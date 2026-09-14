/**
 * Core Triad Attributes corresponding to the 100-class pyramid vertices.
 * Force (Fighter), Finesse (Rogue), Focus (Mage).
 */
export interface TriadAttributes {
  readonly force: number;
  readonly finesse: number;
  readonly focus: number;
}

/**
 * Derived combat vitals computed from Triad Attributes, level, and gear.
 */
export interface DerivedCombatVitals {
  /** Maximum damage capacity before defeat */
  readonly maxHp: number;
  /** Action Points granted at turn start (standard 3) */
  readonly maxAp: number;
  /** CTB tick accumulation speed */
  readonly speed: number;
  /** Hex distance traversed per 1 AP of movement */
  readonly move: number;
  /** Target DC for physical / kinetic attack rolls */
  readonly evasion: number;
  /** Target DC for magical / mental spell rolls */
  readonly resolve: number;
  /** Flat physical damage mitigation */
  readonly armor: number;
  /** Flat magical / elemental damage mitigation */
  readonly ward: number;
}

/**
 * Baseline parameters for a standard recruit.
 */
export const BASE_VITAL_CONFIG = {
  BASE_HP: 20,
  HP_PER_FORCE: 5,
  HP_PER_LEVEL: 2,
  STANDARD_AP: 3,
  BASE_SPEED: 10,
  SPEED_PER_FINESSE: 2,
  BASE_MOVE: 3,
  BASE_EVASION: 10,
  BASE_RESOLVE: 10,
  AP_RECOVERY_RATE: 20
} as const;

/**
 * Uniform starting attributes for a Level-0 recruit.
 */
export const BLANK_SLATE_ATTRIBUTES: TriadAttributes = {
  force: 0,
  finesse: 0,
  focus: 0
};

/**
 * Computes derived combat vitals from attributes and level.
 */
export function computeDerivedVitals(
  attributes: TriadAttributes,
  level = 0
): DerivedCombatVitals {
  return {
    maxHp: BASE_VITAL_CONFIG.BASE_HP + attributes.force * BASE_VITAL_CONFIG.HP_PER_FORCE + level * BASE_VITAL_CONFIG.HP_PER_LEVEL,
    maxAp: BASE_VITAL_CONFIG.STANDARD_AP,
    speed: BASE_VITAL_CONFIG.BASE_SPEED + attributes.finesse * BASE_VITAL_CONFIG.SPEED_PER_FINESSE,
    move: BASE_VITAL_CONFIG.BASE_MOVE + Math.floor(attributes.finesse / 3),
    evasion: BASE_VITAL_CONFIG.BASE_EVASION + attributes.finesse,
    resolve: BASE_VITAL_CONFIG.BASE_RESOLVE + attributes.focus,
    armor: attributes.force,
    ward: attributes.focus
  };
}
