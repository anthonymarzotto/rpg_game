import { Unit } from '../types/unit';
import {
  HexCoord,
  HEX_DIRECTIONS,
  getHexNeighbors,
  getHexesInRange,
  hexEquals,
  hexDistance,
  getDirectionBetween,
  getCombatArc
} from '../grid/hex';
import { Arena } from '../grid/arena';
import { Ability } from '../types/ability';
import {
  CombatState,
  CombatUnit,
  AbilityResolution,
  CombatEvent,
  EncounterObjective
} from './types';
import { canMove, canExecuteAbility, canApplyPendingModifier } from './validator';
import { DiceRoller, SeededDiceRoller, RollAdvantage } from './dice';
import {
  COMBAT_RESOLUTION_CONFIG,
  ACTION_ECONOMY_CONFIG
} from '../config/balance';
import { advanceTurnClock } from './turnClock';
import { resolveAttackRoll } from './attackRoll';
import { resolveDamage } from './damageEngine';
import { executeAbilityEffects, defaultEffectRegistry, EffectContext } from './effects';
import { evaluateRollPassives, onTurnStartPassives } from './passives';
import { evaluateEncounterOutcome } from './objectives';
import { resolveUnitLoadout, LoadoutLookupProviders } from '../units/loadout';
import { getClassPackage, getAbilityById, getPassiveById } from '../../data/packages';
import { PassiveTriggerHook } from '../types/passive';

const defaultDiceRoller = new SeededDiceRoller();

const defaultLoadoutProviders: LoadoutLookupProviders = {
  getPackage: getClassPackage,
  getAbility: getAbilityById,
  getPassive: getPassiveById
};

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

export interface PassiveTriggerContext {
  targetCu?: CombatUnit;
  targetCoord?: HexCoord;
  ability?: Ability;
  diceRoller?: DiceRoller;
}

/**
 * Triggers passives registered to a specific hook lifecycle event.
 * Executes their effects generically via the effect registry without inspecting passive IDs.
 */
export function triggerPassiveHook(
  state: CombatState,
  actorCu: CombatUnit,
  hook: PassiveTriggerHook,
  extra?: PassiveTriggerContext
): CombatEvent[] {
  const events: CombatEvent[] = [];
  const diceRoller = extra?.diceRoller ?? defaultDiceRoller;

  for (const passive of actorCu.passives ?? []) {
    if (passive.hook !== hook) continue;

    // Check trigger filters if present (e.g. magic spell crits)
    if (passive.triggerFilter) {
      if (passive.triggerFilter.damageType && extra?.ability?.damageType !== passive.triggerFilter.damageType) {
        continue;
      }
    }

    // Execute effect if defined
    if (passive.effect) {
      const handler = defaultEffectRegistry.get(passive.effect.type);
      if (handler) {
        const ctx: EffectContext = {
          state,
          actorCu,
          targetCu: extra?.targetCu ?? actorCu,
          targetCoord: extra?.targetCoord,
          ability: extra?.ability ?? ({
            id: passive.id,
            name: passive.name,
            description: passive.description,
            archetypeTag: 'FIGHTER',
            apCost: 0,
            range: 0,
            targetType: 'SELF',
            defenseTarget: 'NONE',
            damageType: 'NONE'
          } as Ability),
          hitOutcome: 'SOLID_HIT',
          diceRoller
        };

        const result = handler.apply(passive.effect, ctx);
        if (result.events && result.events.length > 0) {
          events.push(...result.events);
        }
        if (result.logDetail) {
          state.combatLog.push({
            turnNumber: state.turnNumber,
            actorUnitId: actorCu.unit.id,
            actionId: passive.id,
            message: `${actorCu.unit.name}'s ${passive.name} triggered:${result.logDetail}`
          });
        }
      }
    }
  }

  return events;
}

/**
 * Pre-encounter initialization pass evaluated across all units before the battle starts.
 * Triggers BATTLE_START passives generically (e.g. Tactical Vanguard).
 */
