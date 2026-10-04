import { Ability } from '../../core/types/ability';
import { PassiveTrait } from '../../core/types/passive';
import { ClassPackage } from '../../core/types/classPackage';
import { SPARK, FROSTBITE } from './novice';

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
  effects: [
    {
      type: 'DAMAGE',
      damageProfile: {
        count: 1,
        sides: 4,
        modifierAttribute: 'focus'
      }
    }
  ]
};

export const ARCANE_AEGIS: PassiveTrait = {
  id: 'arcane_aegis',
  name: 'Arcane Aegis',
  description: 'A constant ambient shield of mystical force grants +1 Ward to absorb incoming magical damage.',
  hook: 'ALWAYS',
  statModifiers: {
    ward: 1
  }
};

export const WIZARD_PACKAGE: ClassPackage = {
  classId: 'wizard',
  className: 'Wizard',
  signatureAbility: ARCANE_BLAST,
  domainAbilities: [SPARK, FROSTBITE],
  passive: ARCANE_AEGIS,
  aiProfile: 'SNIPER'
};
