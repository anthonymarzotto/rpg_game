import { Ability } from '../../core/types/ability';
import { WARRIOR_ABILITIES } from './classes/warrior';
import { THIEF_ABILITIES } from './classes/thief';
import { WIZARD_ABILITIES } from './classes/wizard';

export * from './universal';
export * from './novice';
export * from './classes/warrior';
export * from './classes/thief';
export * from './classes/wizard';

const CLASS_ABILITIES_MAP: Readonly<Record<string, readonly Ability[]>> = {
  warrior: WARRIOR_ABILITIES,
  thief: THIEF_ABILITIES,
  wizard: WIZARD_ABILITIES
};

/**
 * Retrieves the ability kit defined for a specific class ID.
 * Returns an empty array if the class has no bespoke abilities authored yet.
 */
export function getClassAbilities(classId: string): readonly Ability[] {
  return CLASS_ABILITIES_MAP[classId.toLowerCase()] ?? [];
}
