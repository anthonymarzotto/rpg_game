import {
  CombatState,
  CombatLogEntry,
  CombatUnit,
  HitOutcome,
  AttackModifierComponent
} from './types';
import { Faction } from '../types/unit';
import { HexCoord } from '../grid/hex';
import { Ability } from '../types/ability';

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
  readonly secondaryDetail?: string;
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
  readonly effectDetail?: string;
  readonly message?: string;
}

export interface LogUtilityParams {
  readonly actorCu: CombatUnit;
  readonly ability: Ability | { readonly id: string; readonly name: string };
  readonly targetCu?: CombatUnit;
  readonly effectDetail?: string;
  readonly damageTotal?: string;
  readonly targetHp?: number;
  readonly targetMaxHp?: number;
  readonly secondaryDetail?: string;
  readonly affectedUnitIds?: readonly string[];
  readonly message?: string;
}

export interface LogPassiveParams {
  readonly cu: CombatUnit;
  readonly passiveName: string;
  readonly passiveId?: string;
  readonly effectDetail: string;
  readonly affectedUnitIds?: readonly string[];
  readonly message?: string;
}

export interface LogEnvironmentParams {
  readonly cu: CombatUnit;
  readonly hazardName: string;
  readonly damage?: number;
  readonly effectDetail?: string;
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
      secondaryDetail = '',
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

    const autoMessage = `${actorCu.unit.name} used ${ability.name} on ${defaultTargetDesc}: ${rollClause}${dmgClause}${hpClause}${secondaryDetail ? ` ${secondaryDetail}` : ''}`.trim();

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
        secondaryDetail: secondaryDetail.trim() || undefined,
        isAreaTarget,
        totalScore: rollResult?.totalScore,
        attackRollBreakdown: rollResult?.modifierBreakdown
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
    const { actorCu, ability, targetCu, effectDetail = '' } = params;
    const faction = actorCu.unit.faction ?? 'PLAYER';
    const allAffected = Array.from(
      new Set([actorCu.unit.id, ...(targetCu ? [targetCu.unit.id] : [])])
    );
    const targetName = targetCu ? targetCu.unit.name : actorCu.unit.name;
    const message =
      params.message ??
      `${actorCu.unit.name} activated ${ability.name}${targetCu && targetCu.unit.id !== actorCu.unit.id ? ` on ${targetName}` : ''}${effectDetail ? `: ${effectDetail}` : ''}`;

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
        effectDetail
      }
    };

    return pushLogEntry(state, entry);
  },

  logUtility(state: CombatState, params: LogUtilityParams): CombatLogEntry {
    const {
      actorCu,
      ability,
      targetCu,
      effectDetail = '',
      damageTotal,
      targetHp,
      targetMaxHp,
      secondaryDetail,
      affectedUnitIds = []
    } = params;
    const faction = actorCu.unit.faction ?? 'PLAYER';
    const allAffected = Array.from(
      new Set([actorCu.unit.id, ...(targetCu ? [targetCu.unit.id] : []), ...affectedUnitIds])
    );
    const targetName = targetCu ? targetCu.unit.name : '';
    const message =
      params.message ??
      `${actorCu.unit.name} used ${ability.name}${targetName ? ` on ${targetName}` : ''}${effectDetail ? `: ${effectDetail}` : ''}`;

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
        effectDetail,
        damageTotal,
        targetHp: targetHp ?? targetCu?.currentHp,
        targetMaxHp: targetMaxHp ?? targetCu?.unit.effectiveVitals.maxHp,
        secondaryDetail
      }
    };

    return pushLogEntry(state, entry);
  },

  logPassive(state: CombatState, params: LogPassiveParams): CombatLogEntry {
    const { cu, passiveName, passiveId, effectDetail, affectedUnitIds = [] } = params;
    const faction = cu.unit.faction ?? 'PLAYER';
    const allAffected = Array.from(new Set([cu.unit.id, ...affectedUnitIds]));
    const message =
      params.message ?? `${cu.unit.name}'s ${passiveName} triggered: ${effectDetail}`;

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
        effectDetail
      }
    };

    return pushLogEntry(state, entry);
  },

  logEnvironment(state: CombatState, params: LogEnvironmentParams): CombatLogEntry {
    const { cu, hazardName, damage, effectDetail } = params;
    const faction = cu.unit.faction ?? 'PLAYER';
    const dmgClause = damage !== undefined ? ` and suffered ${damage} damage` : '';
    const detailClause = effectDetail ? ` (${effectDetail})` : '';
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
        effectDetail,
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
