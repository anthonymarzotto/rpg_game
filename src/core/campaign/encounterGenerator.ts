import { Unit, Faction } from '../types/unit';
import { Archetype } from '../types/class';
import { AIProfile } from '../ai/types';
import { HexCoord, HEX_DIRECTIONS, hexDistance, getHexNeighbors } from '../grid/hex';
import { createRadialArena } from '../grid/templates';
import {
  EncounterDefinition,
  PlacedUnit,
  EncounterTileOverride
} from '../combat/encounter';
import { createRng, shuffle } from '../prng';
import {
  getStageDeploymentBudget,
  getStageHostileBonusThreat
} from './threatBudget';
import { createRecruit } from '../units/unitFactory';
import { advanceArchetypeLevel } from '../progression/pyramid';
import { CLASS_REGISTRY, CLASSES_BY_ID } from '../../data/classes';
import { getClassPackage } from '../../data/packages';
import { computeDerivedVitals } from '../units/vitals';
import { assignEnemyTitles } from '../../data/names';

export type EnemyTier1Class = 'warrior' | 'thief' | 'wizard';
export type EnemyTier2Class = 'knight' | 'infiltrator' | 'sorcerer';
export type EnemyTier3Class = 'cavalier' | 'berserker' | 'highwayman' | 'warlock' | 'witch' | 'cat-burglar';
export type EnemyTier4Class = 'shield-bearer' | 'dragoon' | 'ballistician' | 'philanderer' | 'theurge' | 'arcanist';

export const TIER1_CLASSES: readonly EnemyTier1Class[] = ['warrior', 'thief', 'wizard'];
export const TIER2_CLASSES: readonly EnemyTier2Class[] = ['knight', 'infiltrator', 'sorcerer'];
export const TIER3_CLASSES: readonly EnemyTier3Class[] = [
  'cavalier',
  'berserker',
  'highwayman',
  'warlock',
  'witch',
  'cat-burglar'
];
export const TIER4_CLASSES: readonly EnemyTier4Class[] = [
  'shield-bearer',
  'dragoon',
  'ballistician',
  'philanderer',
  'theurge',
  'arcanist'
];

/**
 * Creates an enemy combatant using core class archetypes (Novice, Tier 1, Tier 2, Tier 3, or Tier 4).
 */
export function createEnemyUnit(
  id: string,
  classId: 'novice' | EnemyTier1Class | EnemyTier2Class | EnemyTier3Class | EnemyTier4Class,
  rng?: () => number,
  customName?: string
): Unit {
  const defaultClassName = classId === 'novice' ? 'Novice' : (CLASSES_BY_ID[classId]?.name ?? 'Enemy');
  const unitName = customName ?? defaultClassName;

  if (classId === 'novice') {
    return createRecruit(id, unitName, {
      faction: 'ENEMY',
      rng
    });
  }

  const classDef = CLASSES_BY_ID[classId];
  if (!classDef) {
    throw new Error(`Unknown enemy class: ${classId}`);
  }

  const req = classDef.requirements;
  const level = classDef.totalPoints;

  const recruit = createRecruit(id, unitName, {
    faction: 'ENEMY',
    rng
  });

  let progression = recruit.progression;

  // Advance progression matching class requirements.
  // Advance dominant archetype first so intermediate pure nodes are unlocked
  // before branching into hybrid classes (e.g. warrior->knight for cavalier/berserker).
  const archetypes: Archetype[] = ['FIGHTER', 'ROGUE', 'MAGE'];
  archetypes.sort((a, b) => {
    const keyA = a.toLowerCase() as keyof typeof req;
    const keyB = b.toLowerCase() as keyof typeof req;
    return req[keyB] - req[keyA];
  });

  for (const arch of archetypes) {
    const key = arch.toLowerCase() as keyof typeof req;
    const count = req[key];
    for (let i = 0; i < count; i++) {
      progression = advanceArchetypeLevel(progression, arch, CLASS_REGISTRY);
    }
  }

  const baseAttributes = {
    ...recruit.baseAttributes,
    force: recruit.baseAttributes.force + req.fighter,
    finesse: recruit.baseAttributes.finesse + req.rogue,
    focus: recruit.baseAttributes.focus + req.mage
  };
  const effectiveVitals = computeDerivedVitals(baseAttributes, level);

  // Collect candidate domain abilities and passives from prior unlocked classes in the constellation
  const priorClassIds = progression.constellation.filter((c) => c !== classId);
  const candidateDomainAbilities: string[] = [];
  const candidatePassives: string[] = [];

  for (const cId of priorClassIds) {
    const pkg = getClassPackage(cId);
    if (pkg) {
      for (const dAbility of pkg.domainAbilities) {
        if (!candidateDomainAbilities.includes(dAbility.id)) {
          candidateDomainAbilities.push(dAbility.id);
        }
      }
      if (pkg.passive && !candidatePassives.includes(pkg.passive.id)) {
        candidatePassives.push(pkg.passive.id);
      }
    }
  }

  // If prior classes provided domain abilities, equip up to 2; otherwise fallback to non-strike starter abilities
  let wildcardAbilities: string[];
  if (candidateDomainAbilities.length > 0) {
    const shuffled = rng ? shuffle(candidateDomainAbilities, rng) : candidateDomainAbilities;
    wildcardAbilities = shuffled.slice(0, 2);
  } else {
    wildcardAbilities = recruit.starterAbilityIds.filter((aid) => aid !== 'strike').slice(0, 2);
  }

  // Select wildcard passive from prior classes or fallback to momentum
  let wildcardPassive = 'momentum';
  if (candidatePassives.length > 0) {
    wildcardPassive = rng
      ? candidatePassives[Math.floor(rng() * candidatePassives.length)]
      : candidatePassives[0];
  }

  return {
    ...recruit,
    name: unitName,
    progression,
    baseAttributes,
    effectiveVitals,
    loadout: {
      activeClassId: classId,
      wildcardAbilityIds: wildcardAbilities,
      wildcardPassiveIds: [wildcardPassive]
    }
  };
}

