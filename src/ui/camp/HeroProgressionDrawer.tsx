import { useState, useMemo, useCallback } from 'react';
import { CampaignState } from '../../core/campaign/types';
import { Unit } from '../../core/types/unit';
import { Archetype, ArchetypePoints, ClassDefinition } from '../../core/types/class';
import { Ability } from '../../core/types/ability';
import { UnitLoadout } from '../../core/types/loadout';
import {
  allocateCampArchetypePoint,
  updateCampUnitLoadout
} from '../../core/campaign/transitions';
import {
  isClassEligibleNextLevel,
  isClassLockedOut,
  getEligibleClassAtLevel
} from '../../core/progression/pyramid';
import { checkHeroLevelReady, getHeroDisplayTitle } from './heroUtils';
import { resolveTokenAssetPath } from '../combat/tokenAssets';
import { ConstellationSvg } from '../pyramid/ConstellationSvg';
import { POINTS_BY_ID, getOffNodeWaypoint, parseCoordKey } from '../pyramid/geometry';
import {
  getShardById,
  getAvailableAttunements,
  WayfarerAttunementId
} from '../../core/progression/harmonization';
import { resolveUnitLoadout } from '../../core/units/loadout';
import { CLASS_REGISTRY } from '../../data/classes';
import { getClassPackage, getAbilityById, getPassiveById, MOMENTUM } from '../../data/packages';
import { OffNodeChoiceModal } from './OffNodeChoiceModal';
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
  const [hoveredWaypointKey, setHoveredWaypointKey] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>(hero.loadout.activeClassId);
  const [pendingOffNode, setPendingOffNode] = useState<{
    readonly archetype: Archetype;
    readonly targetPoints: ArchetypePoints;
  } | null>(null);

  const tokenSrc = resolveTokenAssetPath(hero);
  const levelStatus = checkHeroLevelReady(hero);
  const xp = hero.progression.accumulatedXp ?? { fighter: 0, rogue: 0, mage: 0 };
  const constellation = hero.progression.constellation;

  // Unlocked class IDs set
  const unlockedSet = useMemo(() => {
    return new Set(['novice', ...constellation]);
  }, [constellation]);

  const unlockedClasses = useMemo(() => ['novice', ...constellation], [constellation]);

  // Polyline for constellation paths including Starlight Waypoints
  const constellationPathD = useMemo(() => {
    const pathSteps: { level: number; x: number; y: number }[] = [];

    for (const classId of constellation) {
      const pt = POINTS_BY_ID.get(classId);
      if (pt) {
        pathSteps.push({
          level: pt.cls.totalPoints,
          x: pt.x,
          y: pt.y
        });
      }
    }

    for (const coordKey of hero.progression.offNodeMilestones ?? []) {
      const wp = getOffNodeWaypoint(coordKey);
      const lvl = wp.points.fighter + wp.points.rogue + wp.points.mage;
      pathSteps.push({
        level: lvl,
        x: wp.x,
        y: wp.y
      });
    }

    pathSteps.sort((a, b) => a.level - b.level);

    return pathSteps
      .map((step, idx) => `${idx === 0 ? 'M' : 'L'} ${step.x.toFixed(1)} ${step.y.toFixed(1)}`)
      .join(' ');
  }, [constellation, hero.progression.offNodeMilestones]);

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

  // Pool of all unlocked abilities across starter kit, unlocked classes, and off-node domain unlocks
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

    if (hero.progression.unlockedAbilityIds) {
      for (const aid of hero.progression.unlockedAbilityIds) {
        const a = getAbilityById(aid);
        if (a && !seen.has(a.id) && !coreAbilityIds.has(a.id)) {
          seen.add(a.id);
          list.push(a);
        }
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
  }, [hero.starterAbilityIds, hero.progression.unlockedAbilityIds, constellation, coreAbilityIds]);

  // Pool of eligible wildcard passives
  const eligibleWildcardPassives = useMemo(() => {
    const classPassives = constellation
      .map((cid) => getClassPackage(cid)?.passive)
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
    return [MOMENTUM, ...classPassives].filter((p) => p.id !== innatePassive?.id);
  }, [constellation, innatePassive]);

  // Resolve effective unit loadout with slot augment modifiers
  const resolvedLoadout = useMemo(() => {
    try {
      return resolveUnitLoadout(hero, {
        getPackage: getClassPackage,
        getAbility: getAbilityById,
        getPassive: getPassiveById
      });
    } catch {
      return undefined;
    }
  }, [hero]);

  // Handle Level-up archetype spend (canonical class coordinate)
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

  // Evaluate impending level-up preview (Off-Node Milestone vs. Class Unlock)
  const getArchetypeSpendPreview = useCallback(
    (arch: Archetype): { isOffNode: boolean; targetPoints: ArchetypePoints; label: string } => {
      const currentPts = hero.progression.archetypePoints;
      const key = arch.toLowerCase() as keyof ArchetypePoints;
      const nextPoints: ArchetypePoints = {
        ...currentPts,
        [key]: currentPts[key] + 1
      };
      const nextLvl = hero.progression.currentLevel + 1;
      const eligibleClass = getEligibleClassAtLevel(nextPoints, nextLvl, CLASS_REGISTRY);
      if (!eligibleClass) {
        return { isOffNode: true, targetPoints: nextPoints, label: '✦ Wayfarer Milestone' };
      }
      return { isOffNode: false, targetPoints: nextPoints, label: `Unlock: ${eligibleClass.name}` };
    },
    [hero.progression]
  );

  // Handle click on level-up spend button
  const handleArchetypeSpendClick = useCallback(
    (arch: Archetype) => {
      const preview = getArchetypeSpendPreview(arch);
      if (preview.isOffNode) {
        setPendingOffNode({ archetype: arch, targetPoints: preview.targetPoints });
      } else {
        handleLevelUp(arch);
      }
    },
    [getArchetypeSpendPreview, handleLevelUp]
  );

  // Handle confirming off-node modal selection
  const handleConfirmOffNode = useCallback(
    (choice: {
      readonly attunementId: WayfarerAttunementId;
      readonly unlockedAbilityId?: string;
      readonly earnedShardId?: string;
    }) => {
      if (!pendingOffNode) return;
      try {
        const nextState = allocateCampArchetypePoint(
          campaign,
          hero.id,
          pendingOffNode.archetype,
          choice
        );
        onUpdateCampaign(nextState);
        setPendingOffNode(null);
      } catch (err) {
        console.warn('Off-node level up rejected', err);
      }
    },
    [campaign, hero.id, pendingOffNode, onUpdateCampaign]
  );

  // Handle loadout updates
  const handleUpdateLoadout = useCallback(
    (changed: Partial<UnitLoadout>) => {
      const nextLoadout: UnitLoadout = {
        activeClassId: changed.activeClassId ?? hero.loadout.activeClassId,
        coreAbilityIds: changed.coreAbilityIds ?? hero.loadout.coreAbilityIds,
        wildcardAbilityIds: changed.wildcardAbilityIds ?? hero.loadout.wildcardAbilityIds,
        wildcardPassiveIds: changed.wildcardPassiveIds ?? hero.loadout.wildcardPassiveIds,
        earnedShards: changed.earnedShards ?? hero.loadout.earnedShards,
        slotAugments: changed.slotAugments ?? hero.loadout.slotAugments
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

  // Socket a shard into an ability slot (0..4)
  const handleSocketShard = useCallback(
    (slotIdx: number, shardId: string) => {
      const currentSlotShards = hero.loadout.slotAugments?.[slotIdx] ?? [];
      if (currentSlotShards.length >= 2) return;
      const nextSlotAugments = {
        ...hero.loadout.slotAugments,
        [slotIdx]: [...currentSlotShards, shardId]
      };
      handleUpdateLoadout({ slotAugments: nextSlotAugments });
    },
    [hero.loadout.slotAugments, handleUpdateLoadout]
  );

  // Unsocket a shard from an ability slot
  const handleUnsocketShard = useCallback(
    (slotIdx: number, shardId: string) => {
      const currentSlotShards = hero.loadout.slotAugments?.[slotIdx] ?? [];
      const nextSlotAugments = {
        ...hero.loadout.slotAugments,
        [slotIdx]: currentSlotShards.filter((id) => id !== shardId)
      };
      handleUpdateLoadout({ slotAugments: nextSlotAugments });
    },
    [hero.loadout.slotAugments, handleUpdateLoadout]
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
    setHoveredWaypointKey(null);
  };

  const hoveredWaypointInfo = useMemo(() => {
    if (!hoveredWaypointKey) return null;
    const points = parseCoordKey(hoveredWaypointKey);
    const isUnlocked = (hero.progression.offNodeMilestones ?? []).includes(hoveredWaypointKey);
    const attunements = getAvailableAttunements(points);
    return {
      coordKey: hoveredWaypointKey,
      points,
      isUnlocked,
      attunements
    };
  }, [hoveredWaypointKey, hero.progression.offNodeMilestones]);

  const renderSlotSockets = (slotIdx: number) => {
    const slotShards = hero.loadout.slotAugments?.[slotIdx] ?? [];
    const allSocketed = new Set(Object.values(hero.loadout.slotAugments ?? {}).flat());
    const availableToSocket = (hero.loadout.earnedShards ?? []).filter((sid) => !allSocketed.has(sid));

    return (
      <div className="slot-sockets-container font-mono" data-testid={`slot-sockets-${slotIdx}`}>
        {slotShards.map((sid) => {
          const shard = getShardById(sid);
          return (
            <span
              key={sid}
              className="socket-pip filled font-mono"
              title={`${shard?.name}: ${shard?.description}`}
            >
              ✦ {shard?.icon} {shard?.name}
              <button
                type="button"
                className="btn-unsocket"
                onClick={() => handleUnsocketShard(slotIdx, sid)}
                data-testid={`unsocket-shard-${slotIdx}-${sid}`}
                title="Remove shard"
              >
                ✕
              </button>
            </span>
          );
        })}
        {slotShards.length < 2 && availableToSocket.length > 0 && (
          <select
            className="socket-select font-mono"
            value=""
            onChange={(e) => {
              if (e.target.value) handleSocketShard(slotIdx, e.target.value);
            }}
            data-testid={`select-socket-shard-${slotIdx}`}
          >
            <option value="">◇ Socket Shard ({availableToSocket.length} avail)</option>
            {availableToSocket.map((sid) => {
              const s = getShardById(sid);
              return (
                <option key={sid} value={sid}>
                  {s?.icon} {s?.name}
                </option>
              );
            })}
          </select>
        )}
        {slotShards.length === 0 && availableToSocket.length === 0 && (
          <>
            <span className="socket-pip empty font-mono" title="No unassigned astral shards in inventory">
              ◇ Empty Socket
            </span>
            <span className="socket-pip empty font-mono" title="No unassigned astral shards in inventory">
              ◇ Empty Socket
            </span>
          </>
        )}
        {slotShards.length === 1 && availableToSocket.length === 0 && (
          <span className="socket-pip empty font-mono" title="No unassigned astral shards in inventory">
            ◇ Empty Socket
          </span>
        )}
      </div>
    );
  };

  const handleDevGrantXp = useCallback(() => {
    const currentXp = hero.progression.accumulatedXp ?? { fighter: 0, rogue: 0, mage: 0 };
    const updatedHero: Unit = {
      ...hero,
      progression: {
        ...hero.progression,
        accumulatedXp: {
          fighter: currentXp.fighter + 10,
          rogue: currentXp.rogue + 10,
          mage: currentXp.mage + 10
        }
      }
    };
    const nextRoster = campaign.roster.map((u) => (u.id === hero.id ? updatedHero : u));
    onUpdateCampaign({
      ...campaign,
      roster: nextRoster,
      updatedAt: Date.now()
    });
  }, [hero, campaign, onUpdateCampaign]);

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
                <span className="drawer-overview-name">{hero.name}</span> — Level {hero.progression.currentLevel} {getHeroDisplayTitle(hero)}
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

          <div className="drawer-header-right">
            <button
              type="button"
              className="btn-dev-grant-xp font-mono"
              onClick={handleDevGrantXp}
              data-testid="hero-drawer-dev-xp-btn"
              title="Developer Mode: Grant +10 XP to all disciplines for instant level up testing"
            >
              ⚡ +10 XP (Dev)
            </button>
            <button
              type="button"
              className="hero-drawer-close-btn"
              onClick={onClose}
              data-testid="hero-drawer-close-btn"
              title="Close Progression"
            >
              ✕
            </button>
          </div>
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
                  {levelStatus.qualifyingArchetypes.includes('FIGHTER') && (() => {
                    const preview = getArchetypeSpendPreview('FIGHTER');
                    return (
                      <button
                        type="button"
                        className="btn-archetype-spend fighter font-ui"
                        onClick={() => handleArchetypeSpendClick('FIGHTER')}
                        data-testid="spend-fighter-btn"
                      >
                        <div className="btn-spend-main">
                          <span>⚔️ Ascend: Fighter (+1 Force)</span>
                          <span className="btn-spend-preview font-mono">{preview.label}</span>
                        </div>
                        <span className="font-mono">Current: {xp.fighter} XP</span>
                      </button>
                    );
                  })()}
                  {levelStatus.qualifyingArchetypes.includes('ROGUE') && (() => {
                    const preview = getArchetypeSpendPreview('ROGUE');
                    return (
                      <button
                        type="button"
                        className="btn-archetype-spend rogue font-ui"
                        onClick={() => handleArchetypeSpendClick('ROGUE')}
                        data-testid="spend-rogue-btn"
                      >
                        <div className="btn-spend-main">
                          <span>🗡️ Ascend: Rogue (+1 Finesse)</span>
                          <span className="btn-spend-preview font-mono">{preview.label}</span>
                        </div>
                        <span className="font-mono">Current: {xp.rogue} XP</span>
                      </button>
                    );
                  })()}
                  {levelStatus.qualifyingArchetypes.includes('MAGE') && (() => {
                    const preview = getArchetypeSpendPreview('MAGE');
                    return (
                      <button
                        type="button"
                        className="btn-archetype-spend mage font-ui"
                        onClick={() => handleArchetypeSpendClick('MAGE')}
                        data-testid="spend-mage-btn"
                      >
                        <div className="btn-spend-main">
                          <span>🔮 Ascend: Mage (+1 Focus)</span>
                          <span className="btn-spend-preview font-mono">{preview.label}</span>
                        </div>
                        <span className="font-mono">Current: {xp.mage} XP</span>
                      </button>
                    );
                  })()}
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
                  hoveredWaypointKey={hoveredWaypointKey}
                  selectedClassId={selectedClassId}
                  constellationPathD={constellationPathD}
                  onHoverNode={setHoveredClassId}
                  onHoverWaypoint={setHoveredWaypointKey}
                  onClickNode={setSelectedClassId}
                />

                {/* Pinned Star Scanner HUD (Docked top-right, never covers pyramid) */}
                <div
                  className="constellation-scanner-hud glass-panel-elevated"
                  data-testid="constellation-hover-tooltip"
                >
                  {hoveredWaypointInfo ? (
                    <div className="scanner-body active">
                      <div className="scanner-header">
                        <span className="scanner-name font-display">✦ Starlight Waypoint</span>
                        <span className="scanner-tier font-mono">({hoveredWaypointInfo.coordKey})</span>
                      </div>
                      <div className="scanner-reqs font-mono">
                        Harmonization: <span className="req-fighter font-mono">{hoveredWaypointInfo.points.fighter}F</span> /{' '}
                        <span className="req-rogue font-mono">{hoveredWaypointInfo.points.rogue}R</span> /{' '}
                        <span className="req-mage font-mono">{hoveredWaypointInfo.points.mage}M</span>
                      </div>
                      <div className="scanner-status font-ui">
                        {hoveredWaypointInfo.isUnlocked ? (
                          <span className="status-unlocked">★ Milestone Attuned</span>
                        ) : (
                          <span className="status-eligible">✦ Wayfarer Milestone</span>
                        )}
                      </div>
                      <div className="scanner-hint font-mono">
                        Attunements: {hoveredWaypointInfo.attunements.map((a) => a.name.replace("Wayfarer's ", '')).join(' • ')}
                      </div>
                    </div>
                  ) : hoveredClassDef ? (
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
                  {coreAbilities.map((a, idx) => {
                    const effectiveAbility = resolvedLoadout?.coreAbilities[idx] ?? a;
                    return (
                      <div key={a.id} className="drawer-ability-mini-card">
                        <div className="mini-card-head font-ui">
                          <span className="mini-card-name font-display">{effectiveAbility.name}</span>
                          <span className="mini-card-ap font-mono">{effectiveAbility.apCost} AP</span>
                        </div>
                        <span className="mini-card-desc">{effectiveAbility.description}</span>
                        {renderSlotSockets(idx)}
                      </div>
                    );
                  })}
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

                {equippedWildcard1Ability ? (() => {
                  const effectiveAbility = resolvedLoadout?.wildcardAbilities[0] ?? equippedWildcard1Ability;
                  return (
                    <div className="drawer-tactical-slot-card">
                      <div className="slot-card-header font-ui">
                        <span className={`slot-tag ${effectiveAbility.archetypeTag?.toLowerCase() ?? 'fighter'} font-mono`}>
                          {effectiveAbility.archetypeTag ?? 'RESONANT'}
                        </span>
                        <span className="slot-name font-display">{effectiveAbility.name}</span>
                        <span className="slot-ap font-mono">{effectiveAbility.apCost} AP</span>
                      </div>
                      <p className="slot-desc font-ui">{effectiveAbility.description}</p>
                      {renderSlotSockets(3)}
                    </div>
                  );
                })() : (
                  <div className="drawer-tactical-empty-slot font-mono">
                    (No resonant ability slotted)
                    {renderSlotSockets(3)}
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

                {equippedWildcard2Ability ? (() => {
                  const effectiveAbility = resolvedLoadout?.wildcardAbilities[1] ?? equippedWildcard2Ability;
                  return (
                    <div className="drawer-tactical-slot-card">
                      <div className="slot-card-header font-ui">
                        <span className={`slot-tag ${effectiveAbility.archetypeTag?.toLowerCase() ?? 'fighter'} font-mono`}>
                          {effectiveAbility.archetypeTag ?? 'RESONANT'}
                        </span>
                        <span className="slot-name font-display">{effectiveAbility.name}</span>
                        <span className="slot-ap font-mono">{effectiveAbility.apCost} AP</span>
                      </div>
                      <p className="slot-desc font-ui">{effectiveAbility.description}</p>
                      {renderSlotSockets(4)}
                    </div>
                  );
                })() : (
                  <div className="drawer-tactical-empty-slot font-mono">
                    (No resonant ability slotted)
                    {renderSlotSockets(4)}
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

      {pendingOffNode && (
        <OffNodeChoiceModal
          isOpen={Boolean(pendingOffNode)}
          hero={hero}
          archetype={pendingOffNode.archetype}
          targetPoints={pendingOffNode.targetPoints}
          onConfirm={handleConfirmOffNode}
          onCancel={() => setPendingOffNode(null)}
        />
      )}
    </div>
  );
}
