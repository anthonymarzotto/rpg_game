import { Ability } from '../../core/types/ability';
import { PassiveTrait } from '../../core/types/passive';
import { ClassPackage } from '../../core/types/classPackage';

export const SPELL_SCULPT: Ability = {
  id: 'spell_sculpt',
  name: 'Spell Sculpt',
  description: 'Channel metamagic to expand the reach and blast of your next Focus spell.',
  archetypeTag: 'MAGE',
  apCost: 1,
  range: 0,
  targetType: 'SELF',
  defenseTarget: 'NONE',
  damageType: 'NONE',
  oncePerTurn: true,
  effects: [
    {
      type: 'SPELL_SCULPT',
      magnitude: 1
    }
  ],
  aiHint: {
    role: 'PRIMER',
    primer: {
      requiresFollowUp: 'SPELL',
      minTotalAp: 2,
      bonusScore: 35.0,
      reason: 'Prime Spell Sculpt before casting Focus spell'
    }
  }
};

export const IGNITE: Ability = {
  id: 'ignite',
  name: 'Ignite',
  description: 'Engulfs a foe in scorching arcane flames that continue to smolder.',
  archetypeTag: 'MAGE',
  apCost: 1,
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

export const GUST: Ability = {
  id: 'gust',
  name: 'Gust',
  description: 'A blast of gale-force wind that drives the target directly away from the caster.',
  archetypeTag: 'MAGE',
  apCost: 1,
  range: 3,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'NONE',
  damageType: 'NONE',
  effects: [
    {
      type: 'KNOCKBACK',
      magnitude: 1
    }
  ]
};

export const WILD_SURGE: PassiveTrait = {
  id: 'wild_surge',
  name: 'Wild Surge',
  description: 'Landing a Critical Hit with a magic spell triggers a spontaneous wild magic surge (1d3: +1 AP, +25 CTB, or 2 collateral magic damage).',
  hook: 'ON_CRIT',
  triggerFilter: {
    damageType: 'MAGICAL'
  },
  effect: {
    type: 'WILD_SURGE',
    magnitude: 1
  }
};

export const SORCERER_PACKAGE: ClassPackage = {
  classId: 'sorcerer',
  className: 'Sorcerer',
  signatureAbility: SPELL_SCULPT,
  domainAbilities: [IGNITE, GUST],
  passive: WILD_SURGE,
  aiProfile: 'SNIPER'
};
