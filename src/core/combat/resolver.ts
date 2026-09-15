import { Unit } from '../types/unit';
import { HexCoord, hexDistance, hexSubtract, hexAdd } from '../grid/hex';
import { Arena, KnockbackResult } from '../grid/arena';
import { Ability, AbilityEffect } from '../types/ability';
import {
  CombatState,
  CombatUnit,
  HitOutcome,
  ValidationResult,
  AbilityResolution,
  ActiveModifier,
  getEffectiveMove,
  getEffectiveArmor,
  getEffectiveWard,
  getEffectiveEvasion,
  getEffectiveResolve
} from './types';
import { DiceRoller, SeededDiceRoller } from './dice';
import {
  COMBAT_RESOLUTION_CONFIG,
  DISPLACEMENT_CONFIG,
  ACTION_ECONOMY_CONFIG
} from '../config/balance';
import { advanceTurnClock } from './turnClock';

const defaultDiceRoller = new SeededDiceRoller();

/**
 * Retrieves a CombatUnit by ID or throws a descriptive error.
 */
export function requireCombatUnit(state: CombatState, unitId: string): CombatUnit {
  const cu = state.units.get(unitId);
  if (!cu) {
    throw new Error(`Unit ${unitId} not found in combat state.`);
  }
  return cu;
}

/**
 * Retrieves a unit's position in the arena or throws a descriptive error.
 */
export function requireUnitPosition(arena: Arena, unitId: string): HexCoord {
  const pos = arena.getUnitPosition(unitId);
  if (!pos) {
    throw new Error(`Unit ${unitId} is not placed on the arena.`);
  }
  return pos;
}

/**
 * Initializes a new combat state container with living units placed in the arena.
 */
export function createCombatState(
  arena: Arena,
  units: readonly Unit[],
  initialActiveUnitId?: string
): CombatState {
  const combatUnits = new Map<string, CombatUnit>();

  for (const unit of units) {
    combatUnits.set(unit.id, {
      unit,
      currentHp: unit.effectiveVitals.maxHp,
      currentAp: 0,
      initiativeGauge: 0,
      isDefeated: false,
      inBattleXp: { fighter: 0, rogue: 0, mage: 0 },
      activeModifiers: []
    });
  }

  const state: CombatState = {
    arena,
    units: combatUnits,
    activeUnitId: '',
    turnNumber: 0,
    combatLog: []
  };

  if (initialActiveUnitId && combatUnits.has(initialActiveUnitId)) {
    state.activeUnitId = initialActiveUnitId;
    state.turnNumber = 1;
    const activeCu = combatUnits.get(initialActiveUnitId)!;
    activeCu.currentAp = ACTION_ECONOMY_CONFIG.standardApPerTurn;
  } else {
    advanceTurnClock(state);
  }

  return state;
}

/**
 * Checks if the active unit can legally move to destination.
 */
export function canMove(
  state: CombatState,
  actorUnitId: string,
  destination: HexCoord
): ValidationResult {
  if (state.activeUnitId !== actorUnitId) {
    return { valid: false, reason: 'Unit is not currently active.' };
  }
  const cu = state.units.get(actorUnitId);
  if (!cu || cu.isDefeated) {
    return { valid: false, reason: 'Unit is defeated or does not exist.' };
  }
  if (cu.currentAp < 1) {
    return { valid: false, reason: 'Insufficient AP to move (costs 1 AP).' };
  }

  const currentCoord = state.arena.getUnitPosition(actorUnitId);
  if (!currentCoord) {
    return { valid: false, reason: 'Unit is not placed on the arena.' };
  }

  const effectiveMove = getEffectiveMove(cu);
  const reachable = state.arena.getReachableHexes(currentCoord, effectiveMove);

  if (!reachable.some((h) => h.q === destination.q && h.r === destination.r)) {
    return { valid: false, reason: `Destination (${destination.q}, ${destination.r}) is not reachable.` };
  }

  return { valid: true };
}

