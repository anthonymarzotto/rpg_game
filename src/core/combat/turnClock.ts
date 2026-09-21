import { CombatState, CombatUnit } from './types';
import { getEffectiveSpeed } from './effectiveVitals';
import { ACTION_ECONOMY_CONFIG } from '../config/balance';
import { evaluateEncounterOutcome } from './objectives';
import { onTurnStartPassives } from './passives';

/**
 * Calculates the new initiative gauge value when a unit ends their turn,
 * applying the gauge recovery refund per unspent AP.
 */
export function calculateTurnResetGauge(unspentAp: number, overflow = 0): number {
  const safeUnspent = Math.max(
    0,
    Math.min(unspentAp, ACTION_ECONOMY_CONFIG.standardApPerTurn)
  );
  return Math.max(
    0,
    overflow + safeUnspent * ACTION_ECONOMY_CONFIG.gaugeRecoveryPerUnspentAp
  );
}

/**
 * Advances the CTB clock by repeatedly adding Effective Speed to each living unit's gauge
 * until at least one unit crosses the 100 threshold.
 * Resolves ties by highest gauge, then highest speed, then unit ID.
 */
export function advanceTurnClock(state: CombatState): string {
  const activeUnits = Array.from(state.units.values()).filter(
    (cu) => !cu.isDefeated
  );

  if (activeUnits.length === 0) {
    throw new Error('No living units remaining in combat encounter.');
  }

  const getReadyUnits = (): CombatUnit[] =>
    activeUnits.filter(
      (cu) => cu.initiativeGauge >= ACTION_ECONOMY_CONFIG.gaugeTurnThreshold
    );

  // Tick the clock until someone hits threshold
  while (getReadyUnits().length === 0) {
    for (const cu of activeUnits) {
      cu.initiativeGauge += getEffectiveSpeed(cu);
    }
  }

  const readyUnits = getReadyUnits();

  // Tie-breaker: 1. Highest gauge, 2. Highest Speed, 3. Stable ID
  readyUnits.sort((a, b) => {
    if (b.initiativeGauge !== a.initiativeGauge) {
      return b.initiativeGauge - a.initiativeGauge;
    }
    const speedA = getEffectiveSpeed(a);
    const speedB = getEffectiveSpeed(b);
    if (speedB !== speedA) {
      return speedB - speedA;
    }
    return a.unit.id.localeCompare(b.unit.id);
  });

  const nextActive = readyUnits[0];
  state.activeUnitId = nextActive.unit.id;
  state.turnNumber += 1;

  // Grant standard 3 AP
  nextActive.currentAp = ACTION_ECONOMY_CONFIG.standardApPerTurn;
  onTurnStartPassives(nextActive);

  // Decrement durations on active unit's modifiers and purge expired ones
  nextActive.activeModifiers.forEach((m) => {
    m.durationTurns -= 1;
  });
  nextActive.activeModifiers = nextActive.activeModifiers.filter(
    (m) => m.durationTurns > 0
  );

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
      : activeCombatUnit.currentAp;

  const overflow = Math.max(
    0,
    activeCombatUnit.initiativeGauge - ACTION_ECONOMY_CONFIG.gaugeTurnThreshold
  );

  activeCombatUnit.initiativeGauge = calculateTurnResetGauge(unspent, overflow);
  activeCombatUnit.currentAp = 0;

  const nextActive = advanceTurnClock(state);
  state.outcome = evaluateEncounterOutcome(state.objectives, state, 'player');
  return nextActive;
}
