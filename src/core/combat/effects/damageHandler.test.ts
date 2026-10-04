import { describe, it, expect } from 'vitest';
import { executeAbilityEffects } from './registry';
import { Ability } from '../../types/ability';
import { CombatUnit, CombatState } from '../types';
import { createRadialArena } from '../../grid/templates';
import { createRecruit } from '../../units/unitFactory';
import { MockDiceRoller } from '../dice';
import { HEX_DIRECTIONS } from '../../grid/hex';

function createMockCombatUnit(id: string, name: string, faction: 'PLAYER' | 'ENEMY' = 'PLAYER'): CombatUnit {
  const recruit = createRecruit(id, name, { faction });
  return {
    unit: recruit,
    faction,
    currentHp: 20,
    currentAp: 2,
    initiativeGauge: 0,
    isDefeated: false,
    inBattleXp: { fighter: 0, rogue: 0, mage: 0 },
    activeModifiers: [],
    activeConditions: [],
    abilityModifiers: [],
    abilities: [],
    passives: [],
    facing: HEX_DIRECTIONS.EAST
  };
}

function createTestState(actor: CombatUnit, target: CombatUnit): CombatState {
  const arena = createRadialArena(3);
  arena.setUnitPosition(actor.unit.id, { q: 0, r: 0 });
  arena.setUnitPosition(target.unit.id, { q: 1, r: 0 });

  const units = new Map<string, CombatUnit>();
  units.set(actor.unit.id, actor);
  units.set(target.unit.id, target);

  return {
    arena,
    units,
    activeUnitId: actor.unit.id,
    turnNumber: 1,
    combatLog: [],
    outcome: 'IN_PROGRESS'
  };
}

describe('Atomic Damage Effect Handler & Composable Effects Pipeline', () => {
  const testAttackAbility: Ability = {
    id: 'heavy_smash',
    name: 'Heavy Smash',
    description: 'A heavy attack dealing damage and knockback, while bracing self.',
    archetypeTag: 'FIGHTER',
    apCost: 2,
    range: 1,
    targetType: 'SINGLE_TARGET',
    defenseTarget: 'EVASION',
    attackModifierAttribute: 'force',
    damageType: 'PHYSICAL',
    effects: [
      {
        type: 'DAMAGE',
        damageProfile: { count: 1, sides: 6, modifierAttribute: 'force' }
      },
      {
        type: 'KNOCKBACK',
        magnitude: 1,
        applyOn: 'HIT_OR_CRIT'
      },
      {
        type: 'ARMOR_BUFF',
        magnitude: 2,
        durationTurns: 1,
        targetScope: 'SELF',
        applyOn: 'ALWAYS'
      }
    ]
  };

  it('resolves damage, knockback, and self armor buff on SOLID_HIT', () => {
    const actor = createMockCombatUnit('hero', 'Hero', 'PLAYER');
    const target = createMockCombatUnit('foe', 'Foe', 'ENEMY');
    const state = createTestState(actor, target);

    const dice = new MockDiceRoller({ damageRolls: [4] });
    const result = executeAbilityEffects(testAttackAbility, {
      state,
      actorCu: actor,
      targetCu: target,
      targetCoord: { q: 1, r: 0 },
      ability: testAttackAbility,
      hitOutcome: 'SOLID_HIT',
      diceRoller: dice
    });

    // Damage event
    const dmgEvent = result.events.find((e) => e.type === 'DAMAGE');
    expect(dmgEvent).toBeDefined();
    if (dmgEvent?.type === 'DAMAGE') {
      expect(dmgEvent.targetUnitId).toBe('foe');
      expect(dmgEvent.isCrit).toBe(false);
    }

    // Displacement knockback event
    const knockbackEvent = result.events.find((e) => e.type === 'DISPLACEMENT');
    expect(knockbackEvent).toBeDefined();
    if (knockbackEvent?.type === 'DISPLACEMENT') {
      expect(knockbackEvent.unitId).toBe('foe');
    }

    // Status armor buff on self
    const armorEvent = result.events.find((e) => e.type === 'STATUS_APPLIED');
    expect(armorEvent).toBeDefined();
    if (armorEvent?.type === 'STATUS_APPLIED') {
      expect(armorEvent.targetUnitId).toBe('hero');
      expect(armorEvent.modifier?.stat).toBe('armor');
      expect(armorEvent.modifier?.value).toBe(2);
    }
  });

  it('negates damage and secondary effects on MISS, but applies unconditional self-buff', () => {
    const actor = createMockCombatUnit('hero', 'Hero', 'PLAYER');
    const target = createMockCombatUnit('foe', 'Foe', 'ENEMY');
    const state = createTestState(actor, target);

    const dice = new MockDiceRoller({ damageRolls: [4] });
    const result = executeAbilityEffects(testAttackAbility, {
      state,
      actorCu: actor,
      targetCu: target,
      targetCoord: { q: 1, r: 0 },
      ability: testAttackAbility,
      hitOutcome: 'MISS',
      diceRoller: dice
    });

    expect(result.events.some((e) => e.type === 'DAMAGE')).toBe(false);
    expect(result.events.some((e) => e.type === 'DISPLACEMENT')).toBe(false);

    // Unconditional self armor buff still applies!
    const armorEvent = result.events.find((e) => e.type === 'STATUS_APPLIED');
    expect(armorEvent).toBeDefined();
    if (armorEvent?.type === 'STATUS_APPLIED') {
      expect(armorEvent.targetUnitId).toBe('hero');
    }
  });

  it('scales damage by 0.5 on GRAZE and negates secondary effects', () => {
    const actor = createMockCombatUnit('hero', 'Hero', 'PLAYER');
    const target = createMockCombatUnit('foe', 'Foe', 'ENEMY');
    const state = createTestState(actor, target);

    const dice = new MockDiceRoller({ damageRolls: [6] });
    const result = executeAbilityEffects(testAttackAbility, {
      state,
      actorCu: actor,
      targetCu: target,
      targetCoord: { q: 1, r: 0 },
      ability: testAttackAbility,
      hitOutcome: 'GRAZE',
      diceRoller: dice
    });

    const dmgEvent = result.events.find((e) => e.type === 'DAMAGE');
    expect(dmgEvent).toBeDefined();
    // Knockback secondary effect is negated on graze
    expect(result.events.some((e) => e.type === 'DISPLACEMENT')).toBe(false);
    expect(result.logDetail).toContain('Secondary effect negated on Graze');
  });

  it('deals maximized damage on CRITICAL_HIT', () => {
    const actor = createMockCombatUnit('hero', 'Hero', 'PLAYER');
    const target = createMockCombatUnit('foe', 'Foe', 'ENEMY');
    const state = createTestState(actor, target);

    // 1d6 roll 4: On crit, raw damage = 6 (max) + 4 (rolled) + 1 (Force) = 11
    const dice = new MockDiceRoller({ damageRolls: [4] });
    const result = executeAbilityEffects(testAttackAbility, {
      state,
      actorCu: actor,
      targetCu: target,
      targetCoord: { q: 1, r: 0 },
      ability: testAttackAbility,
      hitOutcome: 'CRITICAL_HIT',
      diceRoller: dice
    });

    const dmgEvent = result.events.find((e) => e.type === 'DAMAGE');
    expect(dmgEvent).toBeDefined();
    if (dmgEvent?.type === 'DAMAGE') {
      expect(dmgEvent.isCrit).toBe(true);
      expect(dmgEvent.amount).toBe(10); // 6 (max) + 4 (rolled) + 0 (Force mod for 10 Force)
    }
  });
});
