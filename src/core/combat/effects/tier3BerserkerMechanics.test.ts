import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../../grid/templates';
import { createRecruit } from '../../units/unitFactory';
import { createCombatState, executeAbility } from '../resolver';
import { canExecuteAbility } from '../validator';
import { MockDiceRoller } from '../dice';
import { Ability } from '../../types/ability';
import { PassiveTrait } from '../../types/passive';
import { resolveAttackRoll } from '../attackRoll';
import { resolveDamage } from '../damageEngine';
import { getEffectiveAbility } from '../modifiers';

describe('Tier 3 Berserker Core Mechanics', () => {
  describe('Ability Self-Sacrifice HP Cost & Validation', () => {
    const SACRIFICE_STRIKE: Ability = {
      id: 'sacrifice_strike',
      name: 'Sacrifice Strike',
      description: 'Sacrifices 3 HP to empower a strike',
      apCost: 1,
      hpCost: 3,
      range: 0,
      targetType: 'SELF',
      defenseTarget: 'NONE',
      damageType: 'NONE',
      effects: []
    };

    it('executes lethal self-sacrifice and marks unit defeated when current HP <= hpCost', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      (hero as any).effectiveVitals.maxHp = 20;

      const state = createCombatState(arena, [hero]);
      state.arena.setUnitPosition('hero', { q: 0, r: 0 });
      state.activeUnitId = 'hero';

      const heroCu = state.units.get('hero')!;
      heroCu.currentHp = 3; // Exactly hpCost

      const check = canExecuteAbility(state, 'hero', SACRIFICE_STRIKE);
      expect(check.valid).toBe(true);

      executeAbility(state, 'hero', SACRIFICE_STRIKE);
      expect(heroCu.currentHp).toBe(0);
      expect(heroCu.isDefeated).toBe(true);
      expect(state.arena.getUnitPosition('hero')).toBeUndefined();
    });

    it('allows execution and deducts hpCost when current HP > hpCost', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      (hero as any).effectiveVitals.maxHp = 20;

      const state = createCombatState(arena, [hero]);
      state.arena.setUnitPosition('hero', { q: 0, r: 0 });
      state.activeUnitId = 'hero';

      const heroCu = state.units.get('hero')!;
      heroCu.currentHp = 10;
      heroCu.currentAp = 3;

      const check = canExecuteAbility(state, 'hero', SACRIFICE_STRIKE);
      expect(check.valid).toBe(true);

      executeAbility(state, 'hero', SACRIFICE_STRIKE);
      expect(heroCu.currentHp).toBe(7);
      expect(heroCu.currentAp).toBe(2);
    });
  });

  describe('Multi-Target Frontal Cleave Handler', () => {
    const ARC_CLEAVE: Ability = {
      id: 'arc_cleave',
      name: 'Arc Cleave',
      description: 'Sweeps across all frontal enemies',
      apCost: 2,
      range: 1,
      targetType: 'SINGLE_TARGET',
      defenseTarget: 'EVASION',
      attackModifierAttribute: 'force',
      damageType: 'PHYSICAL',
      effects: [
        {
          type: 'DAMAGE',
          damageProfile: { count: 2, sides: 4, modifierAttribute: 'force' }
        },
        {
          type: 'CLEAVE',
          magnitude: 2 // Hit up to 2 frontal targets
        }
      ]
    };

    it('hits primary target and sweeps both frontal enemies occupying shared neighbor hexes', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Berserker Hero');
      const primaryEnemy = createRecruit('e1', 'Target Enemy');
      const flankEnemy1 = createRecruit('e2', 'Flank Enemy 1');
      const flankEnemy2 = createRecruit('e3', 'Flank Enemy 2');

      const state = createCombatState(arena, [hero, primaryEnemy, flankEnemy1, flankEnemy2]);
      (hero as any).baseAttributes = { force: 2, finesse: 0, focus: 0 };

      // Set positions:
      // Hero at (0, 0)
      // Primary Enemy at (1, 0) (East)
      // Mutual neighbors of (0,0) and (1,0) are (1, -1) and (0, 1)
      state.arena.setUnitPosition('hero', { q: 0, r: 0 });
      state.arena.setUnitPosition('e1', { q: 1, r: 0 });
      state.arena.setUnitPosition('e2', { q: 1, r: -1 });
      state.arena.setUnitPosition('e3', { q: 0, r: 1 });

      const heroCu = state.units.get('hero')!;
      heroCu.currentAp = 3;
      state.activeUnitId = 'hero';

      const e1Cu = state.units.get('e1')!;
      const e2Cu = state.units.get('e2')!;
      const e3Cu = state.units.get('e3')!;
      e1Cu.currentHp = 20;
      e2Cu.currentHp = 15;
      e3Cu.currentHp = 18;

      // Mock dice roller: d20 roll = 10 (hits), damageRolls: [5, 5, 5]
      const dice = new MockDiceRoller({ d20Rolls: [10], damageRolls: [5, 5, 5] });

      const result = executeAbility(state, 'hero', ARC_CLEAVE, { targetUnitId: 'e1' }, dice);
      expect(result).toBeDefined();

      // All 3 enemies took damage!
      expect(e1Cu.currentHp).toBeLessThan(20);
      expect(e2Cu.currentHp).toBeLessThan(15);
      expect(e3Cu.currentHp).toBeLessThan(18);

      const events = (result as any).details?.events ?? (result as any).events;
      const collateralEvents = events.filter((e: any) => e.reason === 'COLLATERAL');
      expect(collateralEvents).toHaveLength(2);
      expect(state.combatLog[0].message).toContain('Cleave hit');
    });
  });

  describe('Passive Health Threshold Scaling & Attack Roll Deltas', () => {
    const DEATHBOUND_PASSIVE: PassiveTrait = {
      id: 'deathbound_fury',
      name: 'Deathbound Fury',
      description: 'Increases damage and crit threshold when HP <= 50%',
      hook: 'ALWAYS',
      healthThreshold: {
        maxPercent: 0.5,
        flatDamageBonus: 2,
        critThreshold: 19,
        damageTypeFilter: 'PHYSICAL'
      }
    };

    const BASIC_PHYSICAL_ATTACK: Ability = {
      id: 'strike',
      name: 'Strike',
      description: 'Basic strike',
      apCost: 1,
      range: 1,
      targetType: 'SINGLE_TARGET',
      defenseTarget: 'EVASION',
      attackModifierAttribute: 'force',
      damageType: 'PHYSICAL',
      effects: [
        {
          type: 'DAMAGE',
          damageProfile: { count: 1, sides: 6, modifierAttribute: 'force' }
        }
      ]
    };

    it('does not apply bonus when actor HP is above 50% max HP', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      (hero as any).effectiveVitals.maxHp = 20;
      const enemy = createRecruit('enemy', 'Goblin');

      const state = createCombatState(arena, [hero, enemy]);
      const heroCu = state.units.get('hero')!;
      const enemyCu = state.units.get('enemy')!;
      (heroCu as any).passives = [DEATHBOUND_PASSIVE];
      heroCu.currentHp = 15; // > 10 (50% of 20)

      const dice = new MockDiceRoller({ d20Rolls: [19], damageRolls: [4] });
      const roll = resolveAttackRoll(heroCu, enemyCu, BASIC_PHYSICAL_ATTACK, dice);
      // Nat 19 is not crit without threshold
      expect(roll.hitOutcome).toBe('SOLID_HIT');

      const dmg = resolveDamage('SOLID_HIT', BASIC_PHYSICAL_ATTACK, heroCu, enemyCu, dice);
      // Raw damage = rolled dice (4) + modifier (0) + flat (0)
      expect(dmg.rawDamage).toBe(4);
    });

    it('applies +2 flat damage and 19-20 crit when actor HP is <= 50% max HP', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      (hero as any).effectiveVitals.maxHp = 20;
      const enemy = createRecruit('enemy', 'Goblin');

      const state = createCombatState(arena, [hero, enemy]);
      const heroCu = state.units.get('hero')!;
      const enemyCu = state.units.get('enemy')!;
      (heroCu as any).passives = [DEATHBOUND_PASSIVE];
      heroCu.currentHp = 10; // Exactly 50% of 20

      const dice = new MockDiceRoller({ d20Rolls: [19], damageRolls: [4] });
      const roll = resolveAttackRoll(heroCu, enemyCu, BASIC_PHYSICAL_ATTACK, dice);
      expect(roll.hitOutcome).toBe('CRITICAL_HIT');

      const dmg = resolveDamage('SOLID_HIT', BASIC_PHYSICAL_ATTACK, heroCu, enemyCu, dice);
      // Raw damage = rolled dice (4) + flatBonus (2) = 6
      expect(dmg.rawDamage).toBe(6);
    });

    it('applies attackRoll delta from abilityModifiers', () => {
      const hero = createRecruit('hero', 'Alden');
      const enemy = createRecruit('enemy', 'Goblin');
      const arena = createRadialArena(3);
      const state = createCombatState(arena, [hero, enemy]);
      const heroCu = state.units.get('hero')!;
      const enemyCu = state.units.get('enemy')!;
      heroCu.abilityModifiers = [
        {
          id: 'accuracy_boost',
          name: 'Accuracy Boost',
          deltas: {
            attackRoll: 2
          }
        }
      ];

      const effective = getEffectiveAbility(BASIC_PHYSICAL_ATTACK, heroCu.abilityModifiers);
      expect(effective.attackRollBonus).toBe(2);

      const dice = new MockDiceRoller({ d20Rolls: [10] });
      const roll = resolveAttackRoll(heroCu, enemyCu, effective, dice);
      expect(roll.modifier).toBe(2);
      expect(roll.totalScore).toBe(12);
    });
  });
});
