import {
  CombatState,
  CombatLogEntry,
  CombatUnit,
  HitOutcome,
  AttackModifierComponent,
  DamageBreakdownComponent,
  EffectOutcome
} from './types';
import { Faction } from '../types/unit';
import { HexCoord } from '../grid/hex';
import { Ability } from '../types/ability';

/**
 * Formats a single semantic EffectOutcome into a concise plain-text clause
 * for CombatLogEntry.message and Markdown diagnostic exports.
 */
export function formatEffectOutcome(outcome: EffectOutcome): string {
  switch (outcome.kind) {
    case 'CONDITION': {
      switch (outcome.condition) {
        case 'POISON':
          return `[Poisoned: ${outcome.damagePerTurn ?? 2} dmg/turn for ${outcome.durationTurns} turns]`;
        case 'BURN':
          return `[Burned: ${outcome.damagePerTurn ?? 2} dmg/turn for ${outcome.durationTurns} turns]`;
        case 'CHALLENGED':
          return `[Challenged by ${outcome.sourceName ?? 'challenger'} for ${outcome.durationTurns} turns]`;
        case 'STEALTH':
          return `[Stealthed for ${outcome.durationTurns} turn(s)]`;
        case 'EXPOSED':
          return `[Exposed for ${outcome.durationTurns} turn(s)]`;
        case 'TELEMETRY':
          return `[Telemetry Lock for ${outcome.durationTurns} turn(s)]`;
        case 'CHARMED':
          return `[Charmed by ${outcome.sourceName ?? 'charmer'} for ${outcome.durationTurns} turn(s)]`;
        case 'BLINDED':
          return `[Blinded for ${outcome.durationTurns} turn(s)]`;
      }
      break;
    }
    case 'FORCED_FACING':
      return `[Forced facing ${outcome.direction === 'TOWARDS' ? 'towards' : 'away from'} ${outcome.originName}]`;
    case 'DISPLACEMENT': {
      if (outcome.resisted) {
        if (outcome.displacement === 'SWAP') {
          return `[${outcome.targetName ? `${outcome.targetName} is immune to displacement!` : 'Resisted Swap'}]`;
        }
        return `[Resisted ${outcome.displacement === 'KNOCKBACK' ? 'Knockback' : outcome.displacement === 'PULL' ? 'Pull' : outcome.displacement}]`;
      }
      const coordText = outcome.toCoord ? `(${outcome.toCoord.q}, ${outcome.toCoord.r})` : '';
      switch (outcome.displacement) {
        case 'KNOCKBACK':
          return `[Knockback: Pushed to ${coordText}]`;
        case 'PULL':
          return `[Pull: Pulled to ${coordText}]`;
        case 'RETREAT':
          return `[Retreat Step to ${coordText}]`;
        case 'CHARGE':
          return `[${outcome.label ?? 'Charge'} to ${coordText}]`;
        case 'TELEPORT':
          return `[${outcome.label ?? 'Teleport'} to ${coordText}]`;
        case 'SWAP':
          return `[Swapped positions with ${outcome.targetName ?? 'target'}]`;
      }
      break;
    }
    case 'COLLISION': {
      if (outcome.collisionType === 'UNIT') {
        const bystander = outcome.bystanderName ?? 'another unit';
        const hpSuffix =
          outcome.bystanderHp !== undefined && outcome.bystanderMaxHp !== undefined
            ? ` (HP: ${outcome.bystanderHp}/${outcome.bystanderMaxHp})`
            : '';
        return `[Knockback Collision: Slammed into ${bystander}! Target took +${outcome.damage} collision damage. ${bystander} took +${outcome.collateralDamage ?? 0} collateral damage${hpSuffix}.]`;
      }
      const obsType =
        outcome.collisionType === 'WALL'
          ? 'Obstacle'
          : outcome.collisionType === 'CLIFF'
          ? 'Cliff'
          : 'Map Boundary';
      if (!outcome.negated && outcome.damage > 0) {
        return `[Knockback Collision: Slammed into ${obsType}! Took +${outcome.damage} collision damage.]`;
      }
      return `[Knockback Collision: Stopped against ${obsType}! Collision Damage Negated.]`;
    }
    case 'FALL':
      return outcome.negated || outcome.damage <= 0
        ? `[Plunged from ledge: Fall Damage Negated!]`
        : `[Plunged from ledge: Took +${outcome.damage} Fall Impact Damage!]`;
    case 'MODIFIER': {
      const parts = outcome.entries.map((entry) => {
        const valText =
          typeof entry.value === 'number' && entry.value > 0 ? `+${entry.value}` : String(entry.value);
        return `${valText} ${entry.stat}`;
      });
      const detailParts = [
        parts.length > 0 ? parts.join(', ') : undefined,
        outcome.durationTurns !== undefined ? `for ${outcome.durationTurns} turn(s)` : undefined,
        outcome.note
      ].filter(Boolean);
      return `[${outcome.label}${detailParts.length > 0 ? `: ${detailParts.join(' ')}` : ''}]`;
    }
    case 'INITIATIVE':
      return outcome.direction === 'BOOST'
        ? `[Initiative Boost: +${outcome.amount} CTB Gauge]`
        : `[CTB Delay: -${outcome.amount} Initiative]`;
    case 'COLLATERAL_HIT': {
      if (outcome.hitOutcome === 'MISS') {
        const dcText = outcome.defenseTarget !== undefined ? ` [Miss vs DC ${outcome.defenseTarget}]` : '';
        return `[${outcome.sourceLabel}: ${outcome.targetName} resisted${dcText}]`;
      }
      const dmgTypeLabel = outcome.damageType ? ` ${outcome.damageType.toLowerCase()} damage` : ' collateral damage';
      const dcClause =
        outcome.defenseTarget !== undefined
          ? ` [${outcome.hitOutcome === 'GRAZE' ? 'Graze ' : ''}vs DC ${outcome.defenseTarget}]`
          : '';
      const hpClause =
        outcome.targetHp !== undefined && outcome.targetMaxHp !== undefined
          ? ` (HP: ${outcome.targetHp}/${outcome.targetMaxHp})`
          : '';
      const condNotes = (outcome.conditions ?? []).map((c) => {
        const name = c.condition.charAt(0) + c.condition.slice(1).toLowerCase();
        return c.damagePerTurn !== undefined
          ? `${name} (${c.damagePerTurn} dmg/turn, ${c.durationTurns}t)`
          : `${name} (${c.durationTurns}t)`;
      });
      const condSuffix = condNotes.length > 0 ? ` + ${condNotes.join(', ')}` : '';
      return `[${outcome.sourceLabel} hit ${outcome.targetName} for ${outcome.damage}${dmgTypeLabel}${dcClause}${hpClause}${condSuffix}]`;
    }
    case 'CONTEXT':
      if (outcome.context === 'GRAZE_NEGATED') {
        return '(Secondary effect negated on Graze)';
      }
      return `[${outcome.label}${outcome.detail ? `: ${outcome.detail}` : ''}]`;
  }
}

