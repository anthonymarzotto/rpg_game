import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { HEX_DIRECTIONS } from '../grid/hex';
import { createRecruit } from '../units/unitFactory';
import { createCombatState, executeAbility, executeMove } from './resolver';
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
import { CombatEvent } from './types';
import { Ability } from '../types/ability';

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
        expect(result.details.damageBreakdown).toBe('1d6 [Crit: 6 max + 5 roll] + 0 - 0 Armor -> 11');
        const attackLog = state.combatLog.find((l) => l.actionId === 'strike');
        expect(attackLog?.metadata?.type).toBe('ATTACK');
        if (attackLog?.metadata?.type === 'ATTACK') {
          expect(attackLog.metadata.d20).toBe('20 + 0');
        }
        expect(attackLog?.message).toContain('[d20: 20 + 0 vs DC 10 -> CRITICAL_HIT]');
      }

      const goblinCu = state.units.get('goblin')!;
      expect(goblinCu.currentHp).toBe(goblin.effectiveVitals.maxHp - 11);
    });

    it('does not trigger a critical hit on high total score if natural roll is below crit threshold', () => {
      const arena = createRadialArena(3);
      const rogue = createRecruit('rogue', 'Lyra');
      (rogue as any).baseAttributes = { force: 2, finesse: 10, focus: 0 };
      const goblin = createRecruit('goblin', 'Goblin');

      arena.setUnitPosition('rogue', { q: 0, r: 0 });
      arena.setUnitPosition('goblin', { q: 1, r: 0 });

      const state = createCombatState(arena, [rogue, goblin], 'rogue');

      // Target Evasion 10. d20 = 15 + 10 = 25 (beats defense by 15).
      // Natural 15 is not a natural 20 -> SOLID_HIT, not CRITICAL_HIT.
      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [4] });

      const result = executeAbility(
        state,
        'rogue',
        STRIKE,
        { targetUnitId: 'goblin' },
        dice
      );

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.hitOutcome).toBe('SOLID_HIT');
      }
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
      expect(warriorCu.inBattleXp.fighter).toBe(2);
      expect(state.partyXpPool.fighter).toBe(2);
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
          expect(event2.reason).toBe('SPLASH');
          expect(event2.label).toBe('BLAST');
        }
      }

      expect(dummyACu.currentHp).toBe(dummyA.effectiveVitals.maxHp - 3);
      expect(dummyBCu.currentHp).toBe(dummyB.effectiveVitals.maxHp - 2);

      // Verify combat log records secondary splash damage in secondaryDetail
      expect((state.combatLog[0].metadata as any)?.secondaryDetail).toContain(
        'Blast hit Dummy B (Adjacent) for 2 magical damage [vs DC 10] (HP: 10/12)'
      );
      expect(state.combatLog[0].message).toContain(
        'Blast hit Dummy B (Adjacent) for 2 magical damage [vs DC 10] (HP: 10/12)'
      );
    });

    it('executes ground-targeted Arcane Blast on an empty hex hitting multiple adjacent units with splash', () => {
      const arena = createRadialArena(3);
      const wizard = createRecruit('wizard', 'Wizard', { faction: 'PLAYER' });
      const enemyA = createRecruit('enemyA', 'Enemy A', { faction: 'ENEMY' });
      const enemyB = createRecruit('enemyB', 'Enemy B', { faction: 'ENEMY' });

      arena.setUnitPosition('wizard', { q: 0, r: 0 });
      // Empty hex target at (2, 0)
      arena.setUnitPosition('enemyA', { q: 2, r: -1 }); // distance 1 from (2, 0)
      arena.setUnitPosition('enemyB', { q: 2, r: 1 });  // distance 1 from (2, 0)

      const state = createCombatState(arena, [wizard, enemyA, enemyB], 'wizard');

      // 1 d20 roll for ground spellcast (14), then 2 splash damage rolls (2 for enemyA, 3 for enemyB)
      const dice = new MockDiceRoller({ d20Rolls: [14], damageRolls: [2, 3] });
      const result = executeAbility(state, 'wizard', ARCANE_BLAST, { coord: { q: 2, r: 0 } }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        const damageEvents = result.details.events.filter(
          (e): e is Extract<CombatEvent, { type: 'DAMAGE' }> => e.type === 'DAMAGE'
        );
        expect(damageEvents).toHaveLength(2);
        expect(damageEvents.every((e) => e.reason === 'SPLASH')).toBe(true);
        expect(damageEvents.map((e) => e.targetUnitId).sort()).toEqual(['enemyA', 'enemyB']);
      }

      const enemyACu = state.units.get('enemyA')!;
      const enemyBCu = state.units.get('enemyB')!;
      expect(enemyACu.currentHp).toBe(enemyA.effectiveVitals.maxHp - 2);
      expect(enemyBCu.currentHp).toBe(enemyB.effectiveVitals.maxHp - 3);

      const logEntry = state.combatLog[state.combatLog.length - 1];
      expect(logEntry.message).toContain('Wizard cast Arcane Blast at hex (2, 0)');
      expect(logEntry.message).not.toContain('0 (Ground)');
      expect(logEntry.metadata.type).toBe('ATTACK');
      if (logEntry.metadata.type === 'ATTACK') {
        expect(logEntry.metadata.d20).toBeDefined();
        expect(logEntry.metadata.totalScore).toBeDefined();
        expect(logEntry.metadata.isAreaTarget).toBe(true);
        expect(logEntry.metadata.defenseTarget).toBeUndefined();
        expect(logEntry.metadata.damageBreakdown).toBeUndefined();
      }
    });

    it('resolves a splash miss when secondary target Resolve exceeds spellcast attack roll', () => {
      const arena = createRadialArena(3);
      const wizard = createRecruit('wizard', 'Wizard', { faction: 'PLAYER' });
      const dummyA = createRecruit('dummyA', 'Center Dummy', { faction: 'ENEMY' });
      const highResolveDummy = createRecruit('dummyHigh', 'High Resolve Dummy', { faction: 'ENEMY' });
      (highResolveDummy.effectiveVitals as { resolve: number }).resolve = 18;

      arena.setUnitPosition('wizard', { q: 0, r: 0 });
      arena.setUnitPosition('dummyA', { q: 2, r: 0 });
      arena.setUnitPosition('dummyHigh', { q: 2, r: 1 });

      const state = createCombatState(arena, [wizard, dummyA, highResolveDummy], 'wizard');

      // d20 = 5 (+3 focus = 8 total vs DC 10 graze window [5..9], hits dummyA for graze, but misses dummyHigh DC 18 [graze window is 13..17])
      const dice = new MockDiceRoller({ d20Rolls: [5], damageRolls: [4] });
      const result = executeAbility(state, 'wizard', ARCANE_BLAST, { targetUnitId: 'dummyA' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        const splashEvents = result.details.events.filter(
          (e): e is Extract<CombatEvent, { type: 'DAMAGE' }> => e.type === 'DAMAGE' && e.targetUnitId === 'dummyHigh'
        );
        // High resolve dummy took no damage
        expect(splashEvents).toHaveLength(0);
      }

      const highCu = state.units.get('dummyHigh')!;
      expect(highCu.currentHp).toBe(highResolveDummy.effectiveVitals.maxHp);
      expect(state.combatLog[0].message).toContain('High Resolve Dummy resisted [Miss vs DC 18]');
    });

    it('enforces friendly fire on an ally caught in the blast radius of Arcane Blast', () => {
      const arena = createRadialArena(3);
      const wizard = createRecruit('wizard', 'Wizard', { faction: 'PLAYER' });
      const enemy = createRecruit('enemy', 'Enemy Target', { faction: 'ENEMY' });
      const ally = createRecruit('ally', 'Allied Warrior', { faction: 'PLAYER' });

      arena.setUnitPosition('wizard', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 2, r: 0 });
      arena.setUnitPosition('ally', { q: 2, r: 1 }); // Caught in splash

      const state = createCombatState(arena, [wizard, enemy, ally], 'wizard');

      // d20 = 14 (+3 focus = 17 vs DC 10 solid hit), damage rolls: 4 for direct, 3 for splash
      const dice = new MockDiceRoller({ d20Rolls: [14], damageRolls: [4, 3] });
      const result = executeAbility(state, 'wizard', ARCANE_BLAST, { targetUnitId: 'enemy' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        const allyDamage = result.details.events.find(
          (e): e is Extract<CombatEvent, { type: 'DAMAGE' }> => e.type === 'DAMAGE' && e.targetUnitId === 'ally'
        );
        expect(allyDamage).toBeDefined();
        expect(allyDamage?.reason).toBe('SPLASH');
        expect(allyDamage?.amount).toBe(3);
      }

      const allyCu = state.units.get('ally')!;
      expect(allyCu.currentHp).toBe(ally.effectiveVitals.maxHp - 3);
    });

    it('defaults splash damage events to SPLASH reason and label when splashLabel is not set', () => {
      const arena = createRadialArena(3);
      const wizard = createRecruit('wizard', 'Wizard');
      const dummyA = createRecruit('dummyA', 'Dummy A');
      const dummyB = createRecruit('dummyB', 'Dummy B (Adjacent)');

      arena.setUnitPosition('wizard', { q: 0, r: 0 });
      arena.setUnitPosition('dummyA', { q: 2, r: 0 });
      arena.setUnitPosition('dummyB', { q: 2, r: 1 });

      const state = createCombatState(arena, [wizard, dummyA, dummyB], 'wizard');

      const genericSplashAbility: Ability = {
        ...ARCANE_BLAST,
        id: 'generic_spell',
        name: 'Generic Spell',
        splashLabel: undefined
      };

      const dice = new MockDiceRoller({ d20Rolls: [14], damageRolls: [3, 2] });
      const result = executeAbility(state, 'wizard', genericSplashAbility, { targetUnitId: 'dummyA' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        const splashEvent = result.details.events.find(
          (e): e is Extract<CombatEvent, { type: 'DAMAGE' }> =>
            e.type === 'DAMAGE' && e.targetUnitId === 'dummyB'
        );
        expect(splashEvent?.reason).toBe('SPLASH');
        expect(splashEvent?.label).toBe('SPLASH');
      }

      expect((state.combatLog[0].metadata as any)?.secondaryDetail).toContain(
        'Splash hit Dummy B (Adjacent) for 2 magical damage'
      );
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

      // Sneak Attack rolls standard d20 without Advantage (no free Advantage from flank alone)
      // Damage: 1d4 (3) + 1d6 (5) + 1 Force = 9
      const dice = new MockDiceRoller({ d20Rolls: [16], damageRolls: [3, 5] });
      const result = executeAbility(state, 'thief', SNEAK_ATTACK, { targetUnitId: 'target' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.d20Roll).toBe(16);
        expect(result.details.hitOutcome).toBe('SOLID_HIT');
        expect(result.details.damageDealt).toBe(9); // 3 (1d4) + 5 (1d6) + 1 (Force) - 0 (Armor)
        expect(result.details.damageBreakdown).toContain('1d4+1d6');
      }
    });

    it('grants Advantage on Sneak Attack when attacking from STEALTH', () => {
      const arena = createRadialArena(3);
      const thief = createRecruit('thief', 'Thief', { faction: 'PLAYER' });
      const flankedTarget = createRecruit('target', 'Target', { faction: 'ENEMY' });

      arena.setUnitPosition('thief', { q: 0, r: 0 });
      arena.setUnitPosition('target', { q: 0, r: 1 });

      const state = createCombatState(arena, [thief, flankedTarget], 'thief');
      const targetCu = state.units.get('target')!;
      targetCu.facing = HEX_DIRECTIONS.SOUTHEAST;

      // Give thief STEALTH condition
      const thiefCu = state.units.get('thief')!;
      thiefCu.activeConditions.push({
        type: 'STEALTH',
        durationTurns: 1,
        sourceUnitId: 'thief'
      });

      // Sneak Attack from stealth rolls with Advantage (rolls 8 and 16 -> takes 16)
      const dice = new MockDiceRoller({ d20Rolls: [8, 16], damageRolls: [3, 5] });
      const result = executeAbility(state, 'thief', SNEAK_ATTACK, { targetUnitId: 'target' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.d20Roll).toBe(16); // Advantage picked higher roll
        expect(result.details.damageDealt).toBe(8); // 3 (1d4) + 5 (1d6) + 0 Force
      }
      expect(thiefCu.activeConditions.some((c) => c.type === 'STEALTH')).toBe(false);
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

    it('breaks STEALTH on a unit when it suffers direct damage or AoE splash', () => {
      const arena = createRadialArena(3);
      const attacker = createRecruit('attacker', 'Wizard', { faction: 'PLAYER' });
      const primaryTarget = createRecruit('primary', 'Goblin', { faction: 'ENEMY' });
      const stealthedNeighbor = createRecruit('stealthed', 'Infiltrator', { faction: 'ENEMY' });

      arena.setUnitPosition('attacker', { q: 0, r: 0 });
      arena.setUnitPosition('primary', { q: 2, r: 0 });
      arena.setUnitPosition('stealthed', { q: 2, r: 1 }); // Adjacent to primary target

      const state = createCombatState(arena, [attacker, primaryTarget, stealthedNeighbor], 'attacker');
      const stealthCu = state.units.get('stealthed')!;
      stealthCu.activeConditions.push({
        type: 'STEALTH',
        durationTurns: 2,
        sourceUnitId: 'stealthed'
      });

      // Wizard casts Arcane Blast (aoeRadius = 1) at primary target
      const arcaneBlast: Ability = {
        id: 'arcane_blast',
        name: 'Arcane Blast',
        description: 'Blast',
        archetypeTag: 'MAGE',
        targetType: 'SINGLE_TARGET',
        defenseTarget: 'RESOLVE',
        range: 3,
        apCost: 1,
        aoeRadius: 1,
        damageType: 'MAGICAL',
        effects: [
          {
            type: 'DAMAGE',
            damageProfile: { count: 1, sides: 6, modifierAttribute: 'focus' }
          }
        ]
      };

      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [4, 3] });
      executeAbility(state, 'attacker', arcaneBlast, { targetUnitId: 'primary' }, dice);

      // Stealthed neighbor took collateral splash damage and STEALTH is broken!
      expect(stealthCu.activeConditions.some((c) => c.type === 'STEALTH')).toBe(false);
      expect(state.combatLog.some((l) => l.message.includes("Infiltrator's STEALTH was broken by taking damage"))).toBe(true);
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
      // Attacker defied the challenge by attacking the wizard, receiving EXPOSED
      expect(enemyCu.activeConditions.some((c) => c.type === 'EXPOSED')).toBe(true);

      // Verify attack log entry precedes the condition defiance entry in combatLog
      const strikeLogIdx = state.combatLog.findIndex((l) => l.actionId === 'strike');
      const defianceLogIdx = state.combatLog.findIndex((l) => l.actionId === 'condition_applied');
      expect(strikeLogIdx).toBeGreaterThanOrEqual(0);
      expect(defianceLogIdx).toBeGreaterThan(strikeLogIdx);
      expect(state.combatLog[defianceLogIdx].message).toContain('defied the challenge and became EXPOSED');
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
      // Attacking the challenger does NOT inflict EXPOSED
      expect(enemyCu.activeConditions.some((c) => c.type === 'EXPOSED')).toBe(false);
    });

    it('grants Advantage against an EXPOSED target and consumes EXPOSED upon attack', () => {
      const arena = createRadialArena(3);
      const knight = createRecruit('knight', 'Knight', { faction: 'PLAYER' });
      const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });

      arena.setUnitPosition('knight', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 1, r: 0 });

      const state = createCombatState(arena, [knight, enemy], 'knight');
      const enemyCu = state.units.get('enemy')!;

      // Target has EXPOSED condition
      enemyCu.activeConditions.push({
        type: 'EXPOSED',
        durationTurns: 1,
        sourceUnitId: 'knight'
      });

      // Knight attacks Enemy -> Advantage!
      // Mock dice: [6, 17]. Advantage takes 17!
      const dice = new MockDiceRoller({ d20Rolls: [6, 17], damageRolls: [3] });
      const result = executeAbility(state, 'knight', STRIKE, { targetUnitId: 'enemy' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.d20Roll).toBe(17);
      }

      // EXPOSED condition was consumed upon being attacked
      expect(enemyCu.activeConditions.some((c) => c.type === 'EXPOSED')).toBe(false);
    });

    it('deals bonus damage against a target with CHALLENGED condition', () => {
      const arena = createRadialArena(3);
      const knight = createRecruit('knight', 'Knight', { faction: 'PLAYER' });
      (knight as any).baseAttributes = { force: 2, finesse: 2, focus: 0 };
      const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });
      (enemy as any).effectiveVitals = {
        ...enemy.effectiveVitals,
        evasion: 10,
        armor: 0
      };

      arena.setUnitPosition('knight', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 1, r: 0 });

      const state = createCombatState(arena, [knight, enemy], 'knight');
      const enemyCu = state.units.get('enemy')!;
      enemyCu.activeConditions.push({
        type: 'CHALLENGED',
        durationTurns: 2,
        sourceUnitId: 'knight'
      });

      const abilityWithChallengeBonus: Ability = {
        id: 'test_pommel_strike',
        name: 'Pommel Strike',
        description: 'Test pommel strike',
        apCost: 1,
        range: 1,
        targetType: 'SINGLE_TARGET',
        defenseTarget: 'EVASION',
        attackModifierAttribute: 'finesse',
        damageType: 'PHYSICAL',
        effects: [
          {
            type: 'DAMAGE',
            damageProfile: { count: 1, sides: 6, modifierAttribute: 'force' }
          },
          {
            type: 'DAMAGE',
            condition: 'TARGET_CHALLENGED',
            bonusDamage: { count: 1, sides: 4 }
          }
        ]
      };

      // Mock dice roller: d20 = 15 (solid hit), base damage 1d6 = 4, bonus damage 1d4 = 3
      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [4, 3] });
      const result = executeAbility(state, 'knight', abilityWithChallengeBonus, { targetUnitId: 'enemy' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.hitOutcome).toBe('SOLID_HIT');
        // 4 (1d6) + 3 (1d4) + 2 (force) - 0 (armor) = 9
        expect(result.details.damageDealt).toBe(9);
        expect(result.details.damageBreakdown).toContain('1d6+1d4');
      }
    });
  });

  describe('Vertical Elevation Attack Modifiers', () => {
    it('grants +2 attack roll bonus when attacking downward across 1 elevation level (dh = 1)', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      const goblin = createRecruit('goblin', 'Goblin');

      arena.setTile({ coord: { q: 0, r: 0 }, elevation: 1, isWalkable: true });
      arena.setTile({ coord: { q: 1, r: 0 }, elevation: 0, isWalkable: true });
      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('goblin', { q: 1, r: 0 });

      const state = createCombatState(arena, [hero, goblin], 'hero');
      // d20 = 10, Finesse = 0. With +2 high ground: total score = 12 vs 10 Evasion -> SOLID_HIT
      const dice = new MockDiceRoller({ d20Rolls: [10], damageRolls: [4] });
      const result = executeAbility(state, 'hero', STRIKE, { targetUnitId: 'goblin' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.modifier).toBe(2);
        expect(result.details.totalAttackScore).toBe(12);
        expect(result.details.hitOutcome).toBe('SOLID_HIT');
        expect(state.combatLog[0].message).toContain('[Elevation: High Ground (+2)]');
      }
    });

    it('grants Advantage on attack roll when attacking downward across 2+ elevation levels (dh >= 2)', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      const goblin = createRecruit('goblin', 'Goblin');

      // Range 2 dart from plateau (h=2) down to valley (h=0)
      const DART = { ...STRIKE, id: 'dart', range: 2 };
      arena.setTile({ coord: { q: 0, r: 0 }, elevation: 2, isWalkable: true });
      arena.setTile({ coord: { q: 2, r: 0 }, elevation: 0, isWalkable: true });
      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('goblin', { q: 2, r: 0 });

      const state = createCombatState(arena, [hero, goblin], 'hero');
      // Rolls [6, 17] with Advantage -> takes 17!
      const dice = new MockDiceRoller({ d20Rolls: [6, 17], damageRolls: [4] });
      const result = executeAbility(state, 'hero', DART, { targetUnitId: 'goblin' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.d20Roll).toBe(17);
        expect(state.combatLog[0].message).toContain('[Elevation: High Ground (Advantage)]');
      }
    });

    it('inflicts -2 attack roll penalty when attacking upward across 1 elevation level (dh = -1)', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      const goblin = createRecruit('goblin', 'Goblin');

      arena.setTile({ coord: { q: 0, r: 0 }, elevation: 0, isWalkable: true });
      arena.setTile({ coord: { q: 1, r: 0 }, elevation: 1, isWalkable: true });
      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('goblin', { q: 1, r: 0 });

      const state = createCombatState(arena, [hero, goblin], 'hero');
      // d20 = 11, base modifier = 0. With -2 low ground penalty: total score = 9 vs 10 Evasion -> GRAZE
      const dice = new MockDiceRoller({ d20Rolls: [11], damageRolls: [4] });
      const result = executeAbility(state, 'hero', STRIKE, { targetUnitId: 'goblin' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.modifier).toBe(-2);
        expect(result.details.totalAttackScore).toBe(9);
        expect(result.details.hitOutcome).toBe('GRAZE');
        expect(state.combatLog[0].message).toContain('[Elevation: Low Ground (-2)]');
      }
    });

    it('inflicts Disadvantage when attacking upward across 2+ elevation levels (dh <= -2)', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      const sniper = createRecruit('sniper', 'Sniper');

      const DART = { ...STRIKE, id: 'dart', range: 2 };
      arena.setTile({ coord: { q: 0, r: 0 }, elevation: 0, isWalkable: true });
      arena.setTile({ coord: { q: 2, r: 0 }, elevation: 2, isWalkable: true });
      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('sniper', { q: 2, r: 0 });

      const state = createCombatState(arena, [hero, sniper], 'hero');
      // Disadvantage takes lowest of [18, 5] -> 5
      const dice = new MockDiceRoller({ d20Rolls: [18, 5], damageRolls: [4] });
      const result = executeAbility(state, 'hero', DART, { targetUnitId: 'sniper' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.d20Roll).toBe(5);
        expect(state.combatLog[0].message).toContain('[Elevation: Low Ground (Disadvantage)]');
      }
    });

    it('cancels High Ground Advantage with Challenged Disadvantage to a normal roll', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      const knight = createRecruit('knight', 'Knight', { faction: 'ENEMY' });
      const goblin = createRecruit('goblin', 'Goblin', { faction: 'ENEMY' });

      const DART = { ...STRIKE, id: 'dart', range: 2 };
      arena.setTile({ coord: { q: 0, r: 0 }, elevation: 2, isWalkable: true });
      arena.setTile({ coord: { q: 2, r: 0 }, elevation: 0, isWalkable: true });
      arena.setTile({ coord: { q: 1, r: 1 }, elevation: 2, isWalkable: true });

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('goblin', { q: 2, r: 0 });
      arena.setUnitPosition('knight', { q: 1, r: 1 });

      const state = createCombatState(arena, [hero, knight, goblin], 'hero');
      const heroCu = state.units.get('hero')!;
      // Challenged by Knight, but attacking Goblin
      heroCu.activeConditions.push({ type: 'CHALLENGED', durationTurns: 2, sourceUnitId: 'knight' });

      // High Ground (dh=2) grants Advantage, Challenged imposes Disadvantage -> Cancels to Normal! Single d20 roll: 14
      const dice = new MockDiceRoller({ d20Rolls: [14], damageRolls: [4] });
      const result = executeAbility(state, 'hero', DART, { targetUnitId: 'goblin' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.d20Roll).toBe(14);
      }
    });

    it('suppresses upward attack penalty when attacker has ignoresElevationPenalty trait', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      const goblin = createRecruit('goblin', 'Goblin');

      arena.setTile({ coord: { q: 0, r: 0 }, elevation: 0, isWalkable: true });
      arena.setTile({ coord: { q: 1, r: 0 }, elevation: 1, isWalkable: true });
      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('goblin', { q: 1, r: 0 });

      const state = createCombatState(arena, [hero, goblin], 'hero');
      const heroCu = state.units.get('hero')!;
      (heroCu as any).passives = [
        {
          id: 'eagle_eye',
          name: 'Eagle Eye',
          description: 'Ignores elevation attack penalty',
          hook: 'ALWAYS',
          ignoresElevationPenalty: true
        }
      ];

      // d20 = 10. Without penalty: total score = 10 vs 10 Evasion -> SOLID_HIT (not Graze)
      const dice = new MockDiceRoller({ d20Rolls: [10], damageRolls: [4] });
      const result = executeAbility(state, 'hero', STRIKE, { targetUnitId: 'goblin' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.modifier).toBe(0);
        expect(result.details.totalAttackScore).toBe(10);
        expect(result.details.hitOutcome).toBe('SOLID_HIT');
        expect(state.combatLog[0].message).toContain('[Elevation: Low Ground Penalty Negated]');
      }
    });

    it('records target in message and metadata for targeted support abilities, but omits target for self-buffs', () => {
      const arena = createRadialArena(3);
      const mage = createRecruit('mage', 'Vael');
      const ally = createRecruit('ally', 'Alden');

      arena.setUnitPosition('mage', { q: 0, r: 0 });
      arena.setUnitPosition('ally', { q: 1, r: 0 });

      const state = createCombatState(arena, [mage, ally], 'mage');
      const dice = new MockDiceRoller();

      // Targeted ally buff: Minor Ward on Alden
      executeAbility(state, 'mage', MINOR_WARD, { targetUnitId: 'ally' }, dice);

      expect(state.combatLog.length).toBe(1);
      const targetedLog = state.combatLog[0];
      expect(targetedLog.message).toContain('Vael used Minor Ward on Alden.');
      expect(targetedLog.metadata.type).toBe('BUFF');
      if (targetedLog.metadata.type === 'BUFF') {
        expect(targetedLog.metadata.actor).toBe('Vael');
        expect(targetedLog.metadata.ability).toBe('Minor Ward');
        expect(targetedLog.metadata.target).toBe('Alden');
      }

      // Self buff: Minor Ward on self
      executeAbility(state, 'mage', MINOR_WARD, { targetUnitId: 'mage' }, dice);

      expect(state.combatLog.length).toBe(2);
      const selfLog = state.combatLog[1];
      expect(selfLog.message).toContain('Vael used Minor Ward.');
      expect(selfLog.message).not.toContain('on Vael');
      expect(selfLog.metadata.type).toBe('BUFF');
      if (selfLog.metadata.type === 'BUFF') {
        expect(selfLog.metadata.actor).toBe('Vael');
        expect(selfLog.metadata.ability).toBe('Minor Ward');
        expect(selfLog.metadata.target).toBeUndefined();
      }
    });
  });

  describe('Party XP Pool & AP Scaling', () => {
    const oneApFighter: Ability = {
      id: 'test_1ap_fighter',
      name: 'Test 1AP Fighter',
      description: 'Test',
      apCost: 1,
      range: 1,
      targetType: 'SINGLE_TARGET',
      defenseTarget: 'EVASION',
      damageType: 'PHYSICAL',
      effects: [
        {
          type: 'DAMAGE',
          damageProfile: { count: 1, sides: 4, modifierAttribute: 'force' }
        }
      ],
      archetypeTag: 'FIGHTER'
    };

    const twoApRogue: Ability = {
      id: 'test_2ap_rogue',
      name: 'Test 2AP Rogue',
      description: 'Test',
      apCost: 2,
      range: 1,
      targetType: 'SINGLE_TARGET',
      defenseTarget: 'EVASION',
      damageType: 'PHYSICAL',
      effects: [
        {
          type: 'DAMAGE',
          damageProfile: { count: 1, sides: 6, modifierAttribute: 'finesse' }
        }
      ],
      archetypeTag: 'ROGUE'
    };

    const threeApMage: Ability = {
      id: 'test_3ap_mage',
      name: 'Test 3AP Mage',
      description: 'Test',
      apCost: 3,
      range: 1,
      targetType: 'SINGLE_TARGET',
      defenseTarget: 'RESOLVE',
      damageType: 'MAGICAL',
      effects: [
        {
          type: 'DAMAGE',
          damageProfile: { count: 2, sides: 6, modifierAttribute: 'focus' }
        }
      ],
      archetypeTag: 'MAGE'
    };

    it('awards 1 XP for 1 AP, 2 XP for 2 AP, and 3 XP for 3 AP abilities into state.partyXpPool', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      const goblin = createRecruit('goblin', 'Goblin', { faction: 'ENEMY' });

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('goblin', { q: 1, r: 0 });

      const state = createCombatState(arena, [hero, goblin], 'hero');
      const dice = new MockDiceRoller({ d20Rolls: [15, 15, 15], damageRolls: [2, 3, 5] });

      expect(state.partyXpPool).toEqual({ fighter: 0, rogue: 0, mage: 0 });

      // Execute 1 AP Fighter ability -> +1 Fighter XP
      executeAbility(state, 'hero', oneApFighter, { targetUnitId: 'goblin' }, dice);
      expect(state.partyXpPool.fighter).toBe(1);

      // Execute 2 AP Rogue ability -> +2 Rogue XP
      state.units.get('hero')!.currentAp = 5;
      executeAbility(state, 'hero', twoApRogue, { targetUnitId: 'goblin' }, dice);
      expect(state.partyXpPool.rogue).toBe(2);

      // Execute 3 AP Mage ability -> +3 Mage XP
      state.units.get('hero')!.currentAp = 5;
      executeAbility(state, 'hero', threeApMage, { targetUnitId: 'goblin' }, dice);
      expect(state.partyXpPool.mage).toBe(3);

      expect(state.partyXpPool).toEqual({ fighter: 1, rogue: 2, mage: 3 });
    });

    it('awards 0 XP for move actions', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      arena.setUnitPosition('hero', { q: 0, r: 0 });

      const state = createCombatState(arena, [hero], 'hero');
      expect(state.partyXpPool).toEqual({ fighter: 0, rogue: 0, mage: 0 });

      executeMove(state, 'hero', { q: 1, r: 0 });
      expect(state.partyXpPool).toEqual({ fighter: 0, rogue: 0, mage: 0 });
    });

    it('awards 0 party XP when enemy units execute abilities', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      const goblin = createRecruit('goblin', 'Goblin', { faction: 'ENEMY' });

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('goblin', { q: 1, r: 0 });

      const state = createCombatState(arena, [hero, goblin], 'goblin');
      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [2] });

      expect(state.partyXpPool).toEqual({ fighter: 0, rogue: 0, mage: 0 });

      executeAbility(state, 'goblin', twoApRogue, { targetUnitId: 'hero' }, dice);
      expect(state.partyXpPool).toEqual({ fighter: 0, rogue: 0, mage: 0 });
    });
  });

  describe('Movement Step Front-Arc Stealth Detection & Interruption', () => {
    it('halts movement when an opposing stealthed unit enters front arc, unmasks enemy without rotating them, and allows follow-up attack', () => {
      const arena = createRadialArena(4);
      const hero = createRecruit('hero', 'Alden', { faction: 'PLAYER' });
      const infiltrator = createRecruit('infiltrator', 'Infiltrator', { faction: 'ENEMY' });

      arena.setUnitPosition('hero', { q: -2, r: 0 });
      arena.setUnitPosition('infiltrator', { q: 0, r: 0 });

      const state = createCombatState(arena, [hero, infiltrator], 'hero');
      const heroCu = state.units.get('hero')!;
      const infCu = state.units.get('infiltrator')!;

      // Infiltrator is stealthed and facing Northwest (2)
      infCu.facing = 2;
      infCu.activeConditions.push({
        type: 'STEALTH',
        durationTurns: 2,
        sourceUnitId: 'infiltrator'
      });

      expect(heroCu.currentAp).toBe(3);
      expect(infCu.activeConditions.some((c) => c.type === 'STEALTH')).toBe(true);

      // Hero moves East towards (0, -1) via intermediate step (-1, 0).
      // At (-1, 0), hero faces East (0). Infiltrator at (0, 0) is distance 1 in hero's direct FRONT arc.
      executeMove(state, 'hero', { q: 0, r: -1 });

      // Movement must halt at (-1, 0)
      expect(arena.getUnitPosition('hero')).toEqual({ q: -1, r: 0 });
      expect(heroCu.facing).toBe(0); // Facing East towards the spotted enemy
      expect(heroCu.currentAp).toBe(2); // 1 AP consumed for move
      expect(heroCu.hexesMovedThisTurn).toBe(1);

      // Infiltrator STEALTH removed, but facing strictly preserved (no auto-turn)
      expect(infCu.activeConditions.some((c) => c.type === 'STEALTH')).toBe(false);
      expect(infCu.facing).toBe(2);

      // Combat log records detection and interrupted move
      expect(
        state.combatLog.some((l) =>
          l.message.includes('Alden spotted Infiltrator in their direct field of view! Stealth broken!')
        )
      ).toBe(true);
      expect(state.combatLog.some((l) => l.actionId === 'move_interrupted')).toBe(true);

      // Follow-up action: Hero immediately attacks unmasked enemy with remaining 2 AP
      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [5] });
      const attackRes = executeAbility(state, 'hero', STRIKE, { targetUnitId: 'infiltrator' }, dice);

      expect(heroCu.currentAp).toBe(1);
      expect(attackRes.type).toBe('ATTACK');
      if (attackRes.type === 'ATTACK') {
        expect(attackRes.details.hitOutcome).toBe('SOLID_HIT');
      }
      expect(infCu.currentHp).toBeLessThan(infCu.unit.effectiveVitals.maxHp);
    });

    it('does not interrupt movement and preserves STEALTH when enemy is in flank arc', () => {
      const arena = createRadialArena(4);
      const hero = createRecruit('hero', 'Alden', { faction: 'PLAYER' });
      const infiltrator = createRecruit('infiltrator', 'Infiltrator', { faction: 'ENEMY' });

      // Hero starts at (0, -1) and moves East to (1, -1).
      // Step direction is East (0).
      // From (1, -1), infiltrator at (0, 0) is at direction Southwest (4), which is in the FLANK arc.
      arena.setUnitPosition('hero', { q: 0, r: -1 });
      arena.setUnitPosition('infiltrator', { q: 0, r: 0 });

      const state = createCombatState(arena, [hero, infiltrator], 'hero');
      const infCu = state.units.get('infiltrator')!;
      infCu.activeConditions.push({
        type: 'STEALTH',
        durationTurns: 2,
        sourceUnitId: 'infiltrator'
      });

      executeMove(state, 'hero', { q: 1, r: -1 });

      // Hero completed full movement to destination
      expect(arena.getUnitPosition('hero')).toEqual({ q: 1, r: -1 });
      // Enemy at (0, 0) was in FLANK arc relative to hero's East facing (0) -> remains stealthed
      expect(infCu.activeConditions.some((c) => c.type === 'STEALTH')).toBe(true);
    });

    it('does not halt movement or unmask allied stealthed units', () => {
      const arena = createRadialArena(4);
      const hero = createRecruit('hero', 'Alden', { faction: 'PLAYER' });
      const alliedRogue = createRecruit('ally', 'Shadow', { faction: 'PLAYER' });

      arena.setUnitPosition('hero', { q: -2, r: 0 });
      arena.setUnitPosition('ally', { q: -1, r: -1 });

      const state = createCombatState(arena, [hero, alliedRogue], 'hero');
      const allyCu = state.units.get('ally')!;
      allyCu.activeConditions.push({
        type: 'STEALTH',
        durationTurns: 2,
        sourceUnitId: 'ally'
      });

      // Hero moves to (-1, 0)
      executeMove(state, 'hero', { q: -1, r: 0 });

      expect(arena.getUnitPosition('hero')).toEqual({ q: -1, r: 0 });
      // Ally remains stealthed
      expect(allyCu.activeConditions.some((c) => c.type === 'STEALTH')).toBe(true);
    });
  });
});

