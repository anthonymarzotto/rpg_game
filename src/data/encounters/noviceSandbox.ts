import { Unit } from '../../core/types/unit';
import { EncounterDefinition } from '../../core/combat/encounter';
import { computeDerivedVitals } from '../../core/units/vitals';

export interface NoviceSandboxOptions {
  readonly playerUnitOverride?: Unit;
}

/**
 * Clean factory helper for authentic sandbox hostile combatants.
 */
function createSandboxEnemy(
  id: string,
  name: string,
  activeClassId: string,
  wildcardAbilityIds: string[],
  starterAbilityIds: string[],
  vitals: Partial<Unit['effectiveVitals']>
): Unit {
  return {
    id,
    name,
    gender: 'female',
    race: 'human',
    faction: 'ENEMY',
    progression: {
      unitId: id,
      currentLevel: 1,
      archetypePoints: { fighter: 1, rogue: 0, mage: 0 },
      constellation: []
    },
    baseAttributes: { force: 0, finesse: 0, focus: 0 },
    effectiveVitals: {
      maxHp: 20,
      maxAp: 3,
      speed: 7,
      move: 3,
      evasion: 10,
      resolve: 10,
      armor: 1,
      ward: 0,
      ...vitals
    },
    loadout: {
      activeClassId,
      wildcardAbilityIds,
      wildcardPassiveIds: []
    },
    starterAbilityIds
  };
}

/**
 * Builds the standard squad combat encounter with a Level 1 player trio against active hostile enemies:
 * - Alden (Warrior): Frontline fighter with Power Strike & Cleave, plus novice wildcards
 * - Lyra (Thief): High-mobility flanker with Sneak Attack & Shadow Step, plus novice wildcards
 * - Vael (Wizard): Arcane blaster with Arcane Blast, Spark & Minor Ward, plus novice wildcards
 */
export function createNoviceSandboxEncounter(
  options?: NoviceSandboxOptions
): EncounterDefinition {
  const playerUnitOverride = options?.playerUnitOverride;

  // 1. Alden (Warrior - Frontline)
  const aldenAttrs = { force: 1, finesse: 0, focus: 0 };
  const alden: Unit = playerUnitOverride ?? {
    id: 'player-warrior',
    name: 'Alden (Warrior)',
    gender: 'male',
    race: 'human',
    faction: 'PLAYER',
    progression: {
      unitId: 'player-warrior',
      currentLevel: 1,
      archetypePoints: { fighter: 1, rogue: 0, mage: 0 },
      constellation: ['warrior']
    },
    baseAttributes: aldenAttrs,
    effectiveVitals: computeDerivedVitals(aldenAttrs, 1),
    loadout: {
      activeClassId: 'warrior',
      wildcardAbilityIds: ['quick_thrust', 'spark'],
      wildcardPassiveIds: ['momentum']
    },
    starterAbilityIds: ['strike', 'quick_thrust', 'spark']
  };

  // 2. Lyra (Thief - Flanker)
  const lyraAttrs = { force: 0, finesse: 1, focus: 0 };
  const lyra: Unit = {
    id: 'player-thief',
    name: 'Lyra (Thief)',
    gender: 'female',
    race: 'human',
    faction: 'PLAYER',
    progression: {
      unitId: 'player-thief',
      currentLevel: 1,
      archetypePoints: { fighter: 0, rogue: 1, mage: 0 },
      constellation: ['thief']
    },
    baseAttributes: lyraAttrs,
    effectiveVitals: computeDerivedVitals(lyraAttrs, 1),
    loadout: {
      activeClassId: 'thief',
      wildcardAbilityIds: ['strike', 'spark'],
      wildcardPassiveIds: ['momentum']
    },
    starterAbilityIds: ['strike', 'throw_dart', 'spark']
  };

  // 3. Vael (Wizard - Arcane Support / Blaster)
  const vaelAttrs = { force: 0, finesse: 0, focus: 1 };
  const vael: Unit = {
    id: 'player-wizard',
    name: 'Vael (Wizard)',
    gender: 'male',
    race: 'human',
    faction: 'PLAYER',
    progression: {
      unitId: 'player-wizard',
      currentLevel: 1,
      archetypePoints: { fighter: 0, rogue: 0, mage: 1 },
      constellation: ['wizard']
    },
    baseAttributes: vaelAttrs,
    effectiveVitals: computeDerivedVitals(vaelAttrs, 1),
    loadout: {
      activeClassId: 'wizard',
      wildcardAbilityIds: ['minor_ward', 'strike'],
      wildcardPassiveIds: ['momentum']
    },
    starterAbilityIds: ['strike', 'quick_thrust', 'minor_ward']
  };

  // 4. Enemy Fighter A (adjacent frontline at 1, 0)
  const enemyA = createSandboxEnemy(
    'dummy-a',
    'Bandit Fighter A',
    'warrior',
    ['quick_thrust'],
    ['strike', 'quick_thrust'],
    { maxHp: 25, speed: 8, armor: 2 }
  );

  // 5. Enemy Skirmisher B (behind fighter at 2, 0)
  const enemyB = createSandboxEnemy(
    'dummy-b',
    'Bandit Skirmisher B',
    'thief',
    ['throw_dart', 'strike'],
    ['strike', 'throw_dart'],
    { maxHp: 20, speed: 9, evasion: 12, armor: 1 }
  );

  // 6. Screened Cultist C (at 0, 3 behind rock obstacle at 0, 2)
  const enemyC = createSandboxEnemy(
    'dummy-c',
    'Screened Cultist C',
    'wizard',
    ['spark', 'minor_ward'],
    ['spark', 'minor_ward'],
    { maxHp: 20, speed: 7, ward: 2, resolve: 12, armor: 0 }
  );

  // 7. Distant Scout D (at -2, 1)
  const enemyD = createSandboxEnemy(
    'dummy-d',
    'Distant Scout D',
    'thief',
    ['throw_dart', 'strike'],
    ['throw_dart'],
    { maxHp: 20, speed: 8, evasion: 11, ward: 1, armor: 0 }
  );

  return {
    id: 'novice-sandbox',
    name: 'Novice Astral Trial',
    arenaRadius: 3,
    tileOverrides: [{ coord: { q: 0, r: 2 }, isWalkable: false, label: 'PILLAR' }],
    units: [
      { unit: alden, coord: { q: 0, r: 0 } },
      { unit: lyra, coord: { q: -1, r: 0 } },
      { unit: vael, coord: { q: -1, r: 1 } },
      { unit: enemyA, coord: { q: 1, r: 0 } },
      { unit: enemyB, coord: { q: 2, r: 0 } },
      { unit: enemyC, coord: { q: 0, r: 3 } },
      { unit: enemyD, coord: { q: -2, r: 1 } }
    ],
    objectives: [
      {
        id: 'rout_enemies',
        description: 'Defeat all hostile combatants',
        condition: { kind: 'FACTION_DEFEATED', faction: 'ENEMY' }
      }
    ]
  };
}
