import { CombatState } from './types';
import { getEffectiveSpeed } from './effectiveVitals';
import { ACTION_ECONOMY_CONFIG } from '../config/balance';
import { evaluateEncounterOutcome } from './objectives';
import { onTurnStartPassives } from './passives';
import { Faction } from '../types/unit';

/**
 * Minimal interface required to participate in CTB clock ticking.
 */
export interface ClockParticipant {
  readonly id: string;
  gauge: number;
  readonly speed: number;
}

/**
 * Projected entry in the CTB initiative timeline queue.
 */
export interface TurnOrderEntry {
  readonly unitId: string;
  readonly name: string;
  readonly faction: Faction;
  readonly projectedGauge: number;
  readonly isCurrentActive: boolean;
}

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
 * Pure engine function: Ticks participant gauges by their speed until at least one
 * crosses the threshold (default 100), then resolves ties by:
 * 1. Highest Gauge
 * 2. Highest Speed
 * 3. Stable Unit ID
 */
export function stepClockUntilReady<T extends ClockParticipant>(
  participants: T[],
  threshold = ACTION_ECONOMY_CONFIG.gaugeTurnThreshold
): { winner: T; ticks: number } {
  if (participants.length === 0) {
    throw new Error('No living participants in clock stepping.');
  }

  const getReady = (): T[] =>
    participants.filter((p) => p.gauge >= threshold);

  let ticks = 0;
  while (getReady().length === 0) {
    ticks++;
    for (const p of participants) {
      p.gauge += p.speed;
    }
  }

  const ready = getReady();

  // Authoritative 3-tier tie-breaker:
  ready.sort((a, b) => {
    if (b.gauge !== a.gauge) {
      return b.gauge - a.gauge;
    }
    if (b.speed !== a.speed) {
      return b.speed - a.speed;
    }
    return a.id.localeCompare(b.id);
  });

  return { winner: ready[0], ticks };
}

/**
 * Advances the CTB clock using stepClockUntilReady, applies 3 AP, fires turn-start passives,
 * and decrements/purges active modifiers on the newly active unit.
 */
export function advanceTurnClock(state: CombatState): string {
  const activeUnits = Array.from(state.units.values()).filter(
    (cu) => !cu.isDefeated
  );

  if (activeUnits.length === 0) {
    throw new Error('No living units remaining in combat encounter.');
  }

  const participants = activeUnits.map((cu) => ({
    id: cu.unit.id,
    gauge: cu.initiativeGauge,
    speed: getEffectiveSpeed(cu),
    cu
  }));

  const { winner } = stepClockUntilReady(participants);

  // Sync simulated gauges back to real combat units
  for (const p of participants) {
    p.cu.initiativeGauge = p.gauge;
  }

  const nextActive = winner.cu;
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
 * Non-mutating lookahead projection for the UI initiative queue ribbon.
 * Returns the upcoming sequence of turns along the CTB timeline.
 */
export function predictTurnOrder(
  state: CombatState,
  count = 8
): readonly TurnOrderEntry[] {
  const livingUnits = Array.from(state.units.values()).filter(
    (cu) => !cu.isDefeated
  );
  if (livingUnits.length === 0 || count <= 0) {
    return [];
  }

  const entries: TurnOrderEntry[] = [];
  const currentActive = state.units.get(state.activeUnitId);

  // Slot 0: If an active living unit exists, they occupy the currently acting slot
  if (currentActive && !currentActive.isDefeated) {
    entries.push({
      unitId: currentActive.unit.id,
      name: currentActive.unit.name,
      faction: currentActive.faction ?? currentActive.unit.faction ?? 'PLAYER',
      projectedGauge: currentActive.initiativeGauge,
      isCurrentActive: true
    });
  }

  // Clone lightweight participants for simulation
  const simParticipants = livingUnits.map((cu) => {
    let initialGauge = cu.initiativeGauge;
    // For currently active unit, project their gauge resetting after their turn
    if (cu.unit.id === state.activeUnitId) {
      const overflow = Math.max(
        0,
        initialGauge - ACTION_ECONOMY_CONFIG.gaugeTurnThreshold
      );
      initialGauge = calculateTurnResetGauge(0, overflow);
    }
    return {
      id: cu.unit.id,
      name: cu.unit.name,
      faction: cu.faction ?? cu.unit.faction ?? 'PLAYER',
      gauge: initialGauge,
      speed: getEffectiveSpeed(cu)
    };
  });

  // Project future turns
  const targetCount = count;
  while (entries.length < targetCount) {
    const { winner } = stepClockUntilReady(simParticipants);

    entries.push({
      unitId: winner.id,
      name: winner.name,
      faction: winner.faction,
      projectedGauge: winner.gauge,
      isCurrentActive: false
    });

    const overflow = Math.max(
      0,
      winner.gauge - ACTION_ECONOMY_CONFIG.gaugeTurnThreshold
    );
    winner.gauge = calculateTurnResetGauge(0, overflow);
  }

  return entries;
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
  state.outcome = evaluateEncounterOutcome(state.objectives, state);
  return nextActive;
}