/**
 * Formats an array of EffectOutcome entries into a single space-delimited summary string.
 */
export function formatEffectOutcomes(effects?: readonly EffectOutcome[]): string {
  if (!effects || effects.length === 0) return '';
  return effects.map(formatEffectOutcome).filter(Boolean).join(' ');
}

export interface LogAttackParams {
  readonly actorCu: CombatUnit;
  readonly ability: Ability | { readonly id: string; readonly name: string };
  readonly targetCu?: CombatUnit;
  readonly targetDesc?: string;
  readonly rollResult?: {
    readonly d20: number;
    readonly modifier: number;
    readonly hitOutcome: HitOutcome;
    readonly targetDefense?: number;
    readonly totalScore?: number;
    readonly modifierBreakdown?: readonly AttackModifierComponent[];
  };
  readonly damageTotal?: number | string;
  readonly damageBreakdown?: string;
  readonly damageBreakdownComponents?: readonly DamageBreakdownComponent[];
  readonly effects?: readonly EffectOutcome[];
  readonly isAreaTarget?: boolean;
  readonly affectedUnitIds?: readonly string[];
  readonly message?: string;
}

export interface LogMoveParams {
  readonly cu: CombatUnit;
  readonly destination: HexCoord;
  readonly remainingAp: number;
  readonly actionId?: string;
  readonly message?: string;
}

