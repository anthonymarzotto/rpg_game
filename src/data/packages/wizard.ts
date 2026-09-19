import { Ability } from '../../core/types/ability';
import { PassiveTrait } from '../../core/types/passive';
import { ClassPackage } from '../../core/types/classPackage';

export const ARCANE_BLAST: Ability = {
  id: 'arcane_blast',
  name: 'Arcane Blast',
  description: 'Unleash a concentrated blast of arcane energy dealing 1d4 magic damage with a 1-hex splash radius.',
  archetypeTag: 'MAGE',
  apCost: 1,
  range: 3,
  aoeRadius: 1,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'RESOLVE',
  attackModifierAttribute: 'focus',
  damageType: 'MAGICAL',
  damageProfile: {
    count: 1,
    sides: 4,
    modifierAttribute: 'focus'
  }
};

export const WIZARD_DOMAIN_1_TODO: Ability = {
  id: 'wizard_domain_1_todo',
  name: 'TODO: Wizard Domain 1',
  description: 'Temporary placeholder for Wizard domain ability 1.',
  archetypeTag: 'MAGE',
  apCost: 1,
  range: 3,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'RESOLVE',
  attackModifierAttribute: 'focus',
  damageType: 'MAGICAL',
  damageProfile: {
    count: 1,
    sides: 4,
    modifierAttribute: 'focus'
  }
};

export const WIZARD_DOMAIN_2_TODO: Ability = {
  id: 'wizard_domain_2_todo',
  name: 'TODO: Wizard Domain 2',
  description: 'Temporary placeholder for Wizard domain ability 2.',
  archetypeTag: 'MAGE',
  apCost: 1,
  range: 3,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'RESOLVE',
  attackModifierAttribute: 'focus',
  damageType: 'MAGICAL',
  damageProfile: {
    count: 1,
    sides: 4,
    modifierAttribute: 'focus'
  }
};

export const WIZARD_PASSIVE_TODO: PassiveTrait = {
  id: 'wizard_passive_todo',
  name: 'TODO: Wizard Passive',
  description: 'Temporary placeholder for Wizard passive trait.',
  hook: 'ALWAYS'
};

export const WIZARD_PACKAGE: ClassPackage = {
  classId: 'wizard',
  className: 'Wizard',
  signatureAbility: ARCANE_BLAST,
  domainAbilities: [WIZARD_DOMAIN_1_TODO, WIZARD_DOMAIN_2_TODO],
  passive: WIZARD_PASSIVE_TODO
};
