import { Ability } from '../../core/types/ability';
import { PassiveTrait } from '../../core/types/passive';
import { ClassPackage } from '../../core/types/classPackage';

export const LEAD_THE_CHARGE: Ability = {
  id: 'lead_the_charge',
  name: 'Lead the Charge',
  description: 'Knight rallies comrades. Knight and all allies within 3 hexes gain +2 Move and +2 Speed for 2 turns.',
  archetypeTag: 'FIGHTER',
  apCost: 2,
  range: 0,
  aoeRadius: 3,
  targetType: 'SELF',
  defenseTarget: 'NONE',
  damageType: 'NONE',
  effect: {
    type: 'STAT_MODIFIER',
    magnitude: 2,
    durationTurns: 2,
    statModifiers: {
      move: 2,
      speed: 2
    }
  }
};

export const CHALLENGING_SHOUT: Ability = {
  id: 'challenging_shout',
  name: 'Challenging Shout',
  description: 'Taunts an enemy within 3 hexes, forcing them to face the Knight and inflicting CHALLENGED for 2 turns.',
  archetypeTag: 'FIGHTER',
  apCost: 1,
  range: 3,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'NONE',
  damageType: 'NONE',
  effect: {
    type: 'CONDITION',
    conditionType: 'CHALLENGED',
    magnitude: 0,
    durationTurns: 2
  }
};

export const POMMEL_STRIKE: Ability = {
  id: 'pommel_strike',
  name: 'Pommel Strike',
  description: 'A concussive melee blow dealing 1d4 + Force physical damage and reducing the target initiative gauge by 20 points.',
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
    type: 'CTB_DELAY',
    magnitude: 20
  }
};

export const TACTICAL_VANGUARD: PassiveTrait = {
  id: 'tactical_vanguard',
  name: 'Tactical Vanguard',
  description: 'Superior tactical readiness grants +25 starting CTB initiative gauge at the beginning of battle.',
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
