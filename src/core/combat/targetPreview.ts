import { Ability } from '../types/ability';
import { HexCoord, hexDistance, CombatArc, getCombatArc } from '../grid/hex';
import { CombatState } from './types';
import {
  getEffectiveEvasion,
  getEffectiveResolve,
  getEffectiveArmor,
  getEffectiveWard
} from './effectiveVitals';
import { canExecuteAbility } from './validator';
import { isFlankOrRear } from './resolver';

/**
 * Authoritative tactical calculations for an ability projected against a target.
 * Shared directly between the UI target preview and the AI decision engine.
 */
export interface AbilityMetrics {
  readonly targetUnitId: string;
  readonly targetName: string;
  readonly toHitChance: number;
  readonly targetDefense: number;
  readonly defenseType: 'Evasion' | 'Resolve';
  readonly minDamage: number;
  readonly maxDamage: number;
  readonly expectedDamage: number;
  readonly isFlankAdvantage: boolean;
  readonly combatArc: CombatArc;
  readonly hasLoS: boolean;
  readonly diceDescription: string;
  readonly mitigation: number;
}

/**
 * Preview summary formatted for UI presentation.
 */
export interface TargetPreview {
  readonly targetUnitId: string;
  readonly targetName: string;
  readonly toHitChance: number;
  readonly targetDefense: number;
  readonly defenseType: string;
  readonly diceDescription: string;
  readonly damageRange: string;
  readonly isBlockedLoS: boolean;
  readonly blockReason?: string;
  readonly combatArc?: CombatArc;
  readonly isFlankAdvantage?: boolean;
}

/**
 * Pure calculation function projecting hit rates, damage range, and combat arcs.
 * Supports an optional hypothetical originCoord for zero-clone spatial lookahead.
 */
