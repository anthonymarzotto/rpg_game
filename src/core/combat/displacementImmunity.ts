import { CombatUnit } from './types';

/**
 * Evaluates whether a combat unit is currently immune to forced displacement (knockback, forced swap, etc.).
 * Units are immune if they possess an unyielding passive trait or an active displacement immunity modifier.
 */
export function isDisplacementImmune(cu: CombatUnit): boolean {
  return (
    Boolean(cu.passives?.some((p) => p.immuneToDisplacement)) ||
    cu.activeModifiers.some(
      (m) => m.stat === 'displacementImmunity' && m.value > 0 && m.durationTurns > 0
    )
  );
}
