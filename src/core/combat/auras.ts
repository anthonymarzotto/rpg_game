import { hexDistance } from '../grid/hex';
import { CombatState, CombatUnit } from './types';

export interface TargetAuraEvaluation {
  /** Maximum attack roll penalty imposed by protective auras */
  readonly attackRollPenalty: number;
  /** Names of active auras shielding the target */
  readonly sourceAuraNames: string[];
}

/**
 * Evaluates active target-centric protective and debuff auras in the combat arena.
 * If targetCu is within radius of an ally (same faction) with a protective aura
 * (targetScope: 'ALLIES'), returns the attack roll penalty imposed on incoming attacks.
 */
export function evaluateTargetAuras(
  targetCu: CombatUnit,
  actorCu: CombatUnit,
  state: CombatState
): TargetAuraEvaluation {
  if (!state.arena || !state.units) {
    return { attackRollPenalty: 0, sourceAuraNames: [] };
  }

  const targetPos = state.arena.getUnitPosition(targetCu.unit.id);
  if (!targetPos) {
    return { attackRollPenalty: 0, sourceAuraNames: [] };
  }

  // Auras only protect against hostile actions (different factions)
  if (actorCu.faction === targetCu.faction) {
    return { attackRollPenalty: 0, sourceAuraNames: [] };
  }

  let maxPenalty = 0;
  const sourceAuraNames: string[] = [];

  for (const cu of state.units.values()) {
    if (cu.isDefeated || cu.currentHp <= 0) continue;

    // Target-protective aura: emitter must share faction with targetCu
    if (cu.faction !== targetCu.faction) continue;

    const cuPos = state.arena.getUnitPosition(cu.unit.id);
    if (!cuPos) continue;

    const dist = hexDistance(cuPos, targetPos);
    for (const passive of cu.passives ?? []) {
      if (passive.aura && passive.aura.targetScope === 'ALLIES' && dist <= passive.aura.radius) {
        if (passive.aura.attackRollPenalty) {
          if (passive.aura.attackRollPenalty > maxPenalty) {
            maxPenalty = passive.aura.attackRollPenalty;
          }
          if (!sourceAuraNames.includes(passive.name)) {
            sourceAuraNames.push(passive.name);
          }
        }
      }
    }
  }

  return {
    attackRollPenalty: maxPenalty,
    sourceAuraNames
  };
}
