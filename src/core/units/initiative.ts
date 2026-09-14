import { ACTION_ECONOMY_CONFIG } from '../config/balance';

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
