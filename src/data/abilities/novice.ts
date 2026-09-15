import { Ability } from '../../core/types/ability';
import { UNIVERSAL_ACTIONS } from './universal';

export const STRIKE: Ability = {
  id: 'strike',
  name: 'Strike',
  description: 'A disciplined, direct melee blow dealing solid kinetic damage.',
  archetypeTag: 'FIGHTER',
  apCost: 1,
  range: 1,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'EVASION',
  damageType: 'PHYSICAL',
  damageProfile: {
    count: 1,
    sides: 6,
    modifierAttribute: 'force'
  }
};

export const SHIELD_BASH: Ability = {
  id: 'shield_bash',
  name: 'Shield Bash',
  description: 'A forceful slam that deals kinetic damage and pushes the target back 1 hex.',
  archetypeTag: 'FIGHTER',
  apCost: 1,
  range: 1,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'EVASION',
  damageType: 'PHYSICAL',
  damageProfile: {
    count: 1,
    sides: 4,
    modifierAttribute: 'force'
  },
  effect: {
    type: 'KNOCKBACK',
    magnitude: 1
  }
};

export const BRACE: Ability = {
  id: 'brace',
  name: 'Brace',
  description: 'A defensive guard strike dealing light damage and raising Armor by +2 for 1 turn.',
  archetypeTag: 'FIGHTER',
  apCost: 1,
  range: 1,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'EVASION',
  damageType: 'PHYSICAL',
  damageProfile: {
    count: 1,
    sides: 4,
    modifierAttribute: 'force'
  },
  effect: {
    type: 'ARMOR_BUFF',
    magnitude: 2,
    durationTurns: 1
  }
};

export const NOVICE_FIGHTER_ABILITIES: readonly Ability[] = [
  STRIKE,
  SHIELD_BASH,
  BRACE
];

export const QUICK_THRUST: Ability = {
  id: 'quick_thrust',
  name: 'Quick Thrust',
  description: 'A rapid piercing stab with an expanded critical hit threshold (crits on 19-20).',
  archetypeTag: 'ROGUE',
  apCost: 1,
  range: 1,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'EVASION',
  damageType: 'PHYSICAL',
  damageProfile: {
    count: 1,
    sides: 4,
    modifierAttribute: 'finesse'
  },
  effect: {
    type: 'CRIT_BOOST',
    magnitude: 1
  }
};

export const THROW_DART: Ability = {
  id: 'throw_dart',
  name: 'Throw Dart',
  description: 'Hurl a balanced throwing dart at a distant foe.',
  archetypeTag: 'ROGUE',
  apCost: 1,
  range: 2,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'EVASION',
  damageType: 'PHYSICAL',
  damageProfile: {
    count: 1,
    sides: 4,
    modifierAttribute: 'finesse'
  }
};

export const SKIRMISH: Ability = {
  id: 'skirmish',
  name: 'Skirmish',
  description: 'Strike a foe and immediately retreat 1 hex backward without spending move AP.',
  archetypeTag: 'ROGUE',
  apCost: 1,
  range: 1,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'EVASION',
  damageType: 'PHYSICAL',
  damageProfile: {
    count: 1,
    sides: 4,
    modifierAttribute: 'finesse'
  },
  effect: {
    type: 'RETREAT_STEP',
    magnitude: 1
  }
};

export const NOVICE_ROGUE_ABILITIES: readonly Ability[] = [
  QUICK_THRUST,
  THROW_DART,
  SKIRMISH
];

export const SPARK: Ability = {
  id: 'spark',
  name: 'Spark',
  description: 'Project a crackling bolt of raw arcane energy from long range.',
  archetypeTag: 'MAGE',
  apCost: 1,
  range: 3,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'RESOLVE',
  damageType: 'MAGICAL',
  damageProfile: {
    count: 1,
    sides: 6,
    modifierAttribute: 'focus'
  }
};

export const FROSTBITE: Ability = {
  id: 'frostbite',
  name: 'Frostbite',
  description: 'A chilling frost cantrip that deals magic damage and reduces target Move by 1.',
  archetypeTag: 'MAGE',
  apCost: 1,
  range: 2,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'RESOLVE',
  damageType: 'MAGICAL',
  damageProfile: {
    count: 1,
    sides: 4,
    modifierAttribute: 'focus'
  },
  effect: {
    type: 'SLOW',
    magnitude: 1,
    durationTurns: 1
  }
};

export const MINOR_WARD: Ability = {
  id: 'minor_ward',
  name: 'Minor Ward',
  description: 'Weave protective magic over yourself or an ally, raising Ward by +2 for 1 turn.',
  archetypeTag: 'MAGE',
  apCost: 1,
  range: 2,
  targetType: 'ALLY',
  defenseTarget: 'NONE',
  damageType: 'NONE',
  effect: {
    type: 'WARD_BUFF',
    magnitude: 2,
    durationTurns: 1
  }
};

export const NOVICE_MAGE_ABILITIES: readonly Ability[] = [
  SPARK,
  FROSTBITE,
  MINOR_WARD
];

/**
 * Selects 1 Fighter, 1 Rogue, and 1 Mage ability to build a unique Novice kit.
 * Accepts an optional deterministic PRNG function for seeded generation/testing.
 */
export function rollNoviceAbilityKit(rng: () => number = Math.random): readonly Ability[] {
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

  const fighter = pick(NOVICE_FIGHTER_ABILITIES);
  const rogue = pick(NOVICE_ROGUE_ABILITIES);
  const mage = pick(NOVICE_MAGE_ABILITIES);

  return [fighter, rogue, mage, ...UNIVERSAL_ACTIONS];
}
