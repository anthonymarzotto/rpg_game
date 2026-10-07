import { Ability } from '../../core/types/ability';
import { PassiveTrait } from '../../core/types/passive';
import { ClassPackage } from '../../core/types/classPackage';

export const ELDRITCH_BLAST: Ability = {
  id: 'eldritch_blast',
  name: 'Eldritch Blast',
  description: 'A concentrated beam of eldritch force dealing 1d8 + Focus magical damage vs Resolve and knocking the target back 1 hex with wall-slam collision risk.',
  archetypeTag: 'MAGE',
  apCost: 2,
  range: 3,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'RESOLVE',
  attackModifierAttribute: 'focus',
  damageType: 'MAGICAL',
  effects: [
    {
      type: 'DAMAGE',
      damageProfile: {
        count: 1,
        sides: 8,
        modifierAttribute: 'focus'
      }
    },
    {
      type: 'KNOCKBACK',
      magnitude: 1
    }
  ]
};

export const PACT_BLADE: Ability = {
  id: 'pact_blade',
  name: 'Pact Blade',
  description: 'A swift melee strike with an otherworldly conjured blade dealing 1d6 + Focus magical damage vs Resolve, bypassing physical Armor.',
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
    }
  ]
};

export const HELLFIRE_BRAND: Ability = {
  id: 'hellfire_brand',
  name: 'Hellfire Brand',
  description: 'Engulfs a foe in searing demonic flames, dealing 1d4 + Focus magical damage vs Resolve and inflicting BURN for 2 turns (2 damage/turn).',
  archetypeTag: 'MAGE',
  apCost: 1,
  range: 2,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'RESOLVE',
  attackModifierAttribute: 'focus',
  damageType: 'MAGICAL',
  effects: [
    {
      type: 'DAMAGE',
      damageProfile: {
        count: 1,
        sides: 4,
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

export const SOUL_CARAPACE: PassiveTrait = {
  id: 'soul_carapace',
  name: 'Soul Carapace',
  description: 'Channeling eldritch magic manifests an ethereal shroud: landing a magical attack grants self +1 Armor and +1 Ward for 1 turn.',
  hook: 'ON_HIT',
  triggerFilter: {
    damageType: 'MAGICAL'
  },
  effect: {
    type: 'STAT_MODIFIER',
    magnitude: 1,
    durationTurns: 1,
    targetScope: 'SELF',
    statModifiers: {
      armor: 1,
      ward: 1
    }
  }
};

export const WARLOCK_PACKAGE: ClassPackage = {
  classId: 'warlock',
  className: 'Warlock',
  signatureAbility: ELDRITCH_BLAST,
  domainAbilities: [PACT_BLADE, HELLFIRE_BRAND],
  passive: SOUL_CARAPACE,
  aiProfile: 'SNIPER'
};
