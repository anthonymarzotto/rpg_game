import { Ability } from '../../../core/types/ability';

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

export const WARRIOR_ABILITIES: readonly Ability[] = [
  POWER_STRIKE
];
