import { Ability } from '../../core/types/ability';
import { PassiveTrait } from '../../core/types/passive';
import { ClassPackage } from '../../core/types/classPackage';

export const EXPOSE_WEAKNESS: Ability = {
  id: 'expose_weakness',
  name: 'Expose Weakness',
  description: 'Marks enemy weak points within 3 hexes, inflicting -2 Armor and -2 Evasion for 2 turns.',
  archetypeTag: 'ROGUE',
  apCost: 1,
  range: 3,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'NONE',
  damageType: 'NONE',
  effects: [
    {
      type: 'STAT_MODIFIER',
      magnitude: 2,
      durationTurns: 2,
      statModifiers: {
        armor: -2,
        evasion: -2
      }
    }
  ]
};

export const SMOKE_VEIL: Ability = {
  id: 'smoke_veil',
  name: 'Smoke Veil',
  description: 'Vanishes into a dense cloud of smoke, gaining STEALTH for 1 turn. Attacking from stealth grants Advantage and breaks stealth.',
  archetypeTag: 'ROGUE',
  apCost: 1,
  range: 0,
  targetType: 'SELF',
  defenseTarget: 'NONE',
  damageType: 'NONE',
  effects: [
    {
      type: 'CONDITION',
      conditionType: 'STEALTH',
      magnitude: 0,
      durationTurns: 2
    }
  ]
};

export const TOXIC_SHIV: Ability = {
  id: 'toxic_shiv',
  name: 'Toxic Shiv',
  description: 'A venomous blade strike dealing 1d4 + Finesse physical damage and poisoning the target for 2 turns (2 damage/turn).',
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
      type: 'CONDITION',
      conditionType: 'POISON',
      magnitude: 2,
      durationTurns: 2
    }
  ]
};

export const ELUSIVE_STRIDE: PassiveTrait = {
  id: 'elusive_stride',
  name: 'Elusive Stride',
  description: 'Fluid tactical repositioning grants +2 Evasion until next turn upon spending AP to Move.',
  hook: 'ON_MOVE',
  effect: {
    type: 'STAT_MODIFIER',
    magnitude: 2,
    durationTurns: 1,
    statModifiers: {
      evasion: 2
    }
  }
};

export const INFILTRATOR_PACKAGE: ClassPackage = {
  classId: 'infiltrator',
  className: 'Infiltrator',
  signatureAbility: EXPOSE_WEAKNESS,
  domainAbilities: [SMOKE_VEIL, TOXIC_SHIV],
  passive: ELUSIVE_STRIDE,
  aiProfile: 'SKIRMISHER'
};
