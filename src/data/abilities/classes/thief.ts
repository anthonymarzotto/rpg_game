import { Ability } from '../../../core/types/ability';

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

export const THIEF_ABILITIES: readonly Ability[] = [
  SNEAK_ATTACK
];
