import { Ability } from '../../core/types/ability';
import { PassiveTrait } from '../../core/types/passive';
import { ClassPackage } from '../../core/types/classPackage';

export const BALEFUL_HEX: Ability = {
  id: 'baleful_hex',
  name: 'Baleful Hex',
  description: 'Utters a baleful curse dealing 1d4 + Focus magical damage vs Resolve, inflicting POISON for 2 turns (2 damage/turn) and delaying target CTB initiative by 20 ticks.',
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
      conditionType: 'POISON',
      magnitude: 2,
      durationTurns: 2
    },
    {
      type: 'CTB_DELAY',
      magnitude: 20
    }
  ]
};

export const POPPET_NEEDLE: Ability = {
  id: 'poppet_needle',
  name: 'Poppet Needle',
  description: 'Drives a pin into a sympathetic effigy, dealing 1d6 + Focus magical damage vs Resolve, forcing the target to face 180° away from the caster, and inflicting -2 Resolve for 2 turns.',
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
        sides: 6,
        modifierAttribute: 'focus'
      }
    },
    {
      type: 'FORCE_FACING_AWAY',
      applyOn: 'HIT_OR_CRIT'
    },
    {
      type: 'STAT_MODIFIER',
      targetScope: 'TARGET',
      durationTurns: 2,
      statModifiers: {
        resolve: -2
      }
    }
  ]
};

export const WITCHS_TALISMAN: Ability = {
  id: 'witchs_talisman',
  name: "Witch's Talisman",
  description: 'Bestows an occult talisman upon an ally within 2 hexes, granting an immediate +25 CTB initiative boost and +2 Speed for 1 turn.',
  archetypeTag: 'MAGE',
  apCost: 1,
  range: 2,
  targetType: 'ALLY',
  defenseTarget: 'NONE',
  damageType: 'NONE',
  effects: [
    {
      type: 'INITIATIVE_BOOST',
      targetScope: 'TARGET',
      magnitude: 25,
      applyOn: 'ALWAYS'
    },
    {
      type: 'STAT_MODIFIER',
      targetScope: 'TARGET',
      durationTurns: 1,
      statModifiers: {
        speed: 2
      },
      applyOn: 'ALWAYS'
    }
  ]
};

export const MISFORTUNE_WARD: PassiveTrait = {
  id: 'misfortune_ward',
  name: 'Misfortune Ward',
  description: 'An ominous protective hex enshrouds the Witch and her circle: attacks targeting allies or self within 2 hexes suffer -2 to their Attack Roll.',
  hook: 'ALWAYS',
  aura: {
    radius: 2,
    targetScope: 'ALLIES',
    attackRollPenalty: 2
  }
};

export const WITCH_PACKAGE: ClassPackage = {
  classId: 'witch',
  className: 'Witch',
  signatureAbility: BALEFUL_HEX,
  domainAbilities: [POPPET_NEEDLE, WITCHS_TALISMAN],
  passive: MISFORTUNE_WARD,
  aiProfile: 'SUPPORT'
};
