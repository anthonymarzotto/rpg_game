import { Ability, AbilityEffect } from '../types/ability';
import { EffectiveAbility } from '../types/modifier';
import { CombatState, CombatUnit, HitOutcome } from './types';
import { getEffectiveEvasion, getEffectiveResolve } from './effectiveVitals';
import { DiceRoller, RollAdvantage } from './dice';
import { COMBAT_RESOLUTION_CONFIG } from '../config/balance';
import { HexCoord } from '../grid/hex';
import { evaluateTargetAuras } from './auras';
import { getConditionDefinition } from './conditions';

export interface AttackRollEvaluationOptions {
  readonly state?: CombatState;
  readonly originCoord?: HexCoord;
  readonly targetCoord?: HexCoord;
  readonly elevationDelta?: number;
  readonly advantage?: RollAdvantage;
  readonly rollBonus?: number;
  readonly rollPenalty?: number;
  readonly effect?: AbilityEffect;
}

export interface AttackRollOptions extends AttackRollEvaluationOptions {}

export interface ElevationAttackModifierResult {
  readonly rollBonus: number;
  readonly rollPenalty: number;
  readonly grantsAdvantage: boolean;
  readonly grantsDisadvantage: boolean;
  readonly description?: string;
}

export interface AttackRollContext {
  readonly actor: CombatUnit;
  readonly target: CombatUnit;
  readonly netModifier: number;
  readonly targetDefense: number;
  readonly defenseType: 'Evasion' | 'Resolve';
  readonly advantageSources: readonly string[];
  readonly disadvantageSources: readonly string[];
  readonly hasAdvantage: boolean;
  readonly hasDisadvantage: boolean;
  readonly finalAdvantage: RollAdvantage;
  readonly neededRoll: number;
  readonly hitProbability: number;
}

/**
 * Calculates vertical attack roll bonuses, penalties, Advantage, or Disadvantage
 * based on the elevation difference (actorElevation - targetElevation).
 * Supports traits and ability properties that suppress upward penalties.
 */
export function calculateElevationAttackModifier(
  actorCu: CombatUnit,
  elevationDelta: number,
  ability: Ability
): ElevationAttackModifierResult {
  const base: ElevationAttackModifierResult = {
    rollBonus: 0,
    rollPenalty: 0,
    grantsAdvantage: false,
    grantsDisadvantage: false
  };

  const ignoresPenalty =
    ability.ignoresElevationPenalty ||
    actorCu.passives?.some((p) => p.ignoresElevationPenalty);

  if (elevationDelta === 1) {
    return { ...base, rollBonus: 2, description: 'High Ground (+2)' };
  }
  if (elevationDelta >= 2) {
    return { ...base, grantsAdvantage: true, description: 'High Ground (Advantage)' };
  }
  if (elevationDelta === -1) {
    return ignoresPenalty
      ? { ...base, description: 'Low Ground Penalty Negated' }
      : { ...base, rollPenalty: 2, description: 'Low Ground (-2)' };
  }
  if (elevationDelta <= -2) {
    return ignoresPenalty
      ? { ...base, description: 'Low Ground Disadvantage Negated' }
      : { ...base, grantsDisadvantage: true, description: 'Low Ground (Disadvantage)' };
  }

  return base;
}

export interface AttackRollResult {
  readonly hitOutcome: HitOutcome;
  readonly d20: number;
  readonly modifier: number;
  readonly totalScore: number;
  readonly targetDefense: number;
  readonly rawD20Rolls?: readonly number[];
  readonly advantage?: RollAdvantage;
  readonly defenseType?: 'Evasion' | 'Resolve';
}

/**
 * Returns the actor attribute modifier applicable to the ability damage profile.
 */
export function getAbilityModifier(actorCu: CombatUnit, ability: Ability): number {
  const damageEffect = ability.effects?.find((e) => e.type === 'DAMAGE');
  const attr = damageEffect?.damageProfile?.modifierAttribute;
  return attr ? actorCu.unit.baseAttributes[attr] : 0;
}

/**
 * Returns the actor attribute modifier applicable to the d20 attack roll (To-Hit).
 */
export function getAttackRollModifier(actorCu: CombatUnit, ability: Ability): number {
  const attr = ability.attackModifierAttribute;
  const baseAttr = attr ? actorCu.unit.baseAttributes[attr] : 0;
  const attackRollBonus = (ability as EffectiveAbility).attackRollBonus ?? 0;
  const activeAttackMod = (actorCu.activeModifiers ?? []).reduce(
    (sum, m) => sum + (m.stat === 'attackRoll' ? m.value : 0),
    0
  );
  return baseAttr + attackRollBonus + activeAttackMod;
}

