import { CombatUnit, CombatState } from '../combat/types';
import { CombatArc, HexCoord, hexDistance, getDirectionBetween, POINTY_HEX_DIRECTIONS } from '../grid/hex';
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
 * Evaluates tactical utility and combo sequencing for primer abilities declared
 * with declarative AbilityAIHint.primer metadata (e.g. Flash Powder, Blood Frenzy,
 * Spell Sculpt, Stand and Deliver!).
 */
export function scorePrimerAbility(
  actorCu: CombatUnit,
  ability: Ability,
  actorCoord: HexCoord,
  hostileUnits: readonly CombatUnit[],
  state: CombatState,
  profile: AIProfile
): { score: number; reason?: string } {
  const primer = ability.aiHint?.primer;
  if (!primer) return { score: 0 };

  // Guard: if ability has HP sacrifice cost, do not self-sacrifice when dangerously low on HP
  if (ability.hpCost && actorCu.currentHp <= ability.hpCost + 2) {
    return { score: 0 };
  }

  // Guard: if actor already has this pending ability modifier active, do not re-prime
  if (actorCu.abilityModifiers?.some((m) => m.id === ability.id)) {
    return { score: 0 };
  }

  // Profile preference filter (if defined, actor profile must match)
  if (primer.preferredProfiles && !primer.preferredProfiles.includes(profile)) {
    return { score: 0 };
  }

  // Identify follow-up abilities matching the required category
  const followUpAbilities = actorCu.abilities.filter((a) => {
    if (a.id === ability.id) return false;
    switch (primer.requiresFollowUp) {
      case 'PHYSICAL_ATTACK':
        return a.damageType === 'PHYSICAL';
      case 'SPELL':
        return (a.damageType === 'MAGICAL' || a.archetypeTag === 'MAGE') && !a.aiHint?.primer;
      case 'FLANK_ATTACK':
        return a.effects?.some((e) => e.condition === 'FLANK_OR_REAR');
      case 'ANY_ATTACK':
        return a.damageType !== 'NONE';
      default:
        return false;
    }
  });

  if (followUpAbilities.length === 0) return { score: 0 };

  // AP threshold check: actor must be able to afford the primer + at least one viable follow-up
  const minApNeeded = Math.max(
    primer.minTotalAp,
    ability.apCost + Math.min(...followUpAbilities.map((a) => a.apCost))
  );
  if (actorCu.currentAp < minApNeeded) return { score: 0 };

  // Verify there is an in-range hostile target for an affordable follow-up attack
  let maxFollowUpDamage = 0;
  let hasValidTarget = false;

  for (const h of hostileUnits) {
    const pos = state.arena.getUnitPosition(h.unit.id);
    if (!pos) continue;
    const dist = hexDistance(actorCoord, pos);

    for (const atk of followUpAbilities) {
      if (dist <= atk.range && actorCu.currentAp >= ability.apCost + atk.apCost) {
        hasValidTarget = true;
        const dmgEffect = atk.effects?.find((e) => e.type === 'DAMAGE');
        if (dmgEffect) {
          const diceCount = dmgEffect.damageProfile?.count ?? 1;
          const diceSides = dmgEffect.damageProfile?.sides ?? 6;
          const attr = atk.attackModifierAttribute ?? dmgEffect.damageProfile?.modifierAttribute;
          const attrVal = attr ? actorCu.unit.baseAttributes[attr] : 0;
          const expDmg = diceCount * ((diceSides + 1) / 2) + attrVal;
          if (expDmg > maxFollowUpDamage) {
            maxFollowUpDamage = expDmg;
          }
        }
      }
    }
  }

  // For hex/AoE primers like Flash Powder or Stand and Deliver, targets within ability range count as valid
  if (!hasValidTarget) {
    const hasTargetInPrimerRange = hostileUnits.some((h) => {
      const pos = state.arena.getUnitPosition(h.unit.id);
      return pos && hexDistance(actorCoord, pos) <= ability.range;
    });
    if (hasTargetInPrimerRange && followUpAbilities.some((a) => actorCu.currentAp >= ability.apCost + a.apCost)) {
      hasValidTarget = true;
    }
  }

  if (!hasValidTarget) return { score: 0 };

  let score = primer.bonusScore;
  // If damage-scaling primer: scale by follow-up damage
  if (primer.scaleWithFollowUpDamage && maxFollowUpDamage > 0) {
    const weights = getArchetypeWeights(profile);
    score = maxFollowUpDamage * weights.expectedDamageWeight + primer.bonusScore;
  }

  return {
    score: Math.round(score * 10) / 10,
    reason: primer.reason ?? `Prime ${ability.name} before follow-up`
  };
}

