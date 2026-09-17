import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { createRecruit } from '../units/unitFactory';
import { createCombatState, executeAbility } from './resolver';
import { resolveAttackRoll, getAttackRollModifier, getAbilityModifier } from './attackRoll';
import { resolveDamage } from './damageEngine';
import { MockDiceRoller } from './dice';
import { STRIKE, SHIELD_BASH, SPARK, BRACE, MINOR_WARD, QUICK_THRUST } from '../../data/abilities';

describe('Attack & Ability Resolution Outcomes', () => {
  describe('Hit Tiers & Archetype XP Awards', () => {
    it('resolves a SOLID_HIT, deals damage, and awards +1 Fighter XP', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      const goblin = createRecruit('goblin', 'Goblin');

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('goblin', { q: 1, r: 0 });

      const state = createCombatState(arena, [hero, goblin], 'hero');

      // Mock roll: d20 = 12 (vs Evasion 10 -> Solid Hit), damage = 4 (1d6)
      const dice = new MockDiceRoller({ d20Rolls: [12], damageRolls: [4] });

      const result = executeAbility(
        state,
        'hero',
        STRIKE,
        { targetUnitId: 'goblin' },
        dice
      );

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.hitOutcome).toBe('SOLID_HIT');
        expect(result.details.damageDealt).toBe(4); // 4 damage - 0 armor
      }

      const goblinCu = state.units.get('goblin')!;
      expect(goblinCu.currentHp).toBe(goblin.effectiveVitals.maxHp - 4);

      // Archetype XP awarded
      const heroCu = state.units.get('hero')!;
      expect(heroCu.inBattleXp.fighter).toBe(1);
    });

    it('resolves a CRITICAL_HIT with maximized damage formula', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      const goblin = createRecruit('goblin', 'Goblin');

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('goblin', { q: 1, r: 0 });

      const state = createCombatState(arena, [hero, goblin], 'hero');

      // Natural 20 crit! Strike is 1d6. Maximized = 6 + roll(5) = 11 raw damage
      const dice = new MockDiceRoller({ d20Rolls: [20], damageRolls: [5] });

      const result = executeAbility(
        state,
        'hero',
        STRIKE,
        { targetUnitId: 'goblin' },
        dice
      );

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.hitOutcome).toBe('CRITICAL_HIT');
        expect(result.details.damageDealt).toBe(11);
      }

      const goblinCu = state.units.get('goblin')!;
      expect(goblinCu.currentHp).toBe(goblin.effectiveVitals.maxHp - 11);
    });

    it('resolves a GRAZE dealing 50% damage without secondary effects', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      const goblin = createRecruit('goblin', 'Goblin');

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('goblin', { q: 1, r: 0 });

      const state = createCombatState(arena, [hero, goblin], 'hero');

      // Target Evasion is 10. Roll 7 (missed by 3, within 5 -> GRAZE!)
      // Shield Bash damage is 4. Half damage = 2
      const dice = new MockDiceRoller({ d20Rolls: [7], damageRolls: [4] });

      const result = executeAbility(
        state,
        'hero',
        SHIELD_BASH,
        { targetUnitId: 'goblin' },
        dice
      );

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.hitOutcome).toBe('GRAZE');
        expect(result.details.damageDealt).toBe(2);
      }
      // Secondary knockback does NOT occur on Graze
      expect(arena.getUnitPosition('goblin')).toEqual({ q: 1, r: 0 });
    });

    it('resolves a MISS on roll below graze threshold', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      const goblin = createRecruit('goblin', 'Goblin');

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('goblin', { q: 1, r: 0 });

      const state = createCombatState(arena, [hero, goblin], 'hero');

      // Target Evasion 10. Roll 2 (missed by 8 -> MISS!)
      const dice = new MockDiceRoller({ d20Rolls: [2], damageRolls: [6] });

      const result = executeAbility(
        state,
        'hero',
        STRIKE,
        { targetUnitId: 'goblin' },
        dice
      );

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.hitOutcome).toBe('MISS');
        expect(result.details.damageDealt).toBe(0);
      }

      const goblinCu = state.units.get('goblin')!;
      expect(goblinCu.currentHp).toBe(goblin.effectiveVitals.maxHp);
      // XP still awarded for attempting action
      const heroCu = state.units.get('hero')!;
      expect(heroCu.inBattleXp.fighter).toBe(1);
    });
  });

  describe('Buff / Support Ability Resolution', () => {
    it('executes a buff ability returning BUFF resolution and applying modifier', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      arena.setUnitPosition('hero', { q: 0, r: 0 });

      const state = createCombatState(arena, [hero], 'hero');
      const heroCu = state.units.get('hero')!;

      const result = executeAbility(state, 'hero', MINOR_WARD);

      expect(result.type).toBe('BUFF');
      if (result.type === 'BUFF') {
        expect(result.targetUnitId).toBe('hero');
        expect(result.modifierApplied.stat).toBe('ward');
        expect(result.modifierApplied.value).toBe(2);
      }
      expect(heroCu.activeModifiers).toHaveLength(1);
      expect(heroCu.activeModifiers[0].stat).toBe('ward');
    });

    it('executes an attack with secondary ARMOR_BUFF (Brace) dealing damage and buffing self', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      const goblin = createRecruit('goblin', 'Goblin');
      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('goblin', { q: 1, r: 0 });

      const state = createCombatState(arena, [hero, goblin], 'hero');
      const heroCu = state.units.get('hero')!;
      const goblinCu = state.units.get('goblin')!;

      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [3] });
      const result = executeAbility(state, 'hero', BRACE, { targetUnitId: 'goblin' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.hitOutcome).toBe('SOLID_HIT');
        expect(result.details.damageDealt).toBe(3);
      }
      expect(goblinCu.currentHp).toBe(goblin.effectiveVitals.maxHp - 3);
      expect(heroCu.activeModifiers).toHaveLength(1);
      expect(heroCu.activeModifiers[0].stat).toBe('armor');
      expect(heroCu.activeModifiers[0].value).toBe(2);
    });
  });

  describe('Decoupled Attack Roll and Damage Attributes (Scenario 2)', () => {
    it('uses attackModifierAttribute for attack roll and damageProfile.modifierAttribute for damage', () => {
      const arena = createRadialArena(3);
      // Unit with 5 Finesse and 0 Force
      const agileFighter = createRecruit('agile', 'Agile Fighter');
      (agileFighter as any).baseAttributes = { force: 0, finesse: 5, focus: 0 };

      const target = createRecruit('target', 'Target');
      (target as any).effectiveVitals = { ...target.effectiveVitals, evasion: 12, armor: 0 };

      const state = createCombatState(arena, [agileFighter, target], 'agile');
      const actorCu = state.units.get('agile')!;
      const targetCu = state.units.get('target')!;

      // Strike has attackModifierAttribute: 'finesse', damageProfile.modifierAttribute: 'force'
      expect(STRIKE.attackModifierAttribute).toBe('finesse');
      expect(STRIKE.damageProfile?.modifierAttribute).toBe('force');

      // Verify attack modifier uses Finesse (5)
      expect(getAttackRollModifier(actorCu, STRIKE)).toBe(5);
      // Verify damage modifier uses Force (0)
      expect(getAbilityModifier(actorCu, STRIKE)).toBe(0);

      // d20 = 8 + 5 (Finesse) = 13 vs Evasion 12 -> SOLID_HIT
      const dice = new MockDiceRoller({ d20Rolls: [8], damageRolls: [4] });
      const rollResult = resolveAttackRoll(actorCu, targetCu, STRIKE, dice);
      expect(rollResult.hitOutcome).toBe('SOLID_HIT');
      expect(rollResult.modifier).toBe(5);
      expect(rollResult.totalScore).toBe(13);

      // Damage: 4 (1d6) + 0 (Force) - 0 Armor = 4
      const dmgResult = resolveDamage(rollResult.hitOutcome, STRIKE, actorCu, targetCu, dice);
      expect(dmgResult.damageDealt).toBe(4);
      expect(dmgResult.damageBreakdown).toContain('1d6(4)+0 - 0 Armor -> 4');
    });

    it('verifies high-Force low-Finesse units hit for high damage but receive +0 on to-hit roll', () => {
      const arena = createRadialArena(3);
      // Unit with 0 Finesse and 7 Force
      const brute = createRecruit('brute', 'Brute');
      (brute as any).baseAttributes = { force: 7, finesse: 0, focus: 0 };

      const target = createRecruit('target', 'Target');
      (target as any).effectiveVitals = { ...target.effectiveVitals, evasion: 10, armor: 2 };

      const state = createCombatState(arena, [brute, target], 'brute');
      const actorCu = state.units.get('brute')!;
      const targetCu = state.units.get('target')!;

      // Strike: attack modifier uses Finesse (0), damage modifier uses Force (7)
      expect(getAttackRollModifier(actorCu, STRIKE)).toBe(0);
      expect(getAbilityModifier(actorCu, STRIKE)).toBe(7);

      // d20 = 10 + 0 = 10 vs Evasion 10 -> SOLID_HIT
      const dice = new MockDiceRoller({ d20Rolls: [10], damageRolls: [3] });
      const rollResult = resolveAttackRoll(actorCu, targetCu, STRIKE, dice);
      expect(rollResult.hitOutcome).toBe('SOLID_HIT');
      expect(rollResult.modifier).toBe(0);

      // Damage: 3 (1d6) + 7 (Force) - 2 Armor = 8
      const dmgResult = resolveDamage(rollResult.hitOutcome, STRIKE, actorCu, targetCu, dice);
      expect(dmgResult.damageDealt).toBe(8);
      expect(dmgResult.damageBreakdown).toContain('1d6(3)+7 - 2 Armor -> 8');
    });

    it('verifies Rogue Quick Thrust uses Finesse to hit and Force for physical damage', () => {
      const arena = createRadialArena(3);
      const rogue = createRecruit('rogue', 'Rogue');
      (rogue as any).baseAttributes = { force: 2, finesse: 8, focus: 0 };

      const target = createRecruit('target', 'Target');
      const state = createCombatState(arena, [rogue, target], 'rogue');
      const actorCu = state.units.get('rogue')!;
      const targetCu = state.units.get('target')!;

      expect(QUICK_THRUST.attackModifierAttribute).toBe('finesse');
      expect(QUICK_THRUST.damageProfile?.modifierAttribute).toBe('force');

      expect(getAttackRollModifier(actorCu, QUICK_THRUST)).toBe(8);
      expect(getAbilityModifier(actorCu, QUICK_THRUST)).toBe(2);

      // d20 = 11 + 8 = 19 vs Evasion 10 (targetDefense + 9, but natural 19 is crit boosted) -> CRITICAL_HIT
      const dice = new MockDiceRoller({ d20Rolls: [19], damageRolls: [3] });
      const rollResult = resolveAttackRoll(actorCu, targetCu, QUICK_THRUST, dice);
      expect(rollResult.hitOutcome).toBe('CRITICAL_HIT');

      // Crit: max base (4) + rolled (3) + Force (2) - 0 Armor = 9
      const dmgResult = resolveDamage(rollResult.hitOutcome, QUICK_THRUST, actorCu, targetCu, dice);
      expect(dmgResult.damageDealt).toBe(9);
    });

    it('verifies Mage Spark uses Focus for both attack roll and damage', () => {
      const arena = createRadialArena(3);
      const mage = createRecruit('mage', 'Mage');
      (mage as any).baseAttributes = { force: 0, finesse: 0, focus: 6 };

      const target = createRecruit('target', 'Target');
      const state = createCombatState(arena, [mage, target], 'mage');
      const actorCu = state.units.get('mage')!;
      const targetCu = state.units.get('target')!;

      expect(SPARK.attackModifierAttribute).toBe('focus');
      expect(SPARK.damageProfile?.modifierAttribute).toBe('focus');

      expect(getAttackRollModifier(actorCu, SPARK)).toBe(6);
      expect(getAbilityModifier(actorCu, SPARK)).toBe(6);

      // d20 = 10 + 6 = 16 vs Resolve 10 -> SOLID_HIT
      const dice = new MockDiceRoller({ d20Rolls: [10], damageRolls: [4] });
      const rollResult = resolveAttackRoll(actorCu, targetCu, SPARK, dice);
      expect(rollResult.hitOutcome).toBe('SOLID_HIT');

      // Damage: 4 + 6 - 0 Ward = 10
      const dmgResult = resolveDamage(rollResult.hitOutcome, SPARK, actorCu, targetCu, dice);
      expect(dmgResult.damageDealt).toBe(10);
    });
  });
});
