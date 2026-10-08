import { ClassPackage } from '../../core/types/classPackage';
import { Ability } from '../../core/types/ability';
import { PassiveTrait } from '../../core/types/passive';
import {
  ALL_NOVICE_ABILITIES,
  MOMENTUM
} from './novice';
import { WARRIOR_PACKAGE } from './warrior';
import { THIEF_PACKAGE } from './thief';
import { WIZARD_PACKAGE } from './wizard';
import { KNIGHT_PACKAGE } from './knight';
import { INFILTRATOR_PACKAGE } from './infiltrator';
import { SORCERER_PACKAGE } from './sorcerer';
import { CAVALIER_PACKAGE } from './cavalier';
import { BERSERKER_PACKAGE } from './berserker';
import { HIGHWAYMAN_PACKAGE } from './highwayman';
import { WARLOCK_PACKAGE } from './warlock';
import { WITCH_PACKAGE } from './witch';

export * from './novice';
export * from './warrior';
export * from './thief';
export * from './wizard';
export * from './knight';
export * from './infiltrator';
export * from './sorcerer';
export * from './cavalier';
export * from './berserker';
export * from './highwayman';
export * from './warlock';
export * from './witch';

export const CLASS_PACKAGES: Readonly<Record<string, ClassPackage>> = {
  warrior: WARRIOR_PACKAGE,
  thief: THIEF_PACKAGE,
  wizard: WIZARD_PACKAGE,
  knight: KNIGHT_PACKAGE,
  infiltrator: INFILTRATOR_PACKAGE,
  sorcerer: SORCERER_PACKAGE,
  cavalier: CAVALIER_PACKAGE,
  berserker: BERSERKER_PACKAGE,
  highwayman: HIGHWAYMAN_PACKAGE,
  warlock: WARLOCK_PACKAGE,
  witch: WITCH_PACKAGE
};

/**
 * Returns the ClassPackage for a given class ID, or undefined if not authored yet.
 */
export function getClassPackage(classId: string): ClassPackage | undefined {
  return CLASS_PACKAGES[classId.toLowerCase()];
}

/**
 * Global catalog of all authored abilities for fast lookup by ID.
 */
const ABILITIES_BY_ID = new Map<string, Ability>();
for (const ability of ALL_NOVICE_ABILITIES) {
  ABILITIES_BY_ID.set(ability.id, ability);
}
for (const pkg of Object.values(CLASS_PACKAGES)) {
  ABILITIES_BY_ID.set(pkg.signatureAbility.id, pkg.signatureAbility);
  for (const domainAbility of pkg.domainAbilities) {
    ABILITIES_BY_ID.set(domainAbility.id, domainAbility);
  }
}

export function getAbilityById(id: string): Ability | undefined {
  return ABILITIES_BY_ID.get(id);
}

/**
 * Global catalog of all authored passives for fast lookup by ID.
 */
const PASSIVES_BY_ID = new Map<string, PassiveTrait>();
PASSIVES_BY_ID.set(MOMENTUM.id, MOMENTUM);
for (const pkg of Object.values(CLASS_PACKAGES)) {
  PASSIVES_BY_ID.set(pkg.passive.id, pkg.passive);
}

export function getPassiveById(id: string): PassiveTrait | undefined {
  return PASSIVES_BY_ID.get(id);
}
