/**
 * Core Triad Attributes corresponding to the 100-class pyramid vertices:
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
 * Uniform starting attributes for a Level-0 recruit.
 */
export const BLANK_SLATE_ATTRIBUTES: TriadAttributes = {
  force: 0,
  finesse: 0,
  focus: 0
};
