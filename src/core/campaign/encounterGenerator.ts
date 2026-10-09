import { Unit } from '../types/unit';
import { Archetype } from '../types/class';
import { HexCoord, HEX_DIRECTIONS } from '../grid/hex';
import { createRadialArena } from '../grid/templates';
import {
  EncounterDefinition,
  PlacedUnit,
  EncounterTileOverride
} from '../combat/encounter';
import { createRng, shuffle } from '../prng';
import { computeSquadThreat, computeStageThreatBudget } from './threatBudget';
import { createRecruit } from '../units/unitFactory';
import { advanceArchetypeLevel } from '../progression/pyramid';
import { CLASS_REGISTRY, CLASSES_BY_ID } from '../../data/classes';
import { computeDerivedVitals } from '../units/vitals';

export type EnemyTier1Class = 'warrior' | 'thief' | 'wizard';
export type EnemyTier2Class = 'knight' | 'infiltrator' | 'sorcerer';
export type EnemyTier3Class = 'cavalier' | 'berserker' | 'highwayman' | 'warlock' | 'witch';

export const TIER1_CLASSES: readonly EnemyTier1Class[] = ['warrior', 'thief', 'wizard'];
export const TIER2_CLASSES: readonly EnemyTier2Class[] = ['knight', 'infiltrator', 'sorcerer'];
export const TIER3_CLASSES: readonly EnemyTier3Class[] = [
  'cavalier',
  'berserker',
  'highwayman',
  'warlock',
  'witch'
];

/**
 * Creates an enemy combatant using core class archetypes (Novice, Tier 1, Tier 2, or Tier 3).
 */
