import { Ability } from '../../core/types/ability';
import { PassiveTrait } from '../../core/types/passive';
import { ClassPackage } from '../../core/types/classPackage';

export const LEAD_THE_CHARGE: Ability = {
  id: 'lead_the_charge',
  name: 'Lead the Charge',
  description: 'Rally nearby comrades with a battle cry that sharpens their momentum and aim.',
  archetypeTag: 'FIGHTER',
  apCost: 2,
  range: 0,
  aoeRadius: 3,
  targetType: 'SELF',
  defenseTarget: 'NONE',
  damageType: 'NONE',
  effects: [
    {
      type: 'STAT_MODIFIER',
      magnitude: 2,
      durationTurns: 2,
      statModifiers: {
        move: 2,
        speed: 2,
        attackRoll: 2
      }
    }
  ]
};

export const CHALLENGING_SHOUT: Ability = {
  id: 'challenging_shout',
  name: 'Challenging Shout',
  description: 'Issue a commanding taunt that draws an enemy’s attention and punishes defiance.',
  archetypeTag: 'FIGHTER',
  apCost: 1,
  range: 3,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'NONE',
  damageType: 'NONE',
  effects: [
    {
      type: 'FORCE_FACING'
    },
    {
      type: 'CONDITION',
      conditionType: 'CHALLENGED',
      magnitude: 0,
      durationTurns: 2
    }
  ]
};

export const POMMEL_STRIKE: Ability = {
  id: 'pommel_strike',
  name: 'Pommel Strike',
  description: 'A concussive hilt blow that rattles challenged foes and stalls their initiative.',
  archetypeTag: 'FIGHTER',
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
        modifierAttribute: 'force'
      }
    },
    {
      type: 'DAMAGE',
      condition: 'TARGET_CHALLENGED',
      attackRollBonus: 2,
      bonusDamage: {
        count: 1,
        sides: 4
      }
    },
    {
      type: 'CTB_DELAY',
      magnitude: 20,
      shout: null
    }
  ]
};

export const TACTICAL_VANGUARD: PassiveTrait = {
  id: 'tactical_vanguard',
  name: 'Tactical Vanguard',
  description: 'Superior tactical readiness grants +25 starting Initiative at the beginning of a bout.',
  hook: 'BATTLE_START',
  effect: {
    type: 'INITIATIVE_BOOST',
    magnitude: 25
  }
};

export const KNIGHT_PACKAGE: ClassPackage = {
  classId: 'knight',
  className: 'Knight',
  signatureAbility: LEAD_THE_CHARGE,
  domainAbilities: [CHALLENGING_SHOUT, POMMEL_STRIKE],
  passive: TACTICAL_VANGUARD,
  aiProfile: 'SUPPORT'
};
