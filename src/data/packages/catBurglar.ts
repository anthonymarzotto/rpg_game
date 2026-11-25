import { Ability } from '../../core/types/ability';
import { PassiveTrait } from '../../core/types/passive';
import { ClassPackage } from '../../core/types/classPackage';

export const ROOFTOP_VAULT: Ability = {
  id: 'rooftop_vault',
  name: 'Rooftop Vault',
  description: 'An acrobatic vertical leap scaling cliffs and clearing obstacles with heightened agility.',
  archetypeTag: 'ROGUE',
  apCost: 1,
  range: 3,
  targetType: 'HEX',
  intent: 'SELF',
  defenseTarget: 'NONE',
  damageType: 'NONE',
  effects: [
    {
      type: 'TELEPORT',
      shout: 'VAULT!'
    },
    {
      type: 'STAT_MODIFIER',
      targetScope: 'SELF',
      magnitude: 2,
      durationTurns: 1,
      statModifiers: {
        evasion: 2
      },
      applyOn: 'ALWAYS'
    }
  ]
};

export const PILFER: Ability = {
  id: 'pilfer',
  name: 'Pilfer',
  description: 'A lightning-fast finesse strike that siphons initiative directly from the target.',
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
      type: 'CTB_DELAY',
      magnitude: 20,
      shout: null
    },
    {
      type: 'INITIATIVE_BOOST',
      targetScope: 'SELF',
      magnitude: 20,
      applyOn: 'HIT_OR_CRIT'
    }
  ]
};

export const FLASH_POWDER: Ability = {
  id: 'flash_powder',
  name: 'Flash Powder',
  description: 'Throws a pouch of disorienting powder that spins caught enemies around and blinds their aim.',
  archetypeTag: 'MAGE',
  apCost: 1,
  range: 2,
  aoeRadius: 1,
  targetType: 'HEX',
  intent: 'HOSTILE',
  defenseTarget: 'NONE',
  damageType: 'NONE',
  effects: [
    {
      type: 'FORCE_FACING_AWAY',
      applyOn: 'ALWAYS'
    },
    {
      type: 'STAT_MODIFIER',
      targetScope: 'TARGET',
      durationTurns: 1,
      statModifiers: {
        attackRoll: -2
      },
      applyOn: 'ALWAYS'
    }
  ],
  aiHint: {
    role: 'PRIMER',
    primer: {
      requiresFollowUp: 'ANY_ATTACK',
      minTotalAp: 2,
      bonusScore: 65.0,
      reason: 'Prime flash powder disorientation before strike',
      preferredProfiles: ['SKIRMISHER']
    }
  }
};

export const FELINE_GRACE: PassiveTrait = {
  id: 'feline_grace',
  name: 'Feline Grace',
  description: 'Cats always land on their feet: immune to Fall Impact Damage, rebounds safely over obstacles and onto cliff tops during knockback and retreat (immune to collision damage), and gains +2 Evasion.',
  hook: 'ALWAYS',
  immuneToFallDamage: true,
  immuneToCollisionDamage: true,
  canVaultOnKnockback: true,
  canVaultOnRetreat: true,
  statModifiers: {
    evasion: 2
  }
};

export const CAT_BURGLAR_PACKAGE: ClassPackage = {
  classId: 'cat-burglar',
  className: 'Cat-burglar',
  signatureAbility: ROOFTOP_VAULT,
  domainAbilities: [PILFER, FLASH_POWDER],
  passive: FELINE_GRACE,
  aiProfile: 'SKIRMISHER'
};
