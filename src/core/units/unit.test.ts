import { describe, it, expect } from 'vitest';
import { BLANK_SLATE_ATTRIBUTES } from '../types/stats';
import { RECRUIT_BASE_VITALS } from '../config/balance';
import { computeDerivedVitals } from './vitals';
import { createRecruit } from './unitFactory';
import { calculateTurnResetGauge } from '../combat/turnClock';

describe('Unit Stats & Derived Vitals', () => {
  it('computes correct baseline vitals for a Level-0 blank slate recruit', () => {
    const vitals = computeDerivedVitals(BLANK_SLATE_ATTRIBUTES, 0);

    expect(vitals.maxHp).toBe(RECRUIT_BASE_VITALS.hp);
    expect(vitals.maxAp).toBe(3);
    expect(vitals.speed).toBe(10);
    expect(vitals.move).toBe(3);
    expect(vitals.evasion).toBe(10);
    expect(vitals.resolve).toBe(10);
    expect(vitals.armor).toBe(0);
    expect(vitals.ward).toBe(0);
  });

  it('scales HP and Armor with Force', () => {
    const vitals = computeDerivedVitals({ force: 4, finesse: 0, focus: 0 }, 1);

    // 20 base + (4 force * 5) + (1 level * 2) = 42 HP
    expect(vitals.maxHp).toBe(42);
    expect(vitals.armor).toBe(4);
    expect(vitals.ward).toBe(0);
  });

  it('scales Speed, Evasion, and Move with Finesse', () => {
    const vitals = computeDerivedVitals({ force: 0, finesse: 3, focus: 0 }, 0);

    // Speed: 10 + (3 * 2) = 16
    expect(vitals.speed).toBe(16);
    // Evasion: 10 + 3 = 13
    expect(vitals.evasion).toBe(13);
    // Move: 3 + floor(3 / 3) = 4
    expect(vitals.move).toBe(4);
  });

  it('scales Resolve and Ward with Focus', () => {
    const vitals = computeDerivedVitals({ force: 0, finesse: 0, focus: 5 }, 0);

    // Resolve: 10 + 5 = 15
    expect(vitals.resolve).toBe(15);
    // Ward: 5
    expect(vitals.ward).toBe(5);
  });
});

describe('Unit Entity Factory', () => {
  it('creates a fresh Level-0 recruit with expected initial state', () => {
    const recruit = createRecruit('unit-1', 'Alden');

    expect(recruit.id).toBe('unit-1');
    expect(recruit.name).toBe('Alden');
    expect(recruit.progression.currentLevel).toBe(0);
    expect(recruit.progression.constellation).toHaveLength(0);
    expect(recruit.baseAttributes).toEqual({ force: 0, finesse: 0, focus: 0 });
    expect(recruit.effectiveVitals.maxHp).toBe(20);
    expect(recruit.abilities).toHaveLength(5);
  });
});

describe('Dynamic CTB Turn Recovery (Unspent AP)', () => {
  it('resets gauge to 0 when all 3 AP are spent', () => {
    expect(calculateTurnResetGauge(0)).toBe(0);
  });

  it('refunds 20 gauge points per unspent AP', () => {
    expect(calculateTurnResetGauge(1)).toBe(20);
    expect(calculateTurnResetGauge(2)).toBe(40);
    expect(calculateTurnResetGauge(3)).toBe(60);
  });

  it('preserves pre-existing turn overflow', () => {
    // Unit triggered turn at 108 gauge -> 8 overflow. Spends 1 AP (2 unspent).
    expect(calculateTurnResetGauge(2, 8)).toBe(48);
  });
});
