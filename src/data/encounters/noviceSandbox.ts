import { Ability } from '../../core/types/ability';
import { Unit } from '../../core/types/unit';
import { EncounterDefinition } from '../../core/combat/encounter';
import { createRecruit } from '../../core/units/unitFactory';
import {
  SHIELD_BASH,
  QUICK_THRUST,
  SPARK,
  UNIVERSAL_ACTIONS
} from '../abilities';

/**
 * Builds the standard Milestone 5 novice combat testbed encounter.
 */
export function createNoviceSandboxEncounter(
  abilitiesOverride?: readonly Ability[]
): EncounterDefinition {
  const starterAbilities = abilitiesOverride ?? [
    SHIELD_BASH,
    QUICK_THRUST,
    SPARK,
    ...UNIVERSAL_ACTIONS
  ];

  // 1. Player Recruit (center)
  const player = createRecruit('player', 'Alden (Novice)', {
    abilities: starterAbilities,
    faction: 'PLAYER'
  });

  // 2. Training Dummy A (adjacent at 1, 0)
  const dummyA: Unit = {
    id: 'dummy-a',
    name: 'Training Dummy A',
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
    abilities: []
  };

  // 3. Bystander Dummy B (at 2, 0 behind dummy A)
  const dummyB: Unit = {
    id: 'dummy-b',
    name: 'Bystander Dummy B',
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
    abilities: []
  };

  // 4. Screened Dummy C (at 0, 3 behind rock obstacle at 0, 2)
  const dummyC: Unit = {
    id: 'dummy-c',
    name: 'Screened Dummy C',
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
    abilities: []
  };

  // 5. Distant Target D (at -2, 1 for unblocked ranged testing)
  const dummyD: Unit = {
    id: 'dummy-d',
    name: 'Distant Target D',
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
    abilities: []
  };

  return {
    id: 'novice-sandbox',
    name: 'Novice Testbed Arena',
    arenaRadius: 3,
    tileOverrides: [{ coord: { q: 0, r: 2 }, isWalkable: false }],
    units: [
      { unit: player, coord: { q: 0, r: 0 } },
      { unit: dummyA, coord: { q: 1, r: 0 } },
      { unit: dummyB, coord: { q: 2, r: 0 } },
      { unit: dummyC, coord: { q: 0, r: 3 } },
      { unit: dummyD, coord: { q: -2, r: 1 } }
    ],
    initialActiveUnitId: 'player'
  };
}
