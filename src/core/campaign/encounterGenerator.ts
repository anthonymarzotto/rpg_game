import { Unit } from '../types/unit';
import { Archetype } from '../types/class';
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

/**
 * Creates an enemy combatant using core class archetypes (Novice, Tier 1, Tier 2, or Tier 3).
 */
export function createEnemyUnit(
  id: string,
  classId: 'novice' | EnemyTier1Class | EnemyTier2Class | EnemyTier3Class,
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

  // For Stage 5+, allow Tier-3 enemies (Cavalier, Berserker, Highwayman, Warlock, Witch, Cat Burglar) if budget allows (55 threat)
  if (stage >= 5) {
    while (remaining >= 55) {
      if (squad.length === 0 || rng() < 0.75 || remaining === 55) {
        const classPick = TIER3_CLASSES[Math.floor(rng() * TIER3_CLASSES.length)];
        squad.push(createEnemyUnit(`enemy-${unitIndex++}`, classPick, rng));
        remaining -= 55;
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
 * Generates candidate player and enemy deployment coordinates for the given radius.
 */
export function getDeploymentZones(radius: number): {
  readonly playerCoords: readonly HexCoord[];
  readonly enemyCoords: readonly HexCoord[];
} {
  if (radius <= 3) {
    return {
      playerCoords: [
        { q: -2, r: 0 },
        { q: -2, r: 1 },
        { q: -2, r: -1 },
        { q: -1, r: -1 }
      ],
      enemyCoords: [
        { q: 2, r: 0 },
        { q: 2, r: -1 },
        { q: 2, r: -2 },
        { q: 1, r: 1 }
      ]
    };
  }

  if (radius === 4) {
    return {
      playerCoords: [
        { q: -3, r: 0 },
        { q: -3, r: 1 },
        { q: -3, r: -1 },
        { q: -2, r: -1 },
        { q: -2, r: 1 },
        { q: -2, r: 0 }
      ],
      enemyCoords: [
        { q: 3, r: 0 },
        { q: 3, r: -1 },
        { q: 3, r: -2 },
        { q: 2, r: 1 },
        { q: 2, r: -1 },
        { q: 2, r: 0 }
      ]
    };
  }

  // Radius 5+ deployment (10 candidate spawns per side)
  return {
    playerCoords: [
      { q: -4, r: 0 },
      { q: -4, r: 1 },
      { q: -4, r: 2 },
      { q: -4, r: -1 },
      { q: -3, r: 0 },
      { q: -3, r: 1 },
      { q: -3, r: -1 },
      { q: -3, r: -2 },
      { q: -3, r: 2 },
      { q: -2, r: 0 }
    ],
    enemyCoords: [
      { q: 4, r: 0 },
      { q: 4, r: -1 },
      { q: 4, r: -2 },
      { q: 4, r: 1 },
      { q: 3, r: 0 },
      { q: 3, r: -1 },
      { q: 3, r: 1 },
      { q: 3, r: 2 },
      { q: 3, r: -2 },
      { q: 2, r: 0 }
    ]
  };
}


/**
 * Procedurally generates terraced elevation topography and obstacles ensuring
 * guaranteed traversable path connectivity between player and enemy deployment zones.
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
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      allCoords.push({ q, r });
    }
  }

  // Eligible interior coordinates (strictly inside perimeter, excluding spawns)
  const interiorCoords = allCoords.filter((c) => {
    const dist = hexDistance(c, { q: 0, r: 0 });
    return dist < radius && !spawnSet.has(`${c.q},${c.r}`);
  });

  for (let attempt = 0; attempt < 12; attempt++) {
    const elevationMap = new Map<string, number>();

    // 1. Seed 1-2 peak foci (h = 2) in the interior
    const numPeaks = radius >= 4 ? (rng() < 0.75 ? 2 : 1) : 1;
    const peakCandidates = shuffle(
      interiorCoords.filter((c) => hexDistance(c, { q: 0, r: 0 }) <= Math.max(1, radius - 2)),
      rng
    );
    const peaks = peakCandidates.slice(0, numPeaks);
    for (const p of peaks) {
      elevationMap.set(`${p.q},${p.r}`, 2);
    }

    // 2. Flood-fill surrounding terraces (h = 1)
    for (const p of peaks) {
      const neighbors = getHexNeighbors(p);
      for (const n of neighbors) {
        const key = `${n.q},${n.r}`;
        if (!spawnSet.has(key) && !elevationMap.has(key)) {
          // Asymmetrical terrace contour: 75% chance for adjacent to be terrace, leaving some raw cliff edges (h=2 -> h=0)
          if (rng() < 0.75) {
            elevationMap.set(key, 1);
          }
        }
      }
    }

    // Secondary terrace spreading for Radius 4
    if (radius >= 4) {
      for (const p of peaks) {
        for (const c of interiorCoords) {
          const key = `${c.q},${c.r}`;
          if (!elevationMap.has(key) && !spawnSet.has(key)) {
            const d = hexDistance(p, c);
            if (d === 2 && rng() < 0.35) {
              elevationMap.set(key, 1);
            }
          }
        }
      }
    }

    // 3. Place 2 to 4 obstacles (RUINS)
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

    // Check connectivity from first player spawn to first enemy spawn
    const reachable = arena.getReachableHexes(playerSpawns[0], 99);
    const connectsToEnemy = reachable.some(
      (c) => c.q === enemySpawns[0].q && c.r === enemySpawns[0].r
    );

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

  const placedUnits: PlacedUnit[] = [];

  // Place player units (facing East toward enemies)
  playerSquad.forEach((unit, idx) => {
    if (idx < playerCoords.length) {
      placedUnits.push({
        unit: { ...unit, faction: 'PLAYER' },
        coord: playerCoords[idx],
        facing: HEX_DIRECTIONS.EAST
      });
    }
  });

  // Place enemy units (facing West toward player)
  enemies.forEach((unit, idx) => {
    if (idx < enemyCoords.length) {
      placedUnits.push({
        unit,
        coord: enemyCoords[idx],
        facing: HEX_DIRECTIONS.WEST
      });
    }
  });

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