/**
 * Assembles an enemy squad whose combined threat cost matches the target threat budget
 * using standard Novice (10 threat), Tier-1 classes (25 threat), Tier-2 classes (40 threat),
 * and Tier-3 hybrid classes (55 threat).
 */
export function assembleEnemySquad(
  budget: number,
  stage: number,
  rng: () => number
): readonly Unit[] {
  let remaining = budget;
  const squad: Unit[] = [];
  let unitIndex = 1;

  // For Stage 5+, allow Tier-4 enemies (Shield-bearer, Dragoon) if budget allows (70 threat)
  // Limit to at most 1 Tier-4 anchor unless budget is very large (>= 210) to preserve 4-5 unit squad pacing
  const maxTier4 = budget >= 210 ? 2 : 1;
  let tier4Count = 0;
  if (stage >= 5) {
    while (remaining >= 70 && tier4Count < maxTier4) {
      if (rng() < 0.5 || remaining === 70) {
        const classPick = TIER4_CLASSES[Math.floor(rng() * TIER4_CLASSES.length)];
        squad.push(createEnemyUnit(`enemy-${unitIndex++}`, classPick, rng));
        remaining -= 70;
        tier4Count++;
      } else {
        break;
      }
    }
  }

  // For Stage 5+, allow Tier-3 enemies (Cavalier, Berserker, Highwayman, Warlock, Witch, Cat Burglar) if budget allows (55 threat)
  const maxTier3 = budget >= 160 ? 2 : 1;
  let tier3Count = 0;
  if (stage >= 5) {
    while (remaining >= 55 && tier3Count < maxTier3) {
      if (rng() < 0.6 || remaining === 55) {
        const classPick = TIER3_CLASSES[Math.floor(rng() * TIER3_CLASSES.length)];
        squad.push(createEnemyUnit(`enemy-${unitIndex++}`, classPick, rng));
        remaining -= 55;
        tier3Count++;
      } else {
        break;
      }
    }
  }

  // For Stage 3+, allow Tier-2 enemies (Knight, Infiltrator, Sorcerer) if budget allows (40 threat)
  if (stage >= 3) {
    while (remaining >= 40) {
      if (squad.length === 0 || rng() < 0.75 || remaining === 40) {
        const classPick = TIER2_CLASSES[Math.floor(rng() * TIER2_CLASSES.length)];
        squad.push(createEnemyUnit(`enemy-${unitIndex++}`, classPick, rng));
        remaining -= 40;
      } else {
        break;
      }
    }
  }

  // For Stage 2+, allow Tier-1 enemies (Warrior, Thief, Wizard) if budget allows (25 threat)
  if (stage >= 2) {
    while (remaining >= 25) {
      const classPick = TIER1_CLASSES[Math.floor(rng() * TIER1_CLASSES.length)];
      squad.push(createEnemyUnit(`enemy-${unitIndex++}`, classPick, rng));
      remaining -= 25;
    }
  }

  // Fill remaining threat with Novices (10 threat each)
  while (remaining >= 10) {
    squad.push(createEnemyUnit(`enemy-${unitIndex++}`, 'novice', rng));
    remaining -= 10;
  }

  // Guarantee at least 2 enemies even if budget was small
  while (squad.length < 2) {
    squad.push(createEnemyUnit(`enemy-${unitIndex++}`, 'novice', rng));
  }

  // Assign unique astral adjectives across the squad
  const squadDescriptors = squad.map((u) => ({
    id: u.id,
    className: u.name,
    unit: u
  }));
  const titled = assignEnemyTitles(squadDescriptors, rng);
  return titled.map((t) => ({
    ...t.unit,
    name: t.name
  }));
}

