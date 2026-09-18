import { Ability } from '../../../core/types/ability';

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

export const WIZARD_ABILITIES: readonly Ability[] = [
  ARCANE_BLAST
];
