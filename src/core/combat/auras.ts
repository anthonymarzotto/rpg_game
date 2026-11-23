import { hexDistance, getCombatArc, hexEquals } from '../grid/hex';
import { CombatState, CombatUnit } from './types';

export interface TargetAuraEvaluation {
  /** Maximum attack roll penalty imposed by protective and directional attacker-debuff auras */
  readonly attackRollPenalty: number;
  /** Names of active auras penalizing the attack */
  readonly sourceAuraNames: string[];
}

/**
 * Evaluates active target-centric protective auras (targetScope: 'ALLIES') and
 * attacker-centric directional/debuff auras (targetScope: 'ENEMIES', e.g. Captivating Presence).
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
  const actorPos = state.arena.getUnitPosition(actorCu.unit.id);
  if (!targetPos) {
    return { attackRollPenalty: 0, sourceAuraNames: [] };
  }

  // Auras only apply against hostile actions (different factions)
  if (actorCu.faction === targetCu.faction) {
    return { attackRollPenalty: 0, sourceAuraNames: [] };
  }

  let maxPenalty = 0;
  const sourceAuraNames: string[] = [];

  for (const cu of state.units.values()) {
    if (cu.isDefeated || cu.currentHp <= 0) continue;

    const cuPos = state.arena.getUnitPosition(cu.unit.id);
    if (!cuPos) continue;

    for (const passive of cu.passives ?? []) {
      if (!passive.aura || !passive.aura.attackRollPenalty) continue;

      if (passive.aura.targetScope === 'ALLIES') {
        // Target-protective aura: emitter must share faction with targetCu
        if (cu.faction !== targetCu.faction) continue;
        const distToTarget = hexDistance(cuPos, targetPos);
        if (distToTarget <= passive.aura.radius) {
          if (passive.aura.attackRollPenalty > maxPenalty) {
            maxPenalty = passive.aura.attackRollPenalty;
          }
          if (!sourceAuraNames.includes(passive.name)) {
            sourceAuraNames.push(passive.name);
          }
        }
      } else if (passive.aura.targetScope === 'ENEMIES') {
        // Attacker-debuff aura (e.g. Captivating Presence): emitter must be hostile to actorCu
        if (!actorPos || cu.faction === actorCu.faction || hexEquals(cuPos, actorPos)) continue;
        const distToActor = hexDistance(cuPos, actorPos);
        if (distToActor > passive.aura.radius) continue;
        if (passive.aura.arc) {
          const arc = getCombatArc(cu.facing, cuPos, actorPos);
          if (arc !== passive.aura.arc) continue;
        }
        if (passive.aura.attackRollPenalty > maxPenalty) {
          maxPenalty = passive.aura.attackRollPenalty;
        }
        if (!sourceAuraNames.includes(passive.name)) {
          sourceAuraNames.push(passive.name);
        }
      }
    }
  }

  return {
    attackRollPenalty: maxPenalty,
    sourceAuraNames
  };
}