/**
 * Executes a move action (costs 1 AP).
 */
export function executeMove(
  state: CombatState,
  actorUnitId: string,
  destination: HexCoord
): void {
  const validation = canMove(state, actorUnitId, destination);
  if (!validation.valid) {
    throw new Error(`Illegal move action to (${destination.q}, ${destination.r}) for unit ${actorUnitId}: ${validation.reason}`);
  }

  const cu = requireCombatUnit(state, actorUnitId);
  cu.currentAp -= 1;
  state.arena.setUnitPosition(actorUnitId, destination);

  state.combatLog.push({
    turnNumber: state.turnNumber,
    actorUnitId,
    actionId: 'move',
    message: `${cu.unit.name} moved to (${destination.q}, ${destination.r}). [Remaining AP: ${cu.currentAp}]`
  });
}

/**
 * Evaluates whether an ability can be cast against a target.
 */
export function canExecuteAbility(
  state: CombatState,
  actorUnitId: string,
  ability: Ability,
  target?: { coord?: HexCoord; targetUnitId?: string }
): ValidationResult {
  if (state.activeUnitId !== actorUnitId) {
    return { valid: false, reason: 'Unit is not currently active.' };
  }
  const cu = state.units.get(actorUnitId);
  if (!cu || cu.isDefeated) {
    return { valid: false, reason: 'Unit is defeated or does not exist.' };
  }
  if (cu.currentAp < ability.apCost) {
    return { valid: false, reason: `Insufficient AP (requires ${ability.apCost}, has ${cu.currentAp}).` };
  }

  const actorCoord = state.arena.getUnitPosition(actorUnitId);
  if (!actorCoord) {
    return { valid: false, reason: 'Actor not placed on arena.' };
  }

  if (ability.targetType === 'SELF') {
    return { valid: true };
  }

  const targetUnitId =
    ability.targetType === 'ALLY' && !target?.targetUnitId
      ? actorUnitId
      : target?.targetUnitId;

  if (ability.targetType === 'SINGLE_TARGET' || ability.targetType === 'ALLY') {
    if (!targetUnitId) {
      return { valid: false, reason: 'Missing target unit.' };
    }
    const targetCu = state.units.get(targetUnitId);
    if (!targetCu || targetCu.isDefeated) {
      return { valid: false, reason: 'Target unit does not exist or is defeated.' };
    }
    const targetCoord = state.arena.getUnitPosition(targetUnitId);
    if (!targetCoord) {
      return { valid: false, reason: 'Target unit not placed on arena.' };
    }

    const dist = hexDistance(actorCoord, targetCoord);
    if (dist > ability.range) {
      return { valid: false, reason: `Target out of range (distance ${dist} > range ${ability.range}).` };
    }

    if (!state.arena.hasLineOfSight(actorCoord, targetCoord)) {
      return { valid: false, reason: 'Line-of-Sight is blocked.' };
    }
  }

  return { valid: true };
}


function getAbilityModifier(actorCu: CombatUnit, ability: Ability): number {
  const attr = ability.damageProfile?.modifierAttribute;
  return attr ? actorCu.unit.baseAttributes[attr] : 0;
}

function resolveAttackRoll(
  actorCu: CombatUnit,
  targetCu: CombatUnit,
  ability: Ability,
  diceRoller: DiceRoller
): {
  hitOutcome: HitOutcome;
  d20: number;
  modifier: number;
  totalScore: number;
  targetDefense: number;
} {
  const modifier = getAbilityModifier(actorCu, ability);
  const targetDefense =
    ability.defenseTarget === 'EVASION'
      ? getEffectiveEvasion(targetCu)
      : getEffectiveResolve(targetCu);

  const d20 = diceRoller.rollD20();
  const totalScore = d20 + modifier;

  const critMargin = COMBAT_RESOLUTION_CONFIG.critThresholdMargin;
  const isCritBoosted = ability.effect?.type === 'CRIT_BOOST';
  const naturalCritThreshold = isCritBoosted ? 19 : 20;

  let hitOutcome: HitOutcome = 'MISS';
  if (d20 >= naturalCritThreshold || totalScore >= targetDefense + critMargin) {
    hitOutcome = 'CRITICAL_HIT';
  } else if (d20 === 1 || totalScore < targetDefense - COMBAT_RESOLUTION_CONFIG.grazeMargin) {
    hitOutcome = 'MISS';
  } else if (totalScore >= targetDefense) {
    hitOutcome = 'SOLID_HIT';
  } else {
    hitOutcome = 'GRAZE';
  }

  return { hitOutcome, d20, modifier, totalScore, targetDefense };
}

