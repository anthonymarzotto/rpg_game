import { Ability } from '../../core/types/ability';
import { PassiveTrait } from '../../core/types/passive';
import { ClassPackage } from '../../core/types/classPackage';

export const BLOOD_FRENZY: Ability = {
  id: 'blood_frenzy',
  name: 'Blood Frenzy',
  description: 'A sacrificial blood primer that trades vitality for ferocious physical power.',
  archetypeTag: 'FIGHTER',
  apCost: 1,
  hpCost: 3,
  range: 0,
  targetType: 'SELF',
  defenseTarget: 'NONE',
  damageType: 'NONE',
  oncePerTurn: true,
  effects: [
    {
      type: 'BLOOD_FRENZY',
      magnitude: 1
    }
  ],
  aiHint: {
    role: 'PRIMER',
    primer: {
      requiresFollowUp: 'PHYSICAL_ATTACK',
      minTotalAp: 2,
      bonusScore: 15.0,
      scaleWithFollowUpDamage: true,
      reason: 'Prime Blood Frenzy before unleashing physical attack'
    }
  }
};

export const RECKLESS_CLEAVE: Ability = {
  id: 'reckless_cleave',
  name: 'Reckless Cleave',
  description: 'A ferocious frontal sweep that tears through nearby foes at the expense of your guard.',
  archetypeTag: 'FIGHTER',
  apCost: 2,
  range: 1,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'EVASION',
  attackModifierAttribute: 'force',
  damageType: 'PHYSICAL',
  effects: [
    {
      type: 'DAMAGE',
      damageProfile: {
        count: 2,
        sides: 4,
        modifierAttribute: 'force'
      }
    },
    {
      type: 'CLEAVE',
      magnitude: 2
    },
    {
      type: 'STAT_MODIFIER',
      magnitude: 2,
      durationTurns: 1,
      targetScope: 'SELF',
      statModifiers: {
        evasion: -2
      }
    }
  ]
};

export const IGNITE_RAGE: Ability = {
  id: 'ignite_rage',
  name: 'Ignite Rage',
  description: 'Strikes an adjacent foe with crackling arcane flames fueled by fury.',
  archetypeTag: 'MAGE',
  apCost: 1,
  range: 1,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'RESOLVE',
  attackModifierAttribute: 'focus',
  damageType: 'MAGICAL',
  effects: [
    {
      type: 'DAMAGE',
      damageProfile: {
        count: 1,
        sides: 6,
        modifierAttribute: 'focus'
      }
    },
    {
      type: 'CONDITION',
      conditionType: 'BURN',
      magnitude: 2,
      durationTurns: 2
    }
  ]
};

export const DEATHBOUND_FURY: PassiveTrait = {
  id: 'deathbound_fury',
  name: 'Deathbound Fury',
  description: 'When at or below 50% max HP, physical attacks gain +2 flat damage and expand the Critical Hit threshold to 19–20.',
  hook: 'ALWAYS',
  healthThreshold: {
    maxPercent: 0.5,
    flatDamageBonus: 2,
    critThreshold: 19,
    damageTypeFilter: 'PHYSICAL'
  }
};

export const BERSERKER_PACKAGE: ClassPackage = {
  classId: 'berserker',
  className: 'Berserker',
  signatureAbility: BLOOD_FRENZY,
  domainAbilities: [RECKLESS_CLEAVE, IGNITE_RAGE],
  passive: DEATHBOUND_FURY,
  aiProfile: 'BRAWLER'
};