export function createEnemyUnit(
  id: string,
  classId: 'novice' | EnemyTier1Class | EnemyTier2Class | EnemyTier3Class,
  rng?: () => number
): Unit {
  if (classId === 'novice') {
    return createRecruit(id, 'Novice', {
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

  const recruit = createRecruit(id, classDef.name, {
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

  // Wildcards selected from recruit's rolled starter abilities
  const wildcardAbilities = recruit.starterAbilityIds.filter((aid) => aid !== 'strike').slice(0, 2);

  return {
    ...recruit,
    name: classDef.name,
    progression,
    baseAttributes,
    effectiveVitals,
    loadout: {
      activeClassId: classId,
      wildcardAbilityIds: wildcardAbilities,
      wildcardPassiveIds: ['momentum']
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

  // For Stage 5+, allow Tier-3 enemies (Cavalier, Berserker, Highwayman, Warlock, Witch) if budget allows (55 threat)
  const canUseTier3 = stage >= 5 && remaining >= 55;
  if (canUseTier3 && rng() < 0.6) {
    const classPick = TIER3_CLASSES[Math.floor(rng() * TIER3_CLASSES.length)];
    squad.push(createEnemyUnit(`enemy-${unitIndex++}`, classPick, rng));
    remaining -= 55;
  }

  // For Stage 3+, allow Tier-2 enemies (Knight, Infiltrator, Sorcerer) if budget allows (40 threat)
  const canUseTier2 = stage >= 3 && remaining >= 40 && squad.length < 4;
  if (canUseTier2 && rng() < 0.5) {
    const classPick = TIER2_CLASSES[Math.floor(rng() * TIER2_CLASSES.length)];
    squad.push(createEnemyUnit(`enemy-${unitIndex++}`, classPick, rng));
    remaining -= 40;
  }

  // For Stage 2+, allow Tier-1 enemies (Warrior, Thief, Wizard) if budget allows (25 threat)
  const canUseTier1 = stage >= 2 && remaining >= 25 && squad.length < 4;
  if (canUseTier1 && rng() < 0.6) {
    const classPick = TIER1_CLASSES[Math.floor(rng() * TIER1_CLASSES.length)];
    squad.push(createEnemyUnit(`enemy-${unitIndex++}`, classPick, rng));
    remaining -= 25;
  }

  // Fill remaining threat with Novices (10 threat each)
  while (remaining >= 10 && squad.length < 4) {
    squad.push(createEnemyUnit(`enemy-${unitIndex++}`, 'novice', rng));
    remaining -= 10;
  }

  // Guarantee at least 2 enemies even if budget was small
  while (squad.length < 2) {
    squad.push(createEnemyUnit(`enemy-${unitIndex++}`, 'novice', rng));
  }

  return squad;
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

  // Radius 4 deployment
  return {
    playerCoords: [
      { q: -3, r: 0 },
      { q: -3, r: 1 },
      { q: -3, r: -1 },
      { q: -2, r: -1 }
    ],
    enemyCoords: [
      { q: 3, r: 0 },
      { q: 3, r: -1 },
      { q: 3, r: -2 },
      { q: 2, r: 1 }
    ]
  };
}

/**
 * Procedurally generates obstacle tile overrides ensuring path connectivity between zones.
 */
export function generateArenaObstacles(
  radius: number,
  playerSpawns: readonly HexCoord[],
  enemySpawns: readonly HexCoord[],
  rng: () => number
): readonly EncounterTileOverride[] {
  const spawnSet = new Set(
    [...playerSpawns, ...enemySpawns].map((c) => `${c.q},${c.r}`)
  );

  const numObstacles = 2 + Math.floor(rng() * 3); // 2 to 4 obstacles

  // Gather eligible interior tiles
  const interiorCoords: HexCoord[] = [];
  for (let q = -radius + 1; q <= radius - 1; q++) {
    for (let r = -radius + 1; r <= radius - 1; r++) {
      if (Math.abs(q + r) < radius) {
        const key = `${q},${r}`;
        if (!spawnSet.has(key)) {
          interiorCoords.push({ q, r });
        }
      }
    }
  }

  // Shuffle interior coords
  const shuffled = shuffle(interiorCoords, rng);

  // Try candidate obstacle subsets and verify connectivity
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidateCoords = shuffled.slice(attempt * numObstacles, attempt * numObstacles + numObstacles);
    if (candidateCoords.length < 2) break;

    const arena = createRadialArena(radius);
    for (const c of candidateCoords) {
      const tile = arena.getTile(c);
      if (tile) {
        arena.setTile({ ...tile, isWalkable: false });
      }
    }

    // Verify connectivity from first player spawn to first enemy spawn
    const reachable = arena.getReachableHexes(playerSpawns[0], 99);
    const connectsToEnemy = reachable.some(
      (c) => c.q === enemySpawns[0].q && c.r === enemySpawns[0].r
    );

    if (connectsToEnemy) {
      return candidateCoords.map((coord) => ({
        coord,
        isWalkable: false,
        terrainType: 'OBSTACLE',
        label: 'RUINS'
      }));
    }
  }

  // Fallback: 0 obstacles if connectivity verification failed
  return [];
}

/**
 * Procedurally generates a balanced combat encounter for the current stage and player squad.
 */
export function generateStageEncounter(
  stage: number,
  playerSquad: readonly Unit[],
  seed?: number
): EncounterDefinition {
  const effectiveSeed = seed ?? (1000 + stage * 37);
  const rng = createRng(effectiveSeed);

  const squadThreat = computeSquadThreat(playerSquad);
  const baseBudget = computeStageThreatBudget(squadThreat, stage);
  const targetBudget = stage >= 5 ? Math.max(baseBudget, 60) : baseBudget;

  const radius = stage <= 2 ? 3 : rng() < 0.6 ? 3 : 4;
  const { playerCoords, enemyCoords } = getDeploymentZones(radius);

  const obstacles = generateArenaObstacles(radius, playerCoords, enemyCoords, rng);
  const enemies = assembleEnemySquad(targetBudget, stage, rng);

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
    tileOverrides: obstacles,
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
