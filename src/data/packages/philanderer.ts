import { Ability } from '../../core/types/ability';
import { PassiveTrait } from '../../core/types/passive';
import { ClassPackage } from '../../core/types/classPackage';

export const BILLET_DOUX: Ability = {
  id: 'billet_doux',
  name: 'Billet-Doux',
  description: 'Flicks a perfumed love letter sealed with a crimson rose, turning an enemy’s heart against their own comrades.',
  archetypeTag: 'ROGUE',
  apCost: 2,
  range: 3,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'RESOLVE',
  attackModifierAttribute: 'finesse',
  damageType: 'NONE',
  effects: [
    {
      type: 'CONDITION',
      conditionType: 'CHARMED',
      durationTurns: 2,
      applyOn: 'CRIT_ONLY'
    },
    {
      type: 'CONDITION',
      conditionType: 'CHARMED',
      durationTurns: 1,
      applyOn: 'HIT_ONLY'
    },
    {
      type: 'CONDITION',
      conditionType: 'EXPOSED',
      durationTurns: 1,
      applyOn: 'GRAZE_ONLY'
    }
  ],
  aiHint: {
    role: 'DISRUPTION'
  }
};

export const BECKONING_GLANCE: Ability = {
  id: 'beckoning_glance',
  name: 'Beckoning Glance',
  description: 'Catches an enemy’s eye with a crooked finger and a knowing smirk, drawing them out of formation and lowering their guard.',
  archetypeTag: 'ROGUE',
  apCost: 1,
  range: 3,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'RESOLVE',
  attackModifierAttribute: 'finesse',
  damageType: 'NONE',
  effects: [
    {
      type: 'PULL',
      magnitude: 1,
      applyOn: 'HIT_OR_CRIT'
    },
    {
      type: 'FORCE_FACING',
      applyOn: 'HIT_OR_CRIT'
    },
    {
      type: 'CONDITION',
      conditionType: 'EXPOSED',
      durationTurns: 1,
      applyOn: 'HIT_OR_CRIT'
    }
  ],
  aiHint: {
    role: 'PRIMER',
    primer: {
      requiresFollowUp: 'ANY_ATTACK',
      minTotalAp: 3,
      bonusScore: 18.0,
      reason: 'Pull and Expose target at turn start before follow-up',
      preferredProfiles: ['SUPPORT', 'SKIRMISHER']
    }
  }
};

export const LOOKING_GLASS_GLARE: Ability = {
  id: 'looking_glass_glare',
  name: 'Looking-Glass Glare',
  description: 'Angles the polished hand mirror to catch ambient starlight, firing a dazzling violet ray that blinds the target’s aim.',
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
      conditionType: 'BLINDED',
      durationTurns: 1,
      applyOn: 'HIT_OR_CRIT'
    }
  ],
  aiHint: {
    role: 'DISRUPTION'
  }
};

export const CAPTIVATING_PRESENCE: PassiveTrait = {
  id: 'captivating_presence',
  name: 'Captivating Presence',
  description: 'A dazzling frontal glamour: enemies within 3 hexes in the Philanderer’s FRONT combat arc suffer -2 to their Attack Roll on all attacks.',
  hook: 'ALWAYS',
  aura: {
    radius: 3,
    targetScope: 'ENEMIES',
    arc: 'FRONT',
    attackRollPenalty: 2
  }
};

export const PHILANDERER_PACKAGE: ClassPackage = {
  classId: 'philanderer',
  className: 'Philanderer',
  signatureAbility: BILLET_DOUX,
  domainAbilities: [BECKONING_GLANCE, LOOKING_GLASS_GLARE],
  passive: CAPTIVATING_PRESENCE,
  aiProfile: 'SUPPORT'
};