export function computeAbilityMetrics(
  state: CombatState,
  actorUnitId: string,
  ability: Ability,
  targetCoord: HexCoord,
  originCoord?: HexCoord
): AbilityMetrics | null {
  const actorCu = state.units.get(actorUnitId);
  const effectiveOrigin = originCoord ?? state.arena.getUnitPosition(actorUnitId);
  if (!actorCu || !effectiveOrigin) {
    return null;
  }

  const targetUnitId = state.arena.getUnitAt(targetCoord);
  if (!targetUnitId) return null;

  const targetCu = state.units.get(targetUnitId);
  if (!targetCu || targetCu.isDefeated) return null;

  const dist = hexDistance(effectiveOrigin, targetCoord);
  if (dist > ability.range && ability.targetType !== 'SELF') {
    return null;
  }

  const validation = canExecuteAbility(state, actorUnitId, ability, {
    coord: targetCoord,
    targetUnitId,
    originCoord: effectiveOrigin,
    ignoreApCheck: true
  });

  if (!validation.valid && validation.reason !== 'Line-of-Sight is blocked.') {
    return null;
  }

  const hasLoS = state.arena.hasLineOfSight(effectiveOrigin, targetCoord);
  const defenseType = ability.defenseTarget === 'EVASION' ? 'Evasion' : 'Resolve';
  const targetDefense =
    ability.defenseTarget === 'EVASION'
      ? getEffectiveEvasion(targetCu)
      : getEffectiveResolve(targetCu);

  const combatArc = getCombatArc(targetCu.facing, targetCoord, effectiveOrigin);
  let isFlankAdvantage = false;
  let bonusDamageProfile = undefined;

  if (ability.conditionalBonus?.condition === 'FLANK_OR_REAR') {
    // Check if attacker arc is Flank/Rear or if an allied pincer exists
    if (combatArc === 'FLANK' || combatArc === 'REAR' || isFlankOrRear(state, actorUnitId, targetUnitId)) {
      isFlankAdvantage = true;
      bonusDamageProfile = ability.conditionalBonus.bonusDamage;
    }
  }

  // Check Momentum Advantage
  const isMomentumAdvantage =
    (actorCu.hexesMovedThisTurn ?? 0) >= 2 &&
    (actorCu.passives ?? []).some((p) => p.id === 'momentum');
  const hasAdvantage = isFlankAdvantage || isMomentumAdvantage;

  // Approximate to-hit chance on d20
  const attackAttr = ability.attackModifierAttribute ?? ability.damageProfile?.modifierAttribute;
  const attackModifier = attackAttr ? actorCu.unit.baseAttributes[attackAttr] : 0;
  const needed = Math.max(1, Math.min(20, targetDefense - attackModifier));
  const singleP = (21 - needed) / 20;
  const effectiveP = hasAdvantage ? 1 - Math.pow(1 - singleP, 2) : singleP;
  const rawHitChance = Math.round(effectiveP * 100);
  const toHitChance = Math.max(5, Math.min(95, rawHitChance));

  const diceProfile = ability.damageProfile;
  const damageAttr = diceProfile?.modifierAttribute;
  const damageModifier = damageAttr ? actorCu.unit.baseAttributes[damageAttr] : 0;

  const bonusCount = bonusDamageProfile?.count ?? 0;
  const bonusSides = bonusDamageProfile?.sides ?? 0;

  let diceDesc = diceProfile
    ? `${diceProfile.count}d${diceProfile.sides} + ${damageAttr ?? ''}`
    : 'Support';
  if (bonusDamageProfile) {
    diceDesc += ` (+${bonusCount}d${bonusSides})`;
  }

  const mitigation =
    ability.damageType === 'PHYSICAL'
      ? getEffectiveArmor(targetCu)
      : getEffectiveWard(targetCu);

  if (!diceProfile) {
    return {
      targetUnitId,
      targetName: targetCu.unit.name,
      toHitChance: 100,
      targetDefense,
      defenseType,
      minDamage: 0,
      maxDamage: 0,
      expectedDamage: 0,
      isFlankAdvantage,
      combatArc,
      hasLoS,
      diceDescription: diceDesc,
      mitigation: 0
    };
  }

  const minDmg = Math.max(1, diceProfile.count + bonusCount + damageModifier - mitigation);
  const maxDmg = Math.max(1, diceProfile.count * diceProfile.sides + bonusCount * bonusSides + damageModifier - mitigation);

  const avgBaseRoll = diceProfile.count * ((diceProfile.sides + 1) / 2);
  const avgBonusRoll = bonusCount * ((bonusSides + 1) / 2);
  const avgUnmitigated = avgBaseRoll + avgBonusRoll + damageModifier;
  const avgHitDamage = Math.max(1, avgUnmitigated - mitigation);
  const expectedDamage = Math.round((toHitChance / 100) * avgHitDamage * 10) / 10;

  return {
    targetUnitId,
    targetName: targetCu.unit.name,
    toHitChance,
    targetDefense,
    defenseType,
    minDamage: minDmg,
    maxDamage: maxDmg,
    expectedDamage,
    isFlankAdvantage,
    combatArc,
    hasLoS,
    diceDescription: diceDesc,
    mitigation
  };
}

/**
 * Computes live tactical target preview information formatted for the UI.
 */
export function computeTargetPreview(
  state: CombatState,
  actorUnitId: string,
  ability: Ability,
  hoveredCoord: HexCoord
): TargetPreview | null {
  const metrics = computeAbilityMetrics(state, actorUnitId, ability, hoveredCoord);
  if (!metrics) return null;

  return {
    targetUnitId: metrics.targetUnitId,
    targetName: metrics.targetName,
    toHitChance: metrics.toHitChance,
    targetDefense: metrics.targetDefense,
    defenseType: metrics.defenseType,
    diceDescription: metrics.diceDescription,
    damageRange:
      ability.damageProfile
        ? `${metrics.minDamage} – ${metrics.maxDamage} (Soak: ${metrics.mitigation})`
        : 'Buff',
    isBlockedLoS: !metrics.hasLoS,
    blockReason: !metrics.hasLoS ? 'Line-of-Sight is screened/blocked' : undefined,
    combatArc: metrics.combatArc,
    isFlankAdvantage: metrics.isFlankAdvantage
  };
}
