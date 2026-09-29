import { useState, useMemo, useCallback } from 'react';
import { CampaignState } from '../../core/campaign/types';
import { Unit } from '../../core/types/unit';
import { Archetype } from '../../core/types/class';
import { Ability } from '../../core/types/ability';
import { UnitLoadout } from '../../core/types/loadout';
import {
  allocateCampArchetypePoint,
  updateCampUnitLoadout
} from '../../core/campaign/transitions';
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

export function HeroProgressionDrawer({
  hero,
  campaign,
  onClose,
  onUpdateCampaign
}: HeroProgressionDrawerProps) {
  const [hoveredClassId, setHoveredClassId] = useState<string | null>(null);

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
      } catch (err) {
        console.warn('Loadout update rejected', err);
      }
    },
    [campaign, hero.id, hero.loadout, onUpdateCampaign]
  );

  const currentWildcard1 = hero.loadout.wildcardAbilityIds[0] ?? '';
  const currentWildcard2 = hero.loadout.wildcardAbilityIds[1] ?? '';
  const currentWildcardPassive = hero.loadout.wildcardPassiveIds[0] ?? '';

  return (
    <div className="hero-drawer-backdrop" data-testid="hero-progression-drawer">
      <div className="hero-drawer-panel glass-panel-elevated">
        {/* Sticky Header */}
        <header className="hero-drawer-header">
          <h2 className="hero-drawer-title font-display">
            ✦ Hero Progression: {hero.name}
          </h2>
          <button
            type="button"
            className="hero-drawer-close-btn"
            onClick={onClose}
            data-testid="hero-drawer-close-btn"
            title="Close Drawer"
          >
            ✕
          </button>
        </header>

        <div className="hero-drawer-content">
          {/* Hero Overview */}
          <div className="drawer-hero-overview">
            <div className="drawer-avatar-wrap">
              {tokenSrc ? (
                <img src={tokenSrc} alt={hero.name} className="drawer-token-img pixel-art" />
              ) : (
                <span className="hero-card-avatar-fallback">{hero.name.charAt(0)}</span>
              )}
            </div>
            <div className="drawer-overview-info">
              <h3 className="drawer-overview-name font-display">{hero.name}</h3>
              <div className="drawer-overview-class font-ui">
                Level {hero.progression.currentLevel} {hero.loadout.activeClassId}
              </div>
              <div className="drawer-attributes-row font-mono">
                <span className="attr-item force">⚔️ Force: {hero.baseAttributes.force}</span>
                <span className="attr-item finesse">🗡️ Finesse: {hero.baseAttributes.finesse}</span>
                <span className="attr-item focus">🔮 Focus: {hero.baseAttributes.focus}</span>
              </div>
            </div>
          </div>

          {/* Level Up Spend Banner */}
          {levelStatus.isReady && (
            <div className="drawer-level-up-box" data-testid="drawer-level-up-box">
              <h4 className="level-up-box-title font-ui">
                ✦ Level Ready: Allocate 1 Archetype Point ({levelStatus.threshold} XP)
              </h4>
              <div className="level-up-archetype-options">
                {levelStatus.qualifyingArchetypes.includes('FIGHTER') && (
                  <button
                    type="button"
                    className="btn-archetype-spend fighter font-ui"
                    onClick={() => handleLevelUp('FIGHTER')}
                    data-testid="spend-fighter-btn"
                  >
                    <span>⚔️ Advance Fighter (+1 Force)</span>
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
                    <span>🗡️ Advance Rogue (+1 Finesse)</span>
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
                    <span>🔮 Advance Mage (+1 Focus)</span>
                    <span className="font-mono">Current: {xp.mage} XP</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Constellation Star Chart Preview */}
          <div className="drawer-constellation-section">
            <span className="drawer-section-title font-ui">Class Constellation</span>
            <div className="drawer-svg-viewport">
              <ConstellationSvg
                mode="triangle-mosaic"
                progression={hero.progression}
                unlockedSet={unlockedSet}
                hoveredClassId={hoveredClassId}
                constellationPathD={constellationPathD}
                onHoverNode={setHoveredClassId}
              />
            </div>
          </div>

          {/* Loadout Customizer Section */}
          <div className="drawer-loadout-section" data-testid="drawer-loadout-section">
            <span className="drawer-section-title font-ui">Equipped Loadout &amp; Wildcards</span>

            {/* Active Class */}
            <div className="drawer-loadout-field">
              <label className="drawer-field-label font-ui">Active Class:</label>
              <select
                className="drawer-select font-ui"
                value={hero.loadout.activeClassId}
                onChange={(e) => handleUpdateLoadout({ activeClassId: e.target.value })}
                data-testid="select-active-class"
              >
                {unlockedClasses.map((clsId) => (
                  <option key={clsId} value={clsId}>
                    {clsId.charAt(0).toUpperCase() + clsId.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Core Abilities for Active Class */}
            <div className="drawer-loadout-field">
              <label className="drawer-field-label font-ui">Core Abilities (Innate):</label>
              <div className="drawer-core-abilities-summary font-ui">
                {coreAbilities.map((a) => (
                  <span key={a.id} className="drawer-core-chip">
                    {a.name} ({a.apCost} AP)
                  </span>
                ))}
                {innatePassive && (
                  <span className="drawer-core-chip">
                    🛡️ {innatePassive.name}
                  </span>
                )}
              </div>
            </div>

            {/* Wildcard Ability 1 */}
            <div className="drawer-loadout-field">
              <label className="drawer-field-label font-ui">Wildcard Ability 1:</label>
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
            </div>

            {/* Wildcard Ability 2 */}
            <div className="drawer-loadout-field">
              <label className="drawer-field-label font-ui">Wildcard Ability 2:</label>
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
            </div>

            {/* Wildcard Passive */}
            <div className="drawer-loadout-field">
              <label className="drawer-field-label font-ui">Wildcard Passive Trait:</label>
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
                    {p.name} — {p.description}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
