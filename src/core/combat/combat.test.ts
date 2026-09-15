import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { createRecruit } from '../units/unitFactory';
import { createCombatState, executeMove, executeAbility, canExecuteAbility } from './resolver';
import { endActiveTurn } from './turnClock';
import { MockDiceRoller } from './dice';
import { STRIKE, SHIELD_BASH, SPARK, BRACE, MINOR_WARD } from '../../data/abilities';


describe('Headless Combat Action Resolution', () => {
  it('handles movement and AP deduction on CombatUnit', () => {
    const arena = createRadialArena(3);
    const hero = createRecruit('hero', 'Alden');
    arena.setUnitPosition('hero', { q: 0, r: 0 });

    const state = createCombatState(arena, [hero], 'hero');
    const heroCu = state.units.get('hero')!;
    expect(state.activeUnitId).toBe('hero');
    expect(heroCu.currentAp).toBe(3);

    // Move to adjacent tile (costs 1 AP)
    executeMove(state, 'hero', { q: 1, r: 0 });
    expect(heroCu.currentAp).toBe(2);
    expect(arena.getUnitPosition('hero')).toEqual({ q: 1, r: 0 });

    // Move again
    executeMove(state, 'hero', { q: 2, r: 0 });
    expect(heroCu.currentAp).toBe(1);
    expect(arena.getUnitPosition('hero')).toEqual({ q: 2, r: 0 });
  });

  describe('Attack Resolution Outcomes & XP Tracking', () => {
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



  describe('Knockback & Wall-Slam Damage', () => {
    it('displaces target 1 hex on clear hit', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      const goblin = createRecruit('goblin', 'Goblin');

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('goblin', { q: 1, r: 0 });

      const state = createCombatState(arena, [hero, goblin], 'hero');

      // Roll 15 (Hit)
      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [3] });

      executeAbility(state, 'hero', SHIELD_BASH, { targetUnitId: 'goblin' }, dice);

      // Goblin knocked from (1, 0) to (2, 0)
      expect(arena.getUnitPosition('goblin')).toEqual({ q: 2, r: 0 });
      expect(state.combatLog[0].message).toContain('Knockback: Pushed to (2, 0)');
    });

    it('triggers wall-slam collision damage when knocked into map border', () => {
      const arena = createRadialArena(2);
      const hero = createRecruit('hero', 'Alden');
      const goblin = createRecruit('goblin', 'Goblin');

      // Goblin is on outer perimeter of radius 2
      arena.setUnitPosition('hero', { q: 1, r: 0 });
      arena.setUnitPosition('goblin', { q: 2, r: 0 });

      const state = createCombatState(arena, [hero, goblin], 'hero');

      // Hit roll. Base bash deals 3 damage. Collision deals 1 + Force(0) = 1 damage.
      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [3] });

      const result = executeAbility(
        state,
        'hero',
        SHIELD_BASH,
        { targetUnitId: 'goblin' },
        dice
      );

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.knockbackResult?.isCollided).toBe(true);
        expect(result.details.wallSlamDamage).toBe(1);
      }

      const goblinCu = state.units.get('goblin')!;
      // Total HP lost = 3 (bash) + 1 (slam) = 4
      expect(goblinCu.currentHp).toBe(goblin.effectiveVitals.maxHp - 4);
      // Goblin remained at (2, 0)
      expect(arena.getUnitPosition('goblin')).toEqual({ q: 2, r: 0 });
      expect(state.combatLog[0].message).toContain('Knockback Collision: Slammed into Map Boundary');
    });

    it('logs bystander collision and damages both units when knocked into another unit', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      const dummyA = createRecruit('dummyA', 'Dummy A');
      const dummyB = createRecruit('dummyB', 'Dummy B');

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('dummyA', { q: 1, r: 0 });
      arena.setUnitPosition('dummyB', { q: 2, r: 0 });

      const state = createCombatState(arena, [hero, dummyA, dummyB], 'hero');
      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [3] });

      executeAbility(state, 'hero', SHIELD_BASH, { targetUnitId: 'dummyA' }, dice);

      expect(state.combatLog[0].message).toContain('Knockback Collision: Slammed into Dummy B');
      expect(state.combatLog[0].message).toContain('Dummy B took +1 collateral damage');
    });
  });

  describe('Line-of-Sight & Screening', () => {
    it('prevents ranged spell execution when an intervening unit blocks LoS', () => {
      const arena = createRadialArena(3);
      const mage = createRecruit('mage', 'Elia');
      const tank = createRecruit('tank', 'Boran');
      const enemy = createRecruit('enemy', 'Orc');

      arena.setUnitPosition('mage', { q: 0, r: 0 });
      arena.setUnitPosition('tank', { q: 1, r: 0 });
      arena.setUnitPosition('enemy', { q: 2, r: 0 });

      const state = createCombatState(arena, [mage, tank, enemy], 'mage');

      const validation = canExecuteAbility(state, 'mage', SPARK, {
        targetUnitId: 'enemy'
      });
      expect(validation.valid).toBe(false);
      expect((validation as { valid: false; reason: string }).reason).toContain('Line-of-Sight');
    });
  });

  describe('CTB Clock Advancement & Unspent AP Recovery', () => {
    it('refunds 20 gauge points per unspent AP on turn end', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      const enemy = createRecruit('enemy', 'Orc');

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 2, r: 0 });

      const state = createCombatState(arena, [hero, enemy], 'hero');
      const heroCu = state.units.get('hero')!;
      expect(state.activeUnitId).toBe('hero');

      // Hero spends 1 AP on movement, leaving 2 AP unspent
      executeMove(state, 'hero', { q: 1, r: 0 });
      expect(heroCu.currentAp).toBe(2);

      // End turn with 2 unspent AP -> 2 * 20 = 40 gauge recovery baseline.
      // Clock ticks 6 times: Hero reaches 100 first (40 + 60), while Enemy is only at 60!
      const nextActiveId = endActiveTurn(state);

      expect(nextActiveId).toBe('hero');
      expect(state.turnNumber).toBe(2);
      expect(heroCu.currentAp).toBe(3);
      expect(state.units.get('enemy')!.initiativeGauge).toBe(60);
    });

    it('decrements active modifier durations on turn start and purges expired ones', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      arena.setUnitPosition('hero', { q: 0, r: 0 });

      const state = createCombatState(arena, [hero], 'hero');
      const heroCu = state.units.get('hero')!;

      // Add a 1-turn armor buff and a 2-turn speed buff
      heroCu.activeModifiers.push(
        { stat: 'armor', value: 2, durationTurns: 1 },
        { stat: 'speed', value: 4, durationTurns: 2 }
      );

      expect(heroCu.activeModifiers).toHaveLength(2);

      // Hero ends turn
      endActiveTurn(state);

      // On Hero's next turn start, 1-turn armor buff decrements to 0 and is purged;
      // 2-turn speed buff decrements to 1 and remains active!
      expect(heroCu.activeModifiers).toHaveLength(1);
      expect(heroCu.activeModifiers[0].stat).toBe('speed');
      expect(heroCu.activeModifiers[0].durationTurns).toBe(1);

      // Hero ends turn again
      endActiveTurn(state);

      // Now the speed buff decrements to 0 and is purged
      expect(heroCu.activeModifiers).toHaveLength(0);
    });
  });
});