/**
 * Centrally evaluates the attack roll context, aggregating base modifiers, ability effects,
 * conditions via the declarative registry, elevation difference (including spatial lookahead),
 * protective auras, advantage/disadvantage determination, and exact d20 hit probability.
 */
export function evaluateAttackRollContext(
  actorCu: CombatUnit,
  targetCu: CombatUnit,
  ability: Ability,
  options?: AttackRollEvaluationOptions
): AttackRollContext {
  const baseModifier = getAttackRollModifier(actorCu, ability);
  let totalBonus = options?.rollBonus ?? 0;
  let totalPenalty = options?.rollPenalty ?? 0;
  const advantageSources: string[] = [];
  const disadvantageSources: string[] = [];

  // 1. Explicit advantage/disadvantage in options
  if (options?.advantage === 'ADVANTAGE') {
    advantageSources.push('Context (Advantage)');
  } else if (options?.advantage === 'DISADVANTAGE') {
    disadvantageSources.push('Context (Disadvantage)');
  }

  // 2. Ability effect modifiers
  const effect = options?.effect ?? ability.effects?.find((e) => e.type === 'DAMAGE');
  if (effect) {
    if (effect.grantsAdvantage) {
      advantageSources.push('Ability Effect (Advantage)');
    }
    if (effect.grantsDisadvantage) {
      disadvantageSources.push('Ability Effect (Disadvantage)');
    }
    if (effect.attackRollBonus) {
      totalBonus += effect.attackRollBonus;
    }
    if (effect.attackRollPenalty) {
      totalPenalty += effect.attackRollPenalty;
    }
  }

  // 3. Elevation modifier (computed from coordinates or explicit elevationDelta)
  let elevationDelta = options?.elevationDelta;
  if (elevationDelta === undefined && options?.state) {
    const effectiveOrigin = options.originCoord ?? options.state.arena.getUnitPosition(actorCu.unit.id);
    const effectiveTarget = options.targetCoord ?? options.state.arena.getUnitPosition(targetCu.unit.id);
    if (effectiveOrigin && effectiveTarget) {
      const actorElevation = options.state.arena.getElevation(effectiveOrigin);
      const targetElevation = options.state.arena.getElevation(effectiveTarget);
      elevationDelta = actorElevation - targetElevation;
    }
  }

  if (elevationDelta !== undefined && elevationDelta !== 0) {
    const elevMod = calculateElevationAttackModifier(actorCu, elevationDelta, ability);
    totalBonus += elevMod.rollBonus;
    totalPenalty += elevMod.rollPenalty;
    if (elevMod.grantsAdvantage) {
      advantageSources.push(elevMod.description ?? 'Elevation Advantage');
    }
    if (elevMod.grantsDisadvantage) {
      disadvantageSources.push(elevMod.description ?? 'Elevation Disadvantage');
    }
  }

  // 4. Target protective auras (if state is present and rollPenalty wasn't already passed)
  if (options?.rollPenalty === undefined && options?.state) {
    const auraEval = evaluateTargetAuras(targetCu, actorCu, options.state);
    totalPenalty += auraEval.attackRollPenalty;
  }

  // 5. Conditions on actor (outgoing)
  if (actorCu.activeConditions) {
    for (const cond of actorCu.activeConditions) {
      const def = getConditionDefinition(cond.type);
      const mod = def?.onOutgoingAttackRoll?.(cond, actorCu, targetCu, options?.state);
      if (mod?.advantage) {
        advantageSources.push(mod.description ?? `${cond.type} (Advantage)`);
      }
      if (mod?.disadvantage) {
        disadvantageSources.push(mod.description ?? `${cond.type} (Disadvantage)`);
      }
      if (mod?.attackRollBonus) {
        totalBonus += mod.attackRollBonus;
      }
      if (mod?.attackRollPenalty) {
        totalPenalty += mod.attackRollPenalty;
      }
    }
  }

  // 6. Conditions on target (incoming)
  if (targetCu.activeConditions) {
    for (const cond of targetCu.activeConditions) {
      const def = getConditionDefinition(cond.type);
      const mod = def?.onIncomingAttackRoll?.(cond, actorCu, targetCu, options?.state);
      if (mod?.advantage) {
        advantageSources.push(mod.description ?? `${cond.type} (Advantage)`);
      }
      if (mod?.disadvantage) {
        disadvantageSources.push(mod.description ?? `${cond.type} (Disadvantage)`);
      }
      if (mod?.attackRollBonus) {
        totalBonus += mod.attackRollBonus;
      }
      if (mod?.attackRollPenalty) {
        totalPenalty += mod.attackRollPenalty;
      }
    }
  }

  // 7. Advantage / Disadvantage cancellation
  const hasAdvantage = advantageSources.length > 0;
  const hasDisadvantage = disadvantageSources.length > 0;
  const finalAdvantage: RollAdvantage =
    hasAdvantage === hasDisadvantage ? 'NORMAL' : hasAdvantage ? 'ADVANTAGE' : 'DISADVANTAGE';

  // 8. Defense target & net modifier
  const netModifier = baseModifier + totalBonus - totalPenalty;
  const targetDefense =
    ability.defenseTarget === 'EVASION'
      ? getEffectiveEvasion(targetCu)
      : getEffectiveResolve(targetCu);
  const defenseType = ability.defenseTarget === 'EVASION' ? 'Evasion' : 'Resolve';

  // 9. Exact d20 probability math clamped between 5% and 95%
  const neededRoll = Math.max(1, Math.min(20, targetDefense - netModifier));
  const rawP = Math.max(0.05, Math.min(0.95, (21 - neededRoll) / 20));
  let hitProbability: number;
  if (finalAdvantage === 'ADVANTAGE') {
    hitProbability = 1 - Math.pow(1 - rawP, 2);
  } else if (finalAdvantage === 'DISADVANTAGE') {
    hitProbability = Math.pow(rawP, 2);
  } else {
    hitProbability = rawP;
  }
  hitProbability = Math.max(0.05, Math.min(0.95, hitProbability));

  return {
    actor: actorCu,
    target: targetCu,
    netModifier,
    targetDefense,
    defenseType,
    advantageSources,
    disadvantageSources,
    hasAdvantage,
    hasDisadvantage,
    finalAdvantage,
    neededRoll,
    hitProbability
  };
}

