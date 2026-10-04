import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { HEX_DIRECTIONS } from '../grid/hex';
import { createRecruit } from '../units/unitFactory';
import { createCombatState, executeAbility } from './resolver';
import { resolveAttackRoll, getAttackRollModifier, getAbilityModifier } from './attackRoll';
import { resolveDamage } from './damageEngine';
import { MockDiceRoller } from './dice';
import {
  STRIKE,
  SHIELD_BASH,
  SPARK,
  BRACE,
  MINOR_WARD,
  QUICK_THRUST,
  POWER_STRIKE,
  SNEAK_ATTACK,
  ARCANE_BLAST
} from '../../data/abilities';

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
      expect(STRIKE.effects[0].damageProfile?.modifierAttribute).toBe('force');

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
      expect(QUICK_THRUST.effects[0].damageProfile?.modifierAttribute).toBe('force');

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
      expect(SPARK.effects[0].damageProfile?.modifierAttribute).toBe('focus');

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

  describe('Tier 1 Class Signature Abilities', () => {
    it('executes Warrior Power Strike costing 2 AP and dealing concentrated 2d6 kinetic damage', () => {
      const arena = createRadialArena(3);
      const warrior = createRecruit('warrior', 'Warrior');
      (warrior as any).baseAttributes = { force: 2, finesse: 2, focus: 0 };
      const target = createRecruit('target', 'Armored Target');
      (target as any).effectiveVitals = { ...target.effectiveVitals, armor: 3 };

      arena.setUnitPosition('warrior', { q: 0, r: 0 });
      arena.setUnitPosition('target', { q: 1, r: 0 });

      const state = createCombatState(arena, [warrior, target], 'warrior');
      const warriorCu = state.units.get('warrior')!;
      const targetCu = state.units.get('target')!;

      // 2d6 roll = 8. Force = 2. Total = 10. Armor = 3. Net damage = 7.
      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [8] });
      const result = executeAbility(state, 'warrior', POWER_STRIKE, { targetUnitId: 'target' }, dice);

      expect(warriorCu.currentAp).toBe(1); // 3 AP start - 2 AP cost = 1
      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.hitOutcome).toBe('SOLID_HIT');
        expect(result.details.damageDealt).toBe(7);
      }
      expect(targetCu.currentHp).toBe(target.effectiveVitals.maxHp - 7);
      expect(warriorCu.inBattleXp.fighter).toBe(1);
    });

    it('executes Wizard Arcane Blast dealing primary magic damage and collateral AoE splash', () => {
      const arena = createRadialArena(3);
      const wizard = createRecruit('wizard', 'Wizard');
      const dummyA = createRecruit('dummyA', 'Dummy A');
      const dummyB = createRecruit('dummyB', 'Dummy B (Adjacent)');

      arena.setUnitPosition('wizard', { q: 0, r: 0 });
      arena.setUnitPosition('dummyA', { q: 2, r: 0 }); // Primary target at (2, 0)
      arena.setUnitPosition('dummyB', { q: 2, r: 1 }); // Adjacent neighbor at (2, 1)

      const state = createCombatState(arena, [wizard, dummyA, dummyB], 'wizard');
      const dummyACu = state.units.get('dummyA')!;
      const dummyBCu = state.units.get('dummyB')!;

      // Primary damage roll: 3. Splash damage roll: 2.
      const dice = new MockDiceRoller({ d20Rolls: [14], damageRolls: [3, 2] });
      const result = executeAbility(state, 'wizard', ARCANE_BLAST, { targetUnitId: 'dummyA' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.events).toHaveLength(2); // Primary + Collateral
        const [event1, event2] = result.details.events;
        expect(event1.type).toBe('DAMAGE');
        if (event1.type === 'DAMAGE') {
          expect(event1.targetUnitId).toBe('dummyA');
        }
        expect(event2.type).toBe('DAMAGE');
        if (event2.type === 'DAMAGE') {
          expect(event2.targetUnitId).toBe('dummyB');
          expect(event2.reason).toBe('COLLATERAL');
        }
      }

      expect(dummyACu.currentHp).toBe(dummyA.effectiveVitals.maxHp - 3);
      expect(dummyBCu.currentHp).toBe(dummyB.effectiveVitals.maxHp - 2);
    });

    it('executes Thief Sneak Attack with Advantage and bonus precision dice when target is flanked or struck from rear', () => {
      const arena = createRadialArena(3);

      const thief = createRecruit('thief', 'Thief', { faction: 'PLAYER' });
      (thief as any).baseAttributes = { force: 1, finesse: 3, focus: 0 };
      const flankedTarget = createRecruit('target', 'Flanked Target', { faction: 'ENEMY' });

      arena.setUnitPosition('thief', { q: 0, r: 0 });
      arena.setUnitPosition('target', { q: 0, r: 1 });

      const state = createCombatState(arena, [thief, flankedTarget], 'thief');
      // Target is facing SOUTHEAST (away from thief who is NORTHWEST at (0, 0))
      const targetCu = state.units.get('target')!;
      targetCu.facing = HEX_DIRECTIONS.SOUTHEAST;

      // Sneak Attack rolls with Advantage (rolls 2 d20s: 8 and 16 -> takes 16)
      // Damage: 1d4 (3) + 1d6 (5) + 1 Force = 9
      const dice = new MockDiceRoller({ d20Rolls: [8, 16], damageRolls: [3, 5] });
      const result = executeAbility(state, 'thief', SNEAK_ATTACK, { targetUnitId: 'target' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.d20Roll).toBe(16); // Advantage picked higher roll
        expect(result.details.hitOutcome).toBe('SOLID_HIT'); // 16 + 3 = 19 vs 10 DC (needs >= 20 for crit)
        expect(result.details.damageDealt).toBe(9); // 3 (1d4) + 5 (1d6) + 1 (Force) - 0 (Armor)
        expect(result.details.damageBreakdown).toContain('1d4+1d6');
      }
    });

    it('grants Advantage when attacking from STEALTH and breaks stealth after attack', () => {
      const arena = createRadialArena(3);
      const infiltrator = createRecruit('infiltrator', 'Infiltrator', { faction: 'PLAYER' });
      const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });
      arena.setUnitPosition('infiltrator', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 1, r: 0 });

      const state = createCombatState(arena, [infiltrator, enemy], 'infiltrator');
      const infCu = state.units.get('infiltrator')!;
      infCu.activeConditions.push({
        type: 'STEALTH',
        durationTurns: 1,
        sourceUnitId: 'infiltrator'
      });

      // Mock dice roller provides [4, 17] for d20. Advantage takes 17!
      const dice = new MockDiceRoller({ d20Rolls: [4, 17], damageRolls: [3] });
      const result = executeAbility(state, 'infiltrator', STRIKE, { targetUnitId: 'enemy' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.d20Roll).toBe(17);
      }
      // Stealth is broken
      expect(infCu.activeConditions.some((c) => c.type === 'STEALTH')).toBe(false);
    });

    it('imposes Disadvantage when CHALLENGED and attacking a unit other than the challenger', () => {
      const arena = createRadialArena(3);
      const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });
      const knight = createRecruit('knight', 'Knight', { faction: 'PLAYER' });
      const wizard = createRecruit('wizard', 'Wizard', { faction: 'PLAYER' });

      arena.setUnitPosition('enemy', { q: 0, r: 0 });
      arena.setUnitPosition('knight', { q: 1, r: 0 });
      arena.setUnitPosition('wizard', { q: 0, r: 1 });

      const state = createCombatState(arena, [enemy, knight, wizard], 'enemy');
      const enemyCu = state.units.get('enemy')!;

      // Knight challenged the Enemy
      enemyCu.activeConditions.push({
        type: 'CHALLENGED',
        durationTurns: 2,
        sourceUnitId: 'knight'
      });

      // Enemy attacks Wizard (not the Knight) -> Disadvantage!
      // Mock dice: [19, 5]. Disadvantage takes 5!
      const dice = new MockDiceRoller({ d20Rolls: [19, 5], damageRolls: [2] });
      const result = executeAbility(state, 'enemy', STRIKE, { targetUnitId: 'wizard' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.d20Roll).toBe(5);
      }
    });

    it('rolls normally when CHALLENGED and attacking the challenger', () => {
      const arena = createRadialArena(3);
      const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });
      const knight = createRecruit('knight', 'Knight', { faction: 'PLAYER' });

      arena.setUnitPosition('enemy', { q: 0, r: 0 });
      arena.setUnitPosition('knight', { q: 1, r: 0 });

      const state = createCombatState(arena, [enemy, knight], 'enemy');
      const enemyCu = state.units.get('enemy')!;

      // Knight challenged the Enemy
      enemyCu.activeConditions.push({
        type: 'CHALLENGED',
        durationTurns: 2,
        sourceUnitId: 'knight'
      });

      // Enemy attacks Knight (the challenger) -> Normal roll (single d20: 16)
      const dice = new MockDiceRoller({ d20Rolls: [16], damageRolls: [2] });
      const result = executeAbility(state, 'enemy', STRIKE, { targetUnitId: 'knight' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.d20Roll).toBe(16);
      }
    });
  });
});

