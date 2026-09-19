import { UnitProgression } from './class';
import { TriadAttributes, DerivedCombatVitals } from './stats';
import { UnitLoadout } from './loadout';

export type Faction = 'PLAYER' | 'ENEMY' | 'NEUTRAL';

/**
 * Complete character entity comprising progression, permanent attributes,
 * derived vitals, active loadout configuration, and starter abilities.
 */
export interface Unit {
  /** Unique unit identifier */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Faction or combat allegiance (defaults to 'PLAYER' if omitted) */
  readonly faction?: Faction;
  /** Progression record along the 100-class pyramid */
  readonly progression: UnitProgression;
  /** Permanent Triad attributes */
  readonly baseAttributes: TriadAttributes;
  /** Computed combat vitals derived from attributes, level, and gear */
  readonly effectiveVitals: DerivedCombatVitals;
  /** Single source of truth for equipped class and wildcard configuration */
  readonly loadout: UnitLoadout;
  /** The 3 Novice starter ability IDs rolled for this unit on recruitment */
  readonly starterAbilityIds: readonly string[];
}