/**
 * Generates candidate player (West) and enemy (East) deployment coordinates for the given radius.
 * Uses horizontal screen-column projection (col = 2*q + r) to create symmetric full-height
 * deployment crescents across the North-to-South span of the radial arena:
 * - Radius 3: |2*q + r| >= 3 (8 hexes per side)
 * - Radius 4: |2*q + r| >= 4 (12 hexes per side)
 * - Radius 5: |2*q + r| >= 5 (18 hexes per side)
 */
export function getDeploymentZones(radius: number): {
  readonly playerCoords: readonly HexCoord[];
  readonly enemyCoords: readonly HexCoord[];
} {
  const effectiveRadius = Math.max(2, radius);
  const threshold = effectiveRadius <= 3 ? Math.min(3, effectiveRadius) : effectiveRadius === 4 ? 4 : 5;

  const playerCoords: HexCoord[] = [];
  const enemyCoords: HexCoord[] = [];

  for (let q = -effectiveRadius; q <= effectiveRadius; q++) {
    const r1 = Math.max(-effectiveRadius, -q - effectiveRadius);
    const r2 = Math.min(effectiveRadius, -q + effectiveRadius);
    for (let r = r1; r <= r2; r++) {
      const col = 2 * q + r;
      if (col <= -threshold) {
        playerCoords.push({ q, r });
      } else if (col >= threshold) {
        enemyCoords.push({ q, r });
      }
    }
  }

  // Sort deterministically: front-to-back (|2q+r| ascending), then center-to-wings (|r| ascending, r ascending)
  const sortZone = (a: HexCoord, b: HexCoord) => {
    const absColA = Math.abs(2 * a.q + a.r);
    const absColB = Math.abs(2 * b.q + b.r);
    if (absColA !== absColB) return absColA - absColB;
    const absRA = Math.abs(a.r);
    const absRB = Math.abs(b.r);
    if (absRA !== absRB) return absRA - absRB;
    return a.r - b.r;
  };

  playerCoords.sort(sortZone);
  enemyCoords.sort(sortZone);

  const maxCandidates = effectiveRadius <= 3 ? 8 : effectiveRadius === 4 ? 12 : 18;
  return {
    playerCoords: playerCoords.slice(0, maxCandidates),
    enemyCoords: enemyCoords.slice(0, maxCandidates)
  };
}

/**
 * Resolves the tactical formation role for a unit from its class package or base attributes.
 * Note: Frontline Fighter-lineage commanders (such as Knight) deploy as BRAWLER vanguards.
 */
export function resolveUnitTacticalRole(unit: Unit): AIProfile {
  const classId = unit.loadout?.activeClassId;
  if (classId === 'knight') {
    return 'BRAWLER';
  }
  if (classId && classId !== 'novice') {
    const pkg = getClassPackage(classId);
    if (pkg?.aiProfile) {
      return pkg.aiProfile;
    }
  }

  const { force, finesse, focus } = unit.baseAttributes;
  if (focus > force && focus >= finesse) {
    return 'SNIPER';
  }
  if (finesse > force && finesse > focus) {
    return 'SKIRMISHER';
  }
  return 'BRAWLER';
}

/**
 * Places a squad onto candidate deployment coordinates using deterministic role-aware tactical scoring:
 * - BRAWLER: Forward row closest to center, central lanes (|r| small), anti-clumping spacing.
 * - SNIPER / SUPPORT: Back/mid rows behind frontline, prioritizes h>=1 terrace elevation and Brawler screening.
 * - SKIRMISHER: Outer North/South flank wings (|r| larger) on forward/mid rows, balancing wings.
 */
