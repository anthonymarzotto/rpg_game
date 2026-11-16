import { Ability } from '../../core/types/ability';
import { PassiveTrait } from '../../core/types/passive';
import { ClassPackage } from '../../core/types/classPackage';

export const LANCE_CHARGE: Ability = {
  id: 'lance_charge',
  name: 'Lance Charge',
  description: 'A mounted shock charge along an unobstructed straight line that sends foes reeling.',
  archetypeTag: 'FIGHTER',
  apCost: 2,
  range: 3,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'EVASION',
  attackModifierAttribute: 'force',
  damageType: 'PHYSICAL',
  effects: [
    {
      type: 'RUSH_CHARGE',
      magnitude: 3,
      shout: null
    },
    {
      type: 'DAMAGE',
      damageProfile: {
        count: 1,
        sides: 8,
        modifierAttribute: 'force'
      }
    },
    {
      type: 'KNOCKBACK',
      magnitude: 1
    }
  ]
};

export const RIDE_THROUGH: Ability = {
  id: 'ride_through',
  name: 'Ride-Through',
  description: 'A sweeping saber pass that cuts through a foe and rides into the hex behind them.',
  archetypeTag: 'ROGUE',
  apCost: 1,
  range: 1,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'EVASION',
  attackModifierAttribute: 'finesse',
  damageType: 'PHYSICAL',
  effects: [
    {
      type: 'DAMAGE',
      damageProfile: {
        count: 1,
        sides: 4,
        modifierAttribute: 'finesse'
      }
    },
    {
      type: 'PENETRATE_STEP',
      magnitude: 1,
      shout: null
    }
  ]
};

export const FLAMBOYANT_FLOURISH: Ability = {
  id: 'flamboyant_flourish',
  name: 'Flamboyant Flourish',
  description: 'An aristocratic melee taunt that goads a foe while raising your own guard.',
  archetypeTag: 'ROGUE',
  apCost: 1,
  range: 1,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'NONE',
  damageType: 'NONE',
  effects: [
    {
      type: 'CONDITION',
      conditionType: 'CHALLENGED',
      durationTurns: 2,
      targetScope: 'TARGET'
    },
    {
      type: 'STAT_MODIFIER',
      magnitude: 2,
      durationTurns: 1,
      targetScope: 'SELF',
      statModifiers: {
        evasion: 2
      }
    }
  ]
};

export const IMPACT_VELOCITY: PassiveTrait = {
  id: 'impact_velocity',
  name: 'Impact Velocity',
  description: 'Devastating mounted momentum increases wall-slam and collision damage caused by this unit by +2.',
  hook: 'ALWAYS',
  collisionDamageBonus: 2
};

export const CAVALIER_PACKAGE: ClassPackage = {
  classId: 'cavalier',
  className: 'Cavalier',
  signatureAbility: LANCE_CHARGE,
  domainAbilities: [RIDE_THROUGH, FLAMBOYANT_FLOURISH],
  passive: IMPACT_VELOCITY,
  aiProfile: 'BRAWLER'
};
