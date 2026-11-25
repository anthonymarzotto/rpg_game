import { CombatEvent, CombatState, HitOutcome } from './types';
import { getConditionDefinition, purgeConditionsFromDefeatedSource } from './conditions';
import { clearZeroedInStacks } from './zeroedIn';
import { combatLogger } from './combatLogger';

export const HIT_OUTCOME_RANK: Record<HitOutcome, number> = {
  MISS: 0,
  GRAZE: 1,
  SOLID_HIT: 2,
  CRITICAL_HIT: 3
};

/**
 * Returns the highest-severity HitOutcome across a list of contested targets
 * (CRITICAL_HIT > SOLID_HIT > GRAZE > MISS).
 */
export function pickBestHitOutcome(outcomes: readonly HitOutcome[]): HitOutcome {
  let best: HitOutcome = 'MISS';
  for (const o of outcomes) {
    if (HIT_OUTCOME_RANK[o] > HIT_OUTCOME_RANK[best]) {
      best = o;
    }
  }
  return best;
}

export interface ApplyCombatEventsOptions {
  /** True when the caller is logging these events in its own structured combat log entry */
  readonly claimed?: boolean;
  /** True when lethal DAMAGE events should emit standalone defeat cards immediately (e.g. delayed bombardments) */
  readonly logDefeats?: boolean;
}

/**
 * Applies combat events (damage, displacement, statuses, conditions) to CombatState.
 * Single shared pipeline used by both direct ability resolution and delayed bombardments.
 */
export function applyCombatEvents(
  state: CombatState,
  events: readonly CombatEvent[],
  options?: ApplyCombatEventsOptions
): void {
  for (const event of events) {
    if (event.type === 'DAMAGE') {
      const cu = state.units.get(event.targetUnitId);
      if (cu && !cu.isDefeated) {
        cu.currentHp = Math.max(0, cu.currentHp - event.amount);

        // Dispatch damage event to active conditions via onTakeDamage
        if (event.amount > 0 && cu.activeConditions && cu.activeConditions.length > 0) {
          cu.activeConditions = cu.activeConditions.filter((cond) => {
            const def = getConditionDefinition(cond.type);
            const reaction = def?.onTakeDamage?.(
              cond,
              cu,
              {
                damageAmount: event.amount,
                damageType: event.damageType,
                reason: event.reason,
                sourceUnitId: event.sourceUnitId
              },
              state
            );
            if (reaction?.removeCondition) {
              combatLogger.logConditionBroken(state, {
                cu,
                condition: cond.type,
                reason: 'taking damage',
                text: `${cond.type} broken by damage`,
                message: `${cu.unit.name}'s ${cond.type} was broken by taking damage!`
              });
              return false;
            }
            return true;
          });
        }

        // Automatic fallback logging for unclaimed damage events (e.g. ambient hazards, standalone falls/collisions)
        if (!options?.claimed && !event.logged && event.amount > 0) {
          if (event.reason === 'FALL') {
            combatLogger.logEnvironment(state, {
              cu,
              hazardName: 'Ledge Plunge',
              damage: event.amount,
              detail: 'Direct Fall Impact Damage'
            });
          } else if (event.reason === 'COLLISION') {
            combatLogger.logEnvironment(state, {
              cu,
              hazardName: 'Collision',
              damage: event.amount,
              detail: event.label ?? 'Collision Impact Damage'
            });
          } else if (event.reason === 'ENVIRONMENT') {
            combatLogger.logEnvironment(state, {
              cu,
              hazardName: event.label ?? 'Environmental Hazard',
              damage: event.amount
            });
          }
        }

        if (cu.currentHp === 0) {
          cu.isDefeated = true;
          state.arena.removeUnit(event.targetUnitId);
          if (options?.logDefeats) {
            combatLogger.logDefeat(state, { cu });
          }
          purgeConditionsFromDefeatedSource(state, event.targetUnitId);
        }
      }
    } else if (event.type === 'DISPLACEMENT') {
      const movedCu = state.units.get(event.unitId);
      if (movedCu && movedCu.isDefeated) {
        continue;
      }
      if (event.kind === 'SWAP') {
        const otherUnitId = state.arena.getUnitAt(event.toCoord);
        if (otherUnitId && otherUnitId !== event.unitId) {
          state.arena.swapUnits(event.unitId, otherUnitId);
          const otherCu = state.units.get(otherUnitId);
          if (otherCu) clearZeroedInStacks(otherCu, true);
        } else if (!otherUnitId) {
          state.arena.setUnitPosition(event.unitId, event.toCoord);
        }
      } else {
        state.arena.setUnitPosition(event.unitId, event.toCoord);
      }
      if (movedCu) {
        clearZeroedInStacks(movedCu, true);
      }
    } else if (event.type === 'STATUS_APPLIED') {
      const cu = state.units.get(event.targetUnitId);
      if (cu && !cu.isDefeated) {
        if (event.modifier) {
          const existing = cu.activeModifiers.find(
            (m) => m.stat === event.modifier!.stat && m.value === event.modifier!.value
          );
          if (existing) {
            existing.durationTurns = Math.max(existing.durationTurns, event.modifier.durationTurns);
          } else {
            cu.activeModifiers.push(event.modifier);
          }
        }
        if (event.condition) {
          const existing = cu.activeConditions.find(
            (c) => c === event.condition || (c.type === event.condition!.type && c.sourceUnitId === event.condition!.sourceUnitId)
          );
          if (existing) {
            existing.durationTurns = Math.max(existing.durationTurns, event.condition.durationTurns);
          } else {
            cu.activeConditions.push(event.condition);
          }
        }
      }
    } else if (event.type === 'CONDITION_APPLIED') {
      const cu = state.units.get(event.targetUnitId);
      if (cu && !cu.isDefeated) {
        const existing = cu.activeConditions.find(
          (c) => c === event.condition || (c.type === event.condition!.type && c.sourceUnitId === event.condition!.sourceUnitId)
        );
        if (existing) {
          existing.durationTurns = Math.max(existing.durationTurns, event.condition.durationTurns);
        } else {
          cu.activeConditions.push(event.condition);
        }
      }
    }
  }
}
