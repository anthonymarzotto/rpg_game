import { Ability } from '../../core/types/ability';
import { Unit } from '../../core/types/unit';
import { EncounterDefinition } from '../../core/combat/encounter';
import { createRecruit } from '../../core/units/unitFactory';
import {
  SHIELD_BASH,
  QUICK_THRUST,
  SPARK
} from '../packages/novice';

export interface NoviceSandboxOptions {
  readonly abilitiesOverride?: readonly Ability[];
  readonly playerUnitOverride?: Unit;
}

const DUMMY_LOADOUT = {
  activeClassId: 'novice',
  wildcardAbilityIds: [],
  wildcardPassiveIds: []
};

/**
 * Builds the standard Milestone 5 novice combat testbed encounter.
 * Supports injecting an upgraded player character or custom ability kit.
 */
export function createNoviceSandboxEncounter(
  options?: NoviceSandboxOptions | readonly Ability[]
): EncounterDefinition {
  const isOptionsObj = options && typeof options === 'object' && !Array.isArray(options);
  const abilitiesOverride = Array.isArray(options)
    ? options
    : isOptionsObj
    ? (options as NoviceSandboxOptions).abilitiesOverride
    : undefined;
  const playerUnitOverride = isOptionsObj
    ? (options as NoviceSandboxOptions).playerUnitOverride
    : undefined;

  const starterAbilities = abilitiesOverride ?? [
    SHIELD_BASH,
    QUICK_THRUST,
    SPARK
  ];

  // 1. Player Recruit (center)
  const player = playerUnitOverride ?? createRecruit('player', 'Alden (Novice)', {
    starterAbilityIds: starterAbilities.map((a) => a.id),
    faction: 'PLAYER'
  });

  // 2. Training Dummy A (adjacent at 1, 0)
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

  // 3. Bystander Dummy B (at 2, 0 behind dummy A)
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

  // 4. Screened Dummy C (at 0, 3 behind rock obstacle at 0, 2)
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

  // 5. Distant Target D (at -2, 1 for unblocked ranged testing)
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
    name: 'Novice Testbed Arena',
    arenaRadius: 3,
    tileOverrides: [{ coord: { q: 0, r: 2 }, isWalkable: false, label: 'PILLAR' }],
    units: [
      { unit: player, coord: { q: 0, r: 0 } },
      { unit: dummyA, coord: { q: 1, r: 0 } },
      { unit: dummyB, coord: { q: 2, r: 0 } },
      { unit: dummyC, coord: { q: 0, r: 3 } },
      { unit: dummyD, coord: { q: -2, r: 1 } }
    ],
    initialActiveUnitId: 'player',
    objectives: [
      {
        id: 'sandbox_xp_milestone',
        description: 'Earn 5 XP in any archetype (Fighter, Rogue, or Mage)',
        condition: {
          anyOf: [
            { kind: 'ARCHETYPE_XP_EARNED', unitId: 'player', archetype: 'FIGHTER', amount: 5 },
            { kind: 'ARCHETYPE_XP_EARNED', unitId: 'player', archetype: 'ROGUE', amount: 5 },
            { kind: 'ARCHETYPE_XP_EARNED', unitId: 'player', archetype: 'MAGE', amount: 5 }
          ]
        }
      }
    ]
  };
}
