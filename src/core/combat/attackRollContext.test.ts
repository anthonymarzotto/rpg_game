import { describe, it, expect } from 'vitest';
import { evaluateAttackRollContext } from './attackRoll';
import { Ability } from '../types/ability';
import { CombatUnit } from './types';
import { createRecruit } from '../units/unitFactory';
import { createRadialArena } from '../grid/templates';
import { createCombatState } from './resolver';

function createMockUnit(id: string, opts?: { evasion?: number; force?: number; finesse?: number }): CombatUnit {
  const recruit = createRecruit(id, `Unit ${id}`);
  (recruit as any).baseAttributes = {
    force: opts?.force ?? 0,
    finesse: opts?.finesse ?? 0,
    focus: 0
  };
  (recruit as any).effectiveVitals = {
    ...recruit.effectiveVitals,
    evasion: opts?.evasion ?? 10
  };
  return {
    unit: recruit,
    currentHp: 20,
    currentAp: 6,
    initiativeGauge: 0,
    isDefeated: false,
    inBattleXp: { fighter: 0, rogue: 0, mage: 0 },
    activeModifiers: [],
    activeConditions: [],
    abilityModifiers: [],
    abilities: [],
    passives: [],
    facing: 0
  };
}

const BASIC_ATTACK: Ability = {
  id: 'basic_attack',
  name: 'Basic Attack',
  description: 'A simple physical attack',
  apCost: 2,
  range: 1,
  targetType: 'SINGLE_TARGET',
  damageType: 'PHYSICAL',
  defenseTarget: 'EVASION',
  attackModifierAttribute: 'finesse',
  effects: [
    {
      type: 'DAMAGE',
      damageProfile: {
        count: 1,
        sides: 6,
        modifierAttribute: 'force'
      }
    }
  ]
};