export function applyPreEncounterSetup(state: CombatState): void {
  for (const cu of state.units.values()) {
    if (cu.isDefeated) continue;
    const events = triggerPassiveHook(state, cu, 'BATTLE_START');
    if (events.length > 0) {
      applyCombatEvents(state, events);
    }
  }
}

/**
 * Initializes a new combat state container with living units placed in the arena.
 */
export function createCombatState(
  arena: Arena,
  units: readonly Unit[],
  initialActiveUnitId?: string,
  loadoutProviders: LoadoutLookupProviders = defaultLoadoutProviders,
  objectives?: readonly EncounterObjective[]
): CombatState {
  const combatUnits = new Map<string, CombatUnit>();

  for (const unit of units) {
    const resolved = unit.loadout
      ? resolveUnitLoadout(unit, loadoutProviders)
      : undefined;

    combatUnits.set(unit.id, {
      unit,
      faction: unit.faction,
      currentHp: unit.effectiveVitals.maxHp,
      currentAp: 0,
      initiativeGauge: 0,
      isDefeated: false,
      inBattleXp: { fighter: 0, rogue: 0, mage: 0 },
      activeModifiers: [],
      activeConditions: [],
      abilities: resolved?.combatAbilities ?? [],
      passives: resolved?.activePassives ?? [],
      facing: unit.faction === 'PLAYER' ? HEX_DIRECTIONS.EAST : HEX_DIRECTIONS.WEST
    });
  }

  const state: CombatState = {
    arena,
    units: combatUnits,
    activeUnitId: '',
    turnNumber: 0,
    combatLog: [],
    outcome: 'IN_PROGRESS',
    objectives
  };

  // Pre-encounter setup pass: seed initial state (e.g. +25 initiative for Tactical Vanguard)
  applyPreEncounterSetup(state);

  if (initialActiveUnitId && combatUnits.has(initialActiveUnitId)) {
    state.activeUnitId = initialActiveUnitId;
    state.turnNumber = 1;
    const activeCu = combatUnits.get(initialActiveUnitId)!;
    activeCu.initiativeGauge = ACTION_ECONOMY_CONFIG.gaugeTurnThreshold;
    activeCu.currentAp = ACTION_ECONOMY_CONFIG.standardApPerTurn;
    onTurnStartPassives(activeCu);
  } else {
    advanceTurnClock(state);
  }

  state.outcome = evaluateEncounterOutcome(objectives, state);

  return state;
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
  const prevPos = state.arena.getUnitPosition(actorUnitId);
  const dist = prevPos ? hexDistance(prevPos, destination) : 1;
  cu.hexesMovedThisTurn = (cu.hexesMovedThisTurn ?? 0) + dist;
  if (prevPos) {
    cu.facing = getDirectionBetween(prevPos, destination);
  }

  cu.currentAp -= 1;
  state.arena.setUnitPosition(actorUnitId, destination);

  // Trigger ON_MOVE passives (e.g. Elusive Stride) generically
  const moveEvents = triggerPassiveHook(state, cu, 'ON_MOVE');
  if (moveEvents.length > 0) {
    applyCombatEvents(state, moveEvents);
  }

  state.combatLog.push({
    turnNumber: state.turnNumber,
    actorUnitId,
    actionId: 'move',
    message: `${cu.unit.name} moved to (${destination.q}, ${destination.r}). [Remaining AP: ${cu.currentAp}]`
  });
}


/**
 * Applies a stream of atomic combat events to the mutable battle state.
 */
