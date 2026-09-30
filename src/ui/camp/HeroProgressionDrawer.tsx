import { useState, useMemo, useCallback } from 'react';
import { CampaignState } from '../../core/campaign/types';
import { Unit } from '../../core/types/unit';
import { Archetype, ClassDefinition } from '../../core/types/class';
import { Ability } from '../../core/types/ability';
import { UnitLoadout } from '../../core/types/loadout';
import {
  allocateCampArchetypePoint,
  updateCampUnitLoadout
} from '../../core/campaign/transitions';
import {
  isClassEligibleNextLevel,
  isClassLockedOut
} from '../../core/progression/pyramid';
import { checkHeroLevelReady } from './heroUtils';
import { resolveTokenAssetPath } from '../combat/tokenAssets';
import { ConstellationSvg } from '../pyramid/ConstellationSvg';
import { POINTS_BY_ID } from '../pyramid/geometry';
import { getClassPackage, getAbilityById, MOMENTUM } from '../../data/packages';
import './HeroProgressionDrawer.css';

export interface HeroProgressionDrawerProps {
  readonly hero: Unit;
  readonly campaign: CampaignState;
  readonly onClose: () => void;
  readonly onUpdateCampaign: (updatedCampaign: CampaignState) => void;
}

const NOVICE_CLASS_DEF: ClassDefinition = {
  no: '--',
  id: 'novice',
  name: 'Novice',
  requirements: { fighter: 0, rogue: 0, mage: 0 },
  totalPoints: 0
};

function resolveClassDef(classId: string): ClassDefinition | undefined {
  if (classId === 'novice') return NOVICE_CLASS_DEF;
  return POINTS_BY_ID.get(classId)?.cls;
}