export function placeSquadTactically(
  units: readonly Unit[],
  candidateCoords: readonly HexCoord[],
  tileOverrides: readonly EncounterTileOverride[] = [],
  faction: Faction = 'ENEMY'
): readonly PlacedUnit[] {
  if (units.length === 0 || candidateCoords.length === 0) {
    return [];
  }

  const elevationMap = new Map<string, number>();
  const blockedSet = new Set<string>();
  for (const ov of tileOverrides) {
    const key = `${ov.coord.q},${ov.coord.r}`;
    if (ov.elevation !== undefined) {
      elevationMap.set(key, ov.elevation);
    }
    if (ov.isWalkable === false) {
      blockedSet.add(key);
    }
  }

  const walkableCandidates = candidateCoords.filter(
    (c) => !blockedSet.has(`${c.q},${c.r}`)
  );
  const pool = walkableCandidates.length > 0 ? walkableCandidates : candidateCoords;

  const minAbsCol = Math.min(...pool.map((c) => Math.abs(2 * c.q + c.r)));
  const maxAbsR = Math.max(1, ...pool.map((c) => Math.abs(c.r)));

  const rolePriority: Record<AIProfile, number> = {
    BRAWLER: 0,
    SNIPER: 1,
    SUPPORT: 2,
    SKIRMISHER: 3
  };

  const indexedUnits = units.map((unit, originalIndex) => ({
    unit,
    originalIndex,
    role: resolveUnitTacticalRole(unit)
  }));

  // Order units for placement so frontline Brawlers anchor first, then Snipers/Supports screen behind them, then Skirmishers take wings
  const placementOrder = [...indexedUnits].sort((a, b) => {
    const prioDiff = rolePriority[a.role] - rolePriority[b.role];
    if (prioDiff !== 0) return prioDiff;
    // Shield-bearer anchors center first among Brawlers
    if (a.unit.loadout?.activeClassId === 'shield-bearer' && b.unit.loadout?.activeClassId !== 'shield-bearer') {
      return -1;
    }
    if (b.unit.loadout?.activeClassId === 'shield-bearer' && a.unit.loadout?.activeClassId !== 'shield-bearer') {
      return 1;
    }
    return a.originalIndex - b.originalIndex;
  });

  const occupied = new Map<string, { coord: HexCoord; role: AIProfile; unit: Unit }>();
  const assignedByIndex = new Map<number, HexCoord>();

  for (const entry of placementOrder) {
    let bestCoord: HexCoord | undefined;
    let bestScore = -Infinity;

    for (const coord of pool) {
      const key = `${coord.q},${coord.r}`;
      if (occupied.has(key)) continue;

      const absCol = Math.abs(2 * coord.q + coord.r);
      const depth = absCol - minAbsCol; // 0 = front row, 1..2 = mid row, 3+ = back row
      const absR = Math.abs(coord.r);
      const elev = elevationMap.get(key) ?? 0;

      let score = 0;

      if (entry.role === 'BRAWLER') {
        const isShieldBearer = entry.unit.loadout?.activeClassId === 'shield-bearer';
        score -= depth * 18;
        score -= absR * (isShieldBearer ? 6 : 2.5);
        score += elev * 2;

        for (const placed of occupied.values()) {
          const dist = hexDistance(coord, placed.coord);
          if (dist === 1) {
            score -= placed.role === 'BRAWLER' ? 5 : 3;
          } else if (dist === 2 && placed.role === 'BRAWLER') {
            score += 4;
          }
        }
      } else if (entry.role === 'SNIPER' || entry.role === 'SUPPORT') {
        // Prefer backline rows (depth >= 2) behind the frontline
        if (depth === 0) {
          score -= 22;
        } else {
          score += Math.min(depth, 3) * 10;
        }

        // High-ground terrace perch bonus
        score += elev * 15;
        score -= absR * 1.5;

        // Screening bonus behind an already-placed friendly Brawler
        let isScreened = false;
        let isAheadOrEqualToAnyBrawler = false;
        for (const placed of occupied.values()) {
          if (placed.role === 'BRAWLER') {
            const brawlerAbsCol = Math.abs(2 * placed.coord.q + placed.coord.r);
            if (brawlerAbsCol < absCol && Math.abs(placed.coord.r - coord.r) <= 1) {
              isScreened = true;
            }
            if (brawlerAbsCol >= absCol) {
              isAheadOrEqualToAnyBrawler = true;
            }
          }
          const dist = hexDistance(coord, placed.coord);
          if (dist === 1 && (placed.role === 'SNIPER' || placed.role === 'SUPPORT')) {
            score -= 2;
          }
        }
        if (isScreened) {
          score += 9;
        }
        if (isAheadOrEqualToAnyBrawler) {
          score -= 14;
        }
      } else if (entry.role === 'SKIRMISHER') {
        // Prefer outer North/South wings (|r| larger) near forward/mid rows
        score += Math.min(absR, maxAbsR) * 7;
        if (depth <= 1) {
          score += 8 - depth * 2;
        } else {
          score -= depth * 4;
        }
        score += elev * 3;

        // Split wings if another Skirmisher is already placed
        for (const placed of occupied.values()) {
          if (placed.role === 'SKIRMISHER') {
            if ((placed.coord.r < 0 && coord.r > 0) || (placed.coord.r > 0 && coord.r < 0)) {
              score += 10;
            } else if (hexDistance(coord, placed.coord) === 1) {
              score -= 10;
            }
          } else if (hexDistance(coord, placed.coord) === 1) {
            score -= 5;
          }
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestCoord = coord;
      }
    }

    const chosen = bestCoord ?? pool[entry.originalIndex % pool.length];
    occupied.set(`${chosen.q},${chosen.r}`, {
      coord: chosen,
      role: entry.role,
      unit: entry.unit
    });
    assignedByIndex.set(entry.originalIndex, chosen);
  }

  const facing = faction === 'PLAYER' ? HEX_DIRECTIONS.EAST : HEX_DIRECTIONS.WEST;

  return units.map((unit, idx) => ({
    unit: { ...unit, faction },
    coord: assignedByIndex.get(idx) ?? pool[idx % pool.length],
    facing
  }));
}


/**
 * Procedurally generates terraced elevation topography and obstacles ensuring
 * guaranteed traversable path connectivity between player and enemy deployment zones.
 * Non-walkable obstacles and h=2 peaks are kept strictly in the neutral center strip
 * outside deployment zones, while h=1 elevation terraces may spread into deployment zones.
 */
export function generateArenaTerrain(
  radius: number,
  playerSpawns: readonly HexCoord[],
  enemySpawns: readonly HexCoord[],
  rng: () => number
): readonly EncounterTileOverride[] {
  const spawnSet = new Set(
    [...playerSpawns, ...enemySpawns].map((c) => `${c.q},${c.r}`)
  );

  // Collect all radial arena coordinates
  const allCoords: HexCoord[] = [];
  const allCoordSet = new Set<string>();
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      allCoords.push({ q, r });
      allCoordSet.add(`${q},${r}`);
    }
  }

  // Eligible interior coordinates (strictly inside perimeter, excluding deployment zones)
  const interiorCoords = allCoords.filter((c) => {
    const dist = hexDistance(c, { q: 0, r: 0 });
    return dist < radius && !spawnSet.has(`${c.q},${c.r}`);
  });

  // Candidate coordinates for h=1 terrace spreading (includes interior and deployment zone hexes)
  const terraceCandidateCoords = allCoords.filter((c) => {
    const dist = hexDistance(c, { q: 0, r: 0 });
    return dist < radius || spawnSet.has(`${c.q},${c.r}`);
  });

  for (let attempt = 0; attempt < 12; attempt++) {
    const elevationMap = new Map<string, number>();

    // 1. Seed 1-2 peak foci (h = 2) strictly in the neutral interior
    const numPeaks = radius >= 4 ? (rng() < 0.75 ? 2 : 1) : 1;
    const peakCandidates = shuffle(
      interiorCoords.filter((c) => hexDistance(c, { q: 0, r: 0 }) <= Math.max(1, radius - 2)),
      rng
    );
    const peaks = peakCandidates.slice(0, numPeaks);
    for (const p of peaks) {
      elevationMap.set(`${p.q},${p.r}`, 2);
    }

    // 2. Flood-fill surrounding terraces (h = 1), allowing spread into deployment zones
    for (const p of peaks) {
      const neighbors = getHexNeighbors(p);
      for (const n of neighbors) {
        const key = `${n.q},${n.r}`;
        if (allCoordSet.has(key) && !elevationMap.has(key)) {
          // Asymmetrical terrace contour: 75% chance for adjacent to be terrace, leaving some raw cliff edges (h=2 -> h=0)
          if (rng() < 0.75) {
            elevationMap.set(key, 1);
          }
        }
      }
    }

    // Secondary terrace spreading for Radius 3+ (can spill h=1 terraces into deployment zones)
    for (const p of peaks) {
      for (const c of terraceCandidateCoords) {
        const key = `${c.q},${c.r}`;
        if (!elevationMap.has(key)) {
          const d = hexDistance(p, c);
          if ((d === 2 && rng() < 0.35) || (spawnSet.has(key) && d <= 3 && rng() < 0.22)) {
            elevationMap.set(key, 1);
          }
        }
      }
    }

    // 3. Place 2 to 4 obstacles (RUINS) strictly in the neutral interior outside deployment zones
    const numObstacles = 2 + Math.floor(rng() * 3);
    const obstacleCandidates = shuffle(
      interiorCoords.filter((c) => !peaks.some((p) => p.q === c.q && p.r === c.r)),
      rng
    );
    const obstacleCoords = obstacleCandidates.slice(0, numObstacles);
    const obstacleSet = new Set(obstacleCoords.map((c) => `${c.q},${c.r}`));

    // 4. Verify traversable path connectivity
    const arena = createRadialArena(radius);
    for (const c of allCoords) {
      const key = `${c.q},${c.r}`;
      const elev = elevationMap.get(key) ?? 0;
      const isObstacle = obstacleSet.has(key);
      const existing = arena.getTile(c);
      if (existing) {
        arena.setTile({
          ...existing,
          elevation: elev,
          isWalkable: !isObstacle
        });
      }
    }

    // Check connectivity from first player spawn to all other spawns
    const reachable = arena.getReachableHexes(playerSpawns[0], 99);
    const reachableSet = new Set(reachable.map((c) => `${c.q},${c.r}`));
    const connectsToEnemy = enemySpawns.every((c) => reachableSet.has(`${c.q},${c.r}`));

    if (connectsToEnemy) {
      const overrides: EncounterTileOverride[] = [];

      for (const c of allCoords) {
        const key = `${c.q},${c.r}`;
        const elev = elevationMap.get(key) ?? 0;
        const isObstacle = obstacleSet.has(key);

        if (isObstacle) {
          overrides.push({
            coord: c,
            elevation: elev,
            isWalkable: false,
            terrainType: 'OBSTACLE',
            label: 'RUINS'
          });
        } else if (elev > 0) {
          overrides.push({
            coord: c,
            elevation: elev,
            isWalkable: true
          });
        }
      }

      return overrides;
    }
  }

  // Fallback: flat ground without overrides if all generation attempts failed
  return [];
}

