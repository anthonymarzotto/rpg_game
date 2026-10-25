import { Ability } from '../types/ability';
import { HexCoord, hexDistance, CombatArc, getCombatArc, getHexesInRange, hexEquals } from '../grid/hex';
import { CombatState } from './types';
import { TriadAttributes } from '../types/stats';
import {
  getEffectiveArmor,
  getEffectiveWard
} from './effectiveVitals';
import { canExecuteAbility, formatLoSObstructionReason } from './validator';
import { isFlankOrRear } from './flanking';
import { getEffectiveAbility } from './modifiers';
import { evaluateAttackRollContext } from './attackRoll';
import { RollAdvantage } from './dice';

/**
 * Tactical metrics for secondary targets within an AoE blast zone.
 */
export interface SplashTargetMetrics {
  readonly targetUnitId: string;
  readonly targetName: string;
  readonly toHitChance: number;
  readonly targetDefense: number;
  readonly defenseType: 'Evasion' | 'Resolve';
  readonly minDamage: number;
  readonly maxDamage: number;
  readonly expectedDamage: number;
  readonly mitigation: number;
  readonly isAlly: boolean;
}

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
  readonly blockReason?: string;
  readonly diceDescription: string;
  readonly mitigation: number;
  readonly isDamaging: boolean;
  readonly rollAdvantage?: RollAdvantage;
  readonly elevationVantageRange?: number;
  readonly splashUnits?: readonly SplashTargetMetrics[];
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
  readonly rollAdvantage?: RollAdvantage;
  readonly elevationVantageRange?: number;
  readonly splashUnits?: readonly SplashTargetMetrics[];
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

  const effectiveAbility = getEffectiveAbility(ability, actorCu.abilityModifiers);
  const isHexTarget = effectiveAbility.targetType === 'HEX';
  const isSelf = effectiveAbility.targetType === 'SELF';

  const targetUnitId =
    isSelf
      ? actorUnitId
      : state.arena.getUnitAt(targetCoord);

  // If not a HEX target and there's no unit, we cannot target
  if (!targetUnitId && !isHexTarget) return null;

  const targetCu = targetUnitId ? state.units.get(targetUnitId) : undefined;
  if (targetUnitId && (!targetCu || targetCu.isDefeated)) return null;

  const actorElevation = state.arena.getElevation(effectiveOrigin);
  const targetElevation = state.arena.getElevation(targetCoord);
  const elevationDelta = actorElevation - targetElevation;
  const elevationVantageRange =
    effectiveAbility.range >= 2 && elevationDelta > 0 ? elevationDelta : undefined;
  const maxRange =
    effectiveAbility.range >= 2
      ? effectiveAbility.range + Math.max(0, elevationDelta)
      : effectiveAbility.range;

  const dist = hexDistance(effectiveOrigin, targetCoord);
  if (dist > maxRange && !isSelf) {
    return null;
  }

  const validation = canExecuteAbility(state, actorUnitId, effectiveAbility, {
    coord: targetCoord,
    targetUnitId: targetUnitId ?? undefined,
    originCoord: effectiveOrigin,
    ignoreApCheck: true
  });

  if (!validation.valid && !validation.reason?.startsWith('Line-of-Sight is blocked')) {
    return null;
  }

  const obstruction = state.arena.getLineOfSightObstruction(effectiveOrigin, targetCoord, {
    isUnitScreening: (unitId) =>
      !state.units.get(unitId)?.activeConditions?.some((c) => c.type === 'STEALTH')
  });
  const hasLoS = obstruction === null;
  const blockReason = obstruction ? formatLoSObstructionReason(state, obstruction) : undefined;

  // Evaluate secondary splash targets across blast radius
  const splashUnits: SplashTargetMetrics[] = [];
  if ((effectiveAbility.aoeRadius ?? 0) > 0) {
    const aoeHexes = getHexesInRange(targetCoord, effectiveAbility.aoeRadius!);
    const primaryDamageEffect = effectiveAbility.effects?.find((e) => e.type === 'DAMAGE');
    const defaultSplashProfile = primaryDamageEffect?.damageProfile
      ? { count: primaryDamageEffect.damageProfile.count, sides: primaryDamageEffect.damageProfile.sides }
      : undefined;
    const splashProfile = effectiveAbility.splashDamageProfile ?? defaultSplashProfile;
    const splashFlatDamage = effectiveAbility.splashDamageProfile ? 0 : (primaryDamageEffect?.flatDamage ?? 0);
    const splashAttr = splashProfile && 'modifierAttribute' in splashProfile ? (splashProfile.modifierAttribute as keyof TriadAttributes | undefined) : undefined;
    const splashAttrMod = (splashAttr ? actorCu.unit.baseAttributes[splashAttr] : 0) + splashFlatDamage;

    for (const hex of aoeHexes) {
      if (targetCu && hexEquals(hex, targetCoord)) continue;
      const secUnitId = state.arena.getUnitAt(hex);
      if (!secUnitId || secUnitId === actorUnitId) continue;
      const secCu = state.units.get(secUnitId);
      if (!secCu || secCu.isDefeated || secCu.currentHp <= 0) continue;

      const secElevDelta = actorElevation - state.arena.getElevation(hex);
      const splashRollContext = evaluateAttackRollContext(actorCu, secCu, effectiveAbility, {
        state,
        originCoord: effectiveOrigin,
        targetCoord: hex,
        elevationDelta: secElevDelta
      });

      const splashToHit = Math.round(splashRollContext.hitProbability * 100);
      const splashMitigation =
        effectiveAbility.damageType === 'PHYSICAL'
          ? getEffectiveArmor(secCu)
          : getEffectiveWard(secCu);

      const sCount = splashProfile?.count ?? 0;
      const sSides = splashProfile?.sides ?? 0;
      const sMin = Math.max(1, sCount + splashAttrMod - splashMitigation);
      const sMax = Math.max(1, sCount * sSides + splashAttrMod - splashMitigation);
      const avgBase = sCount * ((sSides + 1) / 2);
      const avgHit = Math.max(1, avgBase + splashAttrMod - splashMitigation);
      const expDmg = Math.round((splashToHit / 100) * avgHit * 10) / 10;
      const isAlly = (secCu.unit.faction ?? secCu.faction) === (actorCu.unit.faction ?? actorCu.faction);

      splashUnits.push({
        targetUnitId: secCu.unit.id,
        targetName: secCu.unit.name,
        toHitChance: splashToHit,
        targetDefense: splashRollContext.targetDefense,
        defenseType: splashRollContext.defenseType,
        minDamage: sMin,
        maxDamage: sMax,
        expectedDamage: expDmg,
        mitigation: splashMitigation,
        isAlly
      });
    }
  }

  // Handle ground-targeted hex with no direct center unit
  if (!targetCu) {
    if (splashUnits.length === 0) {
      return null;
    }

    const hostiles = splashUnits.filter((s) => !s.isAlly);
    const splashExpected = Math.round(hostiles.reduce((acc, s) => acc + s.expectedDamage, 0) * 10) / 10;
    const avgHitChance = Math.round(splashUnits.reduce((acc, s) => acc + s.toHitChance, 0) / splashUnits.length);
    const minDmg = splashUnits.length > 0 ? Math.min(...splashUnits.map((s) => s.minDamage)) : 0;
    const maxDmg = splashUnits.length > 0 ? Math.max(...splashUnits.map((s) => s.maxDamage)) : 0;
    const diceProfile = effectiveAbility.splashDamageProfile;
    const diceDesc = diceProfile ? `${diceProfile.count}d${diceProfile.sides} (Splash)` : 'AoE Blast';

    return {
      targetUnitId: '',
      targetName: `Ground Blast (${splashUnits.length} targets)`,
      toHitChance: avgHitChance,
      targetDefense: splashUnits[0].targetDefense,
      defenseType: splashUnits[0].defenseType,
      minDamage: minDmg,
      maxDamage: maxDmg,
      expectedDamage: splashExpected,
      isFlankAdvantage: false,
      combatArc: 'FRONT',
      hasLoS,
      blockReason,
      diceDescription: diceDesc,
      mitigation: splashUnits[0].mitigation,
      isDamaging: true,
      rollAdvantage: 'NORMAL',
      elevationVantageRange,
      splashUnits
    };
  }

  // Direct center unit calculations
  const combatArc = getCombatArc(targetCu.facing, targetCoord, effectiveOrigin);
  let isFlankAdvantage = false;
  let bonusDamageProfile = undefined;

  const flankEffect = effectiveAbility.effects?.find((e) => e.condition === 'FLANK_OR_REAR');
  if (flankEffect) {
    // Check if attacker arc is Flank/Rear or if an allied pincer exists
    if (combatArc === 'FLANK' || combatArc === 'REAR' || isFlankOrRear(state, actorUnitId, targetCu.unit.id)) {
      isFlankAdvantage = Boolean(flankEffect.grantsAdvantage);
      bonusDamageProfile = flankEffect.bonusDamage;
    }
  }

  let isChallengedAdvantage = false;
  const challengedEffect = effectiveAbility.effects?.find((e) => e.condition === 'TARGET_CHALLENGED');
  if (challengedEffect) {
    const isTargetChallenged = targetCu.activeConditions?.some((c) => c.type === 'CHALLENGED');
    if (isTargetChallenged) {
      isChallengedAdvantage = Boolean(challengedEffect.grantsAdvantage);
      bonusDamageProfile = challengedEffect.bonusDamage;
    }
  }

  // Check Momentum Advantage
  const isMomentumAdvantage =
    (actorCu.hexesMovedThisTurn ?? 0) >= 2 &&
    (actorCu.passives ?? []).some((p) => p.id === 'momentum');
  const hasTacticalAdvantage = isFlankAdvantage || isChallengedAdvantage || isMomentumAdvantage;

  // Evaluate centralized attack roll context
  const rollContext = evaluateAttackRollContext(actorCu, targetCu, effectiveAbility, {
    state,
    originCoord: effectiveOrigin,
    targetCoord,
    elevationDelta,
    advantage: hasTacticalAdvantage ? 'ADVANTAGE' : undefined
  });

  // Damage effect lookup
  const damageEffect = effectiveAbility.effects?.find((e) => e.type === 'DAMAGE');
  const diceProfile = damageEffect?.damageProfile;
  const flatDamage = damageEffect?.flatDamage ?? 0;

  const toHitChance = Math.round(rollContext.hitProbability * 100);

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
      targetUnitId: targetCu.unit.id,
      targetName: targetCu.unit.name,
      toHitChance: 100,
      targetDefense: rollContext.targetDefense,
      defenseType: rollContext.defenseType,
      minDamage: 0,
      maxDamage: 0,
      expectedDamage: 0,
      isFlankAdvantage,
      combatArc,
      hasLoS,
      diceDescription: diceDesc,
      mitigation: 0,
      isDamaging: false,
      rollAdvantage: 'NORMAL',
      elevationVantageRange,
      splashUnits: splashUnits.length > 0 ? splashUnits : undefined
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
  const centerExpectedDamage = Math.round((toHitChance / 100) * avgHitDamage * 10) / 10;

  const enemySplashExpDmg = splashUnits
    .filter((s) => !s.isAlly)
    .reduce((acc, s) => acc + s.expectedDamage, 0);
  const totalExpectedDamage = Math.round((centerExpectedDamage + enemySplashExpDmg) * 10) / 10;

  return {
    targetUnitId: targetCu.unit.id,
    targetName: targetCu.unit.name,
    toHitChance,
    targetDefense: rollContext.targetDefense,
    defenseType: rollContext.defenseType,
    minDamage: minDmg,
    maxDamage: maxDmg,
    expectedDamage: totalExpectedDamage,
    isFlankAdvantage,
    combatArc,
    hasLoS,
    blockReason,
    diceDescription: diceDesc,
    mitigation,
    isDamaging: true,
    rollAdvantage: rollContext.finalAdvantage,
    elevationVantageRange,
    splashUnits: splashUnits.length > 0 ? splashUnits : undefined
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

  let damageRange = 'Buff';
  if (metrics.isDamaging) {
    if (!metrics.targetUnitId) {
      damageRange = `${metrics.minDamage} – ${metrics.maxDamage} (Splash)`;
    } else {
      damageRange = `${metrics.minDamage} – ${metrics.maxDamage} (Soak: ${metrics.mitigation})`;
    }
  }

  return {
    targetUnitId: metrics.targetUnitId,
    targetName: metrics.targetName,
    toHitChance: metrics.toHitChance,
    targetDefense: metrics.targetDefense,
    defenseType: metrics.defenseType,
    diceDescription: metrics.diceDescription,
    damageRange,
    isBlockedLoS: !metrics.hasLoS,
    blockReason: !metrics.hasLoS ? (metrics.blockReason ?? 'Line-of-Sight is screened/blocked') : undefined,
    expectedDamage: metrics.expectedDamage,
    combatArc: metrics.combatArc,
    isFlankAdvantage: metrics.isFlankAdvantage,
    hasLoS: metrics.hasLoS,
    mitigation: metrics.mitigation,
    rollAdvantage: metrics.rollAdvantage,
    elevationVantageRange: metrics.elevationVantageRange,
    splashUnits: metrics.splashUnits
  };
}
