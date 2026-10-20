import { describe, it, expect } from 'vitest';
import {
  getCombatUnitXpSummary,
  formatDisciplineName,
  formatDisciplineShort,
  formatDisciplineBadge
} from './combatXpUtils';
import { CombatUnit } from '../../core/combat/types';
import { createRecruit } from '../../core/units/unitFactory';

function createMockCombatUnit(overrides?: Partial<CombatUnit>): CombatUnit {
  const recruit = createRecruit('hero-test', 'Valiant Recruit');
  return {
    unit: recruit,
    faction: 'PLAYER',
    currentHp: 20,
    currentAp: 4,
    initiativeGauge: 50,
    isDefeated: false,
    inBattleXp: { fighter: 0, rogue: 0, mage: 0 },
    activeModifiers: [],
    activeConditions: [],
    abilityModifiers: [],
    abilities: [],
    passives: [],
    facing: 0,
    ...overrides
  };
}

describe('combatXpUtils', () => {
  it('correctly maps fighter->Force, rogue->Finesse, mage->Focus with zero in-battle gains', () => {
    const cu = createMockCombatUnit({
      unit: {
        ...createRecruit('hero-1', 'Recruit'),
        progression: {
          unitId: 'hero-1',
          currentLevel: 0,
          archetypePoints: { fighter: 0, rogue: 0, mage: 0 },
          constellation: [],
          accumulatedXp: { fighter: 3, rogue: 1, mage: 0 },
          milestoneSelections: {}
        }
      },
      inBattleXp: { fighter: 0, rogue: 0, mage: 0 }
    });

    const summary = getCombatUnitXpSummary(cu);

    expect(summary.currentLevel).toBe(0);
    expect(summary.isMaxLevel).toBe(false);
    expect(summary.threshold).toBe(5); // Level 0 threshold is 5

    const [force, finesse, focus] = summary.attributes;

    expect(force.attribute).toBe('Force');
    expect(force.shortLabel).toBe('FRC');
    expect(force.icon).toBe('⚔️');
    expect(force.base).toBe(3);
    expect(force.inBattle).toBe(0);
    expect(force.total).toBe(3);
    expect(force.isReady).toBe(false);

    expect(finesse.attribute).toBe('Finesse');
    expect(finesse.shortLabel).toBe('FIN');
    expect(finesse.icon).toBe('🗡️');
    expect(finesse.base).toBe(1);
    expect(finesse.inBattle).toBe(0);
    expect(finesse.total).toBe(1);
    expect(finesse.isReady).toBe(false);

    expect(focus.attribute).toBe('Focus');
    expect(focus.shortLabel).toBe('FOC');
    expect(focus.icon).toBe('🔮');
    expect(focus.base).toBe(0);
    expect(focus.inBattle).toBe(0);
    expect(focus.total).toBe(0);
    expect(focus.isReady).toBe(false);
  });

  it('aggregates base and in-battle gains to project totals and flags threshold crossing', () => {
    const cu = createMockCombatUnit({
      unit: {
        ...createRecruit('hero-1', 'Recruit'),
        progression: {
          unitId: 'hero-1',
          currentLevel: 0,
          archetypePoints: { fighter: 0, rogue: 0, mage: 0 },
          constellation: [],
          accumulatedXp: { fighter: 4, rogue: 2, mage: 0 },
          milestoneSelections: {}
        }
      },
      inBattleXp: { fighter: 2, rogue: 0, mage: 5 }
    });

    const summary = getCombatUnitXpSummary(cu);

    const [force, finesse, focus] = summary.attributes;

    // Force: 4 base + 2 battle = 6 total (Threshold 5, so ready!)
    expect(force.base).toBe(4);
    expect(force.inBattle).toBe(2);
    expect(force.total).toBe(6);
    expect(force.isReady).toBe(true);

    // Finesse: 2 base + 0 battle = 2 total (Threshold 5, not ready)
    expect(finesse.base).toBe(2);
    expect(finesse.inBattle).toBe(0);
    expect(finesse.total).toBe(2);
    expect(finesse.isReady).toBe(false);

    // Focus: 0 base + 5 battle = 5 total (Exact threshold 5, ready!)
    expect(focus.base).toBe(0);
    expect(focus.inBattle).toBe(5);
    expect(focus.total).toBe(5);
    expect(focus.isReady).toBe(true);
  });

  it('handles higher level thresholds (e.g. Level 1 -> threshold 10)', () => {
    const cu = createMockCombatUnit({
      unit: {
        ...createRecruit('hero-1', 'Warrior'),
        progression: {
          unitId: 'hero-1',
          currentLevel: 1,
          archetypePoints: { fighter: 1, rogue: 0, mage: 0 },
          constellation: ['warrior'],
          accumulatedXp: { fighter: 8, rogue: 0, mage: 0 },
          milestoneSelections: {}
        }
      },
      inBattleXp: { fighter: 2, rogue: 0, mage: 0 }
    });

    const summary = getCombatUnitXpSummary(cu);
    expect(summary.currentLevel).toBe(1);
    expect(summary.threshold).toBe(10); // Level 1 threshold is 10

    const force = summary.attributes[0];
    expect(force.total).toBe(10);
    expect(force.isReady).toBe(true);
  });

  it('handles max level cap (Level 9)', () => {
    const cu = createMockCombatUnit({
      unit: {
        ...createRecruit('hero-1', 'Arch-Champion'),
        progression: {
          unitId: 'hero-1',
          currentLevel: 9,
          archetypePoints: { fighter: 5, rogue: 4, mage: 0 },
          constellation: ['warrior', 'berserker'],
          accumulatedXp: { fighter: 50, rogue: 40, mage: 10 },
          milestoneSelections: {}
        }
      },
      inBattleXp: { fighter: 3, rogue: 2, mage: 1 }
    });

    const summary = getCombatUnitXpSummary(cu);
    expect(summary.currentLevel).toBe(9);
    expect(summary.isMaxLevel).toBe(true);
    expect(summary.threshold).toBe(0);

    for (const attr of summary.attributes) {
      expect(attr.isReady).toBe(false);
    }
  });

  it('safely handles missing or undefined accumulatedXp or inBattleXp without crashing', () => {
    const cu = {
      ...createMockCombatUnit(),
      unit: {
        ...createRecruit('hero-fallback', 'Fallback Hero'),
        progression: {
          unitId: 'hero-fallback',
          currentLevel: 0,
          archetypePoints: { fighter: 0, rogue: 0, mage: 0 },
          constellation: [],
          accumulatedXp: undefined,
          milestoneSelections: {}
        }
      },
      inBattleXp: undefined as any
    };

    const summary = getCombatUnitXpSummary(cu);
    expect(summary.threshold).toBe(5);
    for (const attr of summary.attributes) {
      expect(attr.base).toBe(0);
      expect(attr.inBattle).toBe(0);
      expect(attr.total).toBe(0);
      expect(attr.isReady).toBe(false);
    }
  });

  describe('formatDisciplineName', () => {
    it('maps FIGHTER and fighter to Force', () => {
      expect(formatDisciplineName('FIGHTER')).toBe('Force');
      expect(formatDisciplineName('fighter')).toBe('Force');
    });

    it('maps ROGUE and rogue to Finesse', () => {
      expect(formatDisciplineName('ROGUE')).toBe('Finesse');
      expect(formatDisciplineName('rogue')).toBe('Finesse');
    });

    it('maps MAGE and mage to Focus', () => {
      expect(formatDisciplineName('MAGE')).toBe('Focus');
      expect(formatDisciplineName('mage')).toBe('Focus');
    });

    it('handles undefined or null by returning Universal', () => {
      expect(formatDisciplineName(undefined)).toBe('Universal');
      expect(formatDisciplineName(null)).toBe('Universal');
    });

    it('passes through unrecognized custom labels', () => {
      expect(formatDisciplineName('TRI_HYBRID')).toBe('TRI_HYBRID');
    });
  });

  describe('formatDisciplineShort', () => {
    it('maps archetype tags to standard 3-letter abbreviations', () => {
      expect(formatDisciplineShort('FIGHTER')).toBe('FRC');
      expect(formatDisciplineShort('fighter')).toBe('FRC');
      expect(formatDisciplineShort('ROGUE')).toBe('FIN');
      expect(formatDisciplineShort('rogue')).toBe('FIN');
      expect(formatDisciplineShort('MAGE')).toBe('FOC');
      expect(formatDisciplineShort('mage')).toBe('FOC');
    });

    it('handles undefined or custom tags', () => {
      expect(formatDisciplineShort(undefined)).toBe('UNI');
      expect(formatDisciplineShort('OTHER')).toBe('OTHER');
    });
  });

  describe('formatDisciplineBadge', () => {
    it('returns uppercase canonical discipline badges', () => {
      expect(formatDisciplineBadge('FIGHTER')).toBe('FORCE');
      expect(formatDisciplineBadge('fighter')).toBe('FORCE');
      expect(formatDisciplineBadge('ROGUE')).toBe('FINESSE');
      expect(formatDisciplineBadge('rogue')).toBe('FINESSE');
      expect(formatDisciplineBadge('MAGE')).toBe('FOCUS');
      expect(formatDisciplineBadge('mage')).toBe('FOCUS');
      expect(formatDisciplineBadge(undefined)).toBe('UNIVERSAL');
    });
  });
});