function resolveDamage(
  hitOutcome: HitOutcome,
  ability: Ability,
  actorCu: CombatUnit,
  targetCu: CombatUnit,
  diceRoller: DiceRoller
): { rawDamage: number; mitigation: number; damageDealt: number } {
  if (hitOutcome === 'MISS' || !ability.damageProfile) {
    return { rawDamage: 0, mitigation: 0, damageDealt: 0 };
  }

  const { count, sides } = ability.damageProfile;
  const modifier = getAbilityModifier(actorCu, ability);

  // Maximized Crit: max base dice + rolled dice + modifier
  const rawDamage =
    hitOutcome === 'CRITICAL_HIT'
      ? count * sides + diceRoller.rollDice(count, sides) + modifier
      : diceRoller.rollDice(count, sides) + modifier;

  const mitigation =
    ability.damageType === 'PHYSICAL'
      ? getEffectiveArmor(targetCu)
      : getEffectiveWard(targetCu);

  let subtotal = rawDamage - mitigation;
  if (hitOutcome === 'GRAZE') {
    subtotal = Math.floor(subtotal * COMBAT_RESOLUTION_CONFIG.grazeDamageMultiplier);
  }

  const damageDealt = Math.max(COMBAT_RESOLUTION_CONFIG.minimumDamage, subtotal);
  targetCu.currentHp = Math.max(0, targetCu.currentHp - damageDealt);

  return { rawDamage, mitigation, damageDealt };
}

function resolveSecondaryEffects(
  hitOutcome: HitOutcome,
  ability: Ability,
  actorCu: CombatUnit,
  targetCu: CombatUnit,
  state: CombatState
): {
  effectsApplied: readonly AbilityEffect[];
  knockbackResult?: KnockbackResult;
  wallSlamDamage?: number;
} {
  if (hitOutcome !== 'SOLID_HIT' && hitOutcome !== 'CRITICAL_HIT') {
    return { effectsApplied: [] };
  }
  if (!ability.effect) {
    return { effectsApplied: [] };
  }

  const effect = ability.effect;
  const actorCoord = requireUnitPosition(state.arena, actorCu.unit.id);
  const targetCoord = requireUnitPosition(state.arena, targetCu.unit.id);

  let knockbackResult: KnockbackResult | undefined;
  let wallSlamDamage: number | undefined;

  if (effect.type === 'KNOCKBACK') {
    knockbackResult = state.arena.calculateKnockback(
      actorCoord,
      targetCoord,
      effect.magnitude
    );

    if (knockbackResult.isCollided) {
      const targetArmor = getEffectiveArmor(targetCu);
      wallSlamDamage = Math.max(
        1,
        DISPLACEMENT_CONFIG.wallSlamBaseDamage + actorCu.unit.baseAttributes.force - targetArmor
      );
      targetCu.currentHp = Math.max(0, targetCu.currentHp - wallSlamDamage);

      if (knockbackResult.collidingUnitId) {
        const bystander = state.units.get(knockbackResult.collidingUnitId);
        if (bystander && !bystander.isDefeated) {
          bystander.currentHp = Math.max(
            0,
            bystander.currentHp - DISPLACEMENT_CONFIG.unitCollisionSecondaryDamage
          );
          if (bystander.currentHp === 0) {
            bystander.isDefeated = true;
            state.arena.removeUnit(bystander.unit.id);
          }
        }
      }
    } else {
      state.arena.setUnitPosition(targetCu.unit.id, knockbackResult.finalCoord);
    }
  } else if (effect.type === 'RETREAT_STEP') {
    const retreatDir = hexSubtract(actorCoord, targetCoord);
    const retreatDest = hexAdd(actorCoord, retreatDir);
    const destTile = state.arena.getTile(retreatDest);
    if (destTile && destTile.isWalkable && !destTile.occupiedByUnitId) {
      state.arena.setUnitPosition(actorCu.unit.id, retreatDest);
    }
  } else if (effect.type === 'SLOW') {
    targetCu.activeModifiers.push({
      stat: 'move',
      value: -effect.magnitude,
      durationTurns: effect.durationTurns ?? 1
    });
  } else if (effect.type === 'ARMOR_BUFF') {
    actorCu.activeModifiers.push({
      stat: 'armor',
      value: effect.magnitude,
      durationTurns: effect.durationTurns ?? 1
    });
  }

  return {
    effectsApplied: [effect],
    knockbackResult,
    wallSlamDamage
  };
}