function applyCombatEvents(state: CombatState, events: readonly CombatEvent[]): void {
  for (const event of events) {
    if (event.type === 'DAMAGE') {
      const cu = state.units.get(event.targetUnitId);
      if (cu && !cu.isDefeated) {
        cu.currentHp = Math.max(0, cu.currentHp - event.amount);
        if (cu.currentHp === 0) {
          cu.isDefeated = true;
          state.arena.removeUnit(event.targetUnitId);
        }
      }
    } else if (event.type === 'DISPLACEMENT') {
      state.arena.setUnitPosition(event.unitId, event.toCoord);
    } else if (event.type === 'STATUS_APPLIED') {
      const cu = state.units.get(event.targetUnitId);
      if (cu && !cu.isDefeated) {
        if (event.modifier) {
          const existing = cu.activeModifiers.find(
            (m) => m.stat === event.modifier!.stat && m.value === event.modifier!.value
          );
          if (existing) {
            existing.durationTurns = Math.max(existing.durationTurns, event.modifier.durationTurns);
          } else {
            cu.activeModifiers.push(event.modifier);
          }
        }
        if (event.condition) {
          const existing = cu.activeConditions.find(
            (c) => c === event.condition || (c.type === event.condition!.type && c.sourceUnitId === event.condition!.sourceUnitId)
          );
          if (existing) {
            existing.durationTurns = Math.max(existing.durationTurns, event.condition.durationTurns);
          } else {
            cu.activeConditions.push(event.condition);
          }
        }
      }
    } else if (event.type === 'CONDITION_APPLIED') {
      const cu = state.units.get(event.targetUnitId);
      if (cu && !cu.isDefeated) {
        const existing = cu.activeConditions.find(
          (c) => c === event.condition || (c.type === event.condition.type && c.sourceUnitId === event.condition.sourceUnitId)
        );
        if (existing) {
          existing.durationTurns = Math.max(existing.durationTurns, event.condition.durationTurns);
        } else {
          cu.activeConditions.push(event.condition);
        }
      }
    } else if (event.type === 'CTB_DELAY') {
      const cu = state.units.get(event.targetUnitId);
      if (cu && !cu.isDefeated) {
        cu.initiativeGauge = Math.max(0, cu.initiativeGauge - event.amount);
      }
    }
  }
}

/**
 * Evaluates whether a target is flanked by the actor.
 * Flanking is achieved if:
 * 1. The attacker is in the target's FLANK or REAR combat arc, OR
 * 2. An ally of the actor is also adjacent to the target (Allied Pincer).
 */
export function isFlankOrRear(
  state: CombatState,
  actorUnitId: string,
  targetUnitId: string
): boolean {
  const actorCu = state.units.get(actorUnitId);
  const targetCu = state.units.get(targetUnitId);
  const targetCoord = state.arena.getUnitPosition(targetUnitId);
  const actorCoord = state.arena.getUnitPosition(actorUnitId);
  if (!actorCu || !targetCu || !targetCoord || !actorCoord) return false;

  // 1. Check if attacker is in target's Flank or Rear combat arc
  const arc = getCombatArc(targetCu.facing, targetCoord, actorCoord);
  if (arc === 'FLANK' || arc === 'REAR') {
    return true;
  }

  // 2. Check if any other ally of actor is adjacent to target (Allied Pincer)
  const targetNeighbors = getHexNeighbors(targetCoord);
  const hasAlliedFlanker = targetNeighbors.some((coord) => {
    const occupantId = state.arena.getUnitAt(coord);
    if (!occupantId || occupantId === actorUnitId) return false;
    const cu = state.units.get(occupantId);
    return cu && !cu.isDefeated && cu.currentHp > 0 && cu.faction === actorCu.faction;
  });
  if (hasAlliedFlanker) return true;

  return false;
}