export interface LogBuffParams {
  readonly actorCu: CombatUnit;
  readonly ability: Ability | { readonly id: string; readonly name: string };
  readonly targetCu?: CombatUnit;
  readonly effects?: readonly EffectOutcome[];
  readonly message?: string;
}

export interface LogUtilityParams {
  readonly actorCu: CombatUnit;
  readonly ability: Ability | { readonly id: string; readonly name: string };
  readonly targetCu?: CombatUnit;
  readonly damageTotal?: string;
  readonly targetHp?: number;
  readonly targetMaxHp?: number;
  readonly effects?: readonly EffectOutcome[];
  readonly affectedUnitIds?: readonly string[];
  readonly message?: string;
}

export interface LogPassiveParams {
  readonly cu: CombatUnit;
  readonly passiveName: string;
  readonly passiveId?: string;
  readonly effects?: readonly EffectOutcome[];
  readonly affectedUnitIds?: readonly string[];
  readonly message?: string;
}

export interface LogEnvironmentParams {
  readonly cu: CombatUnit;
  readonly hazardName: string;
  readonly damage?: number;
  readonly detail?: string;
  readonly message?: string;
}

export interface LogConditionBrokenParams {
  readonly cu: CombatUnit;
  readonly condition: string;
  readonly reason?: string;
  readonly text?: string;
  readonly actionId?: string;
  readonly message?: string;
}

export interface LogDotParams {
  readonly cu: CombatUnit;
  readonly condition: string;
  readonly damage: number;
  readonly targetHp?: number;
  readonly text?: string;
  readonly message?: string;
}

export interface InitiativeRollItem {
  readonly unitName: string;
  readonly unitId?: string;
  readonly roll: number;
  readonly isPlayer: boolean;
  readonly faction?: Faction;
}

export interface LogInitiativeParams {
  readonly rolls: readonly InitiativeRollItem[];
  readonly message?: string;
}

export interface LogDefeatParams {
  readonly cu: CombatUnit;
  readonly condition?: string;
  readonly cause?: string;
  readonly actionId?: string;
  readonly message?: string;
}

export interface LogZoneOfControlParams {
  readonly haltedCu: CombatUnit;
  readonly guardianCu: CombatUnit;
  readonly abilityName?: string;
  readonly actionId?: string;
  readonly message?: string;
}

export interface LogGenericParams {
  readonly actorUnitId?: string;
  readonly faction?: Faction;
  readonly actorName?: string;
  readonly actionId?: string;
  readonly text?: string;
  readonly message: string;
  readonly affectedUnitIds?: readonly string[];
}

/**
 * Appends a strongly-typed entry to the combat log, ensuring turnNumber, faction,
 * actorUnitId, and affectedUnitIds are consistently indexed.
 */
export function pushLogEntry(state: CombatState, entry: CombatLogEntry): CombatLogEntry {
  state.combatLog.push(entry);
  return entry;
}

/**
 * Standardized logging pipeline for combat actions, conditions, and environment events.
 */
