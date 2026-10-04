import { Ability } from '../../core/types/ability';
import { PassiveTrait } from '../../core/types/passive';
import { ClassPackage } from '../../core/types/classPackage';

export const SPELL_SCULPT: Ability = {
  id: 'spell_sculpt',
  name: 'Spell Sculpt',
  description: 'Primes metamagic stance: next Mage spell executed this turn gains +1 Range and +1 AoE Radius.',
  archetypeTag: 'MAGE',
  apCost: 1,
  range: 0,
  targetType: 'SELF',
  defenseTarget: 'NONE',
  damageType: 'NONE',
  oncePerTurn: true,
  effect: {
    type: 'SPELL_SCULPT',
    magnitude: 1
  }
};

export const IGNITE: Ability = {
  id: 'ignite',
  name: 'Ignite',
  description: 'Engulfs target in burning flames dealing 1d4 + Focus magical damage and inflicting BURN for 2 turns (2 damage/turn).',
  archetypeTag: 'MAGE',
  apCost: 1,
  range: 3,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'RESOLVE',
  attackModifierAttribute: 'focus',
  damageType: 'MAGICAL',
  damageProfile: {
    count: 1,
    sides: 4,
    modifierAttribute: 'focus'
  },
  effect: {
    type: 'CONDITION',
    conditionType: 'BURN',
    magnitude: 2,
    durationTurns: 2
  }
};

export const GUST: Ability = {
  id: 'gust',
  name: 'Gust',
  description: 'A blast of gale-force wind pushing target 1 hex directly away from caster.',
  archetypeTag: 'MAGE',
  apCost: 1,
  range: 3,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'NONE',
  damageType: 'NONE',
  effect: {
    type: 'KNOCKBACK',
    magnitude: 1
  }
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
