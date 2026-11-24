import { describe, it, expect } from 'vitest';
import {
  CONDITION_REGISTRY,
  getConditionDefinition,
  evaluateFrontArcDetection,
  purgeConditionsFromDefeatedSource
} from './conditions';
import { getEffectiveArmor, getEffectiveWard, getEffectiveMove, getEffectiveSpeed, getEffectiveStat } from './effectiveVitals';
import { applyConditionToUnit } from './effects/conditionHandler';
import { endActiveTurn } from './turnClock';
import { createCombatState, executeAbility } from './resolver';
import { resolvePendingBombardmentsOnTurnStart } from './battlefieldZones';
import { DiceRoller } from './dice';
import { createRadialArena } from '../grid/templates';
import { HEX_DIRECTIONS } from '../grid/hex';
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

  describe('CHARMED and BLINDED', () => {
    it('CHARMED switches unit faction to charmer faction and restores original faction when turn ends', () => {
      const arena = createRadialArena(3);
      const philanderer = createRecruit('phil', 'Philanderer', { faction: 'PLAYER' });
      const bandit = createRecruit('bandit', 'Bandit', { faction: 'ENEMY' });
      arena.setUnitPosition('phil', { q: 0, r: 0 });
      arena.setUnitPosition('bandit', { q: 2, r: 0 });

      const state = createCombatState(arena, [philanderer, bandit], 'phil');
      const banditCu = state.units.get('bandit')!;
      expect(banditCu.faction).toBe('ENEMY');

      applyConditionToUnit(banditCu, 'CHARMED', 1, 'phil', undefined, 'PLAYER');
      expect(banditCu.faction).toBe('PLAYER');
      expect(banditCu.originalFaction).toBe('ENEMY');
      // Does not break on damage
      expect(CONDITION_REGISTRY.CHARMED.onTakeDamage).toBeUndefined();

      // When it becomes bandit's turn and bandit ends their turn, CHARMED expires and restores ENEMY
      banditCu.initiativeGauge = 200;
      endActiveTurn(state); // switches to bandit
      expect(state.activeUnitId).toBe('bandit');
      expect(banditCu.faction).toBe('PLAYER');

      endActiveTurn(state); // concludes bandit's turn
      expect(banditCu.activeConditions.some((c) => c.type === 'CHARMED')).toBe(false);
      expect(banditCu.faction).toBe('ENEMY');
    });

    it('BLINDED imposes outgoing Disadvantage and disables front-arc Stealth detection', () => {
      const blindedDef = CONDITION_REGISTRY.BLINDED;
      expect(blindedDef.stackingPolicy).toBe('REFRESH_DURATION');

      const actor = createMockUnit('archer', 'ENEMY');
      const target = createMockUnit('hero', 'PLAYER');
      const cond: ActiveCondition = {
        type: 'BLINDED',
        durationTurns: 1,
        sourceUnitId: 'phil'
      };
      const mod = blindedDef.onOutgoingAttackRoll?.(cond, actor, target);
      expect(mod?.disadvantage).toBe(true);

      // Front-arc stealth detection skipped while BLINDED
      const arena = createRadialArena(3);
      const rogue = createRecruit('rogue', 'Rogue', { faction: 'PLAYER' });
      const guard = createRecruit('guard', 'Guard', { faction: 'ENEMY' });
      arena.setUnitPosition('guard', { q: 0, r: 0 });
      arena.setUnitPosition('rogue', { q: 1, r: 0 });

      const state = createCombatState(arena, [rogue, guard], 'guard');
      const rogueCu = state.units.get('rogue')!;
      const guardCu = state.units.get('guard')!;
      guardCu.facing = HEX_DIRECTIONS.EAST;
      applyConditionToUnit(rogueCu, 'STEALTH', 1, 'rogue');
      applyConditionToUnit(guardCu, 'BLINDED', 1, 'phil');

      const detected = evaluateFrontArcDetection(state, 'guard', { q: 0, r: 0 }, HEX_DIRECTIONS.EAST, 'TURN_START');
      expect(detected).toHaveLength(0);
      expect(rogueCu.activeConditions.some((c) => c.type === 'STEALTH')).toBe(true);
    });
  });

  describe('HENOSIS and MORTAL_EBB declarative lifecycle', () => {
    it('applies HENOSIS stat modifiers (+2 Attack Roll, +2 Armor, +2 Ward, +1 Move, +1 Speed) and transitions to 1-turn MORTAL_EBB (-1/-1/-1/-1/-1) on turn-end expiry', () => {
      const arena = createRadialArena(3);
      const theurge = createRecruit('theurge', 'Theurge', { faction: 'PLAYER' });
      const ally = createRecruit('ally', 'Ally', { faction: 'PLAYER' });
      arena.setUnitPosition('theurge', { q: 0, r: 0 });
      arena.setUnitPosition('ally', { q: 1, r: 0 });

      const state = createCombatState(arena, [theurge, ally], 'ally');
      const allyCu = state.units.get('ally')!;
      const baseArmor = allyCu.unit.effectiveVitals.armor;
      const baseWard = allyCu.unit.effectiveVitals.ward;
      const baseMove = allyCu.unit.effectiveVitals.move;
      const baseSpeed = allyCu.unit.effectiveVitals.speed;

      applyConditionToUnit(allyCu, 'HENOSIS', 2, 'theurge');
      expect(getEffectiveStat(allyCu, 'attackRoll')).toBe(2);
      expect(getEffectiveArmor(allyCu)).toBe(baseArmor + 2);
      expect(getEffectiveWard(allyCu)).toBe(baseWard + 2);
      expect(getEffectiveMove(allyCu)).toBe(baseMove + 1);
      expect(getEffectiveSpeed(allyCu)).toBe(baseSpeed + 1);
      expect(CONDITION_REGISTRY.HENOSIS.onOutgoingAttackRoll?.(allyCu.activeConditions[0], allyCu, allyCu)?.attackRollBonus).toBe(2);

      // End Ally Turn 1 -> HENOSIS decrements from 2 to 1
      allyCu.initiativeGauge = 200;
      endActiveTurn(state, 3);
      expect(allyCu.activeConditions.find((c) => c.type === 'HENOSIS')?.durationTurns).toBe(1);
      expect(allyCu.activeConditions.some((c) => c.type === 'MORTAL_EBB')).toBe(false);

      // End Ally Turn 2 -> HENOSIS expires and declaratively transitions into 1-turn MORTAL_EBB
      allyCu.initiativeGauge = 200;
      endActiveTurn(state, 3);
      expect(allyCu.activeConditions.some((c) => c.type === 'HENOSIS')).toBe(false);
      const ebbCond = allyCu.activeConditions.find((c) => c.type === 'MORTAL_EBB');
      expect(ebbCond).toBeDefined();
      expect(ebbCond?.durationTurns).toBe(1);
      expect(ebbCond?.sourceUnitId).toBe('theurge');

      // Check MORTAL_EBB stat penalties (respecting 0 floor on armor/ward and 1 floor on move/speed)
      expect(getEffectiveStat(allyCu, 'attackRoll')).toBe(-1);
      expect(getEffectiveArmor(allyCu)).toBe(Math.max(0, baseArmor - 1));
      expect(getEffectiveWard(allyCu)).toBe(Math.max(0, baseWard - 1));
      expect(getEffectiveMove(allyCu)).toBe(Math.max(1, baseMove - 1));
      expect(getEffectiveSpeed(allyCu)).toBe(Math.max(1, baseSpeed - 1));
      expect(CONDITION_REGISTRY.MORTAL_EBB.onOutgoingAttackRoll?.(ebbCond!, allyCu, allyCu)?.attackRollPenalty).toBe(1);

      // End Ally Turn 3 -> MORTAL_EBB expires
      allyCu.initiativeGauge = 200;
      endActiveTurn(state, 3);
      expect(allyCu.activeConditions.some((c) => c.type === 'MORTAL_EBB')).toBe(false);
      expect(getEffectiveStat(allyCu, 'attackRoll')).toBe(0);
    });
  });

  describe('Source-Defeated Condition Cleanup (B.15)', () => {
    const highRoller: DiceRoller = {
      rollD20: () => 20,
      rollDice: (count, sides) => count * sides,
      rollD20Detailed: (adv) => ({
        rolls: adv === 'NORMAL' ? [20] : [20, 20],
        kept: 20
      }),
      rollIndividualDice: (count, sides) => Array.from({ length: count }, () => sides)
    };

    const lethalStrike: Ability = {
      id: 'lethal_strike',
      name: 'Lethal Strike',
      description: 'Heavy physical strike',
      apCost: 1,
      range: 1,
      targetType: 'SINGLE_TARGET',
      defenseTarget: 'EVASION',
      attackModifierAttribute: 'force',
      damageType: 'PHYSICAL',
      effects: [
        {
          type: 'DAMAGE',
          damageProfile: { count: 2, sides: 6, modifierAttribute: 'force' }
        }
      ]
    };

    it('marks CHALLENGED, CHARMED, and HENOSIS with clearWhenSourceDefeated: true', () => {
      expect(CONDITION_REGISTRY.CHALLENGED.clearWhenSourceDefeated).toBe(true);
      expect(CONDITION_REGISTRY.CHARMED.clearWhenSourceDefeated).toBe(true);
      expect(CONDITION_REGISTRY.HENOSIS.clearWhenSourceDefeated).toBe(true);
      expect(CONDITION_REGISTRY.BURN.clearWhenSourceDefeated).toBeUndefined();
      expect(CONDITION_REGISTRY.POISON.clearWhenSourceDefeated).toBeUndefined();
      expect(CONDITION_REGISTRY.EXPOSED.clearWhenSourceDefeated).toBeUndefined();
      expect(CONDITION_REGISTRY.MORTAL_EBB.clearWhenSourceDefeated).toBeUndefined();
    });

    it('purgeConditionsFromDefeatedSource removes source-bound conditions, runs onRemoved without MORTAL_EBB, preserves other sources, and logs CONDITION_BROKEN', () => {
      const arena = createRadialArena(3);
      const knight = createRecruit('knight', 'Garrick', { faction: 'PLAYER' });
      const phil = createRecruit('phil', 'Sylvia', { faction: 'PLAYER' });
      const theurge = createRecruit('theurge', 'Aurelia', { faction: 'PLAYER' });
      const ally = createRecruit('ally', 'Alden', { faction: 'PLAYER' });
      const bandit = createRecruit('bandit', 'Bandit', { faction: 'ENEMY' });
      const orc = createRecruit('orc', 'Orc', { faction: 'ENEMY' });

      arena.setUnitPosition('knight', { q: 0, r: 0 });
      arena.setUnitPosition('phil', { q: 1, r: 0 });
      arena.setUnitPosition('theurge', { q: -1, r: 0 });
      arena.setUnitPosition('ally', { q: -1, r: 1 });
      arena.setUnitPosition('bandit', { q: 0, r: 1 });
      arena.setUnitPosition('orc', { q: 1, r: 1 });

      const state = createCombatState(arena, [knight, phil, theurge, ally, bandit, orc], 'knight');
      const allyCu = state.units.get('ally')!;
      const banditCu = state.units.get('bandit')!;
      const orcCu = state.units.get('orc')!;

      applyConditionToUnit(banditCu, 'CHALLENGED', 2, 'knight');
      applyConditionToUnit(banditCu, 'BURN', 2, 'knight', 2);
      applyConditionToUnit(orcCu, 'CHARMED', 2, 'knight', undefined, 'PLAYER');
      applyConditionToUnit(allyCu, 'HENOSIS', 2, 'knight');
      // Condition from a different living source must remain intact
      applyConditionToUnit(allyCu, 'CHALLENGED', 2, 'orc');

      expect(orcCu.faction).toBe('PLAYER');

      purgeConditionsFromDefeatedSource(state, 'knight');

      expect(banditCu.activeConditions.some((c) => c.type === 'CHALLENGED')).toBe(false);
      // DoT condition from defeated knight stays active
      expect(banditCu.activeConditions.some((c) => c.type === 'BURN')).toBe(true);
      // CHARMED reverted orc faction back to ENEMY
      expect(orcCu.activeConditions.some((c) => c.type === 'CHARMED')).toBe(false);
      expect(orcCu.faction).toBe('ENEMY');
      // HENOSIS cleared WITHOUT applying MORTAL_EBB
      expect(allyCu.activeConditions.some((c) => c.type === 'HENOSIS')).toBe(false);
      expect(allyCu.activeConditions.some((c) => c.type === 'MORTAL_EBB')).toBe(false);
      // Condition from living orc stays
      expect(allyCu.activeConditions.some((c) => c.type === 'CHALLENGED' && c.sourceUnitId === 'orc')).toBe(true);

      const clearedLogs = state.combatLog.filter(
        (e) => e.metadata?.type === 'CONDITION_BROKEN' && e.metadata.reason === 'source_defeated'
      );
      expect(clearedLogs).toHaveLength(3);
    });

    it('clears CHALLENGED, CHARMED (reverting faction), and HENOSIS (no MORTAL_EBB) when source dies via attack damage', () => {
      const arena = createRadialArena(3);
      const source = createRecruit('source', 'Source Hero', { faction: 'PLAYER' });
      const ally = createRecruit('ally', 'Allied Knight', { faction: 'PLAYER' });
      const killer = createRecruit('killer', 'Killer', { faction: 'ENEMY' });
      const bystander = createRecruit('bystander', 'Bystander', { faction: 'ENEMY' });
      const thirdEnemy = createRecruit('third', 'Third', { faction: 'PLAYER' });

      arena.setUnitPosition('source', { q: 0, r: 0 });
      arena.setUnitPosition('ally', { q: -1, r: 0 });
      arena.setUnitPosition('killer', { q: 1, r: 0 });
      arena.setUnitPosition('bystander', { q: 2, r: 0 });
      arena.setUnitPosition('third', { q: 1, r: 1 });

      const state = createCombatState(arena, [source, ally, killer, bystander, thirdEnemy], 'killer');
      const sourceCu = state.units.get('source')!;
      const allyCu = state.units.get('ally')!;
      const killerCu = state.units.get('killer')!;
      const bystanderCu = state.units.get('bystander')!;
      sourceCu.currentHp = 1;

      applyConditionToUnit(killerCu, 'CHALLENGED', 2, 'source');
      applyConditionToUnit(bystanderCu, 'CHARMED', 2, 'source', undefined, 'PLAYER');
      applyConditionToUnit(allyCu, 'HENOSIS', 2, 'source');

      expect(bystanderCu.faction).toBe('PLAYER');

      executeAbility(state, 'killer', lethalStrike, { targetUnitId: 'source' }, highRoller);

      expect(sourceCu.isDefeated).toBe(true);
      expect(killerCu.activeConditions.some((c) => c.type === 'CHALLENGED')).toBe(false);
      expect(bystanderCu.activeConditions.some((c) => c.type === 'CHARMED')).toBe(false);
      expect(bystanderCu.faction).toBe('ENEMY');
      expect(allyCu.activeConditions.some((c) => c.type === 'HENOSIS')).toBe(false);
      expect(allyCu.activeConditions.some((c) => c.type === 'MORTAL_EBB')).toBe(false);

      // Subsequent attack by previously-challenged unit against another target suffers no CHALLENGED Disadvantage or EXPOSED
      const followUp = executeAbility(state, 'killer', lethalStrike, { targetUnitId: 'third' }, highRoller);
      expect(followUp.type).toBe('ATTACK');
      if (followUp.type === 'ATTACK') {
        expect(followUp.details.diceBreakdown?.advantage).toBe('NORMAL');
      }
      expect(killerCu.activeConditions.some((c) => c.type === 'EXPOSED')).toBe(false);
    });

    it('clears source-bound conditions when source dies via self-sacrifice hpCost', () => {
      const arena = createRadialArena(3);
      const berserker = createRecruit('zerk', 'Berserker', { faction: 'PLAYER' });
      const bandit = createRecruit('bandit', 'Bandit', { faction: 'ENEMY' });
      arena.setUnitPosition('zerk', { q: 0, r: 0 });
      arena.setUnitPosition('bandit', { q: 1, r: 0 });

      const state = createCombatState(arena, [berserker, bandit], 'zerk');
      const zerkCu = state.units.get('zerk')!;
      const banditCu = state.units.get('bandit')!;
      zerkCu.currentHp = 2;

      applyConditionToUnit(banditCu, 'CHALLENGED', 2, 'zerk');

      const sacrificeAbility: Ability = {
        ...lethalStrike,
        id: 'sacrifice_strike',
        name: 'Blood Sacrifice',
        hpCost: 2
      };

      executeAbility(state, 'zerk', sacrificeAbility, { targetUnitId: 'bandit' }, highRoller);

      expect(zerkCu.isDefeated).toBe(true);
      expect(banditCu.activeConditions.some((c) => c.type === 'CHALLENGED')).toBe(false);
    });

    it('clears source-bound conditions when source dies via turn-start DoT damage', () => {
      const arena = createRadialArena(3);
      const knight = createRecruit('knight', 'Knight', { faction: 'PLAYER' });
      const ally = createRecruit('ally', 'Ally', { faction: 'PLAYER' });
      const bandit = createRecruit('bandit', 'Bandit', { faction: 'ENEMY' });
      arena.setUnitPosition('knight', { q: 0, r: 0 });
      arena.setUnitPosition('ally', { q: -1, r: 0 });
      arena.setUnitPosition('bandit', { q: 1, r: 0 });

      const state = createCombatState(arena, [knight, ally, bandit], 'ally');
      const knightCu = state.units.get('knight')!;
      const banditCu = state.units.get('bandit')!;
      knightCu.currentHp = 2;
      knightCu.initiativeGauge = 200;

      applyConditionToUnit(knightCu, 'BURN', 2, 'bandit', 3);
      applyConditionToUnit(banditCu, 'CHALLENGED', 2, 'knight');

      endActiveTurn(state, 0);

      expect(knightCu.isDefeated).toBe(true);
      expect(banditCu.activeConditions.some((c) => c.type === 'CHALLENGED')).toBe(false);
    });

    it('clears source-bound conditions when source dies via delayed bombardment detonation', () => {
      const arena = createRadialArena(4);
      const bombardier = createRecruit('bombardier', 'Bombardier', { faction: 'ENEMY' });
      const victim = createRecruit('victim', 'Knight', { faction: 'PLAYER' });
      const bandit = createRecruit('bandit', 'Bandit', { faction: 'ENEMY' });
      arena.setUnitPosition('bombardier', { q: 0, r: 0 });
      arena.setUnitPosition('victim', { q: 2, r: 0 });
      arena.setUnitPosition('bandit', { q: 3, r: 0 });

      const state = createCombatState(arena, [bombardier, victim, bandit], 'bombardier');
      const victimCu = state.units.get('victim')!;
      const banditCu = state.units.get('bandit')!;
      victimCu.currentHp = 1;

      applyConditionToUnit(banditCu, 'CHALLENGED', 2, 'victim');

      state.pendingBombardments = [
        {
          id: 'barrage-1',
          sourceUnitId: 'bombardier',
          sourceUnitName: 'Bombardier',
          sourceFaction: 'ENEMY',
          abilityId: 'siege_barrage',
          abilityName: 'Siege Barrage',
          centerCoord: { q: 2, r: 0 },
          hexCoords: [{ q: 2, r: 0 }],
          damageProfile: { count: 2, sides: 6, modifierAttribute: 'force' },
          attackModifierAttribute: 'finesse',
          snapshotForce: 4,
          snapshotFinesse: 4,
          snapshotFocus: 0,
          snapshotZeroedInStacks: 0
        }
      ];

      resolvePendingBombardmentsOnTurnStart(state, 'bombardier', highRoller);

      expect(victimCu.isDefeated).toBe(true);
      expect(banditCu.activeConditions.some((c) => c.type === 'CHALLENGED')).toBe(false);
    });
  });
});
