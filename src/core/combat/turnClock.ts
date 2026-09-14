import { CombatState, CombatUnit } from './types';
import { ACTION_ECONOMY_CONFIG } from '../config/balance';

/**
 * Advances the CTB clock by repeatedly adding Speed to each living unit's gauge
 * until at least one unit crosses the 100 threshold.
 * Resolves ties by highest gauge, then highest speed, then unit ID.
 */
export function advanceTurnClock(state: CombatState): string {
  const activeUnits = Array.from(state.units.values()).filter(
    (cu) => !cu.unit.isDefeated
  );

  if (activeUnits.length === 0) {
    throw new Error('No living units remaining in combat encounter.');
  }

  // Check if any unit already qualifies (e.g. at start or after high overflow refund)
  const getReadyUnits = (): CombatUnit[] =>
    activeUnits.filter(
      (cu) => cu.unit.initiativeGauge >= ACTION_ECONOMY_CONFIG.gaugeTurnThreshold
    );

  // Tick the clock until someone hits threshold
  while (getReadyUnits().length === 0) {
    for (const cu of activeUnits) {
      cu.unit.initiativeGauge += cu.unit.effectiveVitals.speed;
    }
  }

  const readyUnits = getReadyUnits();

  // Tie-breaker: 1. Highest gauge, 2. Highest Speed, 3. Stable ID
  readyUnits.sort((a, b) => {
    if (b.unit.initiativeGauge !== a.unit.initiativeGauge) {
      return b.unit.initiativeGauge - a.unit.initiativeGauge;
    }
    if (b.unit.effectiveVitals.speed !== a.unit.effectiveVitals.speed) {
      return b.unit.effectiveVitals.speed - a.unit.effectiveVitals.speed;
    }
    return a.unit.id.localeCompare(b.unit.id);
  });

  const nextActive = readyUnits[0];
  state.activeUnitId = nextActive.unit.id;
  state.turnNumber += 1;

  // Grant 3 AP
  nextActive.unit.currentAp = ACTION_ECONOMY_CONFIG.standardApPerTurn;

  // Clear 1-turn temporary buffs from previous round
  nextActive.tempBuffs = {
    armor: 0,
    ward: 0,
    movePenalty: 0
  };

  return nextActive.unit.id;
}

/**
 * Concludes the active unit's turn, applies the unspent AP recovery refund,
 * and advances the CTB clock to hand off the next turn.
 */
export function endActiveTurn(
  state: CombatState,
  unspentApOverride?: number
): string {
  const activeCombatUnit = state.units.get(state.activeUnitId);
  if (!activeCombatUnit) {
    throw new Error(`Active unit ${state.activeUnitId} not found in combat state.`);
  }

  const unspent =
    unspentApOverride !== undefined
      ? unspentApOverride
      : activeCombatUnit.unit.currentAp;

  const safeUnspent = Math.max(
    0,
    Math.min(unspent, ACTION_ECONOMY_CONFIG.standardApPerTurn)
  );
  const overflow = Math.max(
    0,
    activeCombatUnit.unit.initiativeGauge - ACTION_ECONOMY_CONFIG.gaugeTurnThreshold
  );

  // Dynamic recovery: overflow + (unspent * 20)
  activeCombatUnit.unit.initiativeGauge =
    overflow + safeUnspent * ACTION_ECONOMY_CONFIG.gaugeRecoveryPerUnspentAp;
  activeCombatUnit.unit.currentAp = 0;

  return advanceTurnClock(state);
}
