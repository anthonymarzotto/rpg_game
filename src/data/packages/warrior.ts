import { Ability } from '../../core/types/ability';
import { PassiveTrait } from '../../core/types/passive';
import { ClassPackage } from '../../core/types/classPackage';
import { BRACE } from './novice';

export const POWER_STRIKE: Ability = {
  id: 'power_strike',
  name: 'Power Strike',
  description: 'A heavy, two-handed kinetic blow that concentrates immense force to bypass physical armor.',
  archetypeTag: 'FIGHTER',
  apCost: 2,
  range: 1,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'EVASION',
  attackModifierAttribute: 'finesse',
  damageType: 'PHYSICAL',
  damageProfile: {
    count: 2,
    sides: 6,
    modifierAttribute: 'force'
  }
};

export const CLEAVE: Ability = {
  id: 'cleave',
  name: 'Cleave',
  description: 'A sweeping horizontal slash dealing 1d4 kinetic damage and sweeping to 1 adjacent frontal enemy for collateral damage.',
  archetypeTag: 'FIGHTER',
  apCost: 1,
  range: 1,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'EVASION',
  attackModifierAttribute: 'finesse',
  damageType: 'PHYSICAL',
  damageProfile: {
    count: 1,
    sides: 4,
    modifierAttribute: 'force'
  },
  effect: {
    type: 'CLEAVE',
    magnitude: 1
  }
};

export const UNYIELDING: PassiveTrait = {
  id: 'unyielding',
  name: 'Unyielding',
  description: 'Years of armor conditioning grant +1 Armor to reduce all incoming physical damage.',
  hook: 'ALWAYS',
  statModifiers: {
    armor: 1
  }
};

export const WARRIOR_PACKAGE: ClassPackage = {
  classId: 'warrior',
  className: 'Warrior',
  signatureAbility: POWER_STRIKE,
  domainAbilities: [CLEAVE, BRACE],
  passive: UNYIELDING,
  aiProfile: 'BRAWLER'
};
