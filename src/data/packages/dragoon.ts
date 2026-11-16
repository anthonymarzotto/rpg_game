import { Ability } from '../../core/types/ability';
import { PassiveTrait } from '../../core/types/passive';
import { ClassPackage } from '../../core/types/classPackage';

export const DRAGON_DIVE: Ability = {
  id: 'dragon_dive',
  name: 'Dragon Dive',
  description: 'Vault high into the air over obstacles and units to crash down behind an enemy in a shockwave.',
  archetypeTag: 'FIGHTER',
  apCost: 2,
  range: 3,
  aoeRadius: 1,
  splashLabel: 'SHOCKWAVE',
  splashDamageProfile: {
    count: 1,
    sides: 4
  },
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'EVASION',
  attackModifierAttribute: 'force',
  damageType: 'PHYSICAL',
  effects: [
    {
      type: 'DAMAGE',
      damageProfile: {
        count: 1,
        sides: 6,
        modifierAttribute: 'force'
      }
    },
    {
      type: 'AERIAL_VAULT',
      shout: null
    }
  ],
  aiHint: {
    role: 'FINISHER'
  }
};

export const PIERCING_THRUST: Ability = {
  id: 'piercing_thrust',
  name: 'Piercing Thrust',
  description: 'Thrust a long spear forward along a straight line, impaling any foe aligned behind the primary target.',
  archetypeTag: 'FIGHTER',
  apCost: 1,
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
        sides: 6,
        modifierAttribute: 'force'
      }
    },
    {
      type: 'LINE_PIERCE'
    }
  ],
  aiHint: {
    role: 'FINISHER'
  }
};

export const WYRMFLAME_BREATH: Ability = {
  id: 'wyrmflame_breath',
  name: 'Wyrmflame Breath',
  description: 'Exhale a sweeping cone of draconic flames that scorches and ignites caught enemies.',
  archetypeTag: 'MAGE',
  apCost: 1,
  range: 2,
  coneTemplate: true,
  targetType: 'HEX',
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
      magnitude: 1,
      durationTurns: 2
    }
  ],
  aiHint: {
    role: 'FINISHER'
  }
};

export const COILED_APEX: PassiveTrait = {
  id: 'coiled_apex',
  name: 'Coiled Apex',
  description: 'Grants Apex Strike (+2 flat damage when striking targets with height advantage) and Coiled Readiness (+1 Virtual Height on ending turn with unspent AP, max +1). Virtual Height grants combat vantage bonuses and incoming attack penalties without triggering melee reach restrictions.',
  hook: 'ALWAYS',
  unspentApVirtualHeight: true,
  lowerElevationDamageBonus: 2
};

export const DRAGOON_PACKAGE: ClassPackage = {
  classId: 'dragoon',
  className: 'Dragoon',
  signatureAbility: DRAGON_DIVE,
  domainAbilities: [PIERCING_THRUST, WYRMFLAME_BREATH],
  passive: COILED_APEX,
  aiProfile: 'BRAWLER'
};
