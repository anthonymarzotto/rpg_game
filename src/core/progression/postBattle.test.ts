import { describe, it, expect } from 'vitest';
import { createRecruit } from '../units/unitFactory';
import { createClassRegistry } from './registry';
import { ClassDefinition } from '../types/class';
import { reconcilePostBattleProgression } from './postBattle';

const TEST_CLASSES: ClassDefinition[] = [
  { no: '00', id: 'warrior', name: 'Warrior', requirements: { fighter: 1, rogue: 0, mage: 0 }, totalPoints: 1 },
  { no: '81', id: 'thief', name: 'Thief', requirements: { fighter: 0, rogue: 1, mage: 0 }, totalPoints: 1 },
  { no: '99', id: 'wizard', name: 'Wizard', requirements: { fighter: 0, rogue: 0, mage: 1 }, totalPoints: 1 }
];

describe('Post-Battle Progression Reconciliation', () => {
  const registry = createClassRegistry(TEST_CLASSES);

  it('preserves XP as carryover when no threshold is met', () => {
    const recruit = createRecruit('hero', 'Alden');
    const result = reconcilePostBattleProgression(
      recruit,
      { fighter: 3, rogue: 2, mage: 0 },
      registry
    );

    expect(result.levelUpsGained).toBe(0);
    expect(result.unlockedClass).toBeNull();
    expect(result.requiresChoice).toBe(false);
    expect(result.carryoverXp).toEqual({ fighter: 3, rogue: 2, mage: 0 });
    expect(result.updatedProgression.currentLevel).toBe(0);
    expect(result.updatedVitals.maxHp).toBe(12);
  });

  it('auto-advances single qualifying archetype, deducts threshold, and calculates carryover', () => {
    const recruit = createRecruit('hero', 'Alden');
    const result = reconcilePostBattleProgression(
      recruit,
      { fighter: 7, rogue: 1, mage: 0 },
      registry
    );

    expect(result.levelUpsGained).toBe(1);
    expect(result.unlockedClass?.id).toBe('warrior');
    expect(result.unlockedClass?.name).toBe('Warrior');
    expect(result.requiresChoice).toBe(false);
    // 7 - 5 = 2 carryover fighter XP
    expect(result.carryoverXp).toEqual({ fighter: 2, rogue: 1, mage: 0 });
    expect(result.updatedProgression.currentLevel).toBe(1);
    expect(result.updatedProgression.archetypePoints).toEqual({ fighter: 1, rogue: 0, mage: 0 });
    expect(result.updatedProgression.constellation).toEqual(['warrior']);
    expect(result.updatedAttributes.force).toBe(1);
    // Flat HP: 12 base + (1 level * 5) = 17 HP
    expect(result.updatedVitals.maxHp).toBe(17);
    expect(result.updatedVitals.armor).toBe(1);
  });

  it('flags requiresChoice when multiple archetypes cross the threshold simultaneously', () => {
    const recruit = createRecruit('hero', 'Alden');
    const result = reconcilePostBattleProgression(
      recruit,
      { fighter: 5, rogue: 6, mage: 0 },
      registry
    );

    expect(result.levelUpsGained).toBe(0);
    expect(result.requiresChoice).toBe(true);
    expect(result.qualifyingArchetypes).toEqual(['FIGHTER', 'ROGUE']);
    expect(result.unlockedClass).toBeNull();
    // Carryover still holds full accumulated XP pending choice
    expect(result.carryoverXp).toEqual({ fighter: 5, rogue: 6, mage: 0 });
  });

  it('commits chosen archetype when player selects from multiple qualifying options', () => {
    const recruit = createRecruit('hero', 'Alden');
    const result = reconcilePostBattleProgression(
      recruit,
      { fighter: 5, rogue: 6, mage: 0 },
      registry,
      { selectedArchetypeChoice: 'ROGUE' }
    );

    expect(result.levelUpsGained).toBe(1);
    expect(result.requiresChoice).toBe(false);
    expect(result.unlockedClass?.id).toBe('thief');
    // Rogue: 6 - 5 = 1 carryover, Fighter: 5 retained
    expect(result.carryoverXp).toEqual({ fighter: 5, rogue: 1, mage: 0 });
    expect(result.updatedProgression.currentLevel).toBe(1);
    expect(result.updatedProgression.archetypePoints).toEqual({ fighter: 0, rogue: 1, mage: 0 });
    expect(result.updatedAttributes.finesse).toBe(1);
    expect(result.updatedVitals.speed).toBe(12); // 10 base + (1 * 2)
  });

  it('aggregates banked XP from previous encounters toward the threshold', () => {
    const recruit = createRecruit('hero', 'Alden');
    const result = reconcilePostBattleProgression(
      recruit,
      { fighter: 2, rogue: 0, mage: 0 },
      registry,
      { bankedXp: { fighter: 3, rogue: 0, mage: 0 } }
    );

    // 3 banked + 2 earned = 5 Fighter XP -> triggers Level 1 unlock
    expect(result.levelUpsGained).toBe(1);
    expect(result.unlockedClass?.id).toBe('warrior');
    expect(result.carryoverXp.fighter).toBe(0);
  });
});