/**
 * Resolves an ability execution including to-hit roll, damage, mitigation,
 * pluggable effect dispatch, state event application, and in-battle archetype XP award.
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

  // Track oncePerTurn
  if (ability.oncePerTurn) {
    (actorCu.abilitiesUsedThisTurn ??= []).push(ability.id);
  }

  // Evaluate ephemeral pendingAbilityModifier (e.g. primed by Spell Sculpt)
  let effectiveAbility = ability;
  const pendingMod = actorCu.pendingAbilityModifier;
  if (canApplyPendingModifier(pendingMod, ability)) {
    effectiveAbility = {
      ...ability,
      range: ability.range + (pendingMod!.extraRange ?? 0),
      aoeRadius: (ability.aoeRadius ?? 0) + (pendingMod!.extraAoeRadius ?? 0)
    };
    if (pendingMod!.consumesOnUse) {
      actorCu.pendingAbilityModifier = undefined;
    }
  }

  // Turn actor to face target
  const actorCoord = state.arena.getUnitPosition(actorUnitId);
  const targetCoord = target?.coord ?? (target?.targetUnitId ? state.arena.getUnitPosition(target.targetUnitId) : undefined);
  if (actorCoord && targetCoord && !hexEquals(actorCoord, targetCoord)) {
    actorCu.facing = getDirectionBetween(actorCoord, targetCoord);
  }

  // Award In-Battle Archetype XP on execution
  if (effectiveAbility.archetypeTag === 'FIGHTER') {
    actorCu.inBattleXp.fighter += COMBAT_RESOLUTION_CONFIG.xpPerAction;
  } else if (effectiveAbility.archetypeTag === 'ROGUE') {
    actorCu.inBattleXp.rogue += COMBAT_RESOLUTION_CONFIG.xpPerAction;
  } else if (effectiveAbility.archetypeTag === 'MAGE') {
    actorCu.inBattleXp.mage += COMBAT_RESOLUTION_CONFIG.xpPerAction;
  }

  // 1. Support / Buff abilities (DamageType === 'NONE')
  if (effectiveAbility.damageType === 'NONE') {
    // AoE aura / blast resolution (friendly buffs or hostile utility/displacement)
    if (effectiveAbility.aoeRadius && effectiveAbility.aoeRadius > 0) {
      const centerCoord =
        target?.coord ??
        (target?.targetUnitId
          ? state.arena.getUnitPosition(target.targetUnitId)
          : actorCoord);

      const affectedHexes = centerCoord
        ? getHexesInRange(centerCoord, effectiveAbility.aoeRadius)
        : [];

      // Determine target alignment based on targetType and targeted unit
      const primaryTargetId = target?.targetUnitId;
      const primaryTargetCu = primaryTargetId ? state.units.get(primaryTargetId) : undefined;
      const isFriendlyTargeting =
        effectiveAbility.targetType === 'SELF' ||
        effectiveAbility.targetType === 'ALLY' ||
        (primaryTargetCu ? primaryTargetCu.faction === actorCu.faction : false);

      const targetCus: CombatUnit[] = [];

      // If friendly AoE aura centered on self (e.g. Lead the Charge), include actor
      if (effectiveAbility.targetType === 'SELF' && actorCoord) {
        targetCus.push(actorCu);
      }

      for (const hex of affectedHexes) {
        const unitIdAtHex = state.arena.getUnitAt(hex);
        if (unitIdAtHex && (unitIdAtHex !== actorUnitId || isFriendlyTargeting)) {
          const cu = state.units.get(unitIdAtHex);
          if (cu && !cu.isDefeated) {
            const matchesAlignment = isFriendlyTargeting
              ? (!actorCu.faction || !cu.faction || actorCu.faction === cu.faction)
              : (!actorCu.faction || !cu.faction || actorCu.faction !== cu.faction);

            if (matchesAlignment && !targetCus.some((t) => t.unit.id === cu.unit.id)) {
              targetCus.push(cu);
            }
          }
        }
      }

      const allEvents: CombatEvent[] = [];
      let combinedLog = '';
      for (const tCu of targetCus) {
        const effResult = executeAbilityEffects(effectiveAbility, {
          state,
          actorCu,
          targetCu: tCu,
          targetCoord: state.arena.getUnitPosition(tCu.unit.id),
          ability: effectiveAbility,
          hitOutcome: 'SOLID_HIT',
          diceRoller
        });
        allEvents.push(...effResult.events);
        if (effResult.logDetail && !combinedLog.includes(effResult.logDetail)) {
          combinedLog += effResult.logDetail;
        }
      }

      applyCombatEvents(state, allEvents);
      state.outcome = evaluateEncounterOutcome(state.objectives, state);

      state.combatLog.push({
        turnNumber: state.turnNumber,
        actorUnitId,
        actionId: effectiveAbility.id,
        message: `${actorCu.unit.name} used ${effectiveAbility.name}.${combinedLog}`
      });

      return {
        type: 'SUPPORT',
        targetUnitIds: targetCus.map((c) => c.unit.id),
        events: allEvents
      };
    }

    // Single-target Buff / Support
    const targetId = target?.targetUnitId ?? actorUnitId;
    const targetCu = requireCombatUnit(state, targetId);

    const effectResult = executeAbilityEffects(effectiveAbility, {
      state,
      actorCu,
      targetCu,
      targetCoord: target?.coord,
      ability: effectiveAbility,
      hitOutcome: 'SOLID_HIT',
      diceRoller
    });

    applyCombatEvents(state, effectResult.events);
    state.outcome = evaluateEncounterOutcome(state.objectives, state);

    const statusEvent = effectResult.events.find(
      (e): e is Extract<CombatEvent, { type: 'STATUS_APPLIED' }> => e.type === 'STATUS_APPLIED'
    );
    const appliedModifier = statusEvent?.modifier ?? {
      stat: 'armor',
      value: 0,
      durationTurns: 0
    };

    state.combatLog.push({
      turnNumber: state.turnNumber,
      actorUnitId,
      actionId: effectiveAbility.id,
      message: `${actorCu.unit.name} used ${effectiveAbility.name}.${effectResult.logDetail ?? ''}`
    });

    return {
      type: 'BUFF',
      targetUnitId: targetId,
      modifierApplied: appliedModifier,
      events: effectResult.events
    };
  }

  // 2. Damaging Attack Resolution
  const targetCu = requireCombatUnit(state, target!.targetUnitId!);

  // Tactical condition evaluation (e.g. Sneak Attack)
  let rollAdvantage: RollAdvantage = 'NORMAL';
  let bonusDamageProfile = undefined;

  if (effectiveAbility.conditionalBonus?.condition === 'FLANK_OR_REAR') {
    const isFlanked = isFlankOrRear(state, actorUnitId, targetCu.unit.id);
    if (isFlanked) {
      if (effectiveAbility.conditionalBonus.grantsAdvantage !== false) {
        rollAdvantage = 'ADVANTAGE';
      }
      bonusDamageProfile = effectiveAbility.conditionalBonus.bonusDamage;
    }
  }

  // Evaluate passive roll modifiers (e.g. Momentum)
  const passiveRoll = evaluateRollPassives(actorCu);
  if (passiveRoll.grantsAdvantage) {
    rollAdvantage = 'ADVANTAGE';
  }

  const rollResult = resolveAttackRoll(actorCu, targetCu, effectiveAbility, diceRoller, {
    advantage: rollAdvantage
  });

  const damageResult = resolveDamage(
    rollResult.hitOutcome,
    effectiveAbility,
    actorCu,
    targetCu,
    diceRoller,
    bonusDamageProfile
  );

  const events: CombatEvent[] = [];

  // Primary Damage Event
  if (damageResult.damageDealt > 0) {
    events.push({
      type: 'DAMAGE',
      targetUnitId: targetCu.unit.id,
      amount: damageResult.damageDealt,
      damageType: effectiveAbility.damageType === 'PHYSICAL' ? 'PHYSICAL' : 'MAGICAL',
      reason: 'ATTACK',
      sourceUnitId: actorCu.unit.id,
      isCrit: rollResult.hitOutcome === 'CRITICAL_HIT'
    });
  }

  // Secondary AoE Splash Resolution
  if (effectiveAbility.aoeRadius && effectiveAbility.aoeRadius > 0 && rollResult.hitOutcome !== 'MISS') {
    const targetCoord = target?.coord ?? state.arena.getUnitPosition(targetCu.unit.id);
    if (targetCoord) {
      const aoeHexes = getHexesInRange(targetCoord, effectiveAbility.aoeRadius);
      for (const hex of aoeHexes) {
        if (hexEquals(hex, targetCoord)) continue;
        const secondaryUnitId = state.arena.getUnitAt(hex);
        if (secondaryUnitId && secondaryUnitId !== actorCu.unit.id) {
          const splashCu = state.units.get(secondaryUnitId);
          if (splashCu && !splashCu.isDefeated && splashCu.currentHp > 0) {
            const splashDmg = resolveDamage(
              'SOLID_HIT',
              effectiveAbility,
              actorCu,
              splashCu,
              diceRoller
            );
            if (splashDmg.damageDealt > 0) {
              events.push({
                type: 'DAMAGE',
                targetUnitId: splashCu.unit.id,
                amount: splashDmg.damageDealt,
                damageType: effectiveAbility.damageType === 'PHYSICAL' ? 'PHYSICAL' : 'MAGICAL',
                reason: 'COLLATERAL',
                sourceUnitId: actorCu.unit.id,
                isCrit: false
              });
            }
          }
        }
      }
    }
  }

  // Dispatch secondary effects via pluggable registry
  const effectResult = executeAbilityEffects(effectiveAbility, {
    state,
    actorCu,
    targetCu,
    targetCoord: target?.coord,
    ability: effectiveAbility,
    hitOutcome: rollResult.hitOutcome,
    diceRoller
  });

  events.push(...effectResult.events);

  // Trigger ON_CRIT passives (e.g. Wild Surge) on critical hits
  if (rollResult.hitOutcome === 'CRITICAL_HIT') {
    const critEvents = triggerPassiveHook(state, actorCu, 'ON_CRIT', {
      targetCu,
      ability: effectiveAbility,
      diceRoller
    });
    events.push(...critEvents);
  }

  // Apply all events to state
  applyCombatEvents(state, events);

  // When a unit is hit with an attack, their facing direction updates to face the attack
  if (rollResult.hitOutcome !== 'MISS' && !targetCu.isDefeated) {
    const finalTargetPos = state.arena.getUnitPosition(targetCu.unit.id);
    if (finalTargetPos && actorCoord && !hexEquals(finalTargetPos, actorCoord)) {
      targetCu.facing = getDirectionBetween(finalTargetPos, actorCoord);
    }
  }

  // Also turn any living secondary splash damage targets to face the attack origin
  for (const event of events) {
    if (event.type === 'DAMAGE' && event.targetUnitId !== targetCu.unit.id) {
      const secondaryCu = state.units.get(event.targetUnitId);
      if (secondaryCu && !secondaryCu.isDefeated) {
        const secPos = state.arena.getUnitPosition(secondaryCu.unit.id);
        if (secPos && actorCoord && !hexEquals(secPos, actorCoord)) {
          secondaryCu.facing = getDirectionBetween(secPos, actorCoord);
        }
      }
    }
  }

  // Attacking from stealth breaks stealth
  actorCu.activeConditions = actorCu.activeConditions.filter((c) => c.type !== 'STEALTH');

  // Evaluate encounter outcome
  state.outcome = evaluateEncounterOutcome(state.objectives, state);

  // Combat Log
  const secondaryDetail = effectResult.logDetail ?? '';
  state.combatLog.push({
    turnNumber: state.turnNumber,
    actorUnitId,
    actionId: ability.id,
    message: `${actorCu.unit.name} used ${ability.name} on ${targetCu.unit.name}: [d20: ${rollResult.d20}+${rollResult.modifier} vs DC ${rollResult.targetDefense} -> ${rollResult.hitOutcome}] [Damage: ${damageResult.damageBreakdown}] (HP: ${targetCu.currentHp}/${targetCu.unit.effectiveVitals.maxHp})${secondaryDetail}`
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
      damageBreakdown: damageResult.damageBreakdown,
      effectsApplied: ability.effect ? [ability.effect] : [],
      knockbackResult: effectResult.knockbackResult,
      wallSlamDamage: effectResult.wallSlamDamage,
      events
    }
  };
}

