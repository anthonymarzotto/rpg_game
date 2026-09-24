import { CombatUnit } from '../combat/types';
import { HexCoord, hexDistance, CombatArc } from '../grid/hex';
import { AbilityMetrics } from '../combat/targetPreview';
import { AIProfile, AIArchetypeWeights } from './types';

export const DEFAULT_ARCHETYPE_WEIGHTS: Record<AIProfile, AIArchetypeWeights> = {
  BRAWLER: {
    killBonus: 100,
    expectedDamageWeight: 3.0,
    vulnerabilityWeight: 1.5,
    flankWeight: 2.0,
    standoffWeight: 0,
    preferredStandoffRange: 1,
    focusFireWeight: 1.0,
    apConservationThreshold: 5.0
  },
  SKIRMISHER: {
    killBonus: 120,
    expectedDamageWeight: 2.5,
    vulnerabilityWeight: 2.0,
    flankWeight: 7.0, // Highly prioritizes flank and rear angles for sneak attack
    standoffWeight: 0,
    preferredStandoffRange: 1,
    focusFireWeight: 1.5,
    apConservationThreshold: 6.0
  },
  SNIPER: {
    killBonus: 100,
    expectedDamageWeight: 3.0,
    vulnerabilityWeight: 2.5,
    flankWeight: 1.0,
    standoffWeight: 6.0, // High priority on maintaining preferred distance
    preferredStandoffRange: 2,
    focusFireWeight: 1.0,
    apConservationThreshold: 5.0
  },
  SUPPORT: {
    killBonus: 80,
    expectedDamageWeight: 1.5,
    vulnerabilityWeight: 1.0,
    flankWeight: 1.0,
    standoffWeight: 2.0,
    preferredStandoffRange: 2,
    focusFireWeight: 1.0,
    apConservationThreshold: 4.0
  }
};

/**
 * Resolves an authoritative AI profile for a unit by inspecting its active class,
 * abilities, and optional override.
 */
export function resolveAIProfile(
  actorCu: CombatUnit,
  override?: AIProfile
): AIProfile {
  if (override) return override;

  const hasFlankAbility = actorCu.abilities.some(
    (a) => a.conditionalBonus?.condition === 'FLANK_OR_REAR'
  );
  if (hasFlankAbility || actorCu.unit.loadout?.activeClassId === 'thief') {
    return 'SKIRMISHER';
  }

  const hasRangedAttack = actorCu.abilities.some(
    (a) => a.range >= 2 && a.damageType !== 'NONE'
  );
  if (hasRangedAttack || actorCu.unit.loadout?.activeClassId === 'wizard') {
    return 'SNIPER';
  }

  const hasBuffAbility = actorCu.abilities.some(
    (a) => a.targetType === 'ALLY' || a.damageType === 'NONE'
  );
  if (hasBuffAbility) {
    return 'SUPPORT';
  }

  return 'BRAWLER';
}

/**
 * Merges baseline archetype weights with any optional custom overrides.
 */
export function getArchetypeWeights(
  profile: AIProfile,
  overrides?: Partial<AIArchetypeWeights>
): AIArchetypeWeights {
  return {
    ...DEFAULT_ARCHETYPE_WEIGHTS[profile],
    ...(overrides ?? {})
  };
}

/**
 * Evaluates whether an attack eliminates the target, awarding a high priority kill bonus.
 */
export function scoreFinishingBlow(
  targetCu: CombatUnit,
  expectedDmg: number,
  killBonus: number
): { score: number; reason?: string } {
  if (expectedDmg >= targetCu.currentHp) {
    return {
      score: killBonus,
      reason: `Finishing blow on ${targetCu.unit.name} (Exp Dmg: ${expectedDmg} >= HP: ${targetCu.currentHp})`
    };
  }
  return { score: 0 };
}

/**
 * Evaluates targeting efficiency against low defenses (low Evasion or low Resolve).
 */
export function scoreVulnerability(
  metrics: AbilityMetrics,
  vulnerabilityWeight: number
): number {
  let score = 0;
  // High hit probability bonus
  if (metrics.toHitChance >= 70) {
    score += ((metrics.toHitChance - 50) / 10) * vulnerabilityWeight;
  }
  // Low mitigation bonus
  if (metrics.mitigation <= 1) {
    score += (2 - metrics.mitigation) * vulnerabilityWeight;
  }
  return Math.round(score * 10) / 10;
}

/**
 * Evaluates tactical positioning bonus for attacking from or moving to flank/rear arcs.
 */
export function scoreFlankOpportunity(
  combatArc: CombatArc,
  isFlankAdvantage: boolean,
  flankWeight: number
): { score: number; reason?: string } {
  if (combatArc === 'REAR' || (isFlankAdvantage && combatArc === 'REAR')) {
    return {
      score: flankWeight * 2,
      reason: 'Rear combat arc advantage'
    };
  }
  if (combatArc === 'FLANK' || isFlankAdvantage) {
    return {
      score: flankWeight,
      reason: 'Flank combat arc advantage'
    };
  }
  return { score: 0 };
}

/**
 * Scores distance relative to preferred standoff engagement distance.
 */
export function scoreStandoffDistance(
  distance: number,
  preferredRange: number,
  standoffWeight: number
): number {
  if (standoffWeight <= 0) return 0;
  const deviation = Math.abs(distance - preferredRange);
  // Negative penalty for distance deviation
  return -deviation * standoffWeight;
}

/**
 * Bonus for focus-firing already injured targets.
 */
export function scoreFocusFire(
  targetCu: CombatUnit,
  focusFireWeight: number
): number {
  const maxHp = targetCu.unit.effectiveVitals.maxHp;
  if (maxHp <= 0) return 0;
  const injuredRatio = (maxHp - targetCu.currentHp) / maxHp;
  return Math.round(injuredRatio * 10 * focusFireWeight * 10) / 10;
}
