import { Ability } from './ability';
import { PassiveTrait } from './passive';

export interface ClassPackage {
  readonly classId: string;
  readonly className: string;
  /** Unique signature mechanic exclusive to this class */
  readonly signatureAbility: Ability;
  /** Two archetype or domain pool abilities */
  readonly domainAbilities: readonly [Ability, Ability];
  /** Innate passive trait granted while this class is active */
  readonly passive: PassiveTrait;
}