/**
 * Resolves an ability execution including to-hit roll, damage, mitigation,
 * displacement with wall-slam collision, and in-battle archetype XP award.
 */
export function executeAbility(
  state: CombatState,
  actorUnitId: string,
  ability: Ability,
  target?: { coord?: HexCoord; targetUnitId?: string },
  diceRoller: DiceRoller = defaultDiceRoller
): AbilityResolution {
  const validation = canExecuteAbility(state, actorUnitId, ability, target);
  if (!validation.valid) {
    throw new Error(`Cannot execute ability ${ability.name}: ${validation.reason}`);
  }

  const actorCu = requireCombatUnit(state, actorUnitId);
  actorCu.currentAp -= ability.apCost;

  // Award In-Battle Archetype XP on execution
  if (ability.archetypeTag === 'FIGHTER') {
    actorCu.inBattleXp.fighter += COMBAT_RESOLUTION_CONFIG.xpPerAction;
  } else if (ability.archetypeTag === 'ROGUE') {
    actorCu.inBattleXp.rogue += COMBAT_RESOLUTION_CONFIG.xpPerAction;
  } else if (ability.archetypeTag === 'MAGE') {
    actorCu.inBattleXp.mage += COMBAT_RESOLUTION_CONFIG.xpPerAction;
  }

  // Support / Non-damaging buffs (e.g. Minor Ward, Brace)
  if (ability.damageType === 'NONE') {
    const targetId = target?.targetUnitId ?? actorUnitId;
    const targetCu = requireCombatUnit(state, targetId);
    let appliedModifier: ActiveModifier | undefined;

    if (ability.effect?.type === 'WARD_BUFF') {
      appliedModifier = {
        stat: 'ward',
        value: ability.effect.magnitude,
        durationTurns: ability.effect.durationTurns ?? 1
      };
      targetCu.activeModifiers.push(appliedModifier);
    } else if (ability.effect?.type === 'ARMOR_BUFF') {
      appliedModifier = {
        stat: 'armor',
        value: ability.effect.magnitude,
        durationTurns: ability.effect.durationTurns ?? 1
      };
      actorCu.activeModifiers.push(appliedModifier);
    }

    state.combatLog.push({
      turnNumber: state.turnNumber,
      actorUnitId,
      actionId: ability.id,
      message: `${actorCu.unit.name} used ${ability.name}.`
    });

    return {
      type: 'BUFF',
      targetUnitId: targetId,
      modifierApplied: appliedModifier ?? {
        stat: 'armor',
        value: 0,
        durationTurns: 0
      }
    };
  }

  // Attack Roll & Damage Resolution
  const targetCu = requireCombatUnit(state, target!.targetUnitId!);
  const rollResult = resolveAttackRoll(actorCu, targetCu, ability, diceRoller);
  const damageResult = resolveDamage(
    rollResult.hitOutcome,
    ability,
    actorCu,
    targetCu,
    diceRoller
  );

  // Secondary Effects (Knockback, Retreat Step, Slow)
  const effectResult = resolveSecondaryEffects(
    rollResult.hitOutcome,
    ability,
    actorCu,
    targetCu,
    state
  );

  // Defeat Check
  if (targetCu.currentHp <= 0) {
    targetCu.isDefeated = true;
    state.arena.removeUnit(targetCu.unit.id);
  }

  let secondaryDetail = '';
  if (effectResult.knockbackResult) {
    const kb = effectResult.knockbackResult;
    if (kb.isCollided) {
      if (kb.collidingUnitId) {
        const bystander = state.units.get(kb.collidingUnitId);
        const bystanderName = bystander ? bystander.unit.name : 'another unit';
        secondaryDetail = ` 💥 [Knockback Collision: Slammed into ${bystanderName}! Target took +${effectResult.wallSlamDamage ?? 0} collision damage. ${bystanderName} took +${DISPLACEMENT_CONFIG.unitCollisionSecondaryDamage} collateral damage (HP: ${bystander?.currentHp}/${bystander?.unit.effectiveVitals.maxHp}).]`;
      } else {
        const obsType =
          kb.collisionType === 'WALL'
            ? 'Obstacle'
            : kb.collisionType === 'CLIFF'
            ? 'Cliff'
            : 'Map Boundary';
        secondaryDetail = ` 💥 [Knockback Collision: Slammed into ${obsType}! Took +${effectResult.wallSlamDamage ?? 0} collision damage.]`;
      }
    } else {
      secondaryDetail = ` 💨 [Knockback: Pushed to (${kb.finalCoord.q}, ${kb.finalCoord.r})]`;
    }
  } else if (ability.effect && rollResult.hitOutcome === 'GRAZE') {
    secondaryDetail = ` (Secondary effect negated on Graze)`;
  } else if (effectResult.effectsApplied.length > 0) {
    for (const eff of effectResult.effectsApplied) {
      if (eff.type === 'RETREAT_STEP') {
        const newActorPos = state.arena.getUnitPosition(actorCu.unit.id);
        if (newActorPos) {
          secondaryDetail += ` 🏃 [Retreat Step to (${newActorPos.q}, ${newActorPos.r})]`;
        }
      } else if (eff.type === 'SLOW') {
        secondaryDetail += ` ❄️ [Slow: -${eff.magnitude} Move for ${eff.durationTurns ?? 1} turn(s)]`;
      } else if (eff.type === 'ARMOR_BUFF') {
        secondaryDetail += ` 🛡️ [Armor Buff: +${eff.magnitude} Armor for ${eff.durationTurns ?? 1} turn(s)]`;
      }
    }
  }

  state.combatLog.push({
    turnNumber: state.turnNumber,
    actorUnitId,
    actionId: ability.id,
    message: `${actorCu.unit.name} used ${ability.name} on ${targetCu.unit.name}: [d20: ${rollResult.d20}+${rollResult.modifier} vs DC ${rollResult.targetDefense} -> ${rollResult.hitOutcome}] Damage: ${damageResult.damageDealt} (HP: ${targetCu.currentHp}/${targetCu.unit.effectiveVitals.maxHp})${secondaryDetail}`
  });

  return {
    type: 'ATTACK',
    details: {
      hitOutcome: rollResult.hitOutcome,
      d20Roll: rollResult.d20,
      modifier: rollResult.modifier,
      totalAttackScore: rollResult.totalScore,
      defenseTargetScore: rollResult.targetDefense,
      rawDamage: damageResult.rawDamage,
      mitigation: damageResult.mitigation,
      damageDealt: damageResult.damageDealt,
      effectsApplied: effectResult.effectsApplied,
      knockbackResult: effectResult.knockbackResult,
      wallSlamDamage: effectResult.wallSlamDamage
    }
  };
}
