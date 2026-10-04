import { Ability } from '../../core/types/ability';
import { PassiveTrait } from '../../core/types/passive';
import { ClassPackage } from '../../core/types/classPackage';
import { SKIRMISH } from './novice';

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

export const SHADOW_STEP: Ability = {
  id: 'shadow_step',
  name: 'Shadow Step',
  description: 'Phase through the shadows to any unoccupied walkable hex within 2 hexes, bypassing intermediate units and obstacles.',
  archetypeTag: 'ROGUE',
  apCost: 1,
  range: 2,
  targetType: 'HEX',
  defenseTarget: 'NONE',
  damageType: 'NONE',
  effect: {
    type: 'TELEPORT',
    magnitude: 2
  }
};

export const QUICKSTEP: PassiveTrait = {
  id: 'quickstep',
  name: 'Quickstep',
  description: 'Incredible agility grants +2 Speed, drastically reducing the ticks required to generate actions in the CTB turn clock.',
  hook: 'ALWAYS',
  statModifiers: {
    speed: 2
  }
};

export const THIEF_PACKAGE: ClassPackage = {
  classId: 'thief',
  className: 'Thief',
  signatureAbility: SNEAK_ATTACK,
  domainAbilities: [SHADOW_STEP, SKIRMISH],
  passive: QUICKSTEP,
  aiProfile: 'SKIRMISHER'
};