/**
 * Evaluates tactical utility for casting a support or defensive buff on self or an ally.
 * Strictly returns 0 if the target already has the active buff modifier.
 */
export function scoreBuffAbility(
  actorCu: CombatUnit,
  targetCu: CombatUnit,
  ability: Ability,
  actorCoord: HexCoord,
  targetCoord: HexCoord,
  hostileUnits: readonly CombatUnit[],
  state: CombatState,
  profile: AIProfile
): { score: number; reason?: string } {
  const isSelf = actorCu.unit.id === targetCu.unit.id;

  // Declarative primer evaluation for self/ally buffs (e.g. Blood Frenzy, Spell Sculpt)
  if (ability.aiHint?.primer && isSelf) {
    const primerResult = scorePrimerAbility(actorCu, ability, actorCoord, hostileUnits, state, profile);
    if (primerResult.score > 0) {
      return primerResult;
    }
    return { score: 0 };
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

  // Guard against re-applying positive stat modifiers from STAT_MODIFIER effects
  const statModEffect = ability.effects?.find((e) => e.type === 'STAT_MODIFIER');
  if (statModEffect?.statModifiers) {
    for (const [statKey, val] of Object.entries(statModEffect.statModifiers)) {
      if ((val ?? 0) > 0 && targetCu.activeModifiers.some((m) => m.stat === statKey && m.value > 0)) {
        return { score: 0 };
      }
    }
  }

  // Guard against re-applying active conditions (e.g. STEALTH)
  const conditionEffect = ability.effects?.find((e) => e.type === 'CONDITION');
  if (
    conditionEffect?.conditionType &&
    targetCu.activeConditions.some((c) => c.type === conditionEffect.conditionType)
  ) {
    return { score: 0 };
  }

  // Find distance to closest living hostile unit
  let minHostileDist = Infinity;
  for (const h of hostileUnits) {
    const hPos = state.arena.getUnitPosition(h.unit.id);
    if (hPos) {
      const d = hexDistance(targetCoord, hPos);
      if (d < minHostileDist) minHostileDist = d;
    }
  }

  // 2. INITIATIVE_BOOST evaluation (e.g. Witch's Talisman)
  const initiativeEffect = ability.effects?.find((e) => e.type === 'INITIATIVE_BOOST');
  if (initiativeEffect) {
    if (isSelf) return { score: 0 };
    if (targetCu.initiativeGauge >= 80) return { score: 0 };

    // Check if target already has an active speed modifier buff
    const hasSpeedBuff = targetCu.activeModifiers.some(
      (m) => m.stat === 'speed' && m.value > 0
    );
    if (hasSpeedBuff) return { score: 0 };

    let initScore = 20.0;
    const reasons: string[] = ['Initiative acceleration'];

    if (minHostileDist <= 1) {
      initScore += 12.0;
      reasons.push('Frontline ally engaged in melee');
    } else if (minHostileDist <= 2) {
      initScore += 6.0;
      reasons.push('Ally in combat proximity');
    }

    if (targetCu.initiativeGauge < 50) {
      initScore += 8.0;
      reasons.push('Boost lagging CTB gauge');
    }

    if (profile === 'SUPPORT') {
      initScore += 12.0;
    }

    return {
      score: Math.round(initScore * 10) / 10,
      reason: reasons.join('; ')
    };
  }

  const maxHp = targetCu.unit.effectiveVitals.maxHp;
  const missingHp = Math.max(0, maxHp - targetCu.currentHp);
  const healthDeficitRatio = maxHp > 0 ? missingHp / maxHp : 0;

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

/**
 * Evaluates tactical utility and primer value for debuffs, displacement, and special mechanics
 * on single-target hostile abilities (e.g. Stand and Deliver, Flamboyant Flourish, Poppet Needle,
 * Eldritch Blast knockback, Pact Blade armor bypass, Lance Charge).
 */
export function scoreDebuffAndUtility(
  actorCu: CombatUnit,
  targetCu: CombatUnit,
  ability: Ability,
  actorCoord: HexCoord,
  targetCoord: HexCoord,
  state: CombatState,
  profile: AIProfile
): { score: number; reason?: string } {
  let score = 0;
  const reasons: string[] = [];
  const dist = hexDistance(actorCoord, targetCoord);

  // 1. CTB_DELAY (e.g. Stand and Deliver!, Baleful Hex)
  const ctbDelay = ability.effects?.find((e) => e.type === 'CTB_DELAY');
  if (ctbDelay && typeof ctbDelay.magnitude === 'number') {
    const delayScore = (ctbDelay.magnitude / 10) * 2.5;
    score += delayScore;
    if (targetCu.initiativeGauge >= 50) {
      score += 4.0;
      reasons.push(`Delay impending turn (-${ctbDelay.magnitude} CTB)`);
    } else {
      reasons.push(`CTB delay (-${ctbDelay.magnitude} ticks)`);
    }
  }

  // 2. Stat debuffs (Armor, Resolve, Attack Roll, Speed, etc.)
  const statMod = ability.effects?.find((e) => e.type === 'STAT_MODIFIER' && (!e.targetScope || e.targetScope === 'TARGET'));
  if (statMod?.statModifiers) {
    let hasApplicableDebuff = false;
    let hasNegativeStatMod = false;

    for (const [statKey, rawVal] of Object.entries(statMod.statModifiers)) {
      if (typeof rawVal === 'number' && rawVal < 0) {
        hasNegativeStatMod = true;
        const mag = Math.abs(rawVal);
        const hasExistingDebuff = targetCu.activeModifiers.some(
          (m) => m.stat === statKey && m.value < 0
        );

        if (!hasExistingDebuff) {
          hasApplicableDebuff = true;
          if (statKey === 'armor') {
            if (targetCu.unit.effectiveVitals.armor > 0) {
              score += 8.0;
              reasons.push(`Shred target Armor (-${mag})`);
            }
          } else if (statKey === 'resolve') {
            score += 4.0;
            reasons.push(`Shred target Resolve (-${mag})`);
          } else if (statKey === 'attackRoll') {
            score += 10.0;
            reasons.push(`Debuff target Attack Roll (-${mag})`);
          } else {
            score += 6.0;
            reasons.push(`Debuff target ${statKey} (-${mag})`);
          }
        }
      }
    }

    // Universal non-redundancy guard:
    // If an ability applies negative stat debuffs, but all of them are already active on the target,
    // and the ability deals no damage, do not repeat/spam the debuff.
    if (hasNegativeStatMod && !hasApplicableDebuff && ability.damageType === 'NONE' && !ability.effects?.some((e) => e.type === 'DAMAGE')) {
      const hasOtherUtility = ability.effects?.some(
        (e) => e.type === 'CTB_DELAY' || e.type === 'KNOCKBACK' || e.type === 'RUSH_CHARGE'
      );
      if (!hasOtherUtility) {
        return { score: 0 };
      }
    }
  }

  // 3. Declarative primer evaluation (e.g. Flash Powder, Stand and Deliver!)
  if (ability.aiHint?.primer) {
    const primerResult = scorePrimerAbility(actorCu, ability, actorCoord, [targetCu], state, profile);
    if (primerResult.score > 0) {
      score += primerResult.score;
      if (primerResult.reason) reasons.push(primerResult.reason);
    }
  }

  // 3c. Self INITIATIVE_BOOST siphon on attacks (e.g. Pilfer)
  const selfInitBoost = ability.effects?.find(
    (e) => e.type === 'INITIATIVE_BOOST' && e.targetScope === 'SELF'
  );
  if (selfInitBoost && typeof selfInitBoost.magnitude === 'number') {
    score += (selfInitBoost.magnitude / 10) * 2.5;
    reasons.push(`Siphon +${selfInitBoost.magnitude} CTB initiative`);
  }

  // 4. FORCE_FACING_AWAY (e.g. Poppet Needle, Flash Powder)
  const forcesFacingAway = ability.effects?.some((e) => e.type === 'FORCE_FACING_AWAY');
  if (forcesFacingAway) {
    score += profile === 'SKIRMISHER' ? 10.0 : 7.0;
    reasons.push('Force target facing 180° away');
  }

  // 5. CONDITION: CHALLENGED & Self-Evasion (e.g. Flamboyant Flourish)
  const inflictsChallenged = ability.effects?.some(
    (e) => e.type === 'CONDITION' && e.conditionType === 'CHALLENGED'
  );
  if (inflictsChallenged) {
    const isAlreadyChallengedByActor = targetCu.activeConditions.some(
      (c) => c.type === 'CHALLENGED' && c.sourceUnitId === actorCu.unit.id
    );
    if (!isAlreadyChallengedByActor) {
      score += 18.0;
      reasons.push('Taunt target with Challenged');

      // Check if ability also grants self defensive buffs (e.g. Flamboyant Flourish +2 Evasion)
      const selfBuff = ability.effects?.find((e) => e.type === 'STAT_MODIFIER' && e.targetScope === 'SELF');
      if (selfBuff) {
        score += 8.0;
        reasons.push('Self defensive evasion boost');
      }

      if (profile === 'BRAWLER') {
        score += 8.0;
        reasons.push('Brawler frontline engagement control');
      }
    }
  }

  // 6. KNOCKBACK spacing for SNIPER and SKIRMISHER (e.g. Eldritch Blast, Point-Blank Buckshot)
  const hasKnockback = ability.effects?.some((e) => e.type === 'KNOCKBACK');
  if (hasKnockback) {
    if ((profile === 'SNIPER' || profile === 'SKIRMISHER') && dist === 1) {
      score += 8.0;
      reasons.push('Kinetic knockback spacing');
    }
    // Check if target would collide with obstacle or map boundary behind them
    const dirToTarget = getDirectionBetween(actorCoord, targetCoord);
    const behindTarget = {
      q: targetCoord.q + POINTY_HEX_DIRECTIONS[dirToTarget].q,
      r: targetCoord.r + POINTY_HEX_DIRECTIONS[dirToTarget].r
    };
    const behindTile = state.arena.getTile(behindTarget);
    if (!behindTile || !behindTile.isWalkable) {
      score += 5.0;
      reasons.push('Wall-slam collision hazard');
    }
  }

  // 7. Declarative Melee contingency evaluation (e.g. Pact Blade)
  if (ability.aiHint?.meleeContingency && dist === 1) {
    const contingency = ability.aiHint.meleeContingency;
    const targetArmor = targetCu.unit.effectiveVitals.armor;
    const matchesProfile = !contingency.preferredProfiles || contingency.preferredProfiles.includes(profile);
    const matchesArmor = contingency.minTargetArmor === undefined || targetArmor >= contingency.minTargetArmor;

    if (matchesProfile && matchesArmor) {
      score += contingency.bonusScore;
      reasons.push(contingency.reason ?? `Melee contingency bypasses ${targetArmor} Armor`);
    }
  }

  // 8. Straight-line charge initiation (e.g. Lance Charge)
  const isRushCharge = ability.effects?.some((e) => e.type === 'RUSH_CHARGE');
  if (isRushCharge && dist >= 2) {
    score += 6.0;
    reasons.push('Shock charge line breaker');
  }

  // 9. Status condition DoT (e.g. POISON from Baleful Hex, BURN from Hellfire Brand / Ignite Rage)
  const conditionEffect = ability.effects?.find(
    (e) => e.type === 'CONDITION' && (e.conditionType === 'POISON' || e.conditionType === 'BURN')
  );
  if (conditionEffect?.conditionType) {
    const cond = conditionEffect.conditionType;
    const hasCondition = targetCu.activeConditions.some((c) => c.type === cond);
    if (!hasCondition) {
      score += 4.5;
      reasons.push(`Apply ${cond} DoT`);
    }
  }

  return {
    score: Math.round(score * 10) / 10,
    reason: reasons.length > 0 ? reasons.join('; ') : undefined
  };
}
