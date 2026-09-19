import { Ability } from '../../core/types/ability';
import { PassiveTrait } from '../../core/types/passive';
import { ClassPackage } from '../../core/types/classPackage';

export const POWER_STRIKE: Ability = {
  id: 'power_strike',
  name: 'Power Strike',
  description: 'A heavy, two-handed kinetic blow that concentrates immense force to bypass physical armor.',
  archetypeTag: 'FIGHTER',
  apCost: 2,
  range: 1,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'EVASION',
  attackModifierAttribute: 'finesse',
  damageType: 'PHYSICAL',
  damageProfile: {
    count: 2,
    sides: 6,
    modifierAttribute: 'force'
  }
};

export const WARRIOR_DOMAIN_1_TODO: Ability = {
  id: 'warrior_domain_1_todo',
  name: 'TODO: Warrior Domain 1',
  description: 'Temporary placeholder for Warrior domain ability 1.',
  archetypeTag: 'FIGHTER',
  apCost: 1,
  range: 1,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'EVASION',
  attackModifierAttribute: 'finesse',
  damageType: 'PHYSICAL',
  damageProfile: {
    count: 1,
    sides: 4,
    modifierAttribute: 'force'
  }
};

export const WARRIOR_DOMAIN_2_TODO: Ability = {
  id: 'warrior_domain_2_todo',
  name: 'TODO: Warrior Domain 2',
  description: 'Temporary placeholder for Warrior domain ability 2.',
  archetypeTag: 'FIGHTER',
  apCost: 1,
  range: 1,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'EVASION',
  attackModifierAttribute: 'finesse',
  damageType: 'PHYSICAL',
  damageProfile: {
    count: 1,
    sides: 4,
    modifierAttribute: 'force'
  }
};

export const WARRIOR_PASSIVE_TODO: PassiveTrait = {
  id: 'warrior_passive_todo',
  name: 'TODO: Warrior Passive',
  description: 'Temporary placeholder for Warrior passive trait.',
  hook: 'ALWAYS'
};

export const WARRIOR_PACKAGE: ClassPackage = {
  classId: 'warrior',
  className: 'Warrior',
  signatureAbility: POWER_STRIKE,
  domainAbilities: [WARRIOR_DOMAIN_1_TODO, WARRIOR_DOMAIN_2_TODO],
  passive: WARRIOR_PASSIVE_TODO
};
