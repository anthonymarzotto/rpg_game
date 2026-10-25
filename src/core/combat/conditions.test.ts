import { describe, it, expect } from 'vitest';
import { CONDITION_REGISTRY, getConditionDefinition } from './conditions';
import { ActiveCondition, CombatUnit } from './types';
import { Ability } from '../types/ability';
import { createRecruit } from '../units/unitFactory';

function createMockUnit(id: string, faction?: 'PLAYER' | 'ENEMY'): CombatUnit {
  const recruit = createRecruit(id, `Unit ${id}`);
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
    facing: 0,
    faction
  };
}

describe('Condition Registry', () => {
  it('retrieves definitions for registered conditions', () => {
    expect(getConditionDefinition('CHALLENGED')).toBeDefined();
    expect(getConditionDefinition('STEALTH')).toBeDefined();
    expect(getConditionDefinition('POISON')).toBeDefined();
    expect(getConditionDefinition('BURN')).toBeDefined();
    expect(getConditionDefinition('EXPOSED')).toBeDefined();
  });

  describe('CHALLENGED', () => {
    const challengedDef = CONDITION_REGISTRY.CHALLENGED;

    it('has OVERRIDE_SOURCE stacking policy for taunt steal', () => {
      expect(challengedDef.stackingPolicy).toBe('OVERRIDE_SOURCE');
    });

    it('grants Disadvantage when attacking a target other than the challenger', () => {
      const challenger = createMockUnit('knight-1');
      const actor = createMockUnit('goblin-1');
      const victim = createMockUnit('mage-1');

      const condition: ActiveCondition = {
        type: 'CHALLENGED',
        durationTurns: 2,
        sourceUnitId: challenger.unit.id
      };

      const result = challengedDef.onOutgoingAttackRoll?.(condition, actor, victim);
      expect(result).toBeDefined();
      expect(result?.disadvantage).toBe(true);
      expect(result?.description).toContain('Challenged');
    });

    it('does not grant Disadvantage when attacking the challenger directly', () => {
      const challenger = createMockUnit('knight-1');
      const actor = createMockUnit('goblin-1');

      const condition: ActiveCondition = {
        type: 'CHALLENGED',
        durationTurns: 2,
        sourceUnitId: challenger.unit.id
      };

      const result = challengedDef.onOutgoingAttackRoll?.(condition, actor, challenger);
      expect(result).toBeUndefined();
    });

    it('inflicts EXPOSED on attacker via onAfterAction when attacking a non-challenger', () => {
      const challenger = createMockUnit('knight-1');
      const actor = createMockUnit('goblin-1');
      const victim = createMockUnit('wizard-1');

      const condition: ActiveCondition = {
        type: 'CHALLENGED',
        durationTurns: 2,
        sourceUnitId: challenger.unit.id
      };

      const outcome = challengedDef.onAfterAction?.(condition, actor, {
        type: 'ATTACK',
        ability: {} as Ability,
        target: victim
      });

      expect(outcome).toBeDefined();
      expect(outcome?.applyConditions).toHaveLength(1);
      expect(outcome?.applyConditions?.[0].conditionType).toBe('EXPOSED');
      expect(outcome?.applyConditions?.[0].targetUnitId).toBe(actor.unit.id);
      expect(outcome?.applyConditions?.[0].durationTurns).toBe(1);
    });

    it('does not inflict EXPOSED when attacking the challenger directly', () => {
      const challenger = createMockUnit('knight-1');
      const actor = createMockUnit('goblin-1');

      const condition: ActiveCondition = {
        type: 'CHALLENGED',
        durationTurns: 2,
        sourceUnitId: challenger.unit.id
      };

      const outcome = challengedDef.onAfterAction?.(condition, actor, {
        type: 'ATTACK',
        ability: {} as Ability,
        target: challenger
      });

      expect(outcome).toBeUndefined();
    });

    it('does not inflict EXPOSED when secondary targets include the challenger', () => {
      const challenger = createMockUnit('knight-1');
      const actor = createMockUnit('goblin-1');
      const bystander = createMockUnit('wizard-1');

      const condition: ActiveCondition = {
        type: 'CHALLENGED',
        durationTurns: 2,
        sourceUnitId: challenger.unit.id
      };

      const outcome = challengedDef.onAfterAction?.(condition, actor, {
        type: 'ATTACK',
        ability: {} as Ability,
        target: bystander,
        secondaryTargets: [challenger]
      });

      expect(outcome).toBeUndefined();
    });
  });

  describe('STEALTH', () => {
    const stealthDef = CONDITION_REGISTRY.STEALTH;

    it('has REFRESH_DURATION stacking policy', () => {
      expect(stealthDef.stackingPolicy).toBe('REFRESH_DURATION');
    });

    it('grants Advantage on outgoing attack roll', () => {
      const actor = createMockUnit('rogue-1');
      const target = createMockUnit('enemy-1');

      const condition: ActiveCondition = {
        type: 'STEALTH',
        durationTurns: 3,
        sourceUnitId: actor.unit.id
      };

      const result = stealthDef.onOutgoingAttackRoll?.(condition, actor, target);
      expect(result).toBeDefined();
      expect(result?.advantage).toBe(true);
      expect(result?.description).toContain('Stealth');
    });

    it('blocks enemy targeting but permits friendly targeting', () => {
      const rogue = createMockUnit('rogue-1', 'PLAYER');
      const enemy = createMockUnit('goblin-1', 'ENEMY');
      const ally = createMockUnit('cleric-1', 'PLAYER');

      const condition: ActiveCondition = {
        type: 'STEALTH',
        durationTurns: 2,
        sourceUnitId: rogue.unit.id
      };

      expect(stealthDef.canBeTargeted?.(condition, enemy, rogue)).toBe(false);
      expect(stealthDef.canBeTargeted?.(condition, ally, rogue)).toBe(true);
    });

    it('breaks stealth on attack via onAfterAction', () => {
      const rogue = createMockUnit('rogue-1', 'PLAYER');
      const target = createMockUnit('goblin-1', 'ENEMY');
      const dummyAbility: Ability = {
        id: 'strike',
        name: 'Strike',
        description: 'Attack',
        archetypeTag: 'ROGUE',
        targetType: 'SINGLE_TARGET',
        defenseTarget: 'EVASION',
        damageType: 'PHYSICAL',
        range: 1,
        apCost: 1,
        effects: []
      };

      const condition: ActiveCondition = {
        type: 'STEALTH',
        durationTurns: 2,
        sourceUnitId: rogue.unit.id
      };

      const outcome = stealthDef.onAfterAction?.(
        condition,
        rogue,
        { type: 'ATTACK', ability: dummyAbility, target }
      );
      expect(outcome?.removeCondition).toBe(true);
    });

    it('onTakeDamage breaks stealth on direct attack or burn damage, but preserves it on poison DoT', () => {
      const rogue = createMockUnit('rogue-1', 'PLAYER');
      const condition: ActiveCondition = {
        type: 'STEALTH',
        durationTurns: 2,
        sourceUnitId: rogue.unit.id
      };

      // Direct attack damage breaks stealth
      const attackOutcome = stealthDef.onTakeDamage?.(condition, rogue, {
        damageAmount: 5,
        damageType: 'PHYSICAL',
        reason: 'ATTACK'
      });
      expect(attackOutcome?.removeCondition).toBe(true);

      // Burn damage breaks stealth
      const burnOutcome = stealthDef.onTakeDamage?.(condition, rogue, {
        damageAmount: 2,
        damageType: 'MAGICAL',
        reason: 'BURN'
      });
      expect(burnOutcome?.removeCondition).toBe(true);

      // Poison DoT does NOT break stealth
      const poisonOutcome = stealthDef.onTakeDamage?.(condition, rogue, {
        damageAmount: 2,
        damageType: 'PHYSICAL',
        reason: 'POISON'
      });
      expect(poisonOutcome).toBeUndefined();
    });
  });

  describe('POISON and BURN', () => {
    const poison = CONDITION_REGISTRY.POISON;
    const burn = CONDITION_REGISTRY.BURN;

    it('have STACK_INTENSITY stacking policy with max intensity 8', () => {
      expect(poison.stackingPolicy).toBe('STACK_INTENSITY');
      expect(poison.maxIntensity).toBe(8);
      expect(burn.stackingPolicy).toBe('STACK_INTENSITY');
      expect(burn.maxIntensity).toBe(8);
    });

    it('do not modify outgoing or incoming attack rolls', () => {
      expect(poison.onOutgoingAttackRoll).toBeUndefined();
      expect(poison.onIncomingAttackRoll).toBeUndefined();
      expect(burn.onOutgoingAttackRoll).toBeUndefined();
      expect(burn.onIncomingAttackRoll).toBeUndefined();
    });

    it('evaluates turn-start damage for POISON and BURN', () => {
      const unit = createMockUnit('hero');
      const poisonCond: ActiveCondition = {
        type: 'POISON',
        durationTurns: 2,
        sourceUnitId: 'spider',
        damagePerTurn: 4
      };
      const burnCond: ActiveCondition = {
        type: 'BURN',
        durationTurns: 2,
        sourceUnitId: 'mage'
      };

      expect(poison.onTurnStart?.(poisonCond, unit)?.damage).toBe(4);
      expect(poison.onTurnStart?.(poisonCond, unit)?.damageType).toBe('PHYSICAL');
      expect(burn.onTurnStart?.(burnCond, unit)?.damage).toBe(2);
      expect(burn.onTurnStart?.(burnCond, unit)?.damageType).toBe('MAGICAL');
    });
  });

  describe('EXPOSED', () => {
    const exposedDef = CONDITION_REGISTRY.EXPOSED;

    it('has REFRESH_DURATION stacking policy', () => {
      expect(exposedDef.stackingPolicy).toBe('REFRESH_DURATION');
    });

    it('grants Advantage on incoming attack rolls', () => {
      const attacker = createMockUnit('attacker-1');
      const target = createMockUnit('target-1');
      const condition: ActiveCondition = {
        type: 'EXPOSED',
        durationTurns: 1,
        sourceUnitId: 'knight-1'
      };

      const result = exposedDef.onIncomingAttackRoll?.(condition, attacker, target);
      expect(result).toBeDefined();
      expect(result?.advantage).toBe(true);
      expect(result?.description).toContain('Exposed');
    });

    it('does not modify outgoing attack rolls or turn start', () => {
      expect(exposedDef.onOutgoingAttackRoll).toBeUndefined();
      expect(exposedDef.onTurnStart).toBeUndefined();
    });
  });
});
