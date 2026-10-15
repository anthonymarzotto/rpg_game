import { describe, it, expect } from 'vitest';
import { CONDITION_REGISTRY, getConditionDefinition } from './conditions';
import { ActiveCondition, CombatUnit } from './types';

import { createRecruit } from '../units/unitFactory';

function createMockUnit(id: string): CombatUnit {
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
    facing: 0
  };
}

describe('Condition Registry', () => {
  it('retrieves definitions for registered conditions', () => {
    expect(getConditionDefinition('CHALLENGED')).toBeDefined();
    expect(getConditionDefinition('STEALTH')).toBeDefined();
    expect(getConditionDefinition('POISON')).toBeDefined();
    expect(getConditionDefinition('BURN')).toBeDefined();
  });

  describe('CHALLENGED', () => {
    const challengedDef = CONDITION_REGISTRY.CHALLENGED;

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
  });

  describe('STEALTH', () => {
    const stealthDef = CONDITION_REGISTRY.STEALTH;

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
  });

  describe('POISON and BURN', () => {
    it('do not modify outgoing or incoming attack rolls', () => {
      const poison = CONDITION_REGISTRY.POISON;
      const burn = CONDITION_REGISTRY.BURN;

      expect(poison.onOutgoingAttackRoll).toBeUndefined();
      expect(poison.onIncomingAttackRoll).toBeUndefined();
      expect(burn.onOutgoingAttackRoll).toBeUndefined();
      expect(burn.onIncomingAttackRoll).toBeUndefined();
    });
  });
});