export interface GenerateStageEncounterOptions {
  readonly useProjectedThreat?: boolean;
}

/**
 * Procedurally generates a balanced combat encounter for the current stage and player squad.
 */
export function generateStageEncounter(
  stage: number,
  playerSquad: readonly Unit[],
  seed?: number,
  _options?: GenerateStageEncounterOptions
): EncounterDefinition {
  const effectiveSeed = seed ?? (1000 + stage * 37);
  const rng = createRng(effectiveSeed);

  const stageBudget = getStageDeploymentBudget(stage);
  const hostileBonus = getStageHostileBonusThreat(stage);
  const targetBudget = stageBudget + hostileBonus;

  const enemies = assembleEnemySquad(targetBudget, stage, rng);
  const totalUnits = playerSquad.length + enemies.length;
  const radius = totalUnits >= 7 ? 5 : (stage === 1 ? 3 : 4);
  const { playerCoords, enemyCoords } = getDeploymentZones(radius);

  const tileOverrides = generateArenaTerrain(radius, playerCoords, enemyCoords, rng);

  const placedPlayerUnits = placeSquadTactically(
    playerSquad,
    playerCoords,
    tileOverrides,
    'PLAYER'
  );
  const placedEnemyUnits = placeSquadTactically(
    enemies,
    enemyCoords,
    tileOverrides,
    'ENEMY'
  );
  const placedUnits: PlacedUnit[] = [...placedPlayerUnits, ...placedEnemyUnits];

  return {
    id: `stage-${stage}-encounter-${effectiveSeed}`,
    name: `Sector ${stage} Trial`,
    arenaRadius: radius,
    tileOverrides,
    units: placedUnits,
    objectives: [
      {
        id: 'rout_enemies',
        description: 'Defeat all hostile combatants',
        condition: { kind: 'FACTION_DEFEATED', faction: 'ENEMY' }
      }
    ]
  };
}
