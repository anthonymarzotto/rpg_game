import { Ability } from '../../core/types/ability';
import { PassiveTrait } from '../../core/types/passive';
import { ClassPackage } from '../../core/types/classPackage';

export const REFRACTIVE_ARRAY: Ability = {
  id: 'refractive_array',
  name: 'Refractive Array',
  description: 'Projects a geometric resonance lattice that spares allies inside the field and refracts conserved arcane force onto caught foes.',
  archetypeTag: 'MAGE',
  apCost: 2,
  range: 3,
  aoeRadius: 1,
  splashLabel: 'ARRAY',
  splashDamageProfile: {
    count: 1,
    sides: 4,
    modifierAttribute: 'focus'
  },
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
      type: 'ALLY_REFRACTION',
      damageProfile: {
        count: 1,
        sides: 4,
        modifierAttribute: 'focus'
      },
      applyOn: 'ALWAYS'
    }
  ],
  aiHint: {
    role: 'FINISHER'
  }
};

export const ADAPTIVE_FORMULA: Ability = {
  id: 'adaptive_formula',
  name: 'Adaptive Formula',
  description: 'Computes the path of least resistance, launching a calibrated arcane bolt tuned against the target’s weaker defense.',
  archetypeTag: 'MAGE',
  apCost: 1,
  range: 3,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'LOWER_DEFENSE',
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
    }
  ],
  aiHint: {
    role: 'FINISHER'
  }
};

export const DISTRIBUTIVE_PROOF: Ability = {
  id: 'distributive_proof',
  name: 'Distributive Proof',
  description: 'Channels a branching arcane equation that exposes isolated foes or distributes energy across clustered formations.',
  archetypeTag: 'ROGUE',
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
      type: 'DISTRIBUTIVE_PROOF',
      damageProfile: {
        count: 1,
        sides: 4
      },
      conditionType: 'EXPOSED',
      durationTurns: 1,
      applyOn: 'HIT_OR_CRIT'
    }
  ],
  aiHint: {
    role: 'FINISHER'
  }
};

export const EXCLUSION_MATRIX: PassiveTrait = {
  id: 'exclusion_matrix',
  name: 'Exclusion Matrix',
  description: 'Precise spatial geometry curves spells cleanly around teammates: friendly units never block Line of Sight for your magical abilities, and your hostile AoE attacks and splashes never harm or debuff friendly units.',
  hook: 'ALWAYS',
  excludeFriendlyAoE: true,
  ignoresAllyLoS: true
};

export const ARCANIST_PACKAGE: ClassPackage = {
  classId: 'arcanist',
  className: 'Arcanist',
  signatureAbility: REFRACTIVE_ARRAY,
  domainAbilities: [ADAPTIVE_FORMULA, DISTRIBUTIVE_PROOF],
  passive: EXCLUSION_MATRIX,
  aiProfile: 'SNIPER'
};
