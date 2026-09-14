import { CombatState, CombatUnit, getEffectiveSpeed } from './types';
import { ACTION_ECONOMY_CONFIG } from '../config/balance';
import { calculateTurnResetGauge } from '../units/initiative';

/**
 * Advances the CTB clock by repeatedly adding Effective Speed to each living unit's gauge
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

  const getReadyUnits = (): CombatUnit[] =>
    activeUnits.filter(
      (cu) => cu.unit.initiativeGauge >= ACTION_ECONOMY_CONFIG.gaugeTurnThreshold
    );

  // Tick the clock until someone hits threshold
  while (getReadyUnits().length === 0) {
    for (const cu of activeUnits) {
      cu.unit.initiativeGauge += getEffectiveSpeed(cu);
    }
  }

  const readyUnits = getReadyUnits();

  // Tie-breaker: 1. Highest gauge, 2. Highest Speed, 3. Stable ID
  readyUnits.sort((a, b) => {
    if (b.unit.initiativeGauge !== a.unit.initiativeGauge) {
      return b.unit.initiativeGauge - a.unit.initiativeGauge;
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
  nextActive.unit.currentAp = ACTION_ECONOMY_CONFIG.standardApPerTurn;

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
      : activeCombatUnit.unit.currentAp;

  const overflow = Math.max(
    0,
    activeCombatUnit.unit.initiativeGauge - ACTION_ECONOMY_CONFIG.gaugeTurnThreshold
  );

  // Delegate to existing calculateTurnResetGauge formula from initiative.ts
  activeCombatUnit.unit.initiativeGauge = calculateTurnResetGauge(unspent, overflow);
  activeCombatUnit.unit.currentAp = 0;

  return advanceTurnClock(state);
}
