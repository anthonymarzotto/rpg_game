import { Unit } from '../types/unit';
import { Archetype, ClassDefinition, UnitProgression } from '../types/class';
import { TriadAttributes, DerivedCombatVitals } from '../types/stats';
import { InBattleXp } from '../combat/types';
import { ClassRegistry } from './registry';
import { advanceArchetypeLevel, MAX_LEVEL } from './pyramid';
import { LEVEL_XP_THRESHOLDS } from '../config/balance';
import { computeDerivedVitals } from '../units/vitals';

export interface PostBattleReconciliationResult {
  readonly updatedProgression: UnitProgression;
  readonly updatedVitals: DerivedCombatVitals;
  readonly updatedAttributes: TriadAttributes;
  readonly earnedXp: InBattleXp;
  readonly carryoverXp: InBattleXp;
  readonly levelUpsGained: number;
  readonly unlockedClass: ClassDefinition | null;
  readonly requiresChoice: boolean;
  readonly qualifyingArchetypes: readonly Archetype[];
}

export interface ReconcileOptions {
  readonly bankedXp?: InBattleXp;
  readonly selectedArchetypeChoice?: Archetype;
}

/**
 * Reconciles post-battle archetype XP, thresholds, level advancement, carryover XP,
 * and derived combat vitals with explicit dependency injection.
 */
export function reconcilePostBattleProgression(
  unit: Unit,
  inBattleXp: InBattleXp,
  registry: ClassRegistry,
  options?: ReconcileOptions
): PostBattleReconciliationResult {
  const currentLevel = unit.progression.currentLevel;

  const totalFighter = (options?.bankedXp?.fighter ?? 0) + inBattleXp.fighter;
  const totalRogue = (options?.bankedXp?.rogue ?? 0) + inBattleXp.rogue;
  const totalMage = (options?.bankedXp?.mage ?? 0) + inBattleXp.mage;

  const nonLevelUpResult = (
    requiresChoice = false,
    qualifying: readonly Archetype[] = []
  ): PostBattleReconciliationResult => ({
    updatedProgression: unit.progression,
    updatedVitals: unit.effectiveVitals,
    updatedAttributes: unit.baseAttributes,
    earnedXp: { ...inBattleXp },
    carryoverXp: { fighter: totalFighter, rogue: totalRogue, mage: totalMage },
    levelUpsGained: 0,
    unlockedClass: null,
    requiresChoice,
    qualifyingArchetypes: qualifying
  });

  // Max level check
  if (currentLevel >= MAX_LEVEL) {
    return nonLevelUpResult();
  }

  // Threshold for currentLevel -> currentLevel + 1
  const threshold = LEVEL_XP_THRESHOLDS[currentLevel] ?? 5;

  const qualifyingArchetypes: Archetype[] = [];
  if (totalFighter >= threshold) qualifyingArchetypes.push('FIGHTER');
  if (totalRogue >= threshold) qualifyingArchetypes.push('ROGUE');
  if (totalMage >= threshold) qualifyingArchetypes.push('MAGE');

  // Case 1: No archetype met the threshold
  if (qualifyingArchetypes.length === 0) {
    return nonLevelUpResult();
  }

  // Case 2: Multiple archetypes qualify and no player choice is provided
  if (qualifyingArchetypes.length > 1 && !options?.selectedArchetypeChoice) {
    return nonLevelUpResult(true, qualifyingArchetypes);
  }

  // Case 3: Exactly one archetype qualified, or player provided their choice
  const chosenArchetype =
    options?.selectedArchetypeChoice && qualifyingArchetypes.includes(options.selectedArchetypeChoice)
      ? options.selectedArchetypeChoice
      : qualifyingArchetypes[0];

  // Calculate carryover XP: subtract threshold only from chosen archetype
  const carryoverXp: InBattleXp = {
    fighter: chosenArchetype === 'FIGHTER' ? totalFighter - threshold : totalFighter,
    rogue: chosenArchetype === 'ROGUE' ? totalRogue - threshold : totalRogue,
    mage: chosenArchetype === 'MAGE' ? totalMage - threshold : totalMage
  };

  // Advance progression
  const updatedProgression = advanceArchetypeLevel(unit.progression, chosenArchetype, registry);

  // Determine unlocked class
  const newClassId = updatedProgression.constellation[updatedProgression.constellation.length - 1];
  const unlockedClass = newClassId ? registry.getClassById(newClassId) : null;

  // Upgrade attribute vector
  const updatedAttributes: TriadAttributes = {
    force: unit.baseAttributes.force + (chosenArchetype === 'FIGHTER' ? 1 : 0),
    finesse: unit.baseAttributes.finesse + (chosenArchetype === 'ROGUE' ? 1 : 0),
    focus: unit.baseAttributes.focus + (chosenArchetype === 'MAGE' ? 1 : 0)
  };

  // Recompute vitals
  const updatedVitals = computeDerivedVitals(updatedAttributes, updatedProgression.currentLevel);

  return {
    updatedProgression,
    updatedVitals,
    updatedAttributes,
    earnedXp: { ...inBattleXp },
    carryoverXp,
    levelUpsGained: 1,
    unlockedClass,
    requiresChoice: false,
    qualifyingArchetypes
  };
}
