import { Ability } from '../../core/types/ability';
import { PassiveTrait } from '../../core/types/passive';
import { ClassPackage } from '../../core/types/classPackage';

export const BLOOD_FRENZY: Ability = {
  id: 'blood_frenzy',
  name: 'Blood Frenzy',
  description: 'A sacrificial blood primer. Sacrifices 3 HP to empower the next physical attack this turn with +1 Die Step and +2 to the attack roll.',
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
  ]
};

export const RECKLESS_CLEAVE: Ability = {
  id: 'reckless_cleave',
  name: 'Reckless Cleave',
  description: 'A ferocious frontal sweep dealing 2d4 + Force physical damage to an enemy and sweeping up to 2 adjacent frontal foes for collateral damage, at the cost of -2 Evasion for 1 turn.',
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
  description: 'Strikes an adjacent foe with crackling arcane flames, dealing 1d6 + Focus magical damage vs Resolve and inflicting BURN for 2 turns.',
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
