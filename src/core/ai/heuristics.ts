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
  // Blood Frenzy primer check: prioritize when actor has >= 2 AP, follow-up physical attack, safe HP, and an enemy in range
  if (ability.effects?.some((e) => e.type === 'BLOOD_FRENZY')) {
    if (actorCu.unit.id !== targetCu.unit.id) return { score: 0 };
    if (actorCu.abilityModifiers?.some((m) => m.id === 'blood_frenzy')) return { score: 0 };
    if (actorCu.currentHp <= 5) return { score: 0 }; // Zero out self-sacrifice when dangerously low on HP

    const physicalAttacks = actorCu.abilities.filter(
      (a) => a.id !== ability.id && a.damageType === 'PHYSICAL'
    );
    if (physicalAttacks.length === 0) return { score: 0 };

    const minApNeeded = ability.apCost + Math.min(...physicalAttacks.map((a) => a.apCost));
    if (actorCu.currentAp < minApNeeded) return { score: 0 };

    // Find highest expected damage among affordable in-range physical attacks
    let maxFollowUpDamage = 0;
    for (const h of hostileUnits) {
      const pos = state.arena.getUnitPosition(h.unit.id);
      if (!pos) continue;
      const dist = hexDistance(actorCoord, pos);
      for (const atk of physicalAttacks) {
        if (dist <= atk.range && actorCu.currentAp >= ability.apCost + atk.apCost) {
          const dmgEffect = atk.effects?.find((e) => e.type === 'DAMAGE');
          const diceCount = dmgEffect?.damageProfile?.count ?? 1;
          const diceSides = dmgEffect?.damageProfile?.sides ?? 6;
          const attr = atk.attackModifierAttribute ?? dmgEffect?.damageProfile?.modifierAttribute;
          const attrVal = attr ? actorCu.unit.baseAttributes[attr] : 0;
          const expDmg = diceCount * ((diceSides + 1) / 2) + attrVal;
          if (expDmg > maxFollowUpDamage) {
            maxFollowUpDamage = expDmg;
          }
        }
      }
    }
    if (maxFollowUpDamage === 0) return { score: 0 };

    const weights = getArchetypeWeights(profile);
    const score = maxFollowUpDamage * weights.expectedDamageWeight + 15.0;

    return {
      score: Math.round(score * 10) / 10,
      reason: 'Prime Blood Frenzy before unleashing physical attack'
    };
  }

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
      score: 35.0,
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

  // Guard against re-applying positive stat modifiers from STAT_MODIFIER effects
  const statModEffect = ability.effects?.find((e) => e.type === 'STAT_MODIFIER');
  if (statModEffect?.statModifiers) {
    for (const [statKey, val] of Object.entries(statModEffect.statModifiers)) {
      if ((val ?? 0) > 0 && targetCu.activeModifiers.some((m) => m.stat === statKey && m.value > 0)) {
        return { score: 0 };
      }
    }
  }

  const isSelf = actorCu.unit.id === targetCu.unit.id;

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
    if (targetCu.initiativeGauge >= 100) return { score: 0 };

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

  // 2. Armor shred (e.g. Stand and Deliver! -2 Armor)
  const statMod = ability.effects?.find((e) => e.type === 'STAT_MODIFIER');
  if (statMod?.statModifiers?.armor && statMod.statModifiers.armor < 0) {
    const armorShred = Math.abs(statMod.statModifiers.armor);
    const targetArmor = targetCu.unit.effectiveVitals.armor;
    const hasExistingArmorDebuff = targetCu.activeModifiers.some(
      (m) => m.stat === 'armor' && m.value < 0
    );

    if (targetArmor > 0 && !hasExistingArmorDebuff) {
      score += 8.0;
      reasons.push(`Shred target Armor (-${armorShred})`);

      // SKIRMISHER primer bonus if actor has follow-up physical attack
      const hasFollowUpPhysical = actorCu.abilities.some(
        (a) => a.id !== ability.id && a.damageType === 'PHYSICAL' && actorCu.currentAp >= ability.apCost + a.apCost
      );
      if (hasFollowUpPhysical) {
        score += 30.0;
        reasons.push('Prime armor shred before physical strike');
      }
    }
  }

  // 3. Resolve shred (e.g. Poppet Needle -2 Resolve)
  if (statMod?.statModifiers?.resolve && statMod.statModifiers.resolve < 0) {
    const resolveShred = Math.abs(statMod.statModifiers.resolve);
    const hasExistingResolveDebuff = targetCu.activeModifiers.some(
      (m) => m.stat === 'resolve' && m.value < 0
    );
    if (!hasExistingResolveDebuff) {
      score += 4.0;
      reasons.push(`Shred target Resolve (-${resolveShred})`);
    }
  }

  // 4. FORCE_FACING_AWAY (e.g. Poppet Needle)
  const forcesFacingAway = ability.effects?.some((e) => e.type === 'FORCE_FACING_AWAY');
  if (forcesFacingAway) {
    score += 7.0;
    reasons.push('Force target facing 180° away');
  }

  // 5. CONDITION: CHALLENGED & Self-Evasion (e.g. Flamboyant Flourish)
  const inflictsChallenged = ability.effects?.some(
    (e) => e.type === 'CONDITION' && (e.conditionType === 'CHALLENGED' || (e as any).condition === 'CHALLENGED')
  );
  if (inflictsChallenged) {
    const isAlreadyChallenged = targetCu.activeConditions.some(
      (c) => c.type === 'CHALLENGED'
    );
    if (!isAlreadyChallenged) {
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

  // 7. Armor-bypassing melee (e.g. Pact Blade)
  if (ability.id === 'pact_blade' && dist === 1) {
    const targetArmor = targetCu.unit.effectiveVitals.armor;
    if (targetArmor >= 2) {
      score += 6.0;
      reasons.push(`Pact Blade bypasses ${targetArmor} Armor`);
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
    (e) => e.type === 'CONDITION' &&
      (e.conditionType === 'POISON' || e.conditionType === 'BURN' || (e as any).condition === 'POISON' || (e as any).condition === 'BURN')
  );
  if (conditionEffect) {
    const cond = conditionEffect.conditionType ?? (conditionEffect as any).condition;
    if (cond) {
      const hasCondition = targetCu.activeConditions.some((c) => c.type === cond);
      if (!hasCondition) {
        score += 4.5;
        reasons.push(`Apply ${cond} DoT`);
      }
    }
  }

  return {
    score: Math.round(score * 10) / 10,
    reason: reasons.length > 0 ? reasons.join('; ') : undefined
  };
}
