import { Unit, Faction } from '../types/unit';
import {
  HexCoord,
  HexDirection,
  HEX_DIRECTIONS,
  getHexesInRange,
  getHexNeighbors,
  hexEquals,
  hexDistance,
  getDirectionBetween,
  getHexLine,
  getForwardConeHexes
} from '../grid/hex';
import { Arena, calculateRawFallDamage } from '../grid/arena';
import { Ability, AbilityEffect, ConditionType, resolveEffectShout } from '../types/ability';
import {
  CombatState,
  CombatUnit,
  ActiveCondition,
  AbilityResolution,
  CombatEvent,
  EncounterObjective,
  HitOutcome,
  DiceRollBreakdown,
  EffectOutcome
} from './types';
import { canMove, canExecuteAbility } from './validator';
import {
  getEffectiveMove,
  getEffectiveSpeed,
  hasFriendlyAoEExclusion,
  isFriendlyUnit
} from './effectiveVitals';
import { clearZeroedInStacks } from './zeroedIn';
import { getRoughTerrainHexKeys } from './battlefieldZones';
import { getEffectiveAbility } from './modifiers';
import { isFlankOrRear } from './flanking';
import { DiceRoller, SeededDiceRoller, RollAdvantage } from './dice';
import { ACTION_ECONOMY_CONFIG, COMBAT_RESOLUTION_CONFIG } from '../config/balance';
import { advanceTurnClock, predictTurnOrder } from './turnClock';
import {
  resolveAttackRoll,
  resolveGroundAttackRoll,
  resolveTargetDefense,
  calculateElevationAttackModifier,
  AttackRollResult
} from './attackRoll';
import { resolveDamage, resolveFallDamage, DamageResult } from './damageEngine';
import {
  executeAbilityEffects,
  defaultEffectRegistry,
  EffectContext,
  getEffectMetadata,
  getEffectTiming,
  isSelfScopedEffect,
  isPrimaryTargetOnlyEffect,
  isDispatchableEffect,
  resolveApplyOn
} from './effects';
import { applyCombatEvents, ApplyCombatEventsOptions, pickBestHitOutcome } from './eventApplication';
import { evaluateRollPassives, onTurnStartPassives } from './passives';
import { evaluateEncounterOutcome } from './objectives';
import { resolveUnitLoadout, LoadoutLookupProviders } from '../units/loadout';
import { getClassPackage, getAbilityById, getPassiveById } from '../../data/packages';
import { PassiveTriggerHook } from '../types/passive';
import { evaluateTargetAuras } from './auras';
import { getConditionDefinition, evaluateFrontArcDetection, purgeConditionsFromDefeatedSource } from './conditions';
import { getBastionZocHexKeys, evaluateZoneOfControl, hasBastionRangedCover } from './bastionStance';
import { resolveAerialVaultLandingHex } from './aerialVault';
import { applyConditionToUnit } from './effects/conditionHandler';
import { combatLogger, formatEffectOutcomes } from './combatLogger';

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
  hitOutcome?: HitOutcome;
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

    // Check trigger filters if present (e.g. magic spell crits or solid hit/crit requirement)
    if (passive.triggerFilter) {
      if (passive.triggerFilter.damageType && extra?.ability?.damageType !== passive.triggerFilter.damageType) {
        continue;
      }
      if (
        passive.triggerFilter.requireSolidHitOrCrit &&
        extra?.hitOutcome !== 'SOLID_HIT' &&
        extra?.hitOutcome !== 'CRITICAL_HIT'
      ) {
        continue;
      }
    }

    // Execute conduit-projected AoE damage pulse if defined (e.g. Theurgic Synergy)
    if (passive.conduitPulse) {
      const pulse = passive.conduitPulse;
      let conduitCu: CombatUnit | undefined;
      for (const u of state.units.values()) {
        if (u.isDefeated || u.currentHp <= 0) continue;
        if (!state.arena.getUnitPosition(u.unit.id)) continue;
        if (u.activeConditions?.some((c) => c.type === pulse.linkedCondition && c.sourceUnitId === actorCu.unit.id)) {
          conduitCu = u;
          break;
        }
      }
      if (!conduitCu && pulse.fallbackToSelf && !actorCu.isDefeated && actorCu.currentHp > 0) {
        conduitCu = actorCu;
      }

      const conduitPos = conduitCu ? state.arena.getUnitPosition(conduitCu.unit.id) : undefined;
      if (conduitCu && conduitPos) {
        const pulseOutcomes: EffectOutcome[] = [];
        const affectedEnemyIds: string[] = [];
        for (const enemyCu of state.units.values()) {
          if (enemyCu.isDefeated || enemyCu.currentHp <= 0) continue;
          if (!enemyCu.faction || !actorCu.faction || enemyCu.faction === actorCu.faction) continue;
          const enemyPos = state.arena.getUnitPosition(enemyCu.unit.id);
          if (!enemyPos) continue;
          const dist = hexDistance(conduitPos, enemyPos);
          if (dist >= 1 && dist <= pulse.radius) {
            events.push({
              type: 'DAMAGE',
              targetUnitId: enemyCu.unit.id,
              amount: pulse.damage,
              damageType: pulse.damageType,
              reason: 'PASSIVE',
              label: pulse.label,
              sourceUnitId: actorCu.unit.id,
              isCrit: false
            });
            affectedEnemyIds.push(enemyCu.unit.id);
            pulseOutcomes.push({
              kind: 'COLLATERAL_HIT',
              sourceLabel: passive.name,
              targetName: enemyCu.unit.name,
              damage: pulse.damage,
              damageType: pulse.damageType,
              targetHp: Math.max(0, enemyCu.currentHp - pulse.damage),
              targetMaxHp: enemyCu.unit.effectiveVitals.maxHp
            });
          }
        }
        if (pulseOutcomes.length > 0) {
          combatLogger.logPassive(state, {
            cu: actorCu,
            passiveName: passive.name,
            passiveId: passive.id,
            effects: pulseOutcomes,
            affectedUnitIds: [conduitCu.unit.id, ...affectedEnemyIds]
          });
        }
      }
    }

    // Execute effect if defined
    if (passive.effect) {
      const handler = defaultEffectRegistry.get(passive.effect.type);
      if (handler) {
        let effectTargetCu = extra?.targetCu ?? actorCu;
        if (passive.effect.targetScope === 'SELF') {
          effectTargetCu = actorCu;
        }

        const ctx: EffectContext = {
          state,
          actorCu,
          targetCu: effectTargetCu,
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
          hitOutcome: extra?.hitOutcome ?? 'SOLID_HIT',
          diceRoller
        };

        const result = handler.apply(passive.effect, ctx);
        if (result.events && result.events.length > 0) {
          events.push(...result.events);
        }
        if (result.effects && result.effects.length > 0) {
          combatLogger.logPassive(state, {
            cu: actorCu,
            passiveName: passive.name,
            passiveId: passive.id,
            effects: result.effects
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
 * Applies an anti-alpha-strike guardrail ensuring that no single faction
 * takes more than Math.ceil(squadSize / 2) consecutive opening turns at encounter start.
 */
export function applyInitiativeGuardrail(state: CombatState, maxConsecutive?: number): void {
  const livingUnits = Array.from(state.units.values()).filter((cu) => !cu.isDefeated);
  const playerUnits = livingUnits.filter((cu) => cu.faction === 'PLAYER');
  const enemyUnits = livingUnits.filter((cu) => cu.faction === 'ENEMY');

  if (playerUnits.length === 0 || enemyUnits.length === 0) {
    return;
  }

  const squadSize = Math.max(playerUnits.length, enemyUnits.length);
  const limit = maxConsecutive ?? Math.ceil(squadSize / 2);

  const checkCount = limit + 1;
  const opening = predictTurnOrder(state, checkCount);
  if (opening.length < checkCount) {
    return;
  }

  const streakFaction = opening[0].faction;
  const isStreak = opening.slice(0, checkCount).every((entry) => entry.faction === streakFaction);

  if (isStreak) {
    const opposingFaction: Faction = streakFaction === 'PLAYER' ? 'ENEMY' : 'PLAYER';
    const streakingUnitId = opening[limit].unitId;
    const streakingCu = state.units.get(streakingUnitId);
    if (!streakingCu) return;

    const opposingCandidates = (opposingFaction === 'PLAYER' ? playerUnits : enemyUnits)
      .slice()
      .sort((a, b) => b.initiativeGauge - a.initiativeGauge);

    if (opposingCandidates.length > 0) {
      const bestOpposing = opposingCandidates[0];
      const speedOpp = getEffectiveSpeed(bestOpposing);
      const speedStreak = getEffectiveSpeed(streakingCu);

      const ticks = Math.max(
        1,
        Math.ceil((ACTION_ECONOMY_CONFIG.gaugeTurnThreshold - streakingCu.initiativeGauge) / speedStreak)
      );
      const streakFinalGauge = streakingCu.initiativeGauge + ticks * speedStreak;

      const neededGauge = Math.max(
        bestOpposing.initiativeGauge,
        streakFinalGauge + 1 - ticks * speedOpp
      );

      bestOpposing.initiativeGauge = neededGauge;
      bestOpposing.initialInitiativeRoll = neededGauge;
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
  objectives?: readonly EncounterObjective[],
  diceRoller: DiceRoller = defaultDiceRoller
): CombatState {
  const combatUnits = new Map<string, CombatUnit>();
  const shouldRollInitiative = !initialActiveUnitId;

  for (const unit of units) {
    const resolved = unit.loadout
      ? resolveUnitLoadout(unit, loadoutProviders)
      : undefined;

    const initialRoll = shouldRollInitiative ? diceRoller.rollD20() : undefined;
    const initialGauge = initialRoll ?? 0;

    combatUnits.set(unit.id, {
      unit,
      faction: unit.faction,
      currentHp: unit.effectiveVitals.maxHp,
      currentAp: 0,
      initiativeGauge: initialGauge,
      initialInitiativeRoll: initialRoll,
      isDefeated: false,
      inBattleXp: { fighter: 0, rogue: 0, mage: 0 },
      activeModifiers: [],
      activeConditions: [],
      abilityModifiers: unit.loadout?.abilityModifiers ? [...unit.loadout.abilityModifiers] : [],
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
    objectives,
    aiDecisionLog: [],
    partyXpPool: { fighter: 0, rogue: 0, mage: 0 },
    seed: diceRoller instanceof SeededDiceRoller ? diceRoller.seed : undefined
  };

  // Pre-encounter setup pass: seed initial state (e.g. +25 initiative for Tactical Vanguard)
  applyPreEncounterSetup(state);

  // Apply anti-alpha-strike guardrail if rolling initiative naturally
  if (shouldRollInitiative) {
    applyInitiativeGuardrail(state);
  }

  if (shouldRollInitiative) {
    const rollDetails: Array<{ unitName: string; unitId: string; roll: number; isPlayer: boolean; faction: Faction }> = [];
    for (const cu of combatUnits.values()) {
      if (cu.initialInitiativeRoll !== undefined) {
        const faction = cu.faction ?? cu.unit.faction ?? 'PLAYER';
        rollDetails.push({
          unitName: cu.unit.name,
          unitId: cu.unit.id,
          roll: cu.initialInitiativeRoll,
          isPlayer: faction === 'PLAYER',
          faction
        });
      }
    }
    // Sort descending so highest initiative (acting first) is listed first
    rollDetails.sort((a, b) => b.roll - a.roll);

    if (rollDetails.length > 0) {
      const rollSummaries = rollDetails.map((r) => `${r.unitName} (${r.roll})`);
      combatLogger.logInitiative(state, {
        rolls: rollDetails,
        message: `Combat begins! Initiative rolled: ${rollSummaries.join(', ')}`
      });
    }
  }

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
  const effectiveMove = getEffectiveMove(cu);
  const zocKeys = getBastionZocHexKeys(state, actorUnitId);
  const roughKeys = getRoughTerrainHexKeys(state);
  const pathInfo = prevPos
    ? state.arena.findPath(prevPos, destination, effectiveMove, {
        terminalHexKeys: zocKeys,
        roughTerrainHexKeys: roughKeys
      })
    : undefined;

  const fullPath = pathInfo && pathInfo.path.length > 0
    ? pathInfo.path
    : (prevPos ? [prevPos, destination] : [destination]);

  let currentCoord = prevPos ?? destination;
  let stepsTaken = 0;
  let accumulatedFallDamage = 0;
  let interrupted = false;

  for (let i = 1; i < fullPath.length; i++) {
    const prevStep = fullPath[i - 1];
    const nextStep = fullPath[i];
    cu.facing = getDirectionBetween(prevStep, nextStep);
    const dh = state.arena.getElevation(nextStep) - state.arena.getElevation(prevStep);
    accumulatedFallDamage += calculateRawFallDamage(dh);
    currentCoord = nextStep;
    stepsTaken++;

    const zocInterrupt = evaluateZoneOfControl(state, actorUnitId, currentCoord);
    if (zocInterrupt) {
      interrupted = true;
      combatLogger.logZoneOfControl(state, {
        haltedCu: cu,
        guardianCu: zocInterrupt
      });
      break;
    }

    const detected = evaluateFrontArcDetection(state, actorUnitId, currentCoord, cu.facing, 'MOVE');
    if (detected.length > 0) {
      interrupted = true;
      break;
    }
  }

  cu.hexesMovedThisTurn = (cu.hexesMovedThisTurn ?? 0) + stepsTaken;
  cu.currentAp -= 1;
  state.arena.setUnitPosition(actorUnitId, currentCoord);
  if (stepsTaken > 0) {
    clearZeroedInStacks(cu, true);
  }

  // If the path included a plunging ledge drop, apply direct unmitigated fall damage
  if (accumulatedFallDamage > 0) {
    const actualFallDamage = resolveFallDamage(cu, accumulatedFallDamage);
    if (actualFallDamage > 0) {
      const fallEvent: CombatEvent = {
        type: 'DAMAGE',
        targetUnitId: actorUnitId,
        amount: actualFallDamage,
        damageType: 'PHYSICAL',
        reason: 'FALL'
      };
      applyCombatEvents(state, [fallEvent], { claimed: true });

      combatLogger.logEnvironment(state, {
        cu,
        hazardName: 'Ledge Plunge',
        damage: actualFallDamage,
        detail: 'Direct Fall Impact Damage',
        message: `💥 ${cu.unit.name} plunged from a ledge and suffered ${actualFallDamage} direct Fall Impact Damage! (HP: ${cu.currentHp}/${cu.unit.effectiveVitals.maxHp})`
      });
    } else {
      const immunityPassive = cu.passives?.find((p) => p.immuneToFallDamage);
      const passiveName = immunityPassive?.name ?? 'Feline Grace';
      combatLogger.logPassive(state, {
        cu,
        passiveName,
        passiveId: immunityPassive?.id ?? 'feline_grace',
        effects: [{ kind: 'FALL', damage: 0, negated: true }],
        message: `🐾 ${cu.unit.name} plunged from a ledge safely with Fall Damage Immunity!`
      });
    }
  }

  // Trigger ON_MOVE passives (e.g. Elusive Stride) generically
  const moveEvents = triggerPassiveHook(state, cu, 'ON_MOVE');
  if (moveEvents.length > 0) {
    applyCombatEvents(state, moveEvents);
  }

  if (interrupted) {
    combatLogger.logMove(state, {
      cu,
      destination: currentCoord,
      remainingAp: cu.currentAp,
      actionId: 'move_interrupted',
      message: `${cu.unit.name} moved to (${currentCoord.q}, ${currentCoord.r}) and was interrupted by spotting a hidden enemy! [Remaining AP: ${cu.currentAp}]`
    });
  } else {
    combatLogger.logMove(state, {
      cu,
      destination,
      remainingAp: cu.currentAp
    });
  }
}

/**
 * Sets the active unit's directional facing orientation (costs 0 AP).
 * Must be executed during the actor's active turn.
 */
export function executeSetFacing(
  state: CombatState,
  actorUnitId: string,
  facing: HexDirection
): void {
  if (state.activeUnitId !== actorUnitId) {
    throw new Error(
      `Cannot set facing for unit ${actorUnitId}: not active unit (active: ${state.activeUnitId})`
    );
  }
  if (facing < 0 || facing > 5 || !Number.isInteger(facing)) {
    throw new Error(`Invalid hex facing direction: ${facing}. Must be integer between 0 and 5.`);
  }

  const cu = requireCombatUnit(state, actorUnitId);
  cu.facing = facing;
}


export { applyCombatEvents };
export type { ApplyCombatEventsOptions };

export { isFlankOrRear } from './flanking';

/**
 * Executes and commits the POST_ACTION lifecycle phase once for an action.
 */
function runPostActionPhase(
  state: CombatState,
  ctx: EffectContext
): { readonly events: readonly CombatEvent[]; readonly effects: readonly EffectOutcome[] } {
  const res = executeAbilityEffects(
    ctx.ability,
    ctx,
    defaultEffectRegistry,
    (e) => getEffectTiming(e) === 'POST_ACTION' && isDispatchableEffect(e)
  );
  if (res.events.length > 0) {
    applyCombatEvents(state, res.events, { claimed: true });
  }
  return {
    events: res.events,
    effects: res.effects ?? []
  };
}

/**
 * Executes launch-turn self-scoped phases on battlefield zone abilities
 * (unconditional ON_RESOLVE self-buffs strictly before POST_ACTION effects).
 */
function runLaunchSelfPhases(
  state: CombatState,
  actorCu: CombatUnit,
  effectiveAbility: Ability,
  targetCoord: HexCoord,
  diceRoller: DiceRoller
): { readonly events: readonly CombatEvent[]; readonly effects: readonly EffectOutcome[] } {
  const baseCtx: EffectContext = {
    state,
    actorCu,
    targetCu: actorCu,
    targetCoord,
    ability: effectiveAbility,
    hitOutcome: 'SOLID_HIT',
    diceRoller
  };

  const onResolveRes = executeAbilityEffects(
    effectiveAbility,
    baseCtx,
    defaultEffectRegistry,
    (e) =>
      getEffectTiming(e) === 'ON_RESOLVE' &&
      isDispatchableEffect(e) &&
      isSelfScopedEffect(e) &&
      resolveApplyOn(e) === 'ALWAYS'
  );
  if (onResolveRes.events.length > 0) {
    applyCombatEvents(state, onResolveRes.events, { claimed: true });
  }

  const postRes = runPostActionPhase(state, baseCtx);

  return {
    events: [...onResolveRes.events, ...postRes.events],
    effects: [...(onResolveRes.effects ?? []), ...postRes.effects]
  };
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
  const effectiveAbility = getEffectiveAbility(ability, actorCu.abilityModifiers);
  actorCu.currentAp -= effectiveAbility.apCost;

  // Deduct HP cost if specified (e.g. Blood Frenzy self-sacrifice); defeat unit if HP reaches 0
  if (effectiveAbility.hpCost && effectiveAbility.hpCost > 0) {
    actorCu.currentHp = Math.max(0, actorCu.currentHp - effectiveAbility.hpCost);
    if (actorCu.currentHp === 0) {
      actorCu.isDefeated = true;
      state.arena.removeUnit(actorUnitId);
      purgeConditionsFromDefeatedSource(state, actorUnitId);
    }
  }

  // Track oncePerTurn
  if (effectiveAbility.oncePerTurn) {
    (actorCu.abilitiesUsedThisTurn ??= []).push(effectiveAbility.id);
  }

  // Consume ephemeral modifiers that applied to this ability
  if (effectiveAbility.appliedModifierIds.length > 0) {
    actorCu.abilityModifiers = (actorCu.abilityModifiers ?? []).filter(
      (m) => !(m.consumesOnUse && effectiveAbility.appliedModifierIds.includes(m.id))
    );
  }

  // Turn actor to face target
  const actorCoord = state.arena.getUnitPosition(actorUnitId);
  const targetCoord = target?.coord ?? (target?.targetUnitId ? state.arena.getUnitPosition(target.targetUnitId) : undefined);
  if (actorCoord && targetCoord && !hexEquals(actorCoord, targetCoord)) {
    actorCu.facing = getDirectionBetween(actorCoord, targetCoord);
  }

  // Award In-Battle Archetype XP to shared party pool on player ability execution
  const isPlayer = (actorCu.unit.faction ?? actorCu.faction ?? 'PLAYER') === 'PLAYER';
  if (isPlayer) {
    const xpEarned = Math.max(1, effectiveAbility.apCost ?? 1);
    if (effectiveAbility.archetypeTag === 'FIGHTER') {
      state.partyXpPool = {
        ...state.partyXpPool,
        fighter: state.partyXpPool.fighter + xpEarned
      };
      actorCu.inBattleXp.fighter += xpEarned;
    } else if (effectiveAbility.archetypeTag === 'ROGUE') {
      state.partyXpPool = {
        ...state.partyXpPool,
        rogue: state.partyXpPool.rogue + xpEarned
      };
      actorCu.inBattleXp.rogue += xpEarned;
    } else if (effectiveAbility.archetypeTag === 'MAGE') {
      state.partyXpPool = {
        ...state.partyXpPool,
        mage: state.partyXpPool.mage + xpEarned
      };
      actorCu.inBattleXp.mage += xpEarned;
    }
  }

  // 0. Battlefield Zone abilities: Delayed Bombardment (Siege Barrage) & Shrapnel Rubble (Shrapnel Canister)
  const delayedBombardmentEffect = effectiveAbility.effects?.find((e) => e.type === 'DELAYED_BOMBARDMENT');
  if (delayedBombardmentEffect && targetCoord) {
    const blastRadius = effectiveAbility.aoeRadius ?? 1;
    const affectedHexes = getHexesInRange(targetCoord, blastRadius).filter((c) => state.arena.hasTile(c));
    const damageProfile = delayedBombardmentEffect.damageProfile ?? { count: 2, sides: 8, modifierAttribute: 'force' };
    const bombardmentId = `bombard_${actorUnitId}_${state.turnNumber}_${(state.pendingBombardments?.length ?? 0) + 1}`;
    const onHitEffects = (effectiveAbility.effects ?? []).filter((e) => {
      const meta = getEffectMetadata(e.type);
      if (getEffectTiming(e) !== 'ON_RESOLVE') return false;
      if (meta.role !== 'RESOLUTION' && meta.role !== 'ROLL_MODIFIER') return false;
      return !(isSelfScopedEffect(e) && resolveApplyOn(e) === 'ALWAYS');
    });

    state.pendingBombardments = [
      ...(state.pendingBombardments ?? []),
      {
        id: bombardmentId,
        sourceUnitId: actorUnitId,
        sourceUnitName: actorCu.unit.name,
        sourceFaction: actorCu.faction,
        abilityId: effectiveAbility.id,
        abilityName: effectiveAbility.name,
        centerCoord: { q: targetCoord.q, r: targetCoord.r },
        hexCoords: affectedHexes.map((c) => ({ q: c.q, r: c.r })),
        ...(actorCoord ? { snapshotOriginCoord: { q: actorCoord.q, r: actorCoord.r } } : {}),
        damageProfile,
        ...(delayedBombardmentEffect.flatDamage !== undefined ? { flatDamage: delayedBombardmentEffect.flatDamage } : {}),
        damageType: effectiveAbility.damageType === 'MAGICAL' ? 'MAGICAL' : 'PHYSICAL',
        defenseTarget: effectiveAbility.defenseTarget !== 'NONE' ? effectiveAbility.defenseTarget : 'EVASION',
        ...(effectiveAbility.attackRollBonus !== undefined ? { attackRollBonus: effectiveAbility.attackRollBonus } : {}),
        ...(onHitEffects.length > 0 ? { onHitEffects } : {}),
        attackModifierAttribute: effectiveAbility.attackModifierAttribute ?? 'finesse',
        snapshotFinesse: actorCu.unit.baseAttributes.finesse,
        snapshotForce: actorCu.unit.baseAttributes.force,
        snapshotFocus: actorCu.unit.baseAttributes.focus,
        snapshotZeroedInStacks: actorCu.zeroedInStacks ?? 0
      }
    ];

    // Execute launch-turn unconditional SELF ON_RESOLVE buffs strictly before POST_ACTION effects
    const launchSelfRes = runLaunchSelfPhases(state, actorCu, effectiveAbility, targetCoord, diceRoller);
    const launchExtraText = formatEffectOutcomes(launchSelfRes.effects);

    combatLogger.logUtility(state, {
      actorCu,
      ability: effectiveAbility,
      targetName: `hex (${targetCoord.q}, ${targetCoord.r})`,
      effects: [
        {
          kind: 'CONTEXT',
          context: 'ELEVATION',
          label: 'Barrage Marked',
          detail: `${affectedHexes.length} hexes targeted for detonation next turn`
        },
        ...(launchSelfRes.effects ?? [])
      ],
      message: `${actorCu.unit.name} launched ${effectiveAbility.name} at (${targetCoord.q}, ${targetCoord.r}) — ${affectedHexes.length} hexes marked for detonation next turn!${launchExtraText ? ` ${launchExtraText}` : ''}`
    });

    return {
      type: 'SUPPORT',
      targetUnitIds: [],
      events: launchSelfRes.events
    };
  }

  const shrapnelRubbleEffect = effectiveAbility.effects?.find((e) => e.type === 'SHRAPNEL_RUBBLE');
  if (shrapnelRubbleEffect && targetCoord) {
    const blastRadius = effectiveAbility.aoeRadius ?? 1;
    const affectedHexes = getHexesInRange(targetCoord, blastRadius).filter((c) => state.arena.hasTile(c));
    const revealedUnitIds: string[] = [];
    const revealedNames: string[] = [];

    for (const hex of affectedHexes) {
      const occId = state.arena.getUnitAt(hex);
      if (!occId) continue;
      const occCu = state.units.get(occId);
      if (occCu && !occCu.isDefeated && occCu.activeConditions?.some((c) => c.type === 'STEALTH')) {
        occCu.activeConditions = occCu.activeConditions.filter((c) => c.type !== 'STEALTH');
        revealedUnitIds.push(occCu.unit.id);
        revealedNames.push(occCu.unit.name);
      }
    }

    const hazardId = `rubble_${actorUnitId}_${state.turnNumber}_${(state.hexHazards?.length ?? 0) + 1}`;
    const durationTurns = shrapnelRubbleEffect.durationTurns ?? 2;
    const extraMoveCost = shrapnelRubbleEffect.magnitude ?? 2;

    state.hexHazards = [
      ...(state.hexHazards ?? []),
      {
        id: hazardId,
        type: 'SHRAPNEL_RUBBLE',
        sourceUnitId: actorUnitId,
        sourceFaction: actorCu.faction,
        hexCoords: affectedHexes.map((c) => ({ q: c.q, r: c.r })),
        durationTurns,
        extraMoveCost
      }
    ];

    // Execute launch-turn unconditional SELF ON_RESOLVE buffs strictly before POST_ACTION effects
    const launchSelfRes = runLaunchSelfPhases(state, actorCu, effectiveAbility, targetCoord, diceRoller);
    const launchExtraText = formatEffectOutcomes(launchSelfRes.effects);

    const revealClause =
      revealedNames.length > 0 ? ` Revealed ${revealedNames.join(', ')} from Stealth!` : '';

    combatLogger.logUtility(state, {
      actorCu,
      ability: effectiveAbility,
      targetName: `hex (${targetCoord.q}, ${targetCoord.r})`,
      affectedUnitIds: revealedUnitIds.length > 0 ? revealedUnitIds : undefined,
      effects: [
        {
          kind: 'MODIFIER',
          label: 'Shrapnel Rubble',
          entries: [{ stat: 'Move Cost', value: `+${extraMoveCost} MP` }],
          durationTurns,
          ...(revealedNames.length > 0 ? { note: `Revealed: ${revealedNames.join(', ')}` } : {})
        },
        ...(launchSelfRes.effects ?? [])
      ],
      message: `${actorCu.unit.name} deployed ${effectiveAbility.name} at (${targetCoord.q}, ${targetCoord.r}), blanketing ${affectedHexes.length} hexes in rough terrain (+${extraMoveCost} MP, ${durationTurns} turns).${revealClause}${launchExtraText ? ` ${launchExtraText}` : ''}`
    });

    return {
      type: 'SUPPORT',
      targetUnitIds: revealedUnitIds,
      events: launchSelfRes.events
    };
  }

  // 1. Support / Buff abilities (DamageType === 'NONE' and uncontested/no defense target)
  if (effectiveAbility.damageType === 'NONE' && (effectiveAbility.defenseTarget === 'NONE' || !effectiveAbility.defenseTarget)) {
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
      const combinedEffects: EffectOutcome[] = [];
      const seenEffectKeys = new Set<string>();
      const pushUniqueEffects = (outcomes?: readonly EffectOutcome[]) => {
        for (const outcome of outcomes ?? []) {
          const key = JSON.stringify(outcome);
          if (!seenEffectKeys.has(key)) {
            seenEffectKeys.add(key);
            combinedEffects.push(outcome);
          }
        }
      };

      // Target-scoped ON_RESOLVE effects per affected unit
      for (const tCu of targetCus) {
        const effResult = executeAbilityEffects(
          effectiveAbility,
          {
            state,
            actorCu,
            targetCu: tCu,
            targetCoord: centerCoord,
            ability: effectiveAbility,
            hitOutcome: 'SOLID_HIT',
            diceRoller
          },
          defaultEffectRegistry,
          (e) =>
            getEffectTiming(e) === 'ON_RESOLVE' &&
            isDispatchableEffect(e) &&
            !isSelfScopedEffect(e) &&
            !isPrimaryTargetOnlyEffect(e)
        );
        if (effResult.events.length > 0) {
          allEvents.push(...effResult.events);
          applyCombatEvents(state, effResult.events, { claimed: true });
        }
        pushUniqueEffects(effResult.effects);
      }

      // Self-scoped ON_RESOLVE effects once per action
      const selfOnResolve = executeAbilityEffects(
        effectiveAbility,
        {
          state,
          actorCu,
          targetCu: actorCu,
          targetCoord: centerCoord,
          ability: effectiveAbility,
          hitOutcome: 'SOLID_HIT',
          diceRoller
        },
        defaultEffectRegistry,
        (e) =>
          getEffectTiming(e) === 'ON_RESOLVE' &&
          isDispatchableEffect(e) &&
          isSelfScopedEffect(e)
      );
      if (selfOnResolve.events.length > 0) {
        allEvents.push(...selfOnResolve.events);
        applyCombatEvents(state, selfOnResolve.events, { claimed: true });
      }
      pushUniqueEffects(selfOnResolve.effects);

      // POST_ACTION effects once after resolution
      const postRes = runPostActionPhase(state, {
        state,
        actorCu,
        targetCu: actorCu,
        targetCoord: centerCoord,
        ability: effectiveAbility,
        hitOutcome: 'SOLID_HIT',
        diceRoller
      });
      allEvents.push(...postRes.events);
      pushUniqueEffects(postRes.effects);

      state.outcome = evaluateEncounterOutcome(state.objectives, state);

      const externalTargets = targetCus.filter((c) => c.unit.id !== actorCu.unit.id);
      const targetClause =
        externalTargets.length > 0
          ? ` on ${externalTargets.map((c) => c.unit.name).join(', ')}`
          : '';

      const aoeDamageEvents = allEvents.filter(
        (e): e is Extract<CombatEvent, { type: 'DAMAGE' }> => e.type === 'DAMAGE'
      );
      const totalAoeDamage = aoeDamageEvents.reduce((acc, d) => acc + d.amount, 0);
      const isAoeHostile = !isFriendlyTargeting || totalAoeDamage > 0;
      const combinedEffectsText = formatEffectOutcomes(combinedEffects);

      if (isAoeHostile) {
        combatLogger.logUtility(state, {
          actorCu,
          ability: effectiveAbility,
          damageTotal: totalAoeDamage > 0 ? String(totalAoeDamage) : undefined,
          effects: combinedEffects.length > 0 ? combinedEffects : undefined,
          affectedUnitIds: targetCus.map((c) => c.unit.id),
          message: `${actorCu.unit.name} used ${effectiveAbility.name}${targetClause}.${combinedEffectsText ? ` ${combinedEffectsText}` : ''}`
        });
      } else {
        combatLogger.logBuff(state, {
          actorCu,
          ability: effectiveAbility,
          effects: combinedEffects.length > 0 ? combinedEffects : undefined,
          message: `${actorCu.unit.name} used ${effectiveAbility.name}${targetClause}.${combinedEffectsText ? ` ${combinedEffectsText}` : ''}`
        });
      }

      return {
        type: 'SUPPORT',
        targetUnitIds: targetCus.map((c) => c.unit.id),
        events: allEvents
      };
    }

    // Single-target Buff / Support
    const targetId = target?.targetUnitId ?? actorUnitId;
    const targetCu = requireCombatUnit(state, targetId);

    const effectResult = executeAbilityEffects(
      effectiveAbility,
      {
        state,
        actorCu,
        targetCu,
        targetCoord: target?.coord,
        ability: effectiveAbility,
        hitOutcome: 'SOLID_HIT',
        diceRoller
      },
      defaultEffectRegistry,
      (e) => getEffectTiming(e) === 'ON_RESOLVE' && isDispatchableEffect(e)
    );

    applyCombatEvents(state, effectResult.events, { claimed: true });

    const postActionResult = runPostActionPhase(state, {
      state,
      actorCu,
      targetCu,
      targetCoord: target?.coord,
      ability: effectiveAbility,
      hitOutcome: 'SOLID_HIT',
      diceRoller
    });

    const combinedSingleEvents = [...effectResult.events, ...postActionResult.events];
    const combinedSingleEffects: EffectOutcome[] = [
      ...(effectResult.effects ?? []),
      ...(postActionResult.effects ?? [])
    ];

    state.outcome = evaluateEncounterOutcome(state.objectives, state);

    const statusEvent = combinedSingleEvents.find(
      (e): e is Extract<CombatEvent, { type: 'STATUS_APPLIED' }> => e.type === 'STATUS_APPLIED'
    );
    const appliedModifier = statusEvent?.modifier ?? {
      stat: 'armor',
      value: 0,
      durationTurns: 0
    };

    const isSelfTarget = targetCu.unit.id === actorCu.unit.id;
    const isFriendlyTargeting =
      effectiveAbility.targetType === 'SELF' ||
      effectiveAbility.targetType === 'ALLY' ||
      (isSelfTarget ? true : (actorCu.faction && targetCu.faction ? actorCu.faction === targetCu.faction : false));

    const damageEvents = combinedSingleEvents.filter(
      (e): e is Extract<CombatEvent, { type: 'DAMAGE' }> => e.type === 'DAMAGE'
    );
    const totalDamage = damageEvents.reduce((acc, d) => acc + d.amount, 0);
    const isHostile = !isFriendlyTargeting || totalDamage > 0;
    const effectSummaryText = formatEffectOutcomes(combinedSingleEffects);

    const targetClause = isSelfTarget ? '' : ` on ${targetCu.unit.name}`;
    if (isHostile) {
      combatLogger.logUtility(state, {
        actorCu,
        ability: effectiveAbility,
        targetCu: isSelfTarget ? undefined : targetCu,
        damageTotal: totalDamage > 0 ? String(totalDamage) : undefined,
        targetHp: totalDamage > 0 ? targetCu.currentHp : undefined,
        targetMaxHp: totalDamage > 0 ? targetCu.unit.effectiveVitals.maxHp : undefined,
        effects: combinedSingleEffects.length > 0 ? combinedSingleEffects : undefined,
        affectedUnitIds: isSelfTarget ? [actorCu.unit.id] : [actorCu.unit.id, targetCu.unit.id],
        message: `${actorCu.unit.name} used ${effectiveAbility.name}${targetClause}.${effectSummaryText ? ` ${effectSummaryText}` : ''}`
      });
    } else {
      combatLogger.logBuff(state, {
        actorCu,
        ability: effectiveAbility,
        targetCu: isSelfTarget ? undefined : targetCu,
        effects: combinedSingleEffects.length > 0 ? combinedSingleEffects : undefined,
        message: `${actorCu.unit.name} used ${effectiveAbility.name}${targetClause}.${effectSummaryText ? ` ${effectSummaryText}` : ''}`
      });
    }

    return {
      type: 'BUFF',
      targetUnitId: targetId,
      modifierApplied: appliedModifier,
      events: combinedSingleEvents
    };
  }

  // 2. Damaging Attack Resolution
  const rawTargetUnitId = effectiveAbility.targetType === 'HEX'
    ? (targetCoord ? state.arena.getUnitAt(targetCoord) : undefined)
    : target?.targetUnitId;
  const rawTargetCu = rawTargetUnitId ? state.units.get(rawTargetUnitId) : undefined;
  if (!rawTargetCu && effectiveAbility.targetType !== 'HEX') {
    throw new Error(`Target combat unit ${target?.targetUnitId} not found in state.`);
  }
  const excludeFriendlyAoE =
    hasFriendlyAoEExclusion(actorCu) ||
    Boolean(effectiveAbility.effects?.some((e) => e.type === 'ALLY_REFRACTION'));
  const isSparedCenterAlly =
    effectiveAbility.targetType === 'HEX' &&
    effectiveAbility.damageType !== 'NONE' &&
    Boolean(rawTargetCu) &&
    excludeFriendlyAoE &&
    isFriendlyUnit(actorCu, rawTargetCu);
  const targetCu = isSparedCenterAlly ? undefined : rawTargetCu;

  const events: CombatEvent[] = [];
  let attackOriginCoord = actorCoord;

  // PRE_ACTION: RUSH_CHARGE straight-line dash into contact
  const rushEffect = effectiveAbility.effects?.find(
    (e) => getEffectTiming(e) === 'PRE_ACTION' && e.type === 'RUSH_CHARGE'
  );
  if (rushEffect && targetCu) {
    const actorPos = state.arena.getUnitPosition(actorUnitId);
    const targetPos = state.arena.getUnitPosition(targetCu.unit.id);
    if (actorPos && targetPos) {
      const line = getHexLine(actorPos, targetPos);
      if (line.length >= 3) {
        const destHex = line[line.length - 2];
        state.arena.setUnitPosition(actorUnitId, destHex);
        clearZeroedInStacks(actorCu, true);
        attackOriginCoord = destHex;
        const chargeDist = hexDistance(actorPos, destHex);
        actorCu.hexesMovedThisTurn = (actorCu.hexesMovedThisTurn ?? 0) + chargeDist;
        actorCu.facing = getDirectionBetween(destHex, targetPos);
        const rushLabel = resolveEffectShout(rushEffect.shout, 'actor');
        events.push({
          type: 'DISPLACEMENT',
          unitId: actorUnitId,
          fromCoord: actorPos,
          toCoord: destHex,
          kind: 'CHARGE',
          ...(rushLabel !== undefined ? { label: rushLabel } : {})
        });
      }
    }
  }

  // PRE_ACTION: AERIAL_VAULT leap to rear arc (Far Hex) or Near Hex fallback
  const vaultEffect = effectiveAbility.effects?.find(
    (e) => getEffectTiming(e) === 'PRE_ACTION' && e.type === 'AERIAL_VAULT'
  );
  if (vaultEffect && targetCu) {
    const actorPos = state.arena.getUnitPosition(actorUnitId);
    const targetPos = state.arena.getUnitPosition(targetCu.unit.id);
    if (actorPos && targetPos) {
      const landingHex = resolveAerialVaultLandingHex(state, actorPos, targetPos);
      if (landingHex) {
        state.arena.setUnitPosition(actorUnitId, landingHex);
        clearZeroedInStacks(actorCu, true);
        attackOriginCoord = landingHex;
        const vaultDist = hexDistance(actorPos, landingHex);
        actorCu.hexesMovedThisTurn = (actorCu.hexesMovedThisTurn ?? 0) + vaultDist;
        actorCu.facing = getDirectionBetween(landingHex, targetPos);
        const vaultLabel = resolveEffectShout(vaultEffect.shout, 'actor');
        events.push({
          type: 'DISPLACEMENT',
          unitId: actorUnitId,
          fromCoord: actorPos,
          toCoord: landingHex,
          kind: 'CHARGE',
          ...(vaultLabel !== undefined ? { label: vaultLabel } : {})
        });
      }
    }
  }

  // PRE_ACTION movements already updated arena positions; track cursor so subsequent events apply exactly once
  let appliedEventsCursor = events.length;

  // Tactical condition evaluation (e.g. Sneak Attack)
  let rollAdvantage: RollAdvantage = 'NORMAL';
  let bonusDamageProfile = undefined;

  let conditionalRollBonus = 0;

  const flankEffect = effectiveAbility.effects?.find((e) => e.condition === 'FLANK_OR_REAR');
  if (flankEffect && targetCu) {
    const isFlanked = isFlankOrRear(state, actorUnitId, targetCu.unit.id);
    if (isFlanked) {
      if (Boolean(flankEffect.grantsAdvantage)) {
        rollAdvantage = 'ADVANTAGE';
      }
      if (flankEffect.attackRollBonus) {
        conditionalRollBonus += flankEffect.attackRollBonus;
      }
      bonusDamageProfile = flankEffect.bonusDamage;
    }
  }

  const challengedEffect = effectiveAbility.effects?.find((e) => e.condition === 'TARGET_CHALLENGED');
  if (challengedEffect && targetCu) {
    const isTargetChallenged = targetCu.activeConditions?.some((c) => c.type === 'CHALLENGED');
    if (isTargetChallenged) {
      if (Boolean(challengedEffect.grantsAdvantage)) {
        rollAdvantage = 'ADVANTAGE';
      }
      if (challengedEffect.attackRollBonus) {
        conditionalRollBonus += challengedEffect.attackRollBonus;
      }
      bonusDamageProfile = challengedEffect.bonusDamage;
    }
  }

  const distributiveEffect = effectiveAbility.effects?.find((e) => e.type === 'DISTRIBUTIVE_PROOF');
  let distributiveMode: 'ISOLATED' | 'CLUSTERED' | undefined;
  if (distributiveEffect && targetCu && targetCoord) {
    let adjacentTargetAllies = 0;
    for (const neighbor of getHexNeighbors(targetCoord)) {
      const occId = state.arena.getUnitAt(neighbor);
      if (!occId || occId === targetCu.unit.id) continue;
      const occCu = state.units.get(occId);
      if (occCu && !occCu.isDefeated && occCu.currentHp > 0 && isFriendlyUnit(targetCu, occCu)) {
        adjacentTargetAllies++;
      }
    }
    distributiveMode = adjacentTargetAllies === 0 ? 'ISOLATED' : 'CLUSTERED';
    if (distributiveMode === 'ISOLATED' && distributiveEffect.bonusDamage) {
      bonusDamageProfile = distributiveEffect.bonusDamage;
    }
  }

  // Evaluate passive roll modifiers (e.g. Momentum)
  const passiveRoll = evaluateRollPassives(actorCu);
  if (passiveRoll.grantsAdvantage) {
    rollAdvantage = 'ADVANTAGE';
  }

  // Evaluate target-centric protective auras (e.g. Misfortune Ward)
  const auraEval = targetCu
    ? evaluateTargetAuras(targetCu, actorCu, state)
    : { attackRollPenalty: 0, sourceAuraNames: [] };

  // Evaluate elevation difference between attack origin and target position
  const targetPos = targetCu
    ? state.arena.getUnitPosition(targetCu.unit.id)
    : targetCoord;
  const physicalActorElevation = attackOriginCoord ? state.arena.getElevation(attackOriginCoord) : 0;
  const physicalTargetElevation = targetPos ? state.arena.getElevation(targetPos) : 0;
  const physicalElevationDelta = physicalActorElevation - physicalTargetElevation;
  const elevationDelta =
    physicalElevationDelta + (actorCu.virtualElevation ?? 0) - (targetCu?.virtualElevation ?? 0);
  const elevMod = calculateElevationAttackModifier(
    actorCu,
    elevationDelta,
    effectiveAbility
  );

  let rollResult: AttackRollResult;
  if (targetCu) {
    rollResult = resolveAttackRoll(actorCu, targetCu, effectiveAbility, diceRoller, {
      advantage: rollAdvantage,
      rollBonus: conditionalRollBonus,
      rollPenalty: auraEval.attackRollPenalty,
      elevationDelta: physicalElevationDelta
    });

    // Single-attack consumption of EXPOSED: condition is consumed upon being attacked
    if (targetCu.activeConditions?.some((c) => c.type === 'EXPOSED')) {
      targetCu.activeConditions = targetCu.activeConditions.filter((c) => c.type !== 'EXPOSED');
      combatLogger.logConditionBroken(state, {
        cu: targetCu,
        condition: 'EXPOSED',
        reason: 'consumed',
        actionId: 'condition_removed',
        text: 'EXPOSED consumed',
        message: `${targetCu.unit.name}'s EXPOSED condition was consumed!`
      });
    }
  } else {
    // Ground targeting on an unoccupied hex: roll unified attack roll with modifier breakdown
    rollResult = resolveGroundAttackRoll(actorCu, effectiveAbility, diceRoller, {
      advantage: rollAdvantage,
      rollBonus: conditionalRollBonus,
      rollPenalty: auraEval.attackRollPenalty,
      elevationDelta
    });
  }

  // Primary Damage Event on center target (if targetCu exists)
  let damageResult: DamageResult = {
    rawDamage: 0,
    mitigation: 0,
    damageDealt: 0,
    damageBreakdown: '',
    damageDice: [],
    damageModifier: 0
  };

  if (targetCu) {
    const hasRangedCover = hasBastionRangedCover(state, targetCu, attackOriginCoord, effectiveAbility);
    damageResult = resolveDamage(
      rollResult.hitOutcome,
      effectiveAbility,
      actorCu,
      targetCu,
      diceRoller,
      bonusDamageProfile,
      undefined,
      { hasRangedCover, elevationDelta }
    );

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
  }

  // Secondary AoE Splash / Cone Resolution
  const isCone = Boolean(effectiveAbility.coneTemplate);
  const splashOutcomes: EffectOutcome[] = [];
  const splashHitEntries: {
    readonly cu: CombatUnit;
    readonly outcome: HitOutcome;
    readonly coord: HexCoord;
    readonly damageDealt: number;
    readonly damageType: 'PHYSICAL' | 'MAGICAL';
    readonly defenseTarget: number;
    outcomeIndex?: number;
  }[] = [];
  const splashLabel = effectiveAbility.splashLabel ?? (isCone ? 'BREATH' : 'SPLASH');
  const splashTitle = splashLabel.charAt(0).toUpperCase() + splashLabel.slice(1).toLowerCase();
  const splashOrigin = vaultEffect ? attackOriginCoord : targetCoord;
  const aoeHexes = isCone && actorCoord && actorCu.facing !== undefined
    ? getForwardConeHexes(actorCoord, actorCu.facing)
    : (effectiveAbility.aoeRadius && effectiveAbility.aoeRadius > 0 && splashOrigin
      ? getHexesInRange(splashOrigin, effectiveAbility.aoeRadius)
      : []);

  if (aoeHexes.length > 0) {
    for (const hex of aoeHexes) {
      if (targetCu && targetCoord && hexEquals(hex, targetCoord)) continue;
      if (attackOriginCoord && hexEquals(hex, attackOriginCoord)) continue;
      const secondaryUnitId = state.arena.getUnitAt(hex);
      if (secondaryUnitId && secondaryUnitId !== actorCu.unit.id) {
        const splashCu = state.units.get(secondaryUnitId);
        if (splashCu && !splashCu.isDefeated && splashCu.currentHp > 0) {
          if ((vaultEffect || isCone || excludeFriendlyAoE) && isFriendlyUnit(actorCu, splashCu)) {
            continue;
          }
          // Secondary unit contests the spellcast attack roll against their defense
          const splashDefense = resolveTargetDefense(splashCu, effectiveAbility.defenseTarget).value;

          let splashOutcome: HitOutcome = 'MISS';
          if (rollResult.totalScore >= splashDefense) {
            splashOutcome = 'SOLID_HIT';
          } else if (rollResult.totalScore >= splashDefense - COMBAT_RESOLUTION_CONFIG.grazeMargin) {
            splashOutcome = 'GRAZE';
          }

          if (splashOutcome !== 'MISS') {
            const primaryDamageEffect = effectiveAbility.effects?.find((e) => e.type === 'DAMAGE');
            const defaultSplashProfile = primaryDamageEffect?.damageProfile
              ? { count: primaryDamageEffect.damageProfile.count, sides: primaryDamageEffect.damageProfile.sides, modifierAttribute: primaryDamageEffect.damageProfile.modifierAttribute }
              : undefined;
            const splashProfile = effectiveAbility.splashDamageProfile ?? defaultSplashProfile;
            const splashEffect: AbilityEffect = {
              type: 'DAMAGE',
              damageProfile: splashProfile
            };
            const splashHasCover = hasBastionRangedCover(state, splashCu, attackOriginCoord, effectiveAbility);
            const splashDmg = resolveDamage(
              splashOutcome,
              effectiveAbility,
              actorCu,
              splashCu,
              diceRoller,
              undefined,
              splashEffect,
              { hasRangedCover: splashHasCover }
            );

            const damageType = effectiveAbility.damageType === 'PHYSICAL' ? 'PHYSICAL' : 'MAGICAL';
            if (splashDmg.damageDealt > 0) {
              events.push({
                type: 'DAMAGE',
                targetUnitId: splashCu.unit.id,
                amount: splashDmg.damageDealt,
                damageType,
                reason: 'SPLASH',
                label: splashLabel,
                sourceUnitId: actorCu.unit.id,
                isCrit: false
              });
            }
            let outcomeIndex: number | undefined;
            if (splashDmg.damageDealt > 0) {
              outcomeIndex = splashOutcomes.length;
              splashOutcomes.push({
                kind: 'COLLATERAL_HIT',
                sourceLabel: splashTitle,
                targetName: splashCu.unit.name,
                damage: splashDmg.damageDealt,
                damageType,
                hitOutcome: splashOutcome,
                defenseTarget: splashDefense,
                targetHp: Math.max(0, splashCu.currentHp - splashDmg.damageDealt),
                targetMaxHp: splashCu.unit.effectiveVitals.maxHp
              });
            }
            splashHitEntries.push({
              cu: splashCu,
              outcome: splashOutcome,
              coord: hex,
              damageDealt: splashDmg.damageDealt,
              damageType,
              defenseTarget: splashDefense,
              outcomeIndex
            });
          } else {
            splashOutcomes.push({
              kind: 'COLLATERAL_HIT',
              sourceLabel: splashTitle,
              targetName: splashCu.unit.name,
              damage: 0,
              hitOutcome: 'MISS',
              defenseTarget: splashDefense
            });
            events.push({
              type: 'MISS',
              targetUnitId: splashCu.unit.id,
              reason: 'SPLASH'
            });
          }
        }
      }
    }
  }

  // Ally Refraction Resolution (e.g. Arcanist Refractive Array)
  const refractionEffect = effectiveAbility.effects?.find((e) => e.type === 'ALLY_REFRACTION');
  if (refractionEffect && aoeHexes.length > 0) {
    const projectedHp = new Map<string, number>();
    const enemiesInBlast: CombatUnit[] = [];
    const sparedAllies: CombatUnit[] = [];
    const seenIds = new Set<string>();

    for (const hex of aoeHexes) {
      const occId = state.arena.getUnitAt(hex);
      if (!occId || seenIds.has(occId)) continue;
      seenIds.add(occId);
      const occCu = state.units.get(occId);
      if (!occCu || occCu.isDefeated || occCu.currentHp <= 0) continue;

      if (isFriendlyUnit(actorCu, occCu)) {
        if (occId !== actorCu.unit.id) {
          sparedAllies.push(occCu);
        }
      } else {
        enemiesInBlast.push(occCu);
        const priorDmg = events
          .filter((e): e is Extract<CombatEvent, { type: 'DAMAGE' }> => e.type === 'DAMAGE' && e.targetUnitId === occId)
          .reduce((sum, e) => sum + e.amount, 0);
        projectedHp.set(occId, Math.max(0, occCu.currentHp - priorDmg));
      }
    }

    const refractHitsReceived = new Map<string, number>();
    const refractProfile = refractionEffect.damageProfile ?? { count: 1, sides: 4, modifierAttribute: 'focus' as const };
    const refractDamageEffect: AbilityEffect = {
      type: 'DAMAGE',
      damageProfile: refractProfile
    };

    for (let i = 0; i < sparedAllies.length; i++) {
      const livingCandidates = enemiesInBlast.filter((e) => (projectedHp.get(e.unit.id) ?? 0) > 0);
      if (livingCandidates.length === 0) break;

      livingCandidates.sort((a, b) => {
        const hitsDiff = (refractHitsReceived.get(a.unit.id) ?? 0) - (refractHitsReceived.get(b.unit.id) ?? 0);
        if (hitsDiff !== 0) return hitsDiff;
        const hpDiff = (projectedHp.get(a.unit.id) ?? 0) - (projectedHp.get(b.unit.id) ?? 0);
        if (hpDiff !== 0) return hpDiff;
        return a.unit.id.localeCompare(b.unit.id);
      });

      const recipientCu = livingCandidates[0];
      refractHitsReceived.set(recipientCu.unit.id, (refractHitsReceived.get(recipientCu.unit.id) ?? 0) + 1);

      const refractDefense = resolveTargetDefense(recipientCu, effectiveAbility.defenseTarget).value;
      let refractOutcome: HitOutcome = 'MISS';
      if (rollResult.totalScore >= refractDefense) {
        refractOutcome = 'SOLID_HIT';
      } else if (rollResult.totalScore >= refractDefense - COMBAT_RESOLUTION_CONFIG.grazeMargin) {
        refractOutcome = 'GRAZE';
      }

      if (refractOutcome !== 'MISS') {
        const refractHasCover = hasBastionRangedCover(state, recipientCu, attackOriginCoord, effectiveAbility);
        const refractDmg = resolveDamage(
          refractOutcome,
          effectiveAbility,
          actorCu,
          recipientCu,
          diceRoller,
          undefined,
          refractDamageEffect,
          { hasRangedCover: refractHasCover }
        );
        const nextHp = Math.max(0, (projectedHp.get(recipientCu.unit.id) ?? recipientCu.currentHp) - refractDmg.damageDealt);
        projectedHp.set(recipientCu.unit.id, nextHp);
        const damageType = effectiveAbility.damageType === 'PHYSICAL' ? 'PHYSICAL' : 'MAGICAL';
        if (refractDmg.damageDealt > 0) {
          events.push({
            type: 'DAMAGE',
            targetUnitId: recipientCu.unit.id,
            amount: refractDmg.damageDealt,
            damageType,
            reason: 'SPLASH',
            label: 'REFRACT',
            sourceUnitId: actorCu.unit.id,
            isCrit: false
          });
        }
        splashOutcomes.push({
          kind: 'COLLATERAL_HIT',
          sourceLabel: 'Refract',
          targetName: recipientCu.unit.name,
          damage: refractDmg.damageDealt,
          damageType,
          hitOutcome: refractOutcome,
          defenseTarget: refractDefense,
          targetHp: nextHp,
          targetMaxHp: recipientCu.unit.effectiveVitals.maxHp
        });
      } else {
        splashOutcomes.push({
          kind: 'COLLATERAL_HIT',
          sourceLabel: 'Refract',
          targetName: recipientCu.unit.name,
          damage: 0,
          hitOutcome: 'MISS',
          defenseTarget: refractDefense
        });
        events.push({
          type: 'MISS',
          targetUnitId: recipientCu.unit.id,
          reason: 'SPLASH'
        });
      }
    }
  }

  // Distributive Proof Resolution (Isolated -> EXPOSED on Hit/Crit; Clustered -> 1d4 adjacent splash)
  if (distributiveEffect && targetCu && targetCoord) {
    if (
      distributiveMode === 'ISOLATED' &&
      (rollResult.hitOutcome === 'SOLID_HIT' || rollResult.hitOutcome === 'CRITICAL_HIT')
    ) {
      const condType = distributiveEffect.conditionType ?? 'EXPOSED';
      const dur = distributiveEffect.durationTurns ?? 1;
      const condRes = applyConditionToUnit(targetCu, condType, dur, actorCu.unit.id);
      events.push(condRes.event);
      splashOutcomes.push({
        kind: 'CONDITION',
        condition: condType,
        durationTurns: condRes.condition.durationTurns
      });
    } else if (distributiveMode === 'CLUSTERED') {
      const distProfile = distributiveEffect.damageProfile ?? { count: 1, sides: 4 };
      const distDamageEffect: AbilityEffect = {
        type: 'DAMAGE',
        damageProfile: distProfile
      };
      for (const neighbor of getHexNeighbors(targetCoord)) {
        const adjId = state.arena.getUnitAt(neighbor);
        if (!adjId || adjId === actorCu.unit.id || adjId === targetCu.unit.id) continue;
        const adjCu = state.units.get(adjId);
        if (!adjCu || adjCu.isDefeated || adjCu.currentHp <= 0) continue;
        if (excludeFriendlyAoE && isFriendlyUnit(actorCu, adjCu)) continue;

        const adjDefense = resolveTargetDefense(adjCu, effectiveAbility.defenseTarget).value;
        let adjOutcome: HitOutcome = 'MISS';
        if (rollResult.totalScore >= adjDefense) {
          adjOutcome = 'SOLID_HIT';
        } else if (rollResult.totalScore >= adjDefense - COMBAT_RESOLUTION_CONFIG.grazeMargin) {
          adjOutcome = 'GRAZE';
        }

        if (adjOutcome !== 'MISS') {
          const adjHasCover = hasBastionRangedCover(state, adjCu, attackOriginCoord, effectiveAbility);
          const adjDmg = resolveDamage(
            adjOutcome,
            effectiveAbility,
            actorCu,
            adjCu,
            diceRoller,
            undefined,
            distDamageEffect,
            { hasRangedCover: adjHasCover }
          );
          const damageType = effectiveAbility.damageType === 'PHYSICAL' ? 'PHYSICAL' : 'MAGICAL';
          if (adjDmg.damageDealt > 0) {
            events.push({
              type: 'DAMAGE',
              targetUnitId: adjCu.unit.id,
              amount: adjDmg.damageDealt,
              damageType,
              reason: 'SPLASH',
              label: 'DISTRIBUTE',
              sourceUnitId: actorCu.unit.id,
              isCrit: false
            });
          }
          splashOutcomes.push({
            kind: 'COLLATERAL_HIT',
            sourceLabel: 'Distribute',
            targetName: adjCu.unit.name,
            damage: adjDmg.damageDealt,
            damageType,
            hitOutcome: adjOutcome,
            defenseTarget: adjDefense,
            targetHp: Math.max(0, adjCu.currentHp - adjDmg.damageDealt),
            targetMaxHp: adjCu.unit.effectiveVitals.maxHp
          });
        } else {
          splashOutcomes.push({
            kind: 'COLLATERAL_HIT',
            sourceLabel: 'Distribute',
            targetName: adjCu.unit.name,
            damage: 0,
            hitOutcome: 'MISS',
            defenseTarget: adjDefense
          });
          events.push({
            type: 'MISS',
            targetUnitId: adjCu.unit.id,
            reason: 'SPLASH'
          });
        }
      }
    }
  }

  // Commit primary, splash, refraction, and distributive damage/status events once before ON_RESOLVE infusions
  // so units defeated by damage are removed from the arena before subsequent knockbacks calculate occupancy.
  if (events.length > appliedEventsCursor) {
    applyCombatEvents(state, events.slice(appliedEventsCursor), { claimed: true });
    appliedEventsCursor = events.length;
  }

  const commitEvents = (batch: readonly CombatEvent[]): void => {
    if (batch.length === 0) return;
    events.push(...batch);
    applyCombatEvents(state, batch, { claimed: true });
    appliedEventsCursor = events.length;
  };

  // Dispatch ON_RESOLVE effects via pluggable registry:
  // 1) Target-scoped ON_RESOLVE effects execute per hit target sequentially (center + living AoE/Cone splash targets)
  // 2) Self-scoped ON_RESOLVE effects execute at most once per action based on best hit outcome
  const isTargetOnResolveEffect = (e: AbilityEffect): boolean =>
    getEffectTiming(e) === 'ON_RESOLVE' &&
    isDispatchableEffect(e) &&
    !isSelfScopedEffect(e);

  const primaryEffectOutcomes: EffectOutcome[] = [];
  let knockbackResult: any = undefined;
  let wallSlamDamage: number | undefined = undefined;
  let fallDamage: number | undefined = undefined;

  if (targetCu) {
    const primaryRes = executeAbilityEffects(
      effectiveAbility,
      {
        state,
        actorCu,
        targetCu,
        targetCoord,
        ability: effectiveAbility,
        hitOutcome: rollResult.hitOutcome,
        diceRoller
      },
      defaultEffectRegistry,
      (e) =>
        isTargetOnResolveEffect(e) &&
        (!targetCu.isDefeated || isPrimaryTargetOnlyEffect(e))
    );
    commitEvents(primaryRes.events);
    knockbackResult = primaryRes.knockbackResult;
    wallSlamDamage = primaryRes.wallSlamDamage;
    fallDamage = primaryRes.fallDamage;
    if (primaryRes.effects) {
      primaryEffectOutcomes.push(...primaryRes.effects);
    }
  }

  for (const entry of splashHitEntries) {
    if (entry.cu.isDefeated) {
      continue;
    }
    const splashRes = executeAbilityEffects(
      effectiveAbility,
      {
        state,
        actorCu,
        targetCu: entry.cu,
        targetCoord: entry.coord,
        ability: effectiveAbility,
        hitOutcome: entry.outcome,
        diceRoller
      },
      defaultEffectRegistry,
      (e) => isTargetOnResolveEffect(e) && !isPrimaryTargetOnlyEffect(e)
    );
    commitEvents(splashRes.events);

    const entryConditions: {
      readonly condition: ConditionType;
      readonly durationTurns: number;
      readonly damagePerTurn?: number;
    }[] = [];
    for (const outcome of splashRes.effects ?? []) {
      if (outcome.kind === 'CONDITION') {
        entryConditions.push({
          condition: outcome.condition,
          durationTurns: outcome.durationTurns,
          ...(outcome.damagePerTurn !== undefined ? { damagePerTurn: outcome.damagePerTurn } : {})
        });
      } else if (!(outcome.kind === 'CONTEXT' && outcome.context === 'GRAZE_NEGATED')) {
        primaryEffectOutcomes.push(outcome);
      }
    }

    if (entryConditions.length > 0) {
      if (entry.outcomeIndex !== undefined) {
        const existing = splashOutcomes[entry.outcomeIndex];
        if (existing && existing.kind === 'COLLATERAL_HIT') {
          splashOutcomes[entry.outcomeIndex] = {
            ...existing,
            conditions: [...(existing.conditions ?? []), ...entryConditions]
          };
        }
      } else {
        splashOutcomes.push({
          kind: 'COLLATERAL_HIT',
          sourceLabel: splashTitle,
          targetName: entry.cu.unit.name,
          damage: entry.damageDealt,
          damageType: entry.damageType,
          hitOutcome: entry.outcome,
          defenseTarget: entry.defenseTarget,
          targetHp: entry.cu.currentHp,
          targetMaxHp: entry.cu.unit.effectiveVitals.maxHp,
          conditions: entryConditions
        });
      }
    }
  }

  const allTargetOutcomes: HitOutcome[] = [
    ...(targetCu ? [rollResult.hitOutcome] : []),
    ...splashHitEntries.map((s) => s.outcome)
  ];
  const bestHitOutcome = pickBestHitOutcome(allTargetOutcomes);

  const selfOnResolveRes = executeAbilityEffects(
    effectiveAbility,
    {
      state,
      actorCu,
      targetCu: actorCu,
      targetCoord,
      ability: effectiveAbility,
      hitOutcome: bestHitOutcome,
      diceRoller
    },
    defaultEffectRegistry,
    (e) =>
      getEffectTiming(e) === 'ON_RESOLVE' &&
      isDispatchableEffect(e) &&
      isSelfScopedEffect(e)
  );
  commitEvents(selfOnResolveRes.events);
  if (selfOnResolveRes.effects) {
    primaryEffectOutcomes.push(...selfOnResolveRes.effects);
  }

  // Trigger ON_HIT passives (e.g. Soul Carapace) on successful hits
  if (targetCu && rollResult.hitOutcome !== 'MISS') {
    const hitEvents = triggerPassiveHook(state, actorCu, 'ON_HIT', {
      targetCu,
      ability: effectiveAbility,
      diceRoller,
      hitOutcome: rollResult.hitOutcome
    });
    commitEvents(hitEvents);
  }

  // Trigger ON_CRIT passives (e.g. Wild Surge) on critical hits
  if (targetCu && rollResult.hitOutcome === 'CRITICAL_HIT') {
    const critEvents = triggerPassiveHook(state, actorCu, 'ON_CRIT', {
      targetCu,
      ability: effectiveAbility,
      diceRoller,
      hitOutcome: rollResult.hitOutcome
    });
    commitEvents(critEvents);
  }

  // When a unit is hit with an attack, their facing direction updates to face the attack (or away if FORCE_FACING_AWAY)
  if (
    targetCu &&
    rollResult.hitOutcome !== 'MISS' &&
    !targetCu.isDefeated &&
    (effectiveAbility.damageType !== 'NONE' || rollResult.hitOutcome !== 'GRAZE')
  ) {
    const finalTargetPos = state.arena.getUnitPosition(targetCu.unit.id);
    if (finalTargetPos && attackOriginCoord && !hexEquals(finalTargetPos, attackOriginCoord)) {
      const dirToOrigin = getDirectionBetween(finalTargetPos, attackOriginCoord);
      const forcesFacingAway = effectiveAbility.effects?.some((e) => e.type === 'FORCE_FACING_AWAY');
      targetCu.facing = forcesFacingAway
        ? (((dirToOrigin + 3) % 6) as any)
        : dirToOrigin;
    }
  }

  // Also turn any living secondary splash damage targets to face the attack origin
  for (const event of events) {
    if (
      event.type === 'DAMAGE' &&
      event.reason !== 'PASSIVE' &&
      (!targetCu || event.targetUnitId !== targetCu.unit.id)
    ) {
      const secondaryCu = state.units.get(event.targetUnitId);
      if (secondaryCu && !secondaryCu.isDefeated) {
        const secPos = state.arena.getUnitPosition(secondaryCu.unit.id);
        if (secPos && attackOriginCoord && !hexEquals(secPos, attackOriginCoord)) {
          secondaryCu.facing = getDirectionBetween(secPos, attackOriginCoord);
        }
      }
    }
  }

  // Collect all unit IDs targeted or struck during this attack
  const targetedUnitIds: string[] = [];
  if (targetCu) {
    targetedUnitIds.push(targetCu.unit.id);
  }
  for (const event of events) {
    if (event.type === 'DAMAGE' && !targetedUnitIds.includes(event.targetUnitId)) {
      targetedUnitIds.push(event.targetUnitId);
    }
  }

  // Delegate post-action condition updates (e.g. attacking from stealth breaks stealth, defying challenge inflicts exposed)
  const conditionsToRemove = new Set<ActiveCondition>();
  const conditionsToApply: {
    targetUnitId: string;
    conditionType: ConditionType;
    durationTurns: number;
    sourceUnitId?: string;
  }[] = [];

  for (const c of actorCu.activeConditions) {
    const def = getConditionDefinition(c.type);
    if (def?.onAfterAction) {
      const outcome = def.onAfterAction(c, actorCu, {
        type: 'ATTACK',
        ability,
        target: targetCu,
        targetedUnitIds
      });
      if (outcome?.applyConditions) {
        conditionsToApply.push(...outcome.applyConditions);
      }
      if (outcome?.removeCondition) {
        conditionsToRemove.add(c);
      }
    }
  }

  if (conditionsToRemove.size > 0) {
    actorCu.activeConditions = actorCu.activeConditions.filter((c) => !conditionsToRemove.has(c));
  }

  // Execute POST_ACTION effects after onAfterAction cleanup (e.g. Shadow Shard grants Stealth after attack)
  const postActionRes = runPostActionPhase(state, {
    state,
    actorCu,
    targetCu,
    targetCoord,
    ability: effectiveAbility,
    hitOutcome: bestHitOutcome,
    diceRoller
  });
  events.push(...postActionRes.events);
  primaryEffectOutcomes.push(...postActionRes.effects);

  // Evaluate encounter outcome
  state.outcome = evaluateEncounterOutcome(state.objectives, state);

  // Combat Log
  const contextOutcomes: EffectOutcome[] = [];
  if (elevMod.description) {
    const netElev = elevMod.rollBonus - elevMod.rollPenalty;
    const isHighGround = netElev > 0 || elevMod.grantsAdvantage;
    contextOutcomes.push({
      kind: 'CONTEXT',
      context: 'ELEVATION',
      label: isHighGround
        ? `High Ground${elevMod.rollBonus > 0 ? ` +${elevMod.rollBonus}` : ''}`
        : `Low Ground${elevMod.rollPenalty > 0 ? ` -${elevMod.rollPenalty}` : ''}`,
      detail: elevMod.description
    });
  }
  if (auraEval.attackRollPenalty > 0) {
    contextOutcomes.push({
      kind: 'CONTEXT',
      context: 'AURA_PENALTY',
      label: `Aura -${auraEval.attackRollPenalty}`,
      detail: auraEval.sourceAuraNames.join(', ')
    });
  }

  const secondaryOutcomes: EffectOutcome[] = [
    ...primaryEffectOutcomes,
    ...splashOutcomes
  ];
  const attackEffects: EffectOutcome[] = [...contextOutcomes, ...secondaryOutcomes];
  const secondaryText = formatEffectOutcomes(secondaryOutcomes);
  const auraDetail = auraEval.attackRollPenalty > 0 ? ` [Aura Penalty: -${auraEval.attackRollPenalty} (${auraEval.sourceAuraNames.join(', ')})]` : '';
  const elevDetail = elevMod.description ? ` [Elevation: ${elevMod.description}]` : '';
  const damageDetail = targetCu && effectiveAbility.damageType !== 'NONE' ? ` [Damage: ${damageResult.damageBreakdown}]` : '';

  const targetDesc = targetCu ? targetCu.unit.name : `hex (${targetCoord?.q ?? 0}, ${targetCoord?.r ?? 0})`;
  const dcClause = targetCu ? ` vs DC ${rollResult.targetDefense} -> ${rollResult.hitOutcome}` : ` -> score ${rollResult.totalScore}`;
  const hpClause = targetCu ? ` (HP: ${targetCu.currentHp}/${targetCu.unit.effectiveVitals.maxHp})` : '';

  const totalDamageEvents = events.filter(
    (e): e is Extract<CombatEvent, { type: 'DAMAGE' }> =>
      e.type === 'DAMAGE' && e.reason !== 'PASSIVE'
  );
  const totalDamageDealt = totalDamageEvents.reduce((acc, d) => acc + d.amount, 0);

  const d20ModFormatted = rollResult.modifier >= 0
    ? `+ ${rollResult.modifier}`
    : `- ${Math.abs(rollResult.modifier)}`;
  const d20Formatted = `${rollResult.d20} ${d20ModFormatted}`;

  const logMessage = targetCu
    ? `${actorCu.unit.name} used ${ability.name} on ${targetDesc}: [d20: ${d20Formatted}${dcClause}]${elevDetail}${auraDetail}${damageDetail}${hpClause}${secondaryText ? ` ${secondaryText}` : ''}`
    : `${actorCu.unit.name} cast ${ability.name} at ${targetDesc}: [Spellcast roll: ${d20Formatted}${dcClause}]${elevDetail}${auraDetail}${secondaryText ? ` ${secondaryText}` : ''}`;

  combatLogger.logAttack(state, {
    actorCu,
    ability,
    targetCu,
    targetDesc,
    rollResult,
    damageTotal: String(totalDamageDealt),
    damageBreakdown: targetCu ? (damageResult.damageBreakdown || undefined) : undefined,
    damageBreakdownComponents: targetCu ? damageResult.damageBreakdownComponents : undefined,
    effects: attackEffects.length > 0 ? attackEffects : undefined,
    isAreaTarget: !targetCu,
    affectedUnitIds: targetedUnitIds,
    message: logMessage
  });

  // Post-action condition triggers (logged after attack so cause precedes effect)
  for (const toApply of conditionsToApply) {
    const unitToApply = state.units.get(toApply.targetUnitId);
    if (unitToApply && !unitToApply.isDefeated) {
      const { event } = applyConditionToUnit(
        unitToApply,
        toApply.conditionType,
        toApply.durationTurns,
        toApply.sourceUnitId ?? actorCu.unit.id
      );
      events.push(event);
      combatLogger.logConditionBroken(state, {
        cu: unitToApply,
        condition: 'CHALLENGED',
        reason: 'defied',
        actionId: 'condition_applied',
        text: `${unitToApply.unit.name} defied the challenge and became EXPOSED!`,
        message: `${unitToApply.unit.name} defied the challenge and became EXPOSED!`
      });
    }
  }

  const finalHitOutcome = targetCu ? rollResult.hitOutcome : (totalDamageDealt > 0 ? 'SOLID_HIT' : 'MISS');
  const diceBreakdown: DiceRollBreakdown = {
    d20Rolls: rollResult.rawD20Rolls ?? [rollResult.d20],
    keptD20: rollResult.d20,
    advantage: rollResult.advantage ?? 'NORMAL',
    netModifier: rollResult.modifier,
    totalScore: rollResult.totalScore,
    targetDefense: rollResult.targetDefense,
    defenseType: rollResult.defenseType ?? (effectiveAbility.defenseTarget === 'RESOLVE' ? 'Resolve' : 'Evasion'),
    hitOutcome: finalHitOutcome,
    damageDice: damageResult.damageDice ?? [],
    damageModifier: damageResult.damageModifier ?? 0,
    totalDamage: totalDamageDealt,
    mitigation: damageResult.mitigation,
    mitigationType: damageResult.mitigationType ?? (effectiveAbility.damageType === 'MAGICAL' ? 'Ward' : 'Armor'),
    critMaxBonus: damageResult.critMaxBonus,
    modifierBreakdown: rollResult.modifierBreakdown,
    damageBreakdownComponents: damageResult.damageBreakdownComponents
  };

  const resolution: AbilityResolution = {
    type: 'ATTACK',
    details: {
      hitOutcome: finalHitOutcome,
      d20Roll: rollResult.d20,
      modifier: rollResult.modifier,
      totalAttackScore: rollResult.totalScore,
      defenseTargetScore: rollResult.targetDefense,
      rawDamage: damageResult.rawDamage,
      mitigation: damageResult.mitigation,
      damageDealt: totalDamageDealt,
      damageBreakdown: damageResult.damageBreakdown,
      effectsApplied: effectiveAbility.effects,
      knockbackResult,
      wallSlamDamage,
      fallDamage,
      events,
      diceBreakdown
    }
  };

  // Consume actor's virtual elevation after completing attack resolution
  if (actorCu.virtualElevation) {
    actorCu.virtualElevation = undefined;
  }

  return resolution;
}

