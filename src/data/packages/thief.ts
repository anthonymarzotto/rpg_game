import { Ability } from '../../core/types/ability';
import { PassiveTrait } from '../../core/types/passive';
import { ClassPackage } from '../../core/types/classPackage';

export const SNEAK_ATTACK: Ability = {
  id: 'sneak_attack',
  name: 'Sneak Attack',
  description: 'A precise strike dealing 1d4 damage, gaining Advantage and +1d6 precision damage when striking from a flank or rear.',
  archetypeTag: 'ROGUE',
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
  },
  conditionalBonus: {
    condition: 'FLANK_OR_REAR',
    bonusDamage: {
      count: 1,
      sides: 6,
      modifierAttribute: 'force'
    },
    grantsAdvantage: true
  }
};

export const THIEF_DOMAIN_1_TODO: Ability = {
  id: 'thief_domain_1_todo',
  name: 'TODO: Thief Domain 1',
  description: 'Temporary placeholder for Thief domain ability 1.',
  archetypeTag: 'ROGUE',
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

export const THIEF_DOMAIN_2_TODO: Ability = {
  id: 'thief_domain_2_todo',
  name: 'TODO: Thief Domain 2',
  description: 'Temporary placeholder for Thief domain ability 2.',
  archetypeTag: 'ROGUE',
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

export const THIEF_PASSIVE_TODO: PassiveTrait = {
  id: 'thief_passive_todo',
  name: 'TODO: Thief Passive',
  description: 'Temporary placeholder for Thief passive trait.',
  hook: 'ALWAYS'
};

export const THIEF_PACKAGE: ClassPackage = {
  classId: 'thief',
  className: 'Thief',
  signatureAbility: SNEAK_ATTACK,
  domainAbilities: [THIEF_DOMAIN_1_TODO, THIEF_DOMAIN_2_TODO],
  passive: THIEF_PASSIVE_TODO
};
