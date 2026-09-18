import { CombatState, ObjectiveCondition, EncounterObjective, CombatOutcome } from './types';

/**
 * Purely evaluates a single atomic or composable objective condition against the current combat state.
 */
export function evaluateCondition(condition: ObjectiveCondition, state: CombatState): boolean {
  if ('allOf' in condition) {
    return condition.allOf.length > 0 && condition.allOf.every((c) => evaluateCondition(c, state));
  }
  if ('anyOf' in condition) {
    return condition.anyOf.some((c) => evaluateCondition(c, state));
  }

  switch (condition.kind) {
    case 'UNITS_DEFEATED':
      return (
        condition.unitIds.length > 0 &&
        condition.unitIds.every((id) => {
          const cu = state.units.get(id);
          return !cu || cu.isDefeated || cu.currentHp <= 0;
        })
      );

    case 'FACTION_DEFEATED': {
      const factionUnits = Array.from(state.units.values()).filter(
        (cu) => cu.faction === condition.faction
      );
      if (factionUnits.length === 0) return true;
      return factionUnits.every((cu) => cu.isDefeated || cu.currentHp <= 0);
    }

    case 'ARCHETYPE_XP_EARNED': {
      const cu = state.units.get(condition.unitId);
      if (!cu) return false;
      const key = condition.archetype.toLowerCase() as keyof typeof cu.inBattleXp;
      return (cu.inBattleXp[key] ?? 0) >= condition.amount;
    }

    case 'TURNS_ELAPSED':
      return state.turnNumber >= condition.count;

    default:
      return false;
  }
}

/**
 * Evaluates all encounter objectives against the combat state.
 * 
 * Evaluation Order:
 * 1. Immediate Defeat: If the player character falls (HP <= 0 or isDefeated), returns 'DEFEAT'.
 * 2. Victory: If all encounter objectives evaluate to true, returns 'VICTORY'.
 * 3. In Progress: If not defeated and objectives remain unfulfilled, returns 'IN_PROGRESS'.
 */
export function evaluateEncounterOutcome(
  objectives: readonly EncounterObjective[] | undefined,
  state: CombatState,
  playerUnitId = 'player'
): CombatOutcome {
  const playerCu = state.units.get(playerUnitId);
  if (playerCu && (playerCu.isDefeated || playerCu.currentHp <= 0)) {
    return 'DEFEAT';
  }

  if (!objectives || objectives.length === 0) {
    return 'IN_PROGRESS';
  }

  const allObjectivesMet = objectives.every((obj) => evaluateCondition(obj.condition, state));
  return allObjectivesMet ? 'VICTORY' : 'IN_PROGRESS';
}
