import { Unit } from '../../core/types/unit';
import { EncounterDefinition } from '../../core/combat/encounter';
import { computeDerivedVitals } from '../../core/units/vitals';

export interface NoviceSandboxOptions {
  readonly playerUnitOverride?: Unit;
}

const DUMMY_LOADOUT = {
  activeClassId: 'novice',
  wildcardAbilityIds: [],
  wildcardPassiveIds: []
};

/**
 * Builds the standard squad combat encounter with a Level 1 trio:
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

  // 4. Training Dummy A (adjacent at 1, 0)
  const dummyA: Unit = {
    id: 'dummy-a',
    name: 'Training Dummy A',
    gender: 'female',
    race: 'human',
    faction: 'ENEMY',
    progression: {
      unitId: 'dummy-a',
      currentLevel: 0,
      archetypePoints: { fighter: 0, rogue: 0, mage: 0 },
      constellation: []
    },
    baseAttributes: { force: 0, finesse: 0, focus: 0 },
    effectiveVitals: {
      maxHp: 25,
      maxAp: 0,
      speed: 8,
      move: 0,
      evasion: 10,
      resolve: 10,
      armor: 2,
      ward: 0
    },
    loadout: DUMMY_LOADOUT,
    starterAbilityIds: []
  };

  // 5. Bystander Dummy B (at 2, 0 behind dummy A)
  const dummyB: Unit = {
    id: 'dummy-b',
    name: 'Bystander Dummy B',
    gender: 'female',
    race: 'human',
    faction: 'ENEMY',
    progression: {
      unitId: 'dummy-b',
      currentLevel: 0,
      archetypePoints: { fighter: 0, rogue: 0, mage: 0 },
      constellation: []
    },
    baseAttributes: { force: 0, finesse: 0, focus: 0 },
    effectiveVitals: {
      maxHp: 20,
      maxAp: 0,
      speed: 6,
      move: 0,
      evasion: 10,
      resolve: 10,
      armor: 1,
      ward: 0
    },
    loadout: DUMMY_LOADOUT,
    starterAbilityIds: []
  };

  // 6. Screened Dummy C (at 0, 3 behind rock obstacle at 0, 2)
  const dummyC: Unit = {
    id: 'dummy-c',
    name: 'Screened Dummy C',
    gender: 'female',
    race: 'human',
    faction: 'ENEMY',
    progression: {
      unitId: 'dummy-c',
      currentLevel: 0,
      archetypePoints: { fighter: 0, rogue: 0, mage: 0 },
      constellation: []
    },
    baseAttributes: { force: 0, finesse: 0, focus: 0 },
    effectiveVitals: {
      maxHp: 20,
      maxAp: 0,
      speed: 6,
      move: 0,
      evasion: 10,
      resolve: 12,
      armor: 0,
      ward: 2
    },
    loadout: DUMMY_LOADOUT,
    starterAbilityIds: []
  };

  // 7. Distant Target D (at -2, 1 for unblocked ranged testing)
  const dummyD: Unit = {
    id: 'dummy-d',
    name: 'Distant Target D',
    gender: 'female',
    race: 'human',
    faction: 'ENEMY',
    progression: {
      unitId: 'dummy-d',
      currentLevel: 0,
      archetypePoints: { fighter: 0, rogue: 0, mage: 0 },
      constellation: []
    },
    baseAttributes: { force: 0, finesse: 0, focus: 0 },
    effectiveVitals: {
      maxHp: 20,
      maxAp: 0,
      speed: 6,
      move: 0,
      evasion: 10,
      resolve: 10,
      armor: 0,
      ward: 1
    },
    loadout: DUMMY_LOADOUT,
    starterAbilityIds: []
  };

  return {
    id: 'novice-sandbox',
    name: 'Tactical Squad Arena',
    arenaRadius: 3,
    tileOverrides: [{ coord: { q: 0, r: 2 }, isWalkable: false, label: 'PILLAR' }],
    units: [
      { unit: alden, coord: { q: 0, r: 0 } },
      { unit: lyra, coord: { q: -1, r: 0 } },
      { unit: vael, coord: { q: -1, r: 1 } },
      { unit: dummyA, coord: { q: 1, r: 0 } },
      { unit: dummyB, coord: { q: 2, r: 0 } },
      { unit: dummyC, coord: { q: 0, r: 3 } },
      { unit: dummyD, coord: { q: -2, r: 1 } }
    ],
    objectives: [
      {
        id: 'rout_enemies',
        description: 'Defeat all hostile training dummies',
        condition: { kind: 'FACTION_DEFEATED', faction: 'ENEMY' }
      }
    ]
  };
}
