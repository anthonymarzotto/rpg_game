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
import { isFlankOrRear } from './flanking';
import { getEffectiveAbility } from './modifiers';

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
  readonly isDamaging: boolean;
}

/**
 * Preview summary formatted for UI presentation.
 */
export interface TargetPreview {
  readonly targetUnitId: string;
  readonly targetName: string;
  readonly toHitChance: number;
  readonly targetDefense: number;
  readonly defenseType: 'Evasion' | 'Resolve';
  readonly diceDescription: string;
  readonly damageRange: string;
  readonly isBlockedLoS: boolean;
  readonly blockReason?: string;
  readonly expectedDamage: number;
  readonly combatArc: CombatArc;
  readonly isFlankAdvantage: boolean;
  readonly hasLoS: boolean;
  readonly mitigation: number;
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

  const effectiveAbility = getEffectiveAbility(ability, actorCu.abilityModifiers);

  const dist = hexDistance(effectiveOrigin, targetCoord);
  if (dist > effectiveAbility.range && effectiveAbility.targetType !== 'SELF') {
    return null;
  }

  const validation = canExecuteAbility(state, actorUnitId, effectiveAbility, {
    coord: targetCoord,
    targetUnitId,
    originCoord: effectiveOrigin,
    ignoreApCheck: true
  });

  if (!validation.valid && validation.reason !== 'Line-of-Sight is blocked.') {
    return null;
  }

  const hasLoS = state.arena.hasLineOfSight(effectiveOrigin, targetCoord);
  const defenseType = effectiveAbility.defenseTarget === 'EVASION' ? 'Evasion' : 'Resolve';
  const targetDefense =
    effectiveAbility.defenseTarget === 'EVASION'
      ? getEffectiveEvasion(targetCu)
      : getEffectiveResolve(targetCu);

  const combatArc = getCombatArc(targetCu.facing, targetCoord, effectiveOrigin);
  let isFlankAdvantage = false;
  let bonusDamageProfile = undefined;

  const flankEffect = effectiveAbility.effects.find((e) => e.condition === 'FLANK_OR_REAR');
  if (flankEffect) {
    // Check if attacker arc is Flank/Rear or if an allied pincer exists
    if (combatArc === 'FLANK' || combatArc === 'REAR' || isFlankOrRear(state, actorUnitId, targetUnitId)) {
      isFlankAdvantage = flankEffect.grantsAdvantage !== false;
      bonusDamageProfile = flankEffect.bonusDamage;
    }
  }

  // Check Momentum Advantage
  const isMomentumAdvantage =
    (actorCu.hexesMovedThisTurn ?? 0) >= 2 &&
    (actorCu.passives ?? []).some((p) => p.id === 'momentum');
  const hasAdvantage = isFlankAdvantage || isMomentumAdvantage;

  // Damage effect lookup
  const damageEffect = effectiveAbility.effects.find((e) => e.type === 'DAMAGE');
  const diceProfile = damageEffect?.damageProfile;
  const flatDamage = damageEffect?.flatDamage ?? 0;

  // Approximate to-hit chance on d20
  const attackAttr = effectiveAbility.attackModifierAttribute ?? diceProfile?.modifierAttribute;
  const attackModifier = attackAttr ? actorCu.unit.baseAttributes[attackAttr] : 0;
  const needed = Math.max(1, Math.min(20, targetDefense - attackModifier));
  const singleP = (21 - needed) / 20;
  const effectiveP = hasAdvantage ? 1 - Math.pow(1 - singleP, 2) : singleP;
  const rawHitChance = Math.round(effectiveP * 100);
  const toHitChance = Math.max(5, Math.min(95, rawHitChance));

  const damageAttr = diceProfile?.modifierAttribute;
  const damageModifier = (damageAttr ? actorCu.unit.baseAttributes[damageAttr] : 0) + flatDamage;

  const bonusCount = bonusDamageProfile?.count ?? 0;
  const bonusSides = bonusDamageProfile?.sides ?? 0;

  let diceDesc = diceProfile
    ? `${diceProfile.count}d${diceProfile.sides} + ${damageAttr ?? ''}`
    : 'Support';
  if (flatDamage > 0) {
    diceDesc += ` +${flatDamage}`;
  }
  if (bonusDamageProfile) {
    diceDesc += ` (+${bonusCount}d${bonusSides})`;
  }

  const mitigation =
    effectiveAbility.damageType === 'PHYSICAL'
      ? getEffectiveArmor(targetCu)
      : getEffectiveWard(targetCu);

  if (!diceProfile && flatDamage === 0) {
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
      mitigation: 0,
      isDamaging: false
    };
  }

  const baseCount = diceProfile?.count ?? 0;
  const baseSides = diceProfile?.sides ?? 0;

  const minDmg = Math.max(1, baseCount + bonusCount + damageModifier - mitigation);
  const maxDmg = Math.max(1, baseCount * baseSides + bonusCount * bonusSides + damageModifier - mitigation);

  const avgBaseRoll = baseCount * ((baseSides + 1) / 2);
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
    mitigation,
    isDamaging: true
  };
}

/**
 * Computes a target preview for UI display when hovering a candidate target hex.
 */
export function computeTargetPreview(
  state: CombatState,
  actorUnitId: string,
  ability: Ability,
  targetCoord: HexCoord,
  originCoord?: HexCoord
): TargetPreview | null {
  const metrics = computeAbilityMetrics(state, actorUnitId, ability, targetCoord, originCoord);
  if (!metrics) return null;

  return {
    targetUnitId: metrics.targetUnitId,
    targetName: metrics.targetName,
    toHitChance: metrics.toHitChance,
    targetDefense: metrics.targetDefense,
    defenseType: metrics.defenseType,
    diceDescription: metrics.diceDescription,
    damageRange: metrics.isDamaging
      ? `${metrics.minDamage} – ${metrics.maxDamage} (Soak: ${metrics.mitigation})`
      : 'Buff',
    isBlockedLoS: !metrics.hasLoS,
    blockReason: !metrics.hasLoS ? 'Line-of-Sight is screened/blocked' : undefined,
    expectedDamage: metrics.expectedDamage,
    combatArc: metrics.combatArc,
    isFlankAdvantage: metrics.isFlankAdvantage,
    hasLoS: metrics.hasLoS,
    mitigation: metrics.mitigation
  };
}
