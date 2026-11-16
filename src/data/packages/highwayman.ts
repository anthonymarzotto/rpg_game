import { Ability } from '../../core/types/ability';
import { PassiveTrait } from '../../core/types/passive';
import { ClassPackage } from '../../core/types/classPackage';

export const POINT_BLANK_BUCKSHOT: Ability = {
  id: 'point_blank_buckshot',
  name: 'Point-Blank Buckshot',
  description: 'A heavy firearm blast that batters the target backward.',
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
  description: 'A theatrical hold-up at gunpoint that shakes a foe’s initiative and strips their armor.',
  archetypeTag: 'ROGUE',
  apCost: 1,
  range: 2,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'RESOLVE',
  attackModifierAttribute: 'finesse',
  damageType: 'NONE',
  effects: [
    {
      type: 'CTB_DELAY',
      magnitude: 20,
      shout: null
    },
    {
      type: 'STAT_MODIFIER',
      magnitude: 2,
      durationTurns: 2,
      statModifiers: {
        armor: -2
      }
    }
  ],
  aiHint: {
    role: 'PRIMER',
    primer: {
      requiresFollowUp: 'PHYSICAL_ATTACK',
      minTotalAp: 3,
      bonusScore: 30.0,
      scaleWithFollowUpDamage: true,
      reason: 'Prime armor shred before physical strike',
      preferredProfiles: ['SKIRMISHER']
    }
  }
};

export const GALLANT_FLOURISH: Ability = {
  id: 'gallant_flourish',
  name: 'Gallant Flourish',
  description: 'A dashing rapier strike that parries incoming blows before springing clear.',
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
    },
    {
      type: 'RETREAT_STEP',
      magnitude: 1,
      targetScope: 'SELF',
      applyOn: 'ALWAYS'
    }
  ],
  aiHint: {
    role: 'DEFENSIVE',
    meleeContingency: {
      preferredProfiles: ['SKIRMISHER'],
      bonusScore: 25.0,
      reason: 'Melee contingency: Gallant Flourish rapier strike and tactical disengage'
    }
  }
};

export const HIGHWAY_TOLL: PassiveTrait = {
  id: 'highway_toll',
  name: 'Highway Toll',
  description: 'Extorting the wealthy grants +2 flat physical damage on attacks against targets with higher base Force than the attacker.',
  hook: 'ALWAYS',
  targetForceBonus: {
    requireTargetForceExceedsActor: true,
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
