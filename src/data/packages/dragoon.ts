import { Ability } from '../../core/types/ability';
import { PassiveTrait } from '../../core/types/passive';
import { ClassPackage } from '../../core/types/classPackage';

export const DRAGON_DIVE: Ability = {
  id: 'dragon_dive',
  name: 'Dragon Dive',
  description: 'Vault high into the air over intervening obstacles and units to crash down upon an enemy 2 to 3 hexes away, landing in the rear arc with Near Hex fallback. Deals 1d6 + Force physical damage vs Evasion and unleashes a shockwave dealing 1d4 physical damage to surrounding hostile units.',
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
  description: 'Thrust a long spear forward along a straight hex ray up to 2 tiles away, dealing 1d6 + Force physical damage vs Evasion. If another unit occupies the aligned hex directly behind the primary target, the thrust impales through dealing 1d4 + Force physical collateral damage.',
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
  description: 'Exhale a 4-hex forward cone of draconic flames (1 apex at dist 1, 3 fan hexes at dist 2). Each hostile unit hit takes 1d4 + Focus magical damage vs Resolve and suffers BURN (1 damage per turn for 2 turns).',
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