export const combatLogger = {
  logAttack(state: CombatState, params: LogAttackParams): CombatLogEntry {
    const {
      actorCu,
      ability,
      targetCu,
      targetDesc,
      rollResult,
      damageTotal = '0',
      damageBreakdown,
      damageBreakdownComponents,
      effects,
      isAreaTarget = false,
      affectedUnitIds = []
    } = params;

    const actorFaction = actorCu.unit.faction ?? 'PLAYER';
    const allAffected = Array.from(
      new Set([actorCu.unit.id, ...(targetCu ? [targetCu.unit.id] : []), ...affectedUnitIds])
    );

    let d20Formatted: string | undefined;
    if (rollResult) {
      const modFormatted =
        rollResult.modifier >= 0 ? `+ ${rollResult.modifier}` : `- ${Math.abs(rollResult.modifier)}`;
      d20Formatted = `${rollResult.d20} ${modFormatted}`;
    }

    const defaultTargetDesc = targetCu ? targetCu.unit.name : (targetDesc ?? 'target');
    const dcClause = rollResult
      ? targetCu
        ? ` vs DC ${rollResult.targetDefense ?? 10} -> ${rollResult.hitOutcome}`
        : ` -> score ${rollResult.totalScore ?? 0}`
      : '';
    const dmgClause =
      damageBreakdown !== undefined
        ? ` [Damage: ${damageBreakdown}]`
        : Number(damageTotal) > 0
        ? ` [Damage: ${damageTotal}]`
        : '';
    const hpClause = targetCu
      ? ` (HP: ${targetCu.currentHp}/${targetCu.unit.effectiveVitals.maxHp})`
      : '';
    const rollClause = d20Formatted ? `[d20: ${d20Formatted}${dcClause}]` : '';
    const formattedEffects = formatEffectOutcomes(effects);

    const autoMessage = `${actorCu.unit.name} used ${ability.name} on ${defaultTargetDesc}: ${rollClause}${dmgClause}${hpClause}${formattedEffects ? ` ${formattedEffects}` : ''}`.trim();

    const entry: CombatLogEntry = {
      turnNumber: state.turnNumber,
      actorUnitId: actorCu.unit.id,
      faction: actorFaction,
      affectedUnitIds: allAffected,
      actionId: ability.id,
      message: params.message ?? autoMessage,
      metadata: {
        type: 'ATTACK',
        actor: actorCu.unit.name,
        ability: ability.name,
        target: defaultTargetDesc,
        d20: d20Formatted,
        defenseTarget: targetCu ? rollResult?.targetDefense : undefined,
        hitOutcome: rollResult?.hitOutcome ?? (Number(damageTotal) > 0 ? 'SOLID_HIT' : 'MISS'),
        damageTotal: String(damageTotal),
        damageBreakdown,
        targetHp: targetCu?.currentHp,
        targetMaxHp: targetCu?.unit.effectiveVitals.maxHp,
        ...(effects && effects.length > 0 ? { effects } : {}),
        isAreaTarget,
        totalScore: rollResult?.totalScore,
        attackRollBreakdown: rollResult?.modifierBreakdown,
        damageBreakdownComponents
      }
    };

    return pushLogEntry(state, entry);
  },

  logMove(state: CombatState, params: LogMoveParams): CombatLogEntry {
    const { cu, destination, remainingAp } = params;
    const faction = cu.unit.faction ?? 'PLAYER';
    const message =
      params.message ??
      `${cu.unit.name} moved to (${destination.q}, ${destination.r}). [Remaining AP: ${remainingAp}]`;

    const entry: CombatLogEntry = {
      turnNumber: state.turnNumber,
      actorUnitId: cu.unit.id,
      faction,
      affectedUnitIds: [cu.unit.id],
      actionId: params.actionId ?? 'move',
      message,
      metadata: {
        type: 'MOVE',
        actor: cu.unit.name,
        coord: { q: destination.q, r: destination.r },
        remainingAp
      }
    };

    return pushLogEntry(state, entry);
  },

  logBuff(state: CombatState, params: LogBuffParams): CombatLogEntry {
    const { actorCu, ability, targetCu, effects } = params;
    const faction = actorCu.unit.faction ?? 'PLAYER';
    const allAffected = Array.from(
      new Set([actorCu.unit.id, ...(targetCu ? [targetCu.unit.id] : [])])
    );
    const targetName = targetCu ? targetCu.unit.name : actorCu.unit.name;
    const formattedEffects = formatEffectOutcomes(effects);
    const message =
      params.message ??
      `${actorCu.unit.name} activated ${ability.name}${targetCu && targetCu.unit.id !== actorCu.unit.id ? ` on ${targetName}` : ''}${formattedEffects ? `: ${formattedEffects}` : ''}`;

    const entry: CombatLogEntry = {
      turnNumber: state.turnNumber,
      actorUnitId: actorCu.unit.id,
      faction,
      affectedUnitIds: allAffected,
      actionId: ability.id,
      message,
      metadata: {
        type: 'BUFF',
        actor: actorCu.unit.name,
        ability: ability.name,
        target: targetCu?.unit.name,
        ...(effects && effects.length > 0 ? { effects } : {})
      }
    };

    return pushLogEntry(state, entry);
  },

  logUtility(state: CombatState, params: LogUtilityParams): CombatLogEntry {
    const {
      actorCu,
      ability,
      targetCu,
      damageTotal,
      targetHp,
      targetMaxHp,
      effects,
      affectedUnitIds = []
    } = params;
    const faction = actorCu.unit.faction ?? 'PLAYER';
    const allAffected = Array.from(
      new Set([actorCu.unit.id, ...(targetCu ? [targetCu.unit.id] : []), ...affectedUnitIds])
    );
    const targetName = targetCu ? targetCu.unit.name : '';
    const formattedEffects = formatEffectOutcomes(effects);
    const message =
      params.message ??
      `${actorCu.unit.name} used ${ability.name}${targetName ? ` on ${targetName}` : ''}${formattedEffects ? `: ${formattedEffects}` : ''}`;

    const entry: CombatLogEntry = {
      turnNumber: state.turnNumber,
      actorUnitId: actorCu.unit.id,
      faction,
      affectedUnitIds: allAffected,
      actionId: ability.id,
      message,
      metadata: {
        type: 'UTILITY',
        actor: actorCu.unit.name,
        ability: ability.name,
        target: targetCu?.unit.name,
        damageTotal,
        targetHp: targetHp ?? targetCu?.currentHp,
        targetMaxHp: targetMaxHp ?? targetCu?.unit.effectiveVitals.maxHp,
        ...(effects && effects.length > 0 ? { effects } : {})
      }
    };

    return pushLogEntry(state, entry);
  },

  logPassive(state: CombatState, params: LogPassiveParams): CombatLogEntry {
    const { cu, passiveName, passiveId, effects, affectedUnitIds = [] } = params;
    const faction = cu.unit.faction ?? 'PLAYER';
    const allAffected = Array.from(new Set([cu.unit.id, ...affectedUnitIds]));
    const formattedEffects = formatEffectOutcomes(effects);
    const message =
      params.message ??
      `${cu.unit.name}'s ${passiveName} triggered${formattedEffects ? `: ${formattedEffects}` : '.'}`;

    const entry: CombatLogEntry = {
      turnNumber: state.turnNumber,
      actorUnitId: cu.unit.id,
      faction,
      affectedUnitIds: allAffected,
      actionId: passiveId ?? 'passive_trigger',
      message,
      metadata: {
        type: 'PASSIVE',
        actor: cu.unit.name,
        passiveName,
        ...(effects && effects.length > 0 ? { effects } : {})
      }
    };

    return pushLogEntry(state, entry);
  },

  logEnvironment(state: CombatState, params: LogEnvironmentParams): CombatLogEntry {
    const { cu, hazardName, damage, detail } = params;
    const faction = cu.unit.faction ?? 'PLAYER';
    const dmgClause = damage !== undefined ? ` and suffered ${damage} damage` : '';
    const detailClause = detail ? ` (${detail})` : '';
    const message =
      params.message ??
      `💥 ${cu.unit.name} triggered ${hazardName}${dmgClause}!${detailClause} (HP: ${cu.currentHp}/${cu.unit.effectiveVitals.maxHp})`;

    const entry: CombatLogEntry = {
      turnNumber: state.turnNumber,
      actorUnitId: cu.unit.id,
      faction,
      affectedUnitIds: [cu.unit.id],
      actionId: 'environment_hazard',
      message,
      metadata: {
        type: 'ENVIRONMENT',
        actor: cu.unit.name,
        hazardName,
        detail,
        damage,
        targetHp: cu.currentHp,
        targetMaxHp: cu.unit.effectiveVitals.maxHp
      }
    };

    return pushLogEntry(state, entry);
  },

  logConditionBroken(state: CombatState, params: LogConditionBrokenParams): CombatLogEntry {
    const { cu, condition, reason, text } = params;
    const faction = cu.unit.faction ?? 'PLAYER';
    const message =
      params.message ??
      text ??
      `${cu.unit.name}'s ${condition} condition broken${reason ? ` (${reason})` : ''}.`;

    const entry: CombatLogEntry = {
      turnNumber: state.turnNumber,
      actorUnitId: cu.unit.id,
      faction,
      affectedUnitIds: [cu.unit.id],
      actionId: params.actionId ?? 'condition_broken',
      message,
      metadata: {
        type: 'CONDITION_BROKEN',
        actor: cu.unit.name,
        condition,
        reason,
        text: message
      }
    };

    return pushLogEntry(state, entry);
  },

  logDot(state: CombatState, params: LogDotParams): CombatLogEntry {
    const { cu, condition, damage, targetHp, text } = params;
    const faction = cu.unit.faction ?? 'PLAYER';
    const message =
      params.message ??
      `🧪 ${cu.unit.name} took ${damage} ${condition} damage. (HP: ${targetHp ?? cu.currentHp}/${cu.unit.effectiveVitals.maxHp})`;

    const entry: CombatLogEntry = {
      turnNumber: state.turnNumber,
      actorUnitId: cu.unit.id,
      faction,
      affectedUnitIds: [cu.unit.id],
      actionId: 'dot_damage',
      message,
      metadata: {
        type: 'DOT_DAMAGE',
        actor: cu.unit.name,
        condition,
        damage,
        targetHp: targetHp ?? cu.currentHp,
        targetMaxHp: cu.unit.effectiveVitals.maxHp,
        text: text ?? `Suffered ${damage} ${condition} status damage`
      }
    };

    return pushLogEntry(state, entry);
  },

  logInitiative(state: CombatState, params: LogInitiativeParams): CombatLogEntry {
    const affected = params.rolls.map((r) => r.unitId).filter((id): id is string => Boolean(id));
    const entry: CombatLogEntry = {
      turnNumber: state.turnNumber,
      actorUnitId: affected[0] ?? '',
      faction: 'NEUTRAL',
      affectedUnitIds: affected,
      actionId: 'initiative',
      message: params.message ?? 'Opening initiative order resolved.',
      metadata: {
        type: 'INITIATIVE',
        rolls: params.rolls.map((r) => ({
          unitName: r.unitName,
          roll: r.roll,
          isPlayer: r.isPlayer
        }))
      }
    };

    return pushLogEntry(state, entry);
  },

  logDefeat(state: CombatState, params: LogDefeatParams): CombatLogEntry {
    const { cu, condition } = params;
    const faction = cu.unit.faction ?? 'PLAYER';
    const formattedCondition = condition
      ? condition.charAt(0).toUpperCase() + condition.slice(1).toLowerCase()
      : undefined;
    const cause =
      params.cause ??
      (formattedCondition
        ? `Defeated by ${formattedCondition}`
        : 'Defeated by status condition damage');
    const message =
      params.message ??
      (formattedCondition
        ? `${cu.unit.name} was defeated by ${formattedCondition}!`
        : `${cu.unit.name} was defeated by status condition damage!`);

    const entry: CombatLogEntry = {
      turnNumber: state.turnNumber,
      actorUnitId: cu.unit.id,
      faction,
      affectedUnitIds: [cu.unit.id],
      actionId: params.actionId ?? 'defeat',
      message,
      metadata: {
        type: 'DEFEATED',
        actor: cu.unit.name,
        condition,
        cause
      }
    };

    return pushLogEntry(state, entry);
  },

  logZoneOfControl(state: CombatState, params: LogZoneOfControlParams): CombatLogEntry {
    const { haltedCu, guardianCu, abilityName = 'Phalanx Front' } = params;
    const faction = haltedCu.unit.faction ?? 'PLAYER';
    const allAffected = Array.from(new Set([haltedCu.unit.id, guardianCu.unit.id]));
    const message =
      params.message ??
      `🛡️ [Zone of Control] ${haltedCu.unit.name}'s advance was halted by ${guardianCu.unit.name}'s ${abilityName}!`;

    const entry: CombatLogEntry = {
      turnNumber: state.turnNumber,
      actorUnitId: haltedCu.unit.id,
      faction,
      affectedUnitIds: allAffected,
      actionId: params.actionId ?? 'zone_of_control_halted',
      message,
      metadata: {
        type: 'ZONE_OF_CONTROL',
        actor: haltedCu.unit.name,
        guardian: guardianCu.unit.name,
        ability: abilityName
      }
    };

    return pushLogEntry(state, entry);
  },

  logGeneric(state: CombatState, params: LogGenericParams): CombatLogEntry {
    const entry: CombatLogEntry = {
      turnNumber: state.turnNumber,
      actorUnitId: params.actorUnitId ?? '',
      faction: params.faction ?? 'NEUTRAL',
      affectedUnitIds: params.affectedUnitIds ?? (params.actorUnitId ? [params.actorUnitId] : []),
      actionId: params.actionId ?? 'generic_event',
      message: params.message,
      metadata: {
        type: 'GENERIC',
        actor: params.actorName,
        text: params.text ?? params.message
      }
    };

    return pushLogEntry(state, entry);
  }
};
