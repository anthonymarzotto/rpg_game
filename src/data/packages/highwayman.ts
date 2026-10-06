import { Ability } from '../../core/types/ability';
import { PassiveTrait } from '../../core/types/passive';
import { ClassPackage } from '../../core/types/classPackage';

export const POINT_BLANK_BUCKSHOT: Ability = {
  id: 'point_blank_buckshot',
  name: 'Point-Blank Buckshot',
  description: 'A heavy firearm blast dealing 1d8 + Finesse physical damage vs Evasion and knocking the target back 1 hex with wall-slam collision risk.',
  archetypeTag: 'ROGUE',
  apCost: 2,
  range: 2,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'EVASION',
  attackModifierAttribute: 'finesse',
  damageType: 'PHYSICAL',
  effects: [
    {
      type: 'DAMAGE',
      damageProfile: {
        count: 1,
        sides: 8,
        modifierAttribute: 'finesse'
      }
    },
    {
      type: 'KNOCKBACK',
      magnitude: 1
    }
  ]
};

export const STAND_AND_DELIVER: Ability = {
  id: 'stand_and_deliver',
  name: 'Stand and Deliver!',
  description: 'A theatrical hold-up at gunpoint, delaying target CTB initiative by 30 ticks and divesting them of -2 Armor for 2 turns.',
  archetypeTag: 'ROGUE',
  apCost: 1,
  range: 2,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'NONE',
  damageType: 'NONE',
  effects: [
    {
      type: 'CTB_DELAY',
      magnitude: 30
    },
    {
      type: 'STAT_MODIFIER',
      magnitude: 2,
      durationTurns: 2,
      statModifiers: {
        armor: -2
      }
    }
  ]
};

export const GALLANT_FLOURISH: Ability = {
  id: 'gallant_flourish',
  name: 'Gallant Flourish',
  description: 'A dashing rapier strike dealing 1d4 + Finesse physical damage vs Evasion and granting self +2 Evasion for 1 turn.',
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

export const HIGHWAY_TOLL: PassiveTrait = {
  id: 'highway_toll',
  name: 'Highway Toll',
  description: 'Extorting the wealthy grants +2 flat physical damage on attacks against targets with positive Armor (> 0).',
  hook: 'ALWAYS',
  targetArmorBonus: {
    minArmor: 1,
    flatDamageBonus: 2,
    damageTypeFilter: 'PHYSICAL'
  }
};

export const HIGHWAYMAN_PACKAGE: ClassPackage = {
  classId: 'highwayman',
  className: 'Highwayman',
  signatureAbility: POINT_BLANK_BUCKSHOT,
  domainAbilities: [STAND_AND_DELIVER, GALLANT_FLOURISH],
  passive: HIGHWAY_TOLL,
  aiProfile: 'SKIRMISHER'
};
