import { CombatUnit, CombatState } from '../combat/types';
import { CombatArc, HexCoord, hexDistance } from '../grid/hex';
import { AbilityMetrics } from '../combat/targetPreview';
import { Ability } from '../types/ability';
import { AIProfile, AIArchetypeWeights } from './types';
import { getClassPackage } from '../../data/packages';

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
 * Resolves an authoritative AI profile for a unit by inspecting its active class package,
 * abilities, and optional override.
 */
export function resolveAIProfile(
  actorCu: CombatUnit,
  override?: AIProfile
): AIProfile {
  if (override) return override;

  const classId = actorCu.unit.loadout?.activeClassId;
  if (classId) {
    const pkg = getClassPackage(classId);
    if (pkg?.aiProfile) {
      return pkg.aiProfile;
    }
  }

  const hasFlankAbility = actorCu.abilities.some(
    (a) => a.effects?.some((e) => e.condition === 'FLANK_OR_REAR')
  );
  if (hasFlankAbility) {
    return 'SKIRMISHER';
  }

  const hasRangedAttack = actorCu.abilities.some(
    (a) => a.range >= 2 && a.damageType !== 'NONE'
  );
  if (hasRangedAttack) {
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
  if (combatArc === 'REAR') {
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
 * Grants a bonus at ideal standoff distance, with balanced deviation penalty.
 */
export function scoreStandoffDistance(
  distance: number,
  preferredRange: number,
  standoffWeight: number
): number {
  if (standoffWeight <= 0) return 0;
  if (distance === preferredRange) {
    return standoffWeight;
  }
  const deviation = Math.abs(distance - preferredRange);
  return -deviation * (standoffWeight * 0.25);
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

/**
 * Evaluates tactical utility for casting a support or defensive buff on self or an ally.
 * Strictly returns 0 if the target already has the active buff modifier.
 */
export function scoreBuffAbility(
  actorCu: CombatUnit,
  targetCu: CombatUnit,
  ability: Ability,
  _actorCoord: HexCoord,
  targetCoord: HexCoord,
  hostileUnits: readonly CombatUnit[],
  state: CombatState,
  profile: AIProfile
): { score: number; reason?: string } {
  // Spell Sculpt primer check: prioritize when actor has >= 2 AP and a follow-up spell
  if (ability.effects?.some((e) => e.type === 'SPELL_SCULPT')) {
    if (actorCu.unit.id !== targetCu.unit.id) return { score: 0 };
    if (actorCu.abilityModifiers?.some((m) => m.id === 'spell_sculpt')) return { score: 0 };
    if (actorCu.currentAp < 2) return { score: 0 };
    const hasFollowUpSpell = actorCu.abilities.some(
      (a) => a.id !== ability.id && a.archetypeTag === 'MAGE' && !a.effects?.some((e) => e.type === 'SPELL_SCULPT')
    );
    if (!hasFollowUpSpell) return { score: 0 };
    return {
      score: 25.0,
      reason: 'Prime Spell Sculpt before casting Mage spell'
    };
  }

  // 1. Guard against re-applying active modifier
  const buffEffect = ability.effects?.find((e) => e.type === 'WARD_BUFF' || e.type === 'ARMOR_BUFF' || e.type === 'SLOW');
  const targetStat =
    buffEffect?.type === 'WARD_BUFF'
      ? 'ward'
      : buffEffect?.type === 'ARMOR_BUFF'
      ? 'armor'
      : buffEffect?.type === 'SLOW'
      ? 'move'
      : undefined;

  if (targetStat && targetCu.activeModifiers.some((m) => m.stat === targetStat)) {
    return { score: 0 };
  }

  const isSelf = actorCu.unit.id === targetCu.unit.id;
  const maxHp = targetCu.unit.effectiveVitals.maxHp;
  const missingHp = Math.max(0, maxHp - targetCu.currentHp);
  const healthDeficitRatio = maxHp > 0 ? missingHp / maxHp : 0;

  // Find distance to closest living hostile unit
  let minHostileDist = Infinity;
  for (const h of hostileUnits) {
    const hPos = state.arena.getUnitPosition(h.unit.id);
    if (hPos) {
      const d = hexDistance(targetCoord, hPos);
      if (d < minHostileDist) minHostileDist = d;
    }
  }

  // Baseline utility for support/defense
  let score = 2.5;
  const reasons: string[] = [];

  // Threat urgency: is the target in danger?
  if (minHostileDist <= 1) {
    score += 4.5;
    reasons.push(isSelf ? 'Threatened by adjacent enemy' : 'Frontline ally engaged in melee');
  } else if (minHostileDist <= 2) {
    score += 2.0;
    reasons.push('Hostile units in immediate vicinity');
  }

  // Injury severity
  if (healthDeficitRatio > 0.5) {
    score += 4.0;
    reasons.push('Target heavily injured');
  } else if (healthDeficitRatio > 0) {
    score += healthDeficitRatio * 3.0;
  }

  // Archetype preference: dedicated SUPPORT units prioritize allied buffs
  if (profile === 'SUPPORT' && !isSelf) {
    score += 2.5;
    reasons.push('Support focus on teammate');
  }

  return {
    score: Math.round(score * 10) / 10,
    reason: reasons.length > 0 ? reasons.join('; ') : `Defensive ${ability.name}`
  };
}
