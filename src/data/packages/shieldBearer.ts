import { Ability } from '../../core/types/ability';
import { PassiveTrait } from '../../core/types/passive';
import { ClassPackage } from '../../core/types/classPackage';

export const BASTION_PLANT: Ability = {
  id: 'bastion_plant',
  name: 'Bastion Plant',
  description: 'Plants the reinforced kite shield into the earth, anchoring a phalanx line that halts advancing foes and shields rear allies.',
  archetypeTag: 'FIGHTER',
  apCost: 2,
  range: 0,
  targetType: 'SELF',
  defenseTarget: 'NONE',
  damageType: 'NONE',
  effects: [
    {
      type: 'ARMOR_BUFF',
      magnitude: 3,
      durationTurns: 1,
      targetScope: 'SELF',
      applyOn: 'ALWAYS'
    },
    {
      type: 'STAT_MODIFIER',
      magnitude: 0,
      durationTurns: 1,
      targetScope: 'SELF',
      statModifiers: {
        move: -99
      },
      applyOn: 'ALWAYS'
    },
    {
      type: 'BASTION_STANCE',
      durationTurns: 1,
      targetScope: 'SELF',
      applyOn: 'ALWAYS'
    }
  ],
  aiHint: {
    role: 'DEFENSIVE'
  }
};

export const INTERCEPT_STEP: Ability = {
  id: 'intercept_step',
  name: 'Intercept Step',
  description: 'Swaps positions with a targeted ally, pulling them to safety behind your shield.',
  archetypeTag: 'ROGUE',
  apCost: 1,
  range: 3,
  targetType: 'ALLY',
  defenseTarget: 'NONE',
  damageType: 'NONE',
  effects: [
    {
      type: 'POSITION_SWAP',
      applyOn: 'ALWAYS',
      shout: { actor: 'INTERCEPT!', target: null }
    },
    {
      type: 'ARMOR_BUFF',
      magnitude: 2,
      durationTurns: 1,
      targetScope: 'TARGET',
      applyOn: 'ALWAYS'
    }
  ],
  aiHint: {
    role: 'UTILITY'
  }
};

export const CONCUSSIVE_SLAM: Ability = {
  id: 'concussive_slam',
  name: 'Concussive Slam',
  description: 'Slams the heavy kite shield into an adjacent foe, staggering their footing.',
  archetypeTag: 'FIGHTER',
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
        modifierAttribute: 'force'
      }
    },
    {
      type: 'SLOW',
      magnitude: 2,
      durationTurns: 1,
      applyOn: 'HIT_OR_CRIT'
    }
  ],
  aiHint: {
    role: 'FINISHER'
  }
};

export const UNYIELDING_STANCE: PassiveTrait = {
  id: 'unyielding_stance',
  name: 'Unyielding Stance',
  description: 'Unshakeable phalanx anchor: immune to forced displacement (knockback, pull, slide) and projects a protective aura giving -2 to hostile attack rolls targeting adjacent allies.',
  hook: 'ALWAYS',
  immuneToDisplacement: true,
  aura: {
    radius: 1,
    targetScope: 'ALLIES',
    attackRollPenalty: 2
  }
};

export const SHIELD_BEARER_PACKAGE: ClassPackage = {
  classId: 'shield-bearer',
  className: 'Shield-bearer',
  signatureAbility: BASTION_PLANT,
  domainAbilities: [INTERCEPT_STEP, CONCUSSIVE_SLAM],
  passive: UNYIELDING_STANCE,
  aiProfile: 'BRAWLER'
};