/**
 * Resolves an attack roll comparing d20 + modifier against the target defense score,
 * supporting first-class Advantage/Disadvantage, elevation modifiers, conditions, and custom critical thresholds.
 */
export function resolveAttackRoll(
  actorCu: CombatUnit,
  targetCu: CombatUnit,
  ability: Ability,
  diceRoller: DiceRoller,
  options?: AttackRollOptions
): AttackRollResult {
  const context = evaluateAttackRollContext(actorCu, targetCu, ability, options);
  let d20: number;
  let rawD20Rolls: number[];

  if (diceRoller.rollD20Detailed) {
    const detailed = diceRoller.rollD20Detailed(context.finalAdvantage);
    d20 = detailed.kept;
    rawD20Rolls = [...detailed.rolls];
  } else {
    d20 = diceRoller.rollD20(context.finalAdvantage);
    rawD20Rolls = [d20];
  }

  const totalScore = d20 + context.netModifier;

  const isCritBoosted = ability.effects?.some((e) => e.type === 'CRIT_BOOST');
  let naturalCritThreshold = isCritBoosted ? 19 : 20;

  // Check health threshold passives (e.g. Deathbound Fury expanding natural crit to 19-20)
  const maxHp = actorCu.unit.effectiveVitals.maxHp;
  if (actorCu.passives && maxHp > 0) {
    for (const passive of actorCu.passives) {
      if (passive.healthThreshold?.critThreshold) {
        const thresholdHp = Math.floor(maxHp * passive.healthThreshold.maxPercent);
        if (actorCu.currentHp <= thresholdHp) {
          if (
            !passive.healthThreshold.damageTypeFilter ||
            passive.healthThreshold.damageTypeFilter === ability.damageType
          ) {
            naturalCritThreshold = Math.min(naturalCritThreshold, passive.healthThreshold.critThreshold);
          }
        }
      }
    }
  }

  let hitOutcome: HitOutcome = 'MISS';
  if (d20 >= naturalCritThreshold) {
    hitOutcome = 'CRITICAL_HIT';
  } else if (d20 === 1 || totalScore < context.targetDefense - COMBAT_RESOLUTION_CONFIG.grazeMargin) {
    hitOutcome = 'MISS';
  } else if (totalScore >= context.targetDefense) {
    hitOutcome = 'SOLID_HIT';
  } else {
    hitOutcome = 'GRAZE';
  }

  return {
    hitOutcome,
    d20,
    modifier: context.netModifier,
    totalScore,
    targetDefense: context.targetDefense,
    rawD20Rolls,
    advantage: context.finalAdvantage,
    defenseType: context.defenseType
  };
}
