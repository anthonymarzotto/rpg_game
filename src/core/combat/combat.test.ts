import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { createRecruit } from '../units/unitFactory';
import { createCombatState, executeMove, executeAbility } from './resolver';
import { canExecuteAbility } from './validator';
import { resolveAttackRoll, getAttackRollModifier, getAbilityModifier } from './attackRoll';
import { resolveDamage } from './damageEngine';
import { defaultEffectRegistry } from './effects';
import { endActiveTurn } from './turnClock';
import { MockDiceRoller } from './dice';
import { STRIKE, SHIELD_BASH, SPARK, BRACE, MINOR_WARD, SKIRMISH, QUICK_THRUST } from '../../data/abilities';



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

  describe('Extensible Effect Pipeline & Atomic Combat Events', () => {
    it('emits typed DAMAGE and DISPLACEMENT events on Knockback with collision', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      const dummyA = createRecruit('dummyA', 'Dummy A');
      const dummyB = createRecruit('dummyB', 'Dummy B');

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('dummyA', { q: 1, r: 0 });
      arena.setUnitPosition('dummyB', { q: 2, r: 0 });

      const state = createCombatState(arena, [hero, dummyA, dummyB], 'hero');
      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [3] });

      const result = executeAbility(state, 'hero', SHIELD_BASH, { targetUnitId: 'dummyA' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.events).toHaveLength(4);

        const [primaryDmg, collision, wallSlamDmg, collateralDmg] = result.details.events;
        expect(primaryDmg).toEqual({
          type: 'DAMAGE',
          targetUnitId: 'dummyA',
          amount: 3,
          damageType: 'PHYSICAL',
          reason: 'ATTACK',
          sourceUnitId: 'hero',
          isCrit: false
        });
        expect(collision).toEqual({
          type: 'COLLISION',
          unitId: 'dummyA',
          collisionType: 'UNIT',
          collidingUnitId: 'dummyB'
        });
        expect(wallSlamDmg).toEqual({
          type: 'DAMAGE',
          targetUnitId: 'dummyA',
          amount: 1,
          damageType: 'PHYSICAL',
          reason: 'COLLISION',
          sourceUnitId: 'hero'
        });
        expect(collateralDmg).toEqual({
          type: 'DAMAGE',
          targetUnitId: 'dummyB',
          amount: 1,
          damageType: 'PHYSICAL',
          reason: 'COLLATERAL',
          sourceUnitId: 'hero'
        });
      }
    });

    it('emits DISPLACEMENT event on retreat step (Skirmish)', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      const dummy = createRecruit('dummy', 'Dummy');

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('dummy', { q: 1, r: 0 });

      const state = createCombatState(arena, [hero, dummy], 'hero');
      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [4] });

      const result = executeAbility(state, 'hero', SKIRMISH, { targetUnitId: 'dummy' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        const displacementEvent = result.details.events.find((e) => e.type === 'DISPLACEMENT');
        expect(displacementEvent).toEqual({
          type: 'DISPLACEMENT',
          unitId: 'hero',
          fromCoord: { q: 0, r: 0 },
          toCoord: { q: -1, r: 0 },
          kind: 'RETREAT'
        });
        expect(arena.getUnitPosition('hero')).toEqual({ q: -1, r: 0 });
      }
    });

    it('allows dynamic registration of custom effect handlers without modifying resolver', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      arena.setUnitPosition('hero', { q: 0, r: 0 });

      const state = createCombatState(arena, [hero], 'hero');

      defaultEffectRegistry.register('CRIT_BOOST', {
        apply: (_effect, ctx) => ({
          events: [
            {
              type: 'STATUS_APPLIED',
              targetUnitId: ctx.actorCu.unit.id,
              modifier: { stat: 'speed', value: 5, durationTurns: 1 }
            }
          ],
          logDetail: ' ⚡ [Custom Speed Surge!]'
        })
      });

      const customAbility = {
        ...STRIKE,
        id: 'surge_strike',
        name: 'Surge Strike',
        effect: { type: 'CRIT_BOOST' as const, magnitude: 1 }
      };

      const dummy = createRecruit('dummy', 'Dummy');
      arena.setUnitPosition('dummy', { q: 1, r: 0 });
      state.units.set('dummy', {
        unit: dummy,
        currentHp: 20,
        currentAp: 0,
        initiativeGauge: 0,
        isDefeated: false,
        inBattleXp: { fighter: 0, rogue: 0, mage: 0 },
        activeModifiers: []
      });

      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [3] });
      const result = executeAbility(state, 'hero', customAbility, { targetUnitId: 'dummy' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(state.combatLog[0].message).toContain('⚡ [Custom Speed Surge!]');
        expect(state.units.get('hero')!.activeModifiers).toContainEqual({
          stat: 'speed',
          value: 5,
          durationTurns: 1
        });
      }
    });
  });

  describe('Targeting Rules & Faction Validation', () => {
    it('prevents single-target attack abilities from targeting the actor', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      arena.setUnitPosition('hero', { q: 0, r: 0 });

      const state = createCombatState(arena, [hero], 'hero');

      // Spark targeting self
      const sparkValidation = canExecuteAbility(state, 'hero', SPARK, {
        targetUnitId: 'hero'
      });
      expect(sparkValidation.valid).toBe(false);
      expect((sparkValidation as { valid: false; reason: string }).reason).toContain('Cannot target self');

      // Shield bash targeting self
      const bashValidation = canExecuteAbility(state, 'hero', SHIELD_BASH, {
        targetUnitId: 'hero'
      });
      expect(bashValidation.valid).toBe(false);
      expect((bashValidation as { valid: false; reason: string }).reason).toContain('Cannot target self');
    });

    it('prevents friendly fire when factions are specified', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden', { faction: 'PLAYER' });
      const ally = createRecruit('ally', 'Boran', { faction: 'PLAYER' });
      const enemy = createRecruit('enemy', 'Orc', { faction: 'ENEMY' });

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('ally', { q: 1, r: 0 });
      arena.setUnitPosition('enemy', { q: 0, r: 1 });

      const state = createCombatState(arena, [hero, ally, enemy], 'hero');

      // Hero attacking Ally
      const attackAlly = canExecuteAbility(state, 'hero', STRIKE, { targetUnitId: 'ally' });
      expect(attackAlly.valid).toBe(false);
      expect((attackAlly as { valid: false; reason: string }).reason).toContain('Cannot attack a friendly unit');

      // Hero attacking Enemy
      const attackEnemy = canExecuteAbility(state, 'hero', STRIKE, { targetUnitId: 'enemy' });
      expect(attackEnemy.valid).toBe(true);
    });

    it('enforces ALLY targeting: allows self and allies, rejects enemies', () => {
      const arena = createRadialArena(3);
      const mage = createRecruit('mage', 'Elia', { faction: 'PLAYER' });
      const ally = createRecruit('ally', 'Boran', { faction: 'PLAYER' });
      const enemy = createRecruit('enemy', 'Orc', { faction: 'ENEMY' });

      arena.setUnitPosition('mage', { q: 0, r: 0 });
      arena.setUnitPosition('ally', { q: 1, r: 0 });
      arena.setUnitPosition('enemy', { q: 0, r: 1 });

      const state = createCombatState(arena, [mage, ally, enemy], 'mage');

      // Ward on self (explicit targetUnitId)
      const wardSelf = canExecuteAbility(state, 'mage', MINOR_WARD, { targetUnitId: 'mage' });
      expect(wardSelf.valid).toBe(true);

      // Ward on self (default/omitted targetUnitId)
      const wardSelfDefault = canExecuteAbility(state, 'mage', MINOR_WARD);
      expect(wardSelfDefault.valid).toBe(true);

      // Ward on Ally
      const wardAlly = canExecuteAbility(state, 'mage', MINOR_WARD, { targetUnitId: 'ally' });
      expect(wardAlly.valid).toBe(true);

      // Ward on Enemy
      const wardEnemy = canExecuteAbility(state, 'mage', MINOR_WARD, { targetUnitId: 'enemy' });
      expect(wardEnemy.valid).toBe(false);
      expect((wardEnemy as { valid: false; reason: string }).reason).toContain('Cannot cast an ally ability on an enemy unit');
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

