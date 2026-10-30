import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { createRecruit } from '../units/unitFactory';
import { createCombatState, executeAbility } from './resolver';
import { MockDiceRoller } from './dice';
import { resolveAttackRoll } from './attackRoll';
import { Ability } from '../types/ability';

const BASIC_STRIKE: Ability = {
  id: 'basic_strike',
  name: 'Strike',
  description: 'Basic strike',
  apCost: 1,
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
        sides: 8,
        modifierAttribute: 'force'
      }
    }
  ]
};

describe('attackRoll & resolver dice breakdown', () => {
  it('captures raw d20 roll, modifier, and single-die breakdown under NORMAL advantage', () => {
    const warrior = createRecruit('warrior', 'Warrior');
    (warrior as any).baseAttributes = { force: 3, finesse: 4, focus: 0 };
    const target = createRecruit('target', 'Target');
    (target as any).effectiveVitals = { ...target.effectiveVitals, evasion: 12 };

    const dice = new MockDiceRoller({ d20Rolls: [14], damageRolls: [6] });
    const roll = resolveAttackRoll(
      { unit: warrior, currentHp: 20, currentAp: 3, initiativeGauge: 0, isDefeated: false, inBattleXp: { fighter: 0, rogue: 0, mage: 0 }, activeModifiers: [], activeConditions: [], abilityModifiers: [], abilities: [], passives: [], facing: 0 },
      { unit: target, currentHp: 20, currentAp: 3, initiativeGauge: 0, isDefeated: false, inBattleXp: { fighter: 0, rogue: 0, mage: 0 }, activeModifiers: [], activeConditions: [], abilityModifiers: [], abilities: [], passives: [], facing: 0 },
      BASIC_STRIKE,
      dice
    );

    expect(roll.hitOutcome).toBe('SOLID_HIT');
    expect(roll.d20).toBe(14);
    expect(roll.rawD20Rolls).toEqual([14]);
    expect(roll.advantage).toBe('NORMAL');
    expect(roll.modifier).toBe(4);
    expect(roll.totalScore).toBe(18);
    expect(roll.targetDefense).toBe(12);
  });

  it('captures dual candidate d20 rolls and selects higher die under ADVANTAGE', () => {
    const rogue = createRecruit('rogue', 'Rogue');
    (rogue as any).baseAttributes = { force: 1, finesse: 5, focus: 0 };
    const target = createRecruit('target', 'Target');

    // Queue 8 and 17: under Advantage, kept die should be 17
    const dice = new MockDiceRoller({ d20Rolls: [8, 17], damageRolls: [5] });
    const roll = resolveAttackRoll(
      { unit: rogue, currentHp: 20, currentAp: 3, initiativeGauge: 0, isDefeated: false, inBattleXp: { fighter: 0, rogue: 0, mage: 0 }, activeModifiers: [], activeConditions: [], abilityModifiers: [], abilities: [], passives: [], facing: 0 },
      { unit: target, currentHp: 20, currentAp: 3, initiativeGauge: 0, isDefeated: false, inBattleXp: { fighter: 0, rogue: 0, mage: 0 }, activeModifiers: [], activeConditions: [], abilityModifiers: [], abilities: [], passives: [], facing: 0 },
      BASIC_STRIKE,
      dice,
      { advantage: 'ADVANTAGE' }
    );

    expect(roll.d20).toBe(17);
    expect(roll.rawD20Rolls).toEqual([8, 17]);
    expect(roll.advantage).toBe('ADVANTAGE');
    expect(roll.hitOutcome).toBe('SOLID_HIT');
  });

  it('captures dual candidate d20 rolls and selects lower die under DISADVANTAGE', () => {
    const rogue = createRecruit('rogue', 'Rogue');
    (rogue as any).baseAttributes = { force: 1, finesse: 5, focus: 0 };
    const target = createRecruit('target', 'Target');

    // Queue 18 and 6: under Disadvantage, kept die should be 6
    const dice = new MockDiceRoller({ d20Rolls: [18, 6], damageRolls: [4] });
    const roll = resolveAttackRoll(
      { unit: rogue, currentHp: 20, currentAp: 3, initiativeGauge: 0, isDefeated: false, inBattleXp: { fighter: 0, rogue: 0, mage: 0 }, activeModifiers: [], activeConditions: [], abilityModifiers: [], abilities: [], passives: [], facing: 0 },
      { unit: target, currentHp: 20, currentAp: 3, initiativeGauge: 0, isDefeated: false, inBattleXp: { fighter: 0, rogue: 0, mage: 0 }, activeModifiers: [], activeConditions: [], abilityModifiers: [], abilities: [], passives: [], facing: 0 },
      BASIC_STRIKE,
      dice,
      { advantage: 'DISADVANTAGE' }
    );

    expect(roll.d20).toBe(6);
    expect(roll.rawD20Rolls).toEqual([18, 6]);
    expect(roll.advantage).toBe('DISADVANTAGE');
  });

  it('populates full diceBreakdown structure on executeAbility attack resolution', () => {
    const arena = createRadialArena(3);
    const warrior = createRecruit('warrior', 'Warrior');
    (warrior as any).baseAttributes = { force: 3, finesse: 4, focus: 0 };
    const target = createRecruit('target', 'Target');
    (target as any).effectiveVitals = { ...target.effectiveVitals, armor: 1, evasion: 11 };

    arena.setUnitPosition('warrior', { q: 0, r: 0 });
    arena.setUnitPosition('target', { q: 1, r: 0 });

    const state = createCombatState(arena, [warrior, target], 'warrior');
    // d20 = 15 + 4 = 19 vs 11 -> SOLID_HIT. Damage 1d8 = 6 + 3 (Force) - 1 (Armor) = 8
    const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [6] });

    const result = executeAbility(state, 'warrior', BASIC_STRIKE, { targetUnitId: 'target' }, dice);

    expect(result.type).toBe('ATTACK');
    if (result.type === 'ATTACK') {
      const breakdown = result.details.diceBreakdown;
      expect(breakdown).toBeDefined();
      expect(breakdown?.d20Rolls).toEqual([15]);
      expect(breakdown?.keptD20).toBe(15);
      expect(breakdown?.advantage).toBe('NORMAL');
      expect(breakdown?.netModifier).toBe(4);
      expect(breakdown?.totalScore).toBe(19);
      expect(breakdown?.targetDefense).toBe(11);
      expect(breakdown?.defenseType).toBe('Evasion');
      expect(breakdown?.hitOutcome).toBe('SOLID_HIT');
      expect(breakdown?.damageDice).toEqual([{ sides: 8, roll: 6 }]);
      expect(breakdown?.damageModifier).toBe(3);
      expect(breakdown?.totalDamage).toBe(8);
    }
  });
});
