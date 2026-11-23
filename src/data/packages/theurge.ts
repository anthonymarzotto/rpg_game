import { Ability } from '../../core/types/ability';
import { PassiveTrait } from '../../core/types/passive';
import { ClassPackage } from '../../core/types/classPackage';

export const HENOSIS: Ability = {
  id: 'henosis',
  name: 'Henosis',
  description: 'Channels celestial union into a mortal vessel, elevating their prowess before leaving their frame spent.',
  archetypeTag: 'MAGE',
  apCost: 2,
  range: 3,
  targetType: 'ALLY',
  defenseTarget: 'NONE',
  damageType: 'NONE',
  effects: [
    {
      type: 'CONDITION',
      conditionType: 'HENOSIS',
      durationTurns: 2,
      applyOn: 'ALWAYS'
    }
  ]
};

export const ABSOLUTION: Ability = {
  id: 'absolution',
  name: 'Absolution',
  description: 'Bestows a purifying benediction of starlight that cleanses afflictions and hastens the recipient’s turn.',
  archetypeTag: 'MAGE',
  apCost: 1,
  range: 3,
  targetType: 'ALLY',
  defenseTarget: 'NONE',
  damageType: 'NONE',
  effects: [
    {
      type: 'CLEANSE',
      applyOn: 'ALWAYS'
    },
    {
      type: 'INITIATIVE_BOOST',
      magnitude: 20,
      applyOn: 'ALWAYS'
    }
  ]
};

export const EMPYREAN_PILLAR: Ability = {
  id: 'empyrean_pillar',
  name: 'Empyrean Pillar',
  description: 'Calls down a vertical column of solar judgment from the firmament that crushes the target’s momentum.',
  archetypeTag: 'MAGE',
  apCost: 1,
  range: 3,
  ignoresElevationPenalty: true,
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
      type: 'CTB_DELAY',
      magnitude: 20,
      shout: null
    }
  ]
};

export const THEURGIC_SYNERGY: PassiveTrait = {
  id: 'theurgic_synergy',
  name: 'Theurgic Synergy',
  description: 'Landing a solid or critical hit with a magical attack causes a 1-hex ring of celestial radiance to erupt around the active Henosis vessel (or self if none is active), dealing 1 magical damage to adjacent enemies.',
  hook: 'ON_HIT',
  triggerFilter: {
    damageType: 'MAGICAL',
    requireSolidHitOrCrit: true
  },
  conduitPulse: {
    linkedCondition: 'HENOSIS',
    fallbackToSelf: true,
    radius: 1,
    damage: 1,
    damageType: 'MAGICAL',
    label: 'SYNERGY'
  }
};

export const THEURGE_PACKAGE: ClassPackage = {
  classId: 'theurge',
  className: 'Theurge',
  signatureAbility: HENOSIS,
  domainAbilities: [ABSOLUTION, EMPYREAN_PILLAR],
  passive: THEURGIC_SYNERGY,
  aiProfile: 'SUPPORT'
};
