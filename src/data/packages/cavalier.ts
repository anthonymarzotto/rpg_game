import { Ability } from '../../core/types/ability';
import { PassiveTrait } from '../../core/types/passive';
import { ClassPackage } from '../../core/types/classPackage';

export const LANCE_CHARGE: Ability = {
  id: 'lance_charge',
  name: 'Lance Charge',
  description: 'Mounted shock charge. Rushes along an unobstructed straight line (2–3 hexes) into melee contact, dealing 1d8 + Force physical damage and knocking the target back 1 hex.',
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
      magnitude: 3
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
  description: 'A piercing saber strike dealing 1d4 + Finesse physical damage. If the hex directly behind the enemy is unoccupied, advances through to occupy it.',
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
      magnitude: 1
    }
  ]
};

export const FLAMBOYANT_FLOURISH: Ability = {
  id: 'flamboyant_flourish',
  name: 'Flamboyant Flourish',
  description: 'An aristocratic melee taunt that inflicts CHALLENGED on an adjacent foe for 2 turns while granting the Cavalier +2 Evasion for 1 turn.',
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
