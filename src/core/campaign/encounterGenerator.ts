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
import { CLASS_REGISTRY } from '../../data/classes';
import { computeDerivedVitals } from '../units/vitals';

export type EnemyTier1Class = 'warrior' | 'thief' | 'wizard';

export const TIER1_CLASSES: readonly EnemyTier1Class[] = ['warrior', 'thief', 'wizard'];

const ENEMY_TIER1_CONFIG: Record<
  EnemyTier1Class,
  { archetype: Archetype; attr: 'force' | 'finesse' | 'focus'; name: string }
> = {
  warrior: { archetype: 'FIGHTER', attr: 'force', name: 'Warrior' },
  thief: { archetype: 'ROGUE', attr: 'finesse', name: 'Thief' },
  wizard: { archetype: 'MAGE', attr: 'focus', name: 'Wizard' }
};

/**
 * Creates an enemy combatant using core class archetypes (Novice, Warrior, Thief, Wizard).
 */
export function createEnemyUnit(
  id: string,
  classId: 'novice' | EnemyTier1Class,
  rng?: () => number
): Unit {
  if (classId === 'novice') {
    return createRecruit(id, 'Novice', {
      faction: 'ENEMY',
      rng
    });
  }

  const config = ENEMY_TIER1_CONFIG[classId];
  const recruit = createRecruit(id, config.name, {
    faction: 'ENEMY',
    rng
  });

  const progression = advanceArchetypeLevel(recruit.progression, config.archetype, CLASS_REGISTRY);
  const baseAttributes = {
    ...recruit.baseAttributes,
    [config.attr]: recruit.baseAttributes[config.attr] + 1
  };
  const effectiveVitals = computeDerivedVitals(baseAttributes, 1);

  // Wildcards selected from recruit's rolled starter abilities
  const wildcardAbilities = recruit.starterAbilityIds.filter((aid) => aid !== 'strike').slice(0, 2);

  return {
    ...recruit,
    name: config.name,
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
 * using standard Novice (10 threat) and Tier-1 classes (25 threat).
 */
export function assembleEnemySquad(
  budget: number,
  stage: number,
  rng: () => number
): readonly Unit[] {
  let remaining = budget;
  const squad: Unit[] = [];
  let unitIndex = 1;

  // For Stage 2+, allow Tier-1 enemies (Warrior, Thief, Wizard) if budget allows (25 threat)
  const canUseTier1 = stage >= 2 && remaining >= 25;

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
        label: 'Ruins'
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
  const targetBudget = computeStageThreatBudget(squadThreat, stage);

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
    name: `Stage ${stage} Skirmish`,
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