export function HeroProgressionDrawer({
  hero,
  campaign,
  onClose,
  onUpdateCampaign
}: HeroProgressionDrawerProps) {
  const [hoveredClassId, setHoveredClassId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>(hero.loadout.activeClassId);

  const tokenSrc = resolveTokenAssetPath(hero);
  const levelStatus = checkHeroLevelReady(hero);
  const xp = hero.progression.accumulatedXp ?? { fighter: 0, rogue: 0, mage: 0 };
  const constellation = hero.progression.constellation;

  // Unlocked class IDs set
  const unlockedSet = useMemo(() => {
    return new Set(['novice', ...constellation]);
  }, [constellation]);

  const unlockedClasses = useMemo(() => ['novice', ...constellation], [constellation]);

  // Polyline for constellation paths
  const constellationPathD = useMemo(() => {
    if (constellation.length === 0) return '';
    return constellation
      .map((id, index) => {
        const pt = POINTS_BY_ID.get(id);
        if (!pt) return '';
        return `${index === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
      })
      .filter(Boolean)
      .join(' ');
  }, [constellation]);

  // Core abilities and innate passive of current active class
  const activeClassId = hero.loadout.activeClassId;
  const { coreAbilities, innatePassive } = useMemo(() => {
    if (activeClassId === 'novice') {
      const starterAbilities = (hero.starterAbilityIds ?? [])
        .map((id) => getAbilityById(id))
        .filter((a): a is Ability => a !== undefined);
      return { coreAbilities: starterAbilities, innatePassive: MOMENTUM };
    }
    const pkg = getClassPackage(activeClassId);
    if (!pkg) {
      return { coreAbilities: [], innatePassive: MOMENTUM };
    }
    return {
      coreAbilities: [pkg.signatureAbility, ...pkg.domainAbilities],
      innatePassive: pkg.passive
    };
  }, [activeClassId, hero.starterAbilityIds]);

  const coreAbilityIds = useMemo(
    () => new Set(coreAbilities.map((a) => a.id)),
    [coreAbilities]
  );

  // Pool of all unlocked abilities across starter kit and unlocked classes
  const eligibleWildcardAbilities = useMemo(() => {
    const list: Ability[] = [];
    const seen = new Set<string>();

    for (const aid of hero.starterAbilityIds ?? []) {
      const a = getAbilityById(aid);
      if (a && !seen.has(a.id) && !coreAbilityIds.has(a.id)) {
        seen.add(a.id);
        list.push(a);
      }
    }

    for (const cid of constellation) {
      const pkg = getClassPackage(cid);
      if (pkg) {
        if (!seen.has(pkg.signatureAbility.id) && !coreAbilityIds.has(pkg.signatureAbility.id)) {
          seen.add(pkg.signatureAbility.id);
          list.push(pkg.signatureAbility);
        }
        for (const dom of pkg.domainAbilities) {
          if (!seen.has(dom.id) && !coreAbilityIds.has(dom.id)) {
            seen.add(dom.id);
            list.push(dom);
          }
        }
      }
    }

    return list;
  }, [hero.starterAbilityIds, constellation, coreAbilityIds]);

  // Pool of eligible wildcard passives
  const eligibleWildcardPassives = useMemo(() => {
    const classPassives = constellation
      .map((cid) => getClassPackage(cid)?.passive)
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
    return [MOMENTUM, ...classPassives].filter((p) => p.id !== innatePassive?.id);
  }, [constellation, innatePassive]);

  // Handle Level-up archetype spend
  const handleLevelUp = useCallback(
    (archetype: Archetype) => {
      try {
        const nextState = allocateCampArchetypePoint(campaign, hero.id, archetype);
        onUpdateCampaign(nextState);
      } catch (err) {
        console.warn('Level up rejected', err);
      }
    },
    [campaign, hero.id, onUpdateCampaign]
  );

  // Handle loadout updates
  const handleUpdateLoadout = useCallback(
    (changed: Partial<UnitLoadout>) => {
      const nextLoadout: UnitLoadout = {
        activeClassId: changed.activeClassId ?? hero.loadout.activeClassId,
        wildcardAbilityIds: changed.wildcardAbilityIds ?? hero.loadout.wildcardAbilityIds,
        wildcardPassiveIds: changed.wildcardPassiveIds ?? hero.loadout.wildcardPassiveIds
      };

      try {
        const nextState = updateCampUnitLoadout(campaign, hero.id, nextLoadout);
        onUpdateCampaign(nextState);
        if (changed.activeClassId) {
          setSelectedClassId(changed.activeClassId);
        }
      } catch (err) {
        console.warn('Loadout update rejected', err);
      }
    },
    [campaign, hero.id, hero.loadout, onUpdateCampaign]
  );

  const currentWildcard1 = hero.loadout.wildcardAbilityIds[0] ?? '';
  const currentWildcard2 = hero.loadout.wildcardAbilityIds[1] ?? '';
  const currentWildcardPassive = hero.loadout.wildcardPassiveIds[0] ?? '';

  const equippedWildcard1Ability = currentWildcard1 ? getAbilityById(currentWildcard1) : undefined;
  const equippedWildcard2Ability = currentWildcard2 ? getAbilityById(currentWildcard2) : undefined;
  const equippedWildcardPassive = currentWildcardPassive
    ? eligibleWildcardPassives.find((p) => p.id === currentWildcardPassive)
    : undefined;

  // Selected Class details for the persistent Inspector Card
  const selectedClassDef = resolveClassDef(selectedClassId) ?? NOVICE_CLASS_DEF;
  const selectedPackage = selectedClassDef.id !== 'novice' ? getClassPackage(selectedClassDef.id) : undefined;
  const isSelectedUnlocked = unlockedSet.has(selectedClassDef.id);
  const isSelectedActive = hero.loadout.activeClassId === selectedClassDef.id;
  const isSelectedLocked = selectedClassDef.id !== 'novice'
    ? isClassLockedOut(
        selectedClassDef,
        hero.progression.currentLevel,
        hero.progression.archetypePoints,
        isSelectedUnlocked
      )
    : false;
  const isSelectedEligible = selectedClassDef.id !== 'novice'
    ? isClassEligibleNextLevel(
        selectedClassDef,
        hero.progression.currentLevel,
        hero.progression.archetypePoints,
        isSelectedUnlocked
      )
    : false;

  // Hovered Class details for the fast floating tooltip
  const hoveredClassDef = hoveredClassId ? resolveClassDef(hoveredClassId) : undefined;
  const isHoveredUnlocked = hoveredClassDef ? unlockedSet.has(hoveredClassDef.id) : false;
  const isHoveredLocked = hoveredClassDef && hoveredClassDef.id !== 'novice'
    ? isClassLockedOut(
        hoveredClassDef,
        hero.progression.currentLevel,
        hero.progression.archetypePoints,
        isHoveredUnlocked
      )
    : false;
  const isHoveredEligible = hoveredClassDef && hoveredClassDef.id !== 'novice'
    ? isClassEligibleNextLevel(
        hoveredClassDef,
        hero.progression.currentLevel,
        hero.progression.archetypePoints,
        isHoveredUnlocked
      )
    : false;

  const handleMouseLeaveViewport = () => {
    setHoveredClassId(null);
  };

  return (
    <div className="hero-drawer-backdrop" data-testid="hero-progression-drawer">
      <div className="hero-drawer-panel glass-panel-elevated">
        {/* Modal Header with Hero Vitals */}
        <header className="hero-drawer-header">
          <div className="drawer-header-left">
            <div className="drawer-avatar-wrap">
              {tokenSrc ? (
                <img src={tokenSrc} alt={hero.name} className="drawer-token-img pixel-art" />
              ) : (
                <span className="hero-card-avatar-fallback">{hero.name.charAt(0)}</span>
              )}
            </div>
            <div className="drawer-header-titles">
              <div className="drawer-overview-class font-ui">
                <span className="drawer-overview-name">{hero.name}</span> — Level {hero.progression.currentLevel} {hero.loadout.activeClassId}
              </div>
            </div>
          </div>

          <div className="drawer-header-center font-mono">
            <div className="drawer-vitals-pills">
              <span className="attr-item force">⚔️ Force: {hero.baseAttributes.force}</span>
              <span className="attr-item finesse">🗡️ Finesse: {hero.baseAttributes.finesse}</span>
              <span className="attr-item focus">🔮 Focus: {hero.baseAttributes.focus}</span>
              <span className="attr-item hp">❤️ HP: {hero.effectiveVitals.maxHp}</span>
              <span className="attr-item ap">⚡ AP: {hero.effectiveVitals.maxAp}</span>
            </div>
          </div>

          <button
            type="button"
            className="hero-drawer-close-btn"
            onClick={onClose}
            data-testid="hero-drawer-close-btn"
            title="Close Progression"
          >
            ✕
          </button>
        </header>

        {/* 2-Column Responsive Body */}
        <div className="hero-drawer-content">
          {/* Left Column: Level Up CTA, Constellation Chart, and Class Inspector Card */}
          <div className="drawer-left-col">
            {/* Level Up Spend Banner */}
            {levelStatus.isReady && (
              <div className="drawer-level-up-box" data-testid="drawer-level-up-box">
                <h4 className="level-up-box-title font-ui">
                  ✦ Ascension Ready: Channel 1 Astral Discipline Point ({levelStatus.threshold} XP)
                </h4>
                <div className="level-up-archetype-options">
                  {levelStatus.qualifyingArchetypes.includes('FIGHTER') && (
                    <button
                      type="button"
                      className="btn-archetype-spend fighter font-ui"
                      onClick={() => handleLevelUp('FIGHTER')}
                      data-testid="spend-fighter-btn"
                    >
                      <span>⚔️ Ascend: Fighter (+1 Force)</span>
                      <span className="font-mono">Current: {xp.fighter} XP</span>
                    </button>
                  )}
                  {levelStatus.qualifyingArchetypes.includes('ROGUE') && (
                    <button
                      type="button"
                      className="btn-archetype-spend rogue font-ui"
                      onClick={() => handleLevelUp('ROGUE')}
                      data-testid="spend-rogue-btn"
                    >
                      <span>🗡️ Ascend: Rogue (+1 Finesse)</span>
                      <span className="font-mono">Current: {xp.rogue} XP</span>
                    </button>
                  )}
                  {levelStatus.qualifyingArchetypes.includes('MAGE') && (
                    <button
                      type="button"
                      className="btn-archetype-spend mage font-ui"
                      onClick={() => handleLevelUp('MAGE')}
                      data-testid="spend-mage-btn"
                    >
                      <span>🔮 Ascend: Mage (+1 Focus)</span>
                      <span className="font-mono">Current: {xp.mage} XP</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Constellation Star Chart Preview */}
            <div className="drawer-constellation-section">
              <div className="drawer-section-header">
                <span className="drawer-section-title font-ui">The Constellation</span>
                <span className="drawer-section-hint font-mono">
                  Hover node to scan • Click to inspect &amp; equip
                </span>
              </div>

              <div
                className="drawer-svg-viewport"
                onMouseLeave={handleMouseLeaveViewport}
              >
                <ConstellationSvg
                  mode="triangle-mosaic"
                  progression={hero.progression}
                  unlockedSet={unlockedSet}
                  hoveredClassId={hoveredClassId}
                  selectedClassId={selectedClassId}
                  constellationPathD={constellationPathD}
                  onHoverNode={setHoveredClassId}
                  onClickNode={setSelectedClassId}
                />

                {/* Pinned Star Scanner HUD (Docked top-right, never covers pyramid) */}
                <div
                  className="constellation-scanner-hud glass-panel-elevated"
                  data-testid="constellation-hover-tooltip"
                >
                  {hoveredClassDef ? (
                    <div className="scanner-body active">
                      <div className="scanner-header">
                        <span className="scanner-name font-display">{hoveredClassDef.name}</span>
                        <span className="scanner-tier font-mono">Tier {hoveredClassDef.totalPoints}</span>
                      </div>
                      <div className="scanner-reqs font-mono">
                        Req: <span className="req-fighter font-mono">{hoveredClassDef.requirements.fighter}F</span> /{' '}
                        <span className="req-rogue font-mono">{hoveredClassDef.requirements.rogue}R</span> /{' '}
                        <span className="req-mage font-mono">{hoveredClassDef.requirements.mage}M</span>
                      </div>
                      <div className="scanner-status font-ui">
                        {isHoveredUnlocked ? (
                          <span className="status-unlocked">★ Class Unlocked</span>
                        ) : isHoveredEligible ? (
                          <span className="status-eligible">✦ Next Ascension</span>
                        ) : isHoveredLocked ? (
                          <span className="status-locked">✕ Locked Out</span>
                        ) : (
                          <span className="status-pathway">○ Future Pathway</span>
                        )}
                      </div>
                      <div className="scanner-hint font-mono">
                        {isHoveredUnlocked ? 'Click node to inspect & equip' : 'Click node to pin details'}
                      </div>
                    </div>
                  ) : (
                    <div className="scanner-body idle">
                      <div className="scanner-header">
                        <span className="scanner-idle-title font-ui">✦ Node Scanner</span>
                        <span className="scanner-idle-badge font-mono">STANDBY</span>
                      </div>
                      <p className="scanner-idle-desc font-ui">
                        Hover over any node to analyze requirements &amp; status.
                      </p>
                      <span className="scanner-idle-hint font-mono">Click node to pin</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Persistent Class Inspector Card */}
            <div className="drawer-class-inspector-card" data-testid="drawer-class-inspector-card">
              <div className="inspector-card-header">
                <div className="inspector-title-row">
                  <h4 className="inspector-class-name font-display">
                    ✦ {selectedClassDef.name}
                  </h4>
                  <div className="inspector-badges font-mono">
                    <span className="inspector-tier-chip">Tier {selectedClassDef.totalPoints}</span>
                    {selectedClassDef.no !== '--' && (
                      <span className="inspector-id-chip">#{selectedClassDef.no}</span>
                    )}
                  </div>
                </div>

                <div className="inspector-reqs-row font-mono">
                  <span className="req-chip fighter">⚔️ Force: {selectedClassDef.requirements.fighter}</span>
                  <span className="req-chip rogue">🗡️ Finesse: {selectedClassDef.requirements.rogue}</span>
                  <span className="req-chip mage">🔮 Focus: {selectedClassDef.requirements.mage}</span>
                  <span className="inspector-status-badge font-ui">
                    {isSelectedActive ? (
                      <span className="status-active">★ Active Class</span>
                    ) : isSelectedUnlocked ? (
                      <span className="status-unlocked">★ Unlocked</span>
                    ) : isSelectedEligible ? (
                      <span className="status-eligible">✦ Next Ascension</span>
                    ) : isSelectedLocked ? (
                      <span className="status-locked">✕ Locked Out</span>
                    ) : (
                      <span className="status-pathway">○ Future Pathway</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Kit Abilities & Passive details */}
              <div className="inspector-kit-details">
                {selectedPackage ? (
                  <div className="inspector-abilities-grid">
                    <div className="kit-item signature">
                      <div className="kit-item-head font-ui">
                        <span className="kit-type-tag signature font-mono">SIGNATURE</span>
                        <span className="kit-name font-display">{selectedPackage.signatureAbility.name}</span>
                        <span className="kit-ap font-mono">{selectedPackage.signatureAbility.apCost} AP</span>
                      </div>
                      <p className="kit-desc font-ui">{selectedPackage.signatureAbility.description}</p>
                    </div>

                    {selectedPackage.domainAbilities.map((dom) => (
                      <div key={dom.id} className="kit-item domain">
                        <div className="kit-item-head font-ui">
                          <span className="kit-type-tag domain font-mono">DOMAIN</span>
                          <span className="kit-name font-display">{dom.name}</span>
                          <span className="kit-ap font-mono">{dom.apCost} AP</span>
                        </div>
                        <p className="kit-desc font-ui">{dom.description}</p>
                      </div>
                    ))}

                    <div className="kit-item passive">
                      <div className="kit-item-head font-ui">
                        <span className="kit-type-tag passive font-mono">PASSIVE</span>
                        <span className="kit-name font-display">🛡️ {selectedPackage.passive.name}</span>
                      </div>
                      <p className="kit-desc font-ui">{selectedPackage.passive.description}</p>
                    </div>
                  </div>
                ) : selectedClassDef.id === 'novice' ? (
                  <div className="inspector-abilities-grid">
                    <div className="kit-item signature">
                      <div className="kit-item-head font-ui">
                        <span className="kit-type-tag signature font-mono">STARTER</span>
                        <span className="kit-name font-display">Novice Strike &amp; Tactics</span>
                      </div>
                      <p className="kit-desc font-ui">
                        Disciplined baseline abilities suited for early combat maneuvers before specializing.
                      </p>
                    </div>
                    <div className="kit-item passive">
                      <div className="kit-item-head font-ui">
                        <span className="kit-type-tag passive font-mono">PASSIVE</span>
                        <span className="kit-name font-display">🛡️ {MOMENTUM.name}</span>
                      </div>
                      <p className="kit-desc font-ui">{MOMENTUM.description}</p>
                    </div>
                  </div>
                ) : (
                  <div className="inspector-unauthored-msg font-ui">
                    <p className="text-dim">
                      Combat abilities for {selectedClassDef.name} unlock in an upcoming expansion.
                      Unlocking this node advances your constellation path toward higher tier capstones.
                    </p>
                  </div>
                )}
              </div>

              {/* Inspector Action Button */}
              <div className="inspector-card-actions">
                {isSelectedUnlocked ? (
                  isSelectedActive ? (
                    <button type="button" className="btn-equip-class equipped font-ui" disabled>
                      ✓ Assumed Class
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-equip-class font-ui"
                      onClick={() => handleUpdateLoadout({ activeClassId: selectedClassDef.id })}
                      data-testid="btn-equip-active-class"
                    >
                      ✦ Assume Class
                    </button>
                  )
                ) : isSelectedEligible ? (
                  <div className="inspector-instruction font-ui">
                    ✦ Ascend to unlock this class.
                  </div>
                ) : isSelectedLocked ? (
                  <div className="inspector-instruction locked font-ui">
                    ✕ Locked Out: This wayfarer's ascension path cannot reach this class.
                  </div>
                ) : (
                  <div className="inspector-instruction locked font-ui">
                    ○ Future Pathway: Further ascensions required.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Equipped Loadout & Wildcards */}
          <div className="drawer-right-col">
            <div className="drawer-loadout-section" data-testid="drawer-loadout-section">
              <span className="drawer-section-title font-ui">Combat Manifest</span>

              {/* Active Class */}
              <div className="drawer-loadout-field">
                <label className="drawer-field-label font-ui">Assumed Class:</label>
                <select
                  className="drawer-select font-ui"
                  value={hero.loadout.activeClassId}
                  onChange={(e) => {
                    const newClassId = e.target.value;
                    setSelectedClassId(newClassId);
                    handleUpdateLoadout({ activeClassId: newClassId });
                  }}
                  data-testid="select-active-class"
                >
                  {unlockedClasses.map((clsId) => {
                    const def = resolveClassDef(clsId);
                    return (
                      <option key={clsId} value={clsId}>
                        {def ? def.name : clsId.charAt(0).toUpperCase() + clsId.slice(1)}
                      </option>
                    );
                  })}
                </select>

                {/* Core Abilities for Active Class */}
                <div className="drawer-core-abilities-summary font-ui">
                  {coreAbilities.map((a) => (
                    <div key={a.id} className="drawer-ability-mini-card">
                      <div className="mini-card-head font-ui">
                        <span className="mini-card-name font-display">{a.name}</span>
                        <span className="mini-card-ap font-mono">{a.apCost} AP</span>
                      </div>
                      <span className="mini-card-desc">{a.description}</span>
                    </div>
                  ))}
                  {innatePassive && (
                    <div className="drawer-passive-mini-card font-ui">
                      <div className="mini-card-head">
                        <span className="mini-card-name font-display">🛡️ {innatePassive.name}</span>
                        <span className="mini-card-tag font-mono">INNATE</span>
                      </div>
                      <span className="mini-card-desc">{innatePassive.description}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Wildcard Ability 1 */}
              <div className="drawer-loadout-field">
                <label className="drawer-field-label font-ui">Resonant Ability I:</label>
                <select
                  className="drawer-select font-ui"
                  value={currentWildcard1}
                  onChange={(e) => {
                    const val = e.target.value;
                    const newWildcards = [val, currentWildcard2].filter(Boolean);
                    handleUpdateLoadout({ wildcardAbilityIds: newWildcards });
                  }}
                  data-testid="select-wildcard-1"
                >
                  <option value="">(None)</option>
                  {eligibleWildcardAbilities
                    .filter((a) => a.id !== currentWildcard2)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.apCost} AP)
                      </option>
                    ))}
                </select>

                {equippedWildcard1Ability ? (
                  <div className="drawer-tactical-slot-card">
                    <div className="slot-card-header font-ui">
                      <span className={`slot-tag ${equippedWildcard1Ability.archetypeTag?.toLowerCase() ?? 'fighter'} font-mono`}>
                        {equippedWildcard1Ability.archetypeTag ?? 'RESONANT'}
                      </span>
                      <span className="slot-name font-display">{equippedWildcard1Ability.name}</span>
                      <span className="slot-ap font-mono">{equippedWildcard1Ability.apCost} AP</span>
                    </div>
                    <p className="slot-desc font-ui">{equippedWildcard1Ability.description}</p>
                  </div>
                ) : (
                  <div className="drawer-tactical-empty-slot font-mono">
                    (No resonant ability slotted)
                  </div>
                )}
              </div>

              {/* Wildcard Ability 2 */}
              <div className="drawer-loadout-field">
                <label className="drawer-field-label font-ui">Resonant Ability II:</label>
                <select
                  className="drawer-select font-ui"
                  value={currentWildcard2}
                  onChange={(e) => {
                    const val = e.target.value;
                    const newWildcards = [currentWildcard1, val].filter(Boolean);
                    handleUpdateLoadout({ wildcardAbilityIds: newWildcards });
                  }}
                  data-testid="select-wildcard-2"
                >
                  <option value="">(None)</option>
                  {eligibleWildcardAbilities
                    .filter((a) => a.id !== currentWildcard1)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.apCost} AP)
                      </option>
                    ))}
                </select>

                {equippedWildcard2Ability ? (
                  <div className="drawer-tactical-slot-card">
                    <div className="slot-card-header font-ui">
                      <span className={`slot-tag ${equippedWildcard2Ability.archetypeTag?.toLowerCase() ?? 'fighter'} font-mono`}>
                        {equippedWildcard2Ability.archetypeTag ?? 'RESONANT'}
                      </span>
                      <span className="slot-name font-display">{equippedWildcard2Ability.name}</span>
                      <span className="slot-ap font-mono">{equippedWildcard2Ability.apCost} AP</span>
                    </div>
                    <p className="slot-desc font-ui">{equippedWildcard2Ability.description}</p>
                  </div>
                ) : (
                  <div className="drawer-tactical-empty-slot font-mono">
                    (No resonant ability slotted)
                  </div>
                )}
              </div>

              {/* Wildcard Passive */}
              <div className="drawer-loadout-field">
                <label className="drawer-field-label font-ui">Resonant Passive:</label>
                <select
                  className="drawer-select font-ui"
                  value={currentWildcardPassive}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleUpdateLoadout({ wildcardPassiveIds: val ? [val] : [] });
                  }}
                  data-testid="select-wildcard-passive"
                >
                  <option value="">(None)</option>
                  {eligibleWildcardPassives.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                {equippedWildcardPassive ? (
                  <div className="drawer-tactical-slot-card">
                    <div className="slot-card-header font-ui">
                      <span className="slot-tag passive font-mono">PASSIVE</span>
                      <span className="slot-name font-display">🛡️ {equippedWildcardPassive.name}</span>
                    </div>
                    <p className="slot-desc font-ui">{equippedWildcardPassive.description}</p>
                  </div>
                ) : (
                  <div className="drawer-tactical-empty-slot font-mono">
                    (No resonant passive slotted)
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
