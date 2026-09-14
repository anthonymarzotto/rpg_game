import { TriadAttributes, DerivedCombatVitals } from '../types/stats';
import {
  RECRUIT_BASE_VITALS,
  STAT_SCALING_RATES,
  ACTION_ECONOMY_CONFIG
} from '../config/balance';

/**
 * Computes derived combat vitals from attributes and level according to balance rules.
 */
export function computeDerivedVitals(
  attributes: TriadAttributes,
  level = 0
): DerivedCombatVitals {
  return {
    maxHp:
      RECRUIT_BASE_VITALS.hp +
      attributes.force * STAT_SCALING_RATES.hpPerForce +
      level * STAT_SCALING_RATES.hpPerLevel,
    maxAp: ACTION_ECONOMY_CONFIG.standardApPerTurn,
    speed:
      RECRUIT_BASE_VITALS.speed +
      attributes.finesse * STAT_SCALING_RATES.speedPerFinesse,
    move:
      RECRUIT_BASE_VITALS.move +
      Math.floor(attributes.finesse / STAT_SCALING_RATES.moveFinesseDivisor),
    evasion: RECRUIT_BASE_VITALS.evasion + attributes.finesse,
    resolve: RECRUIT_BASE_VITALS.resolve + attributes.focus,
    armor: attributes.force,
    ward: attributes.focus
  };
}
