import { Ability } from '../types/ability';
import { HexCoord, hexDistance } from '../grid/hex';
import { CombatState } from './types';
import {
  getEffectiveEvasion,
  getEffectiveResolve,
  getEffectiveArmor,
  getEffectiveWard
} from './effectiveVitals';
import { canExecuteAbility } from './resolver';

/**
 * Preview summary of an attack or ability projected against a target.
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
}

/**
 * Computes live tactical target preview information (hit chance, defense DC, LoS, min/max damage range).
 */
export function computeTargetPreview(
  state: CombatState,
  actorUnitId: string,
  ability: Ability,
  hoveredCoord: HexCoord
): TargetPreview | null {
  const actorCu = state.units.get(actorUnitId);
  const actorCoord = state.arena.getUnitPosition(actorUnitId);
  if (!actorCu || !actorCoord) {
    return null;
  }

  const targetUnitId = state.arena.getUnitAt(hoveredCoord);
  if (!targetUnitId) return null;

  const targetCu = state.units.get(targetUnitId);
  if (!targetCu || targetCu.isDefeated) return null;

  const dist = hexDistance(actorCoord, hoveredCoord);
  if (dist > ability.range && ability.targetType !== 'SELF') {
    return null;
  }

  const validation = canExecuteAbility(state, actorUnitId, ability, {
    coord: hoveredCoord,
    targetUnitId
  });

  if (!validation.valid && validation.reason !== 'Line-of-Sight is blocked.') {
    return null;
  }

  const hasLoS = state.arena.hasLineOfSight(actorCoord, hoveredCoord);
  const defenseType = ability.defenseTarget === 'EVASION' ? 'Evasion' : 'Resolve';
  const targetDefense =
    ability.defenseTarget === 'EVASION'
      ? getEffectiveEvasion(targetCu)
      : getEffectiveResolve(targetCu);

  // Approximate to-hit chance on d20
  const attackAttr = ability.attackModifierAttribute ?? ability.damageProfile?.modifierAttribute;
  const attackModifier = attackAttr ? actorCu.unit.baseAttributes[attackAttr] : 0;
  const needed = Math.max(1, Math.min(20, targetDefense - attackModifier));
  const toHitChance = Math.round(((21 - needed) / 20) * 100);

  const diceProfile = ability.damageProfile;
  const damageAttr = diceProfile?.modifierAttribute;
  const damageModifier = damageAttr ? actorCu.unit.baseAttributes[damageAttr] : 0;
  const diceDesc = diceProfile
    ? `${diceProfile.count}d${diceProfile.sides} + ${damageAttr ?? ''}`
    : 'Support';

  const mitigation =
    ability.damageType === 'PHYSICAL'
      ? getEffectiveArmor(targetCu)
      : getEffectiveWard(targetCu);

  const minDmg = diceProfile ? Math.max(1, diceProfile.count + damageModifier - mitigation) : 0;
  const maxDmg = diceProfile
    ? Math.max(1, diceProfile.count * diceProfile.sides + damageModifier - mitigation)
    : 0;

  return {
    targetUnitId,
    targetName: targetCu.unit.name,
    toHitChance: Math.max(5, Math.min(95, toHitChance)),
    targetDefense,
    defenseType,
    diceDescription: diceDesc,
    damageRange: diceProfile ? `${minDmg} – ${maxDmg} (Soak: ${mitigation})` : 'Buff',
    isBlockedLoS: !hasLoS,
    blockReason: !hasLoS ? 'Line-of-Sight is screened/blocked' : undefined
  };
}