describe('evaluateAttackRollContext', () => {
  it('computes normal hit probability clamped between 5% and 95%', () => {
    // Evasion 14, Finesse 4 -> needed = 14 - 4 = 10 -> (21 - 10) / 20 = 11/20 = 0.55
    const actor = createMockUnit('hero', { finesse: 4 });
    const target = createMockUnit('enemy', { evasion: 14 });

    const context = evaluateAttackRollContext(actor, target, BASIC_ATTACK);
    expect(context.finalAdvantage).toBe('NORMAL');
    expect(context.neededRoll).toBe(10);
    expect(context.hitProbability).toBeCloseTo(0.55, 4);
  });

  it('computes advantage hit probability as 1 - (1 - p)^2', () => {
    const actor = createMockUnit('hero', { finesse: 4 });
    const target = createMockUnit('enemy', { evasion: 14 });

    const context = evaluateAttackRollContext(actor, target, BASIC_ATTACK, { advantage: 'ADVANTAGE' });
    expect(context.finalAdvantage).toBe('ADVANTAGE');
    // p = 0.55 -> 1 - (1 - 0.55)^2 = 1 - 0.45^2 = 1 - 0.2025 = 0.7975
    expect(context.hitProbability).toBeCloseTo(0.7975, 4);
  });

  it('computes disadvantage hit probability as p^2', () => {
    const actor = createMockUnit('hero', { finesse: 4 });
    const target = createMockUnit('enemy', { evasion: 14 });

    const context = evaluateAttackRollContext(actor, target, BASIC_ATTACK, { advantage: 'DISADVANTAGE' });
    expect(context.finalAdvantage).toBe('DISADVANTAGE');
    // p = 0.55 -> 0.55^2 = 0.3025
    expect(context.hitProbability).toBeCloseTo(0.3025, 4);
  });

  it('cancels Advantage and Disadvantage to NORMAL', () => {
    const actor = createMockUnit('hero', { finesse: 4 });
    const target = createMockUnit('enemy', { evasion: 14 });

    // Both option advantage and an effect with disadvantage
    const disadvAbility: Ability = {
      ...BASIC_ATTACK,
      effects: [
        {
          ...BASIC_ATTACK.effects[0],
          grantsDisadvantage: true
        }
      ]
    };

    const context = evaluateAttackRollContext(actor, target, disadvAbility, { advantage: 'ADVANTAGE' });
    expect(context.hasAdvantage).toBe(true);
    expect(context.hasDisadvantage).toBe(true);
    expect(context.finalAdvantage).toBe('NORMAL');
    expect(context.hitProbability).toBeCloseTo(0.55, 4);
  });

  it('evaluates STEALTH condition as Advantage', () => {
    const actor = createMockUnit('rogue', { finesse: 4 });
    actor.activeConditions.push({
      type: 'STEALTH',
      durationTurns: 2,
      sourceUnitId: actor.unit.id
    });
    const target = createMockUnit('enemy', { evasion: 14 });

    const context = evaluateAttackRollContext(actor, target, BASIC_ATTACK);
    expect(context.hasAdvantage).toBe(true);
    expect(context.finalAdvantage).toBe('ADVANTAGE');
    expect(context.advantageSources).toContain('Stealth (Advantage)');
    expect(context.hitProbability).toBeCloseTo(0.7975, 4);
  });

  it('evaluates CHALLENGED condition as Disadvantage against non-challenger', () => {
    const challenger = createMockUnit('knight');
    const actor = createMockUnit('goblin', { finesse: 4 });
    actor.activeConditions.push({
      type: 'CHALLENGED',
      durationTurns: 2,
      sourceUnitId: challenger.unit.id
    });
    const nonChallenger = createMockUnit('mage', { evasion: 14 });

    const contextAgainstOther = evaluateAttackRollContext(actor, nonChallenger, BASIC_ATTACK);
    expect(contextAgainstOther.hasDisadvantage).toBe(true);
    expect(contextAgainstOther.finalAdvantage).toBe('DISADVANTAGE');
    expect(contextAgainstOther.disadvantageSources).toContain('Challenged (Disadvantage)');
    expect(contextAgainstOther.hitProbability).toBeCloseTo(0.3025, 4);

    const contextAgainstChallenger = evaluateAttackRollContext(actor, challenger, BASIC_ATTACK);
    expect(contextAgainstChallenger.hasDisadvantage).toBe(false);
    expect(contextAgainstChallenger.finalAdvantage).toBe('NORMAL');
  });

  it('evaluates spatial elevation lookahead using originCoord and targetCoord', () => {
    const arena = createRadialArena(3);
    const archer = createRecruit('archer', 'Archer', { faction: 'PLAYER' });
    (archer as any).baseAttributes = { force: 0, finesse: 4, focus: 0 };
    const grunt = createRecruit('grunt', 'Grunt', { faction: 'ENEMY' });
    (grunt as any).effectiveVitals = {
      ...grunt.effectiveVitals,
      evasion: 14
    };

    arena.setUnitPosition('archer', { q: 0, r: 0 });
    arena.setUnitPosition('grunt', { q: 1, r: 0 });

    // Set ridge elevation = 2 at (0, 0), flat = 0 at (1, 0)
    arena.setTile({ coord: { q: 0, r: 0 }, elevation: 2, isWalkable: true });
    arena.setTile({ coord: { q: 1, r: 0 }, elevation: 0, isWalkable: true });

    const state = createCombatState(arena, [archer, grunt], 'archer');
    const actorCu = state.units.get('archer')!;
    const targetCu = state.units.get('grunt')!;

    const context = evaluateAttackRollContext(actorCu, targetCu, BASIC_ATTACK, {
      state,
      originCoord: { q: 0, r: 0 },
      targetCoord: { q: 1, r: 0 }
    });

    expect(context.hasAdvantage).toBe(true);
    expect(context.finalAdvantage).toBe('ADVANTAGE');
    expect(context.hitProbability).toBeCloseTo(0.7975, 4);
  });
});
