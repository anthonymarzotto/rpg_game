import { describe, it, expect } from 'vitest';
import { createRecruit } from '../units/unitFactory';
import { CombatUnit } from './types';
import {
  getEffectiveStat,
  getEffectiveSpeed,
  getEffectiveMove,
  getEffectiveArmor,
  getEffectiveWard,
  getEffectiveEvasion,
  getEffectiveResolve
} from './effectiveVitals';

function createTestCombatUnit(): CombatUnit {
  const recruit = createRecruit('hero', 'Hero');
  return {
    unit: recruit,
    currentHp: recruit.effectiveVitals.maxHp,
    currentAp: recruit.effectiveVitals.maxAp,
    initiativeGauge: 0,
    isDefeated: false,
    inBattleXp: { fighter: 0, rogue: 0, mage: 0 },
    activeModifiers: [],
    activeConditions: [],
    abilities: [],
    passives: [],
    facing: 0
  };
}

describe('Effective Combat Vitals Runtime Computations', () => {
  it('returns base vitals when no active modifiers exist', () => {
    const cu = createTestCombatUnit();

    expect(getEffectiveStat(cu, 'speed')).toBe(cu.unit.effectiveVitals.speed);
    expect(getEffectiveSpeed(cu)).toBe(cu.unit.effectiveVitals.speed);
    expect(getEffectiveMove(cu)).toBe(cu.unit.effectiveVitals.move);
    expect(getEffectiveArmor(cu)).toBe(cu.unit.effectiveVitals.armor);
    expect(getEffectiveWard(cu)).toBe(cu.unit.effectiveVitals.ward);
    expect(getEffectiveEvasion(cu)).toBe(cu.unit.effectiveVitals.evasion);
    expect(getEffectiveResolve(cu)).toBe(cu.unit.effectiveVitals.resolve);
  });

  it('aggregates multiple positive modifiers (buffs)', () => {
    const cu = createTestCombatUnit();
    cu.activeModifiers.push(
      { stat: 'armor', value: 2, durationTurns: 2 },
      { stat: 'armor', value: 3, durationTurns: 1 }
    );

    expect(getEffectiveArmor(cu)).toBe(cu.unit.effectiveVitals.armor + 5);
  });

  it('applies negative modifiers (debuffs)', () => {
    const cu = createTestCombatUnit();
    const baseSpeed = cu.unit.effectiveVitals.speed;
    cu.activeModifiers.push({ stat: 'speed', value: -3, durationTurns: 1 });

    expect(getEffectiveSpeed(cu)).toBe(baseSpeed - 3);
  });

  it('clamps move and speed to a minimum floor of 1', () => {
    const cu = createTestCombatUnit();
    cu.activeModifiers.push(
      { stat: 'move', value: -100, durationTurns: 1 },
      { stat: 'speed', value: -100, durationTurns: 1 }
    );

    expect(getEffectiveMove(cu)).toBe(1);
    expect(getEffectiveSpeed(cu)).toBe(1);
  });

  it('clamps defensive stats (armor, ward, evasion, resolve) to a minimum floor of 0', () => {
    const cu = createTestCombatUnit();
    cu.activeModifiers.push(
      { stat: 'armor', value: -100, durationTurns: 1 },
      { stat: 'ward', value: -100, durationTurns: 1 },
      { stat: 'evasion', value: -100, durationTurns: 1 },
      { stat: 'resolve', value: -100, durationTurns: 1 }
    );

    expect(getEffectiveArmor(cu)).toBe(0);
    expect(getEffectiveWard(cu)).toBe(0);
    expect(getEffectiveEvasion(cu)).toBe(0);
    expect(getEffectiveResolve(cu)).toBe(0);
  });
});
