import { useEffect, useRef, useState, Fragment } from 'react';
import { CombatLogEntry, AttackModifierComponent, DamageBreakdownComponent } from '../../core/combat/types';
import { Faction } from '../../core/types/unit';
import { AttackRollTooltip } from './AttackRollTooltip';
import { DamageRollTooltip, formatDamageBreakdown } from './DamageRollTooltip';

export interface CombatLogPanelProps {
  readonly logEntries: readonly CombatLogEntry[];
  readonly turnNumber: number;
  readonly combatants?: readonly { readonly id: string; readonly name: string; readonly faction?: Faction }[];
  readonly initialUnitFilter?: string;
}

type LogFilter = 'ALL' | 'COMBAT' | 'MOVE';

export type ParsedLogEntry =
  | {
      type: 'ATTACK';
      turn: number;
      actor: string;
      faction: Faction;
      isPlayer: boolean;
      actorUnitId?: string;
      affectedUnitIds?: readonly string[];
      ability: string;
      target?: string;
      d20?: string;
      defenseTarget?: number;
      hitOutcome: string;
      damageTotal: string;
      damageBreakdown?: string;
      targetHp?: number;
      targetMaxHp?: number;
      secondaryDetail: string;
      isAreaTarget?: boolean;
      totalScore?: number;
      attackRollBreakdown?: readonly AttackModifierComponent[];
      damageBreakdownComponents?: readonly DamageBreakdownComponent[];
      rawMessage: string;
    }
  | {
      type: 'MOVE';
      turn: number;
      actor: string;
      faction: Faction;
      isPlayer: boolean;
      actorUnitId?: string;
      affectedUnitIds?: readonly string[];
      coord: { q: number; r: number };
      remainingAp: number;
      rawMessage: string;
    }
  | {
      type: 'BUFF';
      turn: number;
      actor: string;
      faction: Faction;
      isPlayer: boolean;
      actorUnitId?: string;
      affectedUnitIds?: readonly string[];
      ability: string;
      target?: string;
      effectDetail: string;
      rawMessage: string;
    }
  | {
      type: 'UTILITY';
      turn: number;
      actor: string;
      faction: Faction;
      isPlayer: boolean;
      actorUnitId?: string;
      affectedUnitIds?: readonly string[];
      ability: string;
      target?: string;
      effectDetail: string;
      damageTotal?: string;
      targetHp?: number;
      targetMaxHp?: number;
      secondaryDetail?: string;
      rawMessage: string;
    }
  | {
      type: 'ENVIRONMENT';
      turn: number;
      actor: string;
      faction: Faction;
      isPlayer: boolean;
      actorUnitId?: string;
      affectedUnitIds?: readonly string[];
      hazardName: string;
      damage?: number;
      targetHp?: number;
      targetMaxHp?: number;
      effectDetail?: string;
      rawMessage: string;
    }
  | {
      type: 'INITIATIVE';
      turn: number;
      faction: Faction;
      isPlayer: boolean;
      actorUnitId?: string;
      affectedUnitIds?: readonly string[];
      rolls: readonly {
        readonly unitName: string;
        readonly roll: number;
        readonly isPlayer: boolean;
      }[];
      rawMessage: string;
    }
  | {
      type: 'FAULT';
      turn: number;
      actor: string;
      faction: Faction;
      isPlayer: boolean;
      actorUnitId?: string;
      affectedUnitIds?: readonly string[];
      actionName: string;
      reason: string;
      rawMessage: string;
    }
  | {
      type: 'PASSIVE';
      turn: number;
      actor: string;
      faction: Faction;
      isPlayer: boolean;
      actorUnitId?: string;
      affectedUnitIds?: readonly string[];
      passiveName: string;
      effectDetail: string;
      rawMessage: string;
    }
  | {
      type: 'DETECTION';
      turn: number;
      actor: string;
      faction: Faction;
      isPlayer: boolean;
      actorUnitId?: string;
      affectedUnitIds?: readonly string[];
      target: string;
      isTargetPlayer: boolean;
      isTurnStart: boolean;
      rawMessage: string;
    }
  | {
      type: 'CONDITION_BROKEN';
      turn: number;
      actor: string;
      faction: Faction;
      isPlayer: boolean;
      actorUnitId?: string;
      affectedUnitIds?: readonly string[];
      condition: string;
      reason?: string;
      rawMessage: string;
    }
  | {
      type: 'DOT_DAMAGE';
      turn: number;
      actor: string;
      faction: Faction;
      isPlayer: boolean;
      actorUnitId?: string;
      affectedUnitIds?: readonly string[];
      condition: string;
      damage: number;
      targetHp?: number;
      targetMaxHp?: number;
      rawMessage: string;
    }
  | {
      type: 'GENERIC';
      turn: number;
      actor: string;
      faction: Faction;
      isPlayer: boolean;
      actorUnitId?: string;
      affectedUnitIds?: readonly string[];
      rawMessage: string;
    };

export function formatD20Roll(d20?: string): string {
  if (!d20) return '';
  return d20
    .replace(/\+\s*-/g, ' - ')
    .replace(/(\d+)\s*\+\s*(\d+)/g, '$1 + $2')
    .replace(/(\d+)\s*-\s*(\d+)/g, '$1 - $2');
}

export function formatPassiveDetail(detail: string): string {
  if (!detail) return '';
  const match = detail.match(/^(.*?)\s*\[(?:Stat Modifier:\s*|.*?:\s*)?(.*?)\]\s*$/);
  if (match) {
    const icon = match[1]?.trim() || '✨';
    const content = match[2]?.trim();
    return `${icon} ${content}`.trim();
  }
  return detail.trim();
}

export function parseCombatLogMessage(entry: CombatLogEntry): ParsedLogEntry {
  if (!entry) {
    return {
      type: 'GENERIC',
      turn: 0,
      actor: '',
      faction: 'NEUTRAL',
      isPlayer: false,
      rawMessage: 'This action is not yet defined'
    };
  }

  const turn = entry.turnNumber ?? 0;
  const actorUnitId = entry.actorUnitId || '';
  const fallbackIsPlayer = actorUnitId.startsWith('player');
  const faction: Faction = entry.faction ?? (fallbackIsPlayer ? 'PLAYER' : 'ENEMY');
  const isPlayer = faction === 'PLAYER';
  const affectedUnitIds = entry.affectedUnitIds ?? (actorUnitId ? [actorUnitId] : []);
  const msg = entry.message || '';
  const meta = entry.metadata;

  if (meta?.type === 'ENVIRONMENT') {
    return {
      type: 'ENVIRONMENT',
      turn,
      actor: meta.actor || actorUnitId,
      faction,
      isPlayer,
      actorUnitId,
      affectedUnitIds,
      hazardName: meta.hazardName,
      damage: meta.damage,
      targetHp: meta.targetHp,
      targetMaxHp: meta.targetMaxHp,
      effectDetail: meta.effectDetail,
      rawMessage: msg
    };
  }

  if (
    entry.actionId === 'environment_hazard' ||
    msg.includes('plunged from a ledge and suffered') ||
    msg.includes('Fall Impact Damage')
  ) {
    const match = msg.match(/(?:💥\s*)?(.+?)\s+plunged from a ledge and suffered\s+(\d+)\s+direct Fall Impact Damage!(?:\s+\(HP:\s*(\d+)\/(\d+)\))?/i);
    const actor = match ? match[1].trim() : (meta && 'actor' in meta && typeof meta.actor === 'string' ? meta.actor : actorUnitId);
    const damage = match ? parseInt(match[2], 10) : (meta && 'damage' in meta && typeof meta.damage === 'number' ? meta.damage : undefined);
    const targetHp = match && match[3] ? parseInt(match[3], 10) : (meta && 'targetHp' in meta && typeof meta.targetHp === 'number' ? meta.targetHp : undefined);
    const targetMaxHp = match && match[4] ? parseInt(match[4], 10) : (meta && 'targetMaxHp' in meta && typeof meta.targetMaxHp === 'number' ? meta.targetMaxHp : undefined);

    return {
      type: 'ENVIRONMENT',
      turn,
      actor,
      hazardName: 'Ledge Plunge',
      faction,
      isPlayer,
      actorUnitId,
      affectedUnitIds,
      damage,
      targetHp,
      targetMaxHp,
      effectDetail: 'Direct Fall Impact Damage',
      rawMessage: msg
    };
  }

  if (meta?.type === 'MOVE') {
    return {
      type: 'MOVE',
      turn,
      actor: meta.actor,
      faction,
      isPlayer,
      actorUnitId,
      affectedUnitIds,
      coord: meta.coord,
      remainingAp: meta.remainingAp,
      rawMessage: msg
    };
  }

  if (meta?.type === 'BUFF') {
    return {
      type: 'BUFF',
      turn,
      actor: meta.actor,
      faction,
      isPlayer,
      actorUnitId,
      affectedUnitIds,
      ability: meta.ability,
      target: meta.target,
      effectDetail: meta.effectDetail ?? '',
      rawMessage: msg
    };
  }

  if (meta?.type === 'UTILITY') {
    return {
      type: 'UTILITY',
      turn,
      actor: meta.actor,
      faction,
      isPlayer,
      actorUnitId,
      affectedUnitIds,
      ability: meta.ability,
      target: meta.target,
      effectDetail: meta.effectDetail ?? '',
      damageTotal: meta.damageTotal,
      targetHp: meta.targetHp,
      targetMaxHp: meta.targetMaxHp,
      secondaryDetail: meta.secondaryDetail ?? '',
      rawMessage: msg
    };
  }

  if (meta?.type === 'ATTACK') {
    return {
      type: 'ATTACK',
      turn,
      actor: meta.actor,
      faction,
      isPlayer,
      actorUnitId,
      affectedUnitIds,
      ability: meta.ability,
      target: meta.target,
      d20: meta.d20,
      defenseTarget: meta.defenseTarget,
      hitOutcome: meta.hitOutcome || (Number(meta.damageTotal || '0') > 0 ? 'SOLID_HIT' : 'MISS'),
      damageTotal: meta.damageTotal,
      damageBreakdown: meta.damageBreakdown,
      targetHp: meta.targetHp,
      targetMaxHp: meta.targetMaxHp,
      secondaryDetail: meta.secondaryDetail ?? '',
      isAreaTarget: Boolean(meta.isAreaTarget || (meta.target && meta.target.startsWith('hex '))),
      totalScore: meta.totalScore,
      attackRollBreakdown: meta.attackRollBreakdown,
      damageBreakdownComponents: meta.damageBreakdownComponents,
      rawMessage: msg
    };
  }

  if (meta?.type === 'INITIATIVE') {
    return {
      type: 'INITIATIVE',
      turn,
      faction: 'NEUTRAL',
      isPlayer: false,
      actorUnitId,
      affectedUnitIds,
      rolls: meta.rolls,
      rawMessage: msg
    };
  }

  if (meta?.type === 'PASSIVE') {
    return {
      type: 'PASSIVE',
      turn,
      actor: meta.actor || actorUnitId,
      faction,
      isPlayer,
      actorUnitId,
      affectedUnitIds,
      passiveName: meta.passiveName,
      effectDetail: meta.effectDetail ?? '',
      rawMessage: msg
    };
  }

  if (meta?.type === 'DETECTION') {
    const isTargetPlayer = meta.targetUnitId
      ? meta.targetUnitId.startsWith('player')
      : !isPlayer;

    return {
      type: 'DETECTION',
      turn,
      actor: meta.actor || actorUnitId,
      faction,
      isPlayer,
      actorUnitId,
      affectedUnitIds,
      target: meta.target,
      isTargetPlayer,
      isTurnStart: Boolean(meta.isTurnStart),
      rawMessage: msg
    };
  }

  if (meta?.type === 'CONDITION_BROKEN') {
    return {
      type: 'CONDITION_BROKEN',
      turn,
      actor: meta.actor || actorUnitId,
      faction,
      isPlayer,
      actorUnitId,
      affectedUnitIds,
      condition: meta.condition || 'STEALTH',
      reason: meta.reason,
      rawMessage: msg
    };
  }

  if (meta?.type === 'DOT_DAMAGE') {
    return {
      type: 'DOT_DAMAGE',
      turn,
      actor: meta.actor || actorUnitId,
      faction,
      isPlayer,
      actorUnitId,
      affectedUnitIds,
      condition: (meta.condition || 'BURN').toUpperCase(),
      damage: typeof meta.damage === 'number' ? meta.damage : parseInt(String(meta.damage || '0'), 10),
      targetHp: meta.targetHp,
      targetMaxHp: meta.targetMaxHp,
      rawMessage: msg
    };
  }

  if (entry.actionId === 'initiative' || msg.includes('Initiative rolled:')) {
    const rollMatches = Array.from(msg.matchAll(/([^(,]+)\s*\((\d+)\)/g));
    const parsedRolls = rollMatches.map((m) => {
      const name = m[1].replace(/.*Initiative rolled:\s*/, '').trim();
      const roll = parseInt(m[2], 10);
      const isPlayer =
        !name.toLowerCase().includes('goblin') &&
        !name.toLowerCase().includes('bandit') &&
        !name.toLowerCase().includes('enemy');
      return { unitName: name, roll, isPlayer };
    });
    return {
      type: 'INITIATIVE',
      turn,
      faction: 'NEUTRAL',
      isPlayer: false,
      actorUnitId,
      affectedUnitIds,
      rolls: parsedRolls,
      rawMessage: msg
    };
  }

  if (entry.actionId === 'ai_fault' || msg.includes('[AI Fault]')) {
    const rawActionName = meta?.text
      ? meta.text.replace(/^⚠️\s*\[AI Fault\]\s*/, '').split(':')[0]?.trim()
      : 'Action';
    return {
      type: 'FAULT',
      turn,
      actor: meta?.actor || actorUnitId,
      faction,
      isPlayer,
      actorUnitId,
      affectedUnitIds,
      actionName: rawActionName || 'Action',
      reason: msg,
      rawMessage: msg
    };
  }

  if (
    entry.actionId === 'stealth_spotted' ||
    entry.actionId === 'stealth_spotted_turn_start' ||
    (msg.includes('spotted') && msg.includes('field of view'))
  ) {
    const isTurnStart =
      entry.actionId === 'stealth_spotted_turn_start' || msg.includes('[Turn Start]');
    const spottedMatch = msg.match(
      /(?:⚠️\s*(?:\[Turn Start\]\s*|Spotted!\s*))?(.+?)\s+spotted\s+(.+?)\s+in their direct field of view/i
    );
    const actor = spottedMatch ? spottedMatch[1].trim() : meta?.actor || actorUnitId;
    const target = spottedMatch ? spottedMatch[2].trim() : 'Unknown';
    const isTargetPlayer = !isPlayer;

    return {
      type: 'DETECTION',
      turn,
      actor,
      faction,
      isPlayer,
      actorUnitId,
      affectedUnitIds,
      target,
      isTargetPlayer,
      isTurnStart,
      rawMessage: msg
    };
  }

  const passiveMatch = msg.match(/^(.+?)'s\s+(.+?)\s+triggered:(.*)$/i);
  if (passiveMatch || (meta?.text && meta.text.includes('triggered:'))) {
    const actor = passiveMatch ? passiveMatch[1].trim() : meta?.actor || actorUnitId;
    const rawPassiveName = passiveMatch
      ? passiveMatch[2].trim()
      : meta?.text?.split('triggered:')[0]?.trim() || 'Passive';
    const effectDetail = passiveMatch
      ? passiveMatch[3].trim()
      : meta?.text?.split('triggered:')[1]?.trim() || '';

    return {
      type: 'PASSIVE',
      turn,
      actor,
      faction,
      isPlayer,
      actorUnitId,
      affectedUnitIds,
      passiveName: rawPassiveName,
      effectDetail,
      rawMessage: msg
    };
  }

  if (
    entry.actionId === 'condition_removed' ||
    entry.actionId === 'condition_applied' ||
    msg.includes('was broken by taking damage') ||
    msg.includes('condition was consumed') ||
    msg.includes('defied the challenge')
  ) {
    if (entry.actionId === 'condition_applied' || msg.includes('defied the challenge')) {
      const match = msg.match(/^(.+?)\s+defied the challenge/i);
      const actor = match ? match[1].trim() : meta?.actor || actorUnitId;
      return {
        type: 'CONDITION_BROKEN',
        turn,
        actor,
        faction,
        isPlayer,
        actorUnitId,
        affectedUnitIds,
        condition: 'CHALLENGED',
        reason: 'defied',
        rawMessage: msg
      };
    }

    const match = msg.match(/^(.+?)'s\s+([A-Za-z_]+)(?:\s+condition)?\s+(?:was\s+broken|was\s+consumed)/i);
    const actor = match ? match[1].trim() : meta?.actor || actorUnitId;
    const condition = match ? match[2].trim().toUpperCase() : (meta?.text?.split(' ')[0] || 'STEALTH');
    const isBroken = msg.includes('broken');
    const reason = isBroken ? 'taking damage' : 'consumed';

    return {
      type: 'CONDITION_BROKEN',
      turn,
      actor,
      faction,
      isPlayer,
      actorUnitId,
      affectedUnitIds,
      condition,
      reason,
      rawMessage: msg
    };
  }

  if (
    entry.actionId === 'burn' ||
    entry.actionId === 'poison' ||
    /suffered\s+\d+\s+(?:burn|poison)\s+damage/i.test(msg)
  ) {
    const match = msg.match(/^(.+?)\s+suffered\s+(\d+)\s+([A-Za-z]+)\s+damage!(?:\s+\(HP:\s*(\d+)\/(\d+)\))?/i);
    const actor = match ? match[1].trim() : meta?.actor || actorUnitId;
    const damage = match ? parseInt(match[2], 10) : (meta && 'damage' in meta && typeof meta.damage === 'number' ? meta.damage : 0);
    const condition = match ? match[3].toUpperCase() : (entry.actionId ? entry.actionId.toUpperCase() : 'BURN');
    const targetHp = match && match[4] ? parseInt(match[4], 10) : (meta && 'targetHp' in meta && typeof meta.targetHp === 'number' ? meta.targetHp : undefined);
    const targetMaxHp = match && match[5] ? parseInt(match[5], 10) : (meta && 'targetMaxHp' in meta && typeof meta.targetMaxHp === 'number' ? meta.targetMaxHp : undefined);

    return {
      type: 'DOT_DAMAGE',
      turn,
      actor,
      faction,
      isPlayer,
      actorUnitId,
      affectedUnitIds,
      condition,
      damage,
      targetHp,
      targetMaxHp,
      rawMessage: msg
    };
  }

  return {
    type: 'GENERIC',
    turn,
    actor: meta?.actor || actorUnitId,
    faction,
    isPlayer,
    actorUnitId,
    affectedUnitIds,
    rawMessage: msg || meta?.text || 'This action is not yet defined'
  };
}

function getFactionCardClass(faction: Faction): string {
  switch (faction) {
    case 'PLAYER':
      return 'faction-player player-card';
    case 'ENEMY':
      return 'faction-enemy enemy-card';
    case 'NEUTRAL':
      return 'faction-neutral neutral-card';
    default:
      return 'faction-neutral neutral-card';
  }
}

function getFactionActorClass(faction: Faction): string {
  switch (faction) {
    case 'PLAYER':
      return 'actor-faction-player actor-player';
    case 'ENEMY':
      return 'actor-faction-enemy actor-enemy';
    case 'NEUTRAL':
      return 'actor-faction-neutral actor-neutral';
    default:
      return 'actor-faction-neutral actor-neutral';
  }
}

export function CombatLogPanel({ logEntries, turnNumber, combatants, initialUnitFilter }: CombatLogPanelProps) {
  const [filter, setFilter] = useState<LogFilter>('ALL');
  const [selectedUnitId, setSelectedUnitId] = useState<string>(initialUnitFilter ?? 'ALL');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Directly evaluate without brittle pointer-equality caching
  const entriesList = Array.isArray(logEntries) ? logEntries : [];
  const parsedEntries = entriesList.map(parseCombatLogMessage);

  // Discover available combatants from props or dynamic entry scanning
  const unitOptions: { id: string; name: string }[] = (() => {
    if (combatants && combatants.length > 0) {
      return combatants.map((c) => ({ id: c.id, name: c.name }));
    }
    const map = new Map<string, string>();
    for (let i = 0; i < entriesList.length; i++) {
      const raw = entriesList[i];
      const parsed = parsedEntries[i];
      if (raw.actorUnitId && !map.has(raw.actorUnitId)) {
        map.set(raw.actorUnitId, 'actor' in parsed ? parsed.actor : raw.actorUnitId);
      }
      if (raw.affectedUnitIds) {
        for (const affId of raw.affectedUnitIds) {
          if (!map.has(affId)) {
            const name =
              'target' in parsed && parsed.target && affId !== raw.actorUnitId
                ? parsed.target
                : affId;
            map.set(affId, name);
          }
        }
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  })();

  // Filtered by Unit and Action Type, and reversed: NEWEST at the TOP
  const filtered = parsedEntries.filter((e, idx) => {
    // Unit Filter (UX.4)
    if (selectedUnitId !== 'ALL') {
      const raw = entriesList[idx];
      const isActor =
        raw.actorUnitId === selectedUnitId ||
        ('actorUnitId' in e && e.actorUnitId === selectedUnitId);
      const isAffected =
        (raw.affectedUnitIds && raw.affectedUnitIds.includes(selectedUnitId)) ||
        ('affectedUnitIds' in e && e.affectedUnitIds && e.affectedUnitIds.includes(selectedUnitId));
      if (!isActor && !isAffected) {
        return false;
      }
    }

    // Type Filter
    if (filter === 'COMBAT') return e.type !== 'MOVE';
    if (filter === 'MOVE') return e.type === 'MOVE';
    return true;
  });
  const displayedEntries = [...filtered].reverse();

  // Counts for tabs (respecting unit filter if active)
  let combatCount = 0;
  let moveCount = 0;
  let totalCount = 0;
  for (let i = 0; i < parsedEntries.length; i++) {
    const e = parsedEntries[i];
    const raw = entriesList[i];
    if (selectedUnitId !== 'ALL') {
      const isActor =
        raw.actorUnitId === selectedUnitId ||
        ('actorUnitId' in e && e.actorUnitId === selectedUnitId);
      const isAffected =
        (raw.affectedUnitIds && raw.affectedUnitIds.includes(selectedUnitId)) ||
        ('affectedUnitIds' in e && e.affectedUnitIds && e.affectedUnitIds.includes(selectedUnitId));
      if (!isActor && !isAffected) continue;
    }
    totalCount++;
    if (e.type === 'MOVE') moveCount++;
    else combatCount++;
  }

  // Pin scroll to top whenever new entries arrive or filter changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [entriesList.length, filter, selectedUnitId]);

  return (
    <div className="combat-log-container">
      {/* Log Header */}
      <div className="combat-log-header">
        <div className="log-header-left">
          <span className="log-title">📜 Astral Chronicle</span>
          <span className="log-turn-badge">Turn {turnNumber}</span>
        </div>

        {/* Unit Filter Controls (UX.4) */}
        <div className="log-header-center">
          <select
            className="log-unit-select"
            value={selectedUnitId}
            onChange={(e) => setSelectedUnitId(e.target.value)}
            aria-label="Filter events by unit"
          >
            <option value="ALL">All Units</option>
            {unitOptions.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Controls: All / Combat / Moves */}
        <div className="log-filter-tabs">
          <button
            className={`btn-log-tab ${filter === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilter('ALL')}
            title="Show all combat and movement events"
          >
            All <span className="tab-count">{totalCount}</span>
          </button>
          <button
            className={`btn-log-tab ${filter === 'COMBAT' ? 'active' : ''}`}
            onClick={() => setFilter('COMBAT')}
            title="Show only attack and ability actions"
          >
            ⚔️ Combat <span className="tab-count">{combatCount}</span>
          </button>
          <button
            className={`btn-log-tab ${filter === 'MOVE' ? 'active' : ''}`}
            onClick={() => setFilter('MOVE')}
            title="Show only movement steps"
          >
            🏃 Moves <span className="tab-count">{moveCount}</span>
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="combat-log-messages" ref={scrollRef}>
        {displayedEntries.length === 0 ? (
          <div className="log-empty-hint">
            {selectedUnitId !== 'ALL'
              ? `No actions logged for ${
                  unitOptions.find((u) => u.id === selectedUnitId)?.name ?? 'this unit'
                } yet.`
              : filter === 'ALL'
              ? '⚔️ Trial started. Nothing logged yet.'
              : filter === 'COMBAT'
              ? 'No combat logged yet.'
              : 'No moves logged yet.'}
          </div>
        ) : (
          displayedEntries.map((entry, idx) => {
            const isNewest = idx === 0;
            const showTurnDivider = idx === 0 || entry.turn !== displayedEntries[idx - 1].turn;
            const factionCardClass = getFactionCardClass(entry.faction);
            const factionActorClass = getFactionActorClass(entry.faction);

            const card = (() => {
              if (entry.type === 'ATTACK') {
                const hitOutcome = entry.hitOutcome || 'HIT';
                const isCrit = hitOutcome.includes('CRIT');
                const isGraze = hitOutcome.includes('GRAZE');
                const isMiss = hitOutcome.includes('MISS');

                let outcomeBadgeClass = 'outcome-hit';
                let outcomeLabel = 'HIT';
                if (isCrit) {
                  outcomeBadgeClass = 'outcome-crit';
                  outcomeLabel = 'CRIT!';
                } else if (isGraze) {
                  outcomeBadgeClass = 'outcome-graze';
                  outcomeLabel = 'GRAZE';
                } else if (isMiss) {
                  outcomeBadgeClass = 'outcome-miss';
                  outcomeLabel = 'MISS';
                }

                return (
                  <div
                    key={idx}
                    className={`log-card log-attack-card ${factionCardClass} ${
                      isNewest ? 'entry-fresh' : ''
                    }`}
                  >
                    {/* Card Header Row */}
                    <div className="log-card-header">
                      <span className="log-turn-pill">T{entry.turn}</span>
                      <span className={`log-actor-name ${factionActorClass}`}>
                        {entry.actor}
                      </span>
                      <span className="log-ability-name">⚔️ {entry.ability}</span>
                      <span className={`log-outcome-badge ${outcomeBadgeClass}`}>{outcomeLabel}</span>
                    </div>

                    {/* Target & Damage Row */}
                    <div className="log-card-body">
                      <div className="log-target-line">
                        <span className="target-arrow">→</span>
                        <span className="target-name">{entry.target}</span>
                        {entry.targetHp !== undefined && entry.targetMaxHp !== undefined && (
                          <span className="target-hp-chip" title="Target Remaining HP">
                            ❤️ {entry.targetHp}/{entry.targetMaxHp}
                          </span>
                        )}
                      </div>

                      <div className="log-impact-line">
                        {isMiss ? (
                          <span className="impact-miss">Missed</span>
                        ) : (
                          <span
                            className={`impact-damage ${isCrit ? 'damage-crit' : ''} ${
                              entry.damageBreakdownComponents && entry.damageBreakdownComponents.length > 0
                                ? 'has-tooltip'
                                : ''
                            }`}
                          >
                            💥 <strong>{entry.damageTotal}</strong> dmg
                            {entry.isAreaTarget && <span className="area-total-tag"> (Total)</span>}
                            {entry.damageBreakdown && (
                              <span
                                className="damage-formula"
                                title={
                                  entry.damageBreakdownComponents && entry.damageBreakdownComponents.length > 0
                                    ? undefined
                                    : 'Damage Breakdown'
                                }
                              >
                                ({formatDamageBreakdown(entry.damageBreakdown)})
                              </span>
                            )}
                            {entry.damageBreakdownComponents && entry.damageBreakdownComponents.length > 0 && (
                              <DamageRollTooltip
                                breakdown={entry.damageBreakdownComponents}
                                totalDamage={entry.damageTotal}
                                formulaSummary={entry.damageBreakdown}
                                placement="top"
                              />
                            )}
                          </span>
                        )}

                        {entry.d20 && (
                          <span
                            className="log-roll-chip"
                            title={
                              entry.attackRollBreakdown && entry.attackRollBreakdown.length > 0
                                ? undefined
                                : entry.isAreaTarget
                                ? 'Spellcast Roll & Score'
                                : 'Attack Roll vs Defense DC'
                            }
                          >
                            🎲 {formatD20Roll(entry.d20)}
                            {entry.defenseTarget !== undefined
                              ? ` vs DC ${entry.defenseTarget}`
                              : entry.totalScore !== undefined
                              ? ` (Score ${entry.totalScore})`
                              : ''}
                            {entry.attackRollBreakdown && entry.attackRollBreakdown.length > 0 && (
                              <AttackRollTooltip
                                breakdown={entry.attackRollBreakdown}
                                d20={entry.d20.split(' ')[0]}
                                totalScore={entry.totalScore}
                                targetDefense={entry.defenseTarget}
                                placement="left"
                              />
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Secondary Effects (Knockback, Collisions) */}
                    {entry.secondaryDetail && (
                      <div className="log-card-secondary">
                        <span className="secondary-icon">⚡</span>
                        <span className="secondary-text">{entry.secondaryDetail}</span>
                      </div>
                    )}
                  </div>
                );
              }

              if (entry.type === 'ENVIRONMENT') {
                return (
                  <div
                    key={idx}
                    className={`log-card log-environment-card ${factionCardClass} ${
                      isNewest ? 'entry-fresh' : ''
                    }`}
                  >
                    <div className="log-card-header">
                      <span className="log-turn-pill">T{entry.turn}</span>
                      <span className="log-hazard-badge">⚠️ HAZARD</span>
                      <span className={`log-actor-name ${factionActorClass}`}>
                        {entry.actor}
                      </span>
                      <span className="log-hazard-name">{entry.hazardName}</span>
                    </div>

                    <div className="log-card-body">
                      {entry.damage !== undefined && (
                        <div className="log-impact-line">
                          <span className="impact-damage hazard-damage">
                            💥 <strong>{entry.damage}</strong> dmg
                          </span>
                          {entry.targetHp !== undefined && entry.targetMaxHp !== undefined && (
                            <span className="target-hp-chip" title="Remaining HP">
                              ❤️ {entry.targetHp}/{entry.targetMaxHp}
                            </span>
                          )}
                        </div>
                      )}
                      {entry.effectDetail && (
                        <div className="log-hazard-detail">
                          <span>{entry.effectDetail}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              if (entry.type === 'MOVE') {
                return (
                  <div
                    key={idx}
                    className={`log-card log-move-card ${factionCardClass} ${
                      isNewest ? 'entry-fresh' : ''
                    }`}
                  >
                    <span className="log-turn-pill">T{entry.turn}</span>
                    <span className="move-icon">🏃</span>
                    <span className={`log-actor-name ${factionActorClass}`}>
                      {entry.actor}
                    </span>
                    <span className="move-text">
                      moved to <strong>({entry.coord.q}, {entry.coord.r})</strong>
                    </span>
                    <span className="move-ap-pill">{entry.remainingAp} AP left</span>
                  </div>
                );
              }

              if (entry.type === 'BUFF') {
                return (
                  <div
                    key={idx}
                    className={`log-card log-buff-card ${factionCardClass} ${
                      isNewest ? 'entry-fresh' : ''
                    }`}
                  >
                    <div className="log-card-header">
                      <span className="log-turn-pill">T{entry.turn}</span>
                      <span className={`log-actor-name ${factionActorClass}`}>
                        {entry.actor}
                      </span>
                      <span className="log-ability-name">🛡️ {entry.ability}</span>
                    </div>
                    {entry.target && entry.target !== entry.actor && (
                      <div className="log-card-body">
                        <div className="log-target-line">
                          <span className="target-arrow">→</span>
                          <span className="target-name">{entry.target}</span>
                        </div>
                      </div>
                    )}
                    {entry.effectDetail && (
                      <div className="log-buff-detail">
                        <span>✨ {entry.effectDetail}</span>
                      </div>
                    )}
                  </div>
                );
              }

              if (entry.type === 'UTILITY') {
                const utilityIcon = entry.ability.toLowerCase().includes('gust') ? '💨' : '🌀';
                return (
                  <div
                    key={idx}
                    className={`log-card log-utility-card ${factionCardClass} ${
                      isNewest ? 'entry-fresh' : ''
                    }`}
                  >
                    <div className="log-card-header">
                      <span className="log-turn-pill">T{entry.turn}</span>
                      <span className={`log-actor-name ${factionActorClass}`}>
                        {entry.actor}
                      </span>
                      <span className="log-ability-name">{utilityIcon} {entry.ability}</span>
                    </div>
                    {entry.target && (
                      <div className="log-card-body">
                        <div className="log-target-line">
                          <span className="target-arrow">→</span>
                          <span className="target-name">{entry.target}</span>
                          {entry.targetHp !== undefined && entry.targetMaxHp !== undefined && (
                            <span className="target-hp-chip" title="Target Remaining HP">
                              ❤️ {entry.targetHp}/{entry.targetMaxHp}
                            </span>
                          )}
                        </div>

                        {entry.damageTotal && (
                          <div className="log-impact-line">
                            <span className="impact-damage">
                              💥 <strong>{entry.damageTotal}</strong> dmg
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    {entry.secondaryDetail && (
                      <div className="log-card-secondary">
                        <span className="secondary-icon">⚡</span>
                        <span className="secondary-text">{entry.secondaryDetail}</span>
                      </div>
                    )}
                    {entry.effectDetail && !entry.damageTotal && (
                      <div className="log-buff-detail">
                        <span>✨ {entry.effectDetail}</span>
                      </div>
                    )}
                  </div>
                );
              }

              if (entry.type === 'FAULT') {
                return (
                  <div
                    key={idx}
                    className={`log-card log-fault-card ${isNewest ? 'entry-fresh' : ''}`}
                  >
                    <div className="log-card-header">
                      <span className="log-turn-pill">T{entry.turn}</span>
                      <span className="log-fault-badge">⚠️ AI FAULT</span>
                      <span className={`log-actor-name ${factionActorClass}`}>
                        {entry.actor}
                      </span>
                      <span className="log-ability-name">{entry.actionName}</span>
                    </div>
                    <div className="log-card-body">
                      <div className="log-fault-reason">
                        {entry.reason}
                      </div>
                    </div>
                  </div>
                );
              }

              if (entry.type === 'INITIATIVE') {
                return (
                  <div
                    key={idx}
                    className={`log-card log-initiative-card ${isNewest ? 'entry-fresh' : ''}`}
                  >
                    <div className="log-card-header">
                      <span className="log-turn-pill log-turn-init">START</span>
                      <span className="log-initiative-badge">🎲 INITIATIVE</span>
                      <span className="log-initiative-title">Opening Turn Order</span>
                    </div>
                    <div className="log-initiative-grid">
                      {entry.rolls.map((r, rIdx) => (
                        <div
                          key={rIdx}
                          className={`initiative-roll-chip ${r.isPlayer ? 'chip-player' : 'chip-enemy'}`}
                          title={`${r.unitName}: rolled ${r.roll}`}
                        >
                          <span className="roll-rank">#{rIdx + 1}</span>
                          <span className="roll-name">{r.unitName}</span>
                          <span className="roll-value">🎲 {r.roll}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              if (entry.type === 'DETECTION') {
                return (
                  <div
                    key={idx}
                    className={`log-card log-detection-card ${factionCardClass} ${
                      isNewest ? 'entry-fresh' : ''
                    }`}
                  >
                    <div className="log-card-header">
                      <span className="log-turn-pill">T{entry.turn}</span>
                      <span className="log-spotted-badge">👁️ SPOTTED!</span>
                      <span className="log-detection-context">
                        {entry.isTurnStart ? 'Turn Start' : 'Mid-Move'}
                      </span>
                      <span className={`log-actor-name ${factionActorClass}`}>
                        {entry.actor}
                      </span>
                    </div>

                    <div className="log-card-body">
                      <div className="log-target-line">
                        <span className="target-arrow">→</span>
                        <span className="detection-desc">Spotted</span>
                        <span className={`target-name ${entry.isTargetPlayer ? 'actor-faction-player actor-player' : 'actor-faction-enemy actor-enemy'}`}>
                          👤 {entry.target}
                        </span>
                        <span className="log-stealth-broken-badge">STEALTH BROKEN</span>
                      </div>
                    </div>

                    <div className="log-card-secondary log-detection-footer">
                      <span className="secondary-icon">🎯</span>
                      <span className="secondary-text">Detected in front arc field of view!</span>
                    </div>
                  </div>
                );
              }

              if (entry.type === 'PASSIVE') {
                const displayDetail = formatPassiveDetail(entry.effectDetail);
                return (
                  <div
                    key={idx}
                    className={`log-card log-passive-card ${factionCardClass} ${
                      isNewest ? 'entry-fresh' : ''
                    }`}
                  >
                    <div className="log-card-header">
                      <span className="log-turn-pill">T{entry.turn}</span>
                      <span className="log-passive-badge">⚡ PASSIVE</span>
                      <span className={`log-actor-name ${factionActorClass}`}>
                        {entry.actor}
                      </span>
                      <span className="log-ability-name">✨ {entry.passiveName}</span>
                    </div>

                    {displayDetail && (
                      <div className="log-card-body">
                        <div className="log-passive-detail">
                          <span className="passive-effect-chip">{displayDetail}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              if (entry.type === 'CONDITION_BROKEN') {
                const isStealth = entry.condition.toUpperCase() === 'STEALTH';
                const isChallenged = entry.condition.toUpperCase() === 'CHALLENGED';
                const badgeText = isStealth
                  ? '👤 STEALTH BROKEN'
                  : isChallenged
                  ? '⚔️ CHALLENGE DEFIED'
                  : `⚡ ${entry.condition} BROKEN`;
                const contextNote = isStealth
                  ? 'Concealment lost due to taking damage!'
                  : isChallenged
                  ? 'Defied the challenge and became EXPOSED!'
                  : `${entry.condition} effect removed.`;

                return (
                  <div
                    key={idx}
                    className={`log-card log-condition-broken-card ${factionCardClass} ${
                      isNewest ? 'entry-fresh' : ''
                    }`}
                  >
                    <div className="log-card-header">
                      <span className="log-turn-pill">T{entry.turn}</span>
                      <span className="log-condition-broken-badge">{badgeText}</span>
                      <span className={`log-actor-name ${factionActorClass}`}>
                        {entry.actor}
                      </span>
                    </div>

                    <div className="log-card-secondary log-condition-footer">
                      <span className="secondary-icon">{isChallenged ? '⚠️' : '💥'}</span>
                      <span className="secondary-text">{contextNote}</span>
                    </div>
                  </div>
                );
              }

              if (entry.type === 'DOT_DAMAGE') {
                const isBurn = entry.condition.toUpperCase() === 'BURN';
                const badgeClass = isBurn ? 'log-burn-badge' : 'log-poison-badge';
                const badgeText = isBurn ? '🔥 BURN TICK' : '🧪 POISON TICK';

                return (
                  <div
                    key={idx}
                    className={`log-card log-dot-card ${factionCardClass} ${
                      isNewest ? 'entry-fresh' : ''
                    }`}
                  >
                    <div className="log-card-header">
                      <span className="log-turn-pill">T{entry.turn}</span>
                      <span className={`log-dot-badge ${badgeClass}`}>{badgeText}</span>
                      <span className={`log-actor-name ${factionActorClass}`}>
                        {entry.actor}
                      </span>
                    </div>

                    <div className="log-card-body">
                      <div className="log-impact-line">
                        <span className={`impact-dot-damage ${isBurn ? 'burn-damage' : 'poison-damage'}`}>
                          💥 <strong>{entry.damage}</strong> dmg
                        </span>
                        {entry.targetHp !== undefined && entry.targetMaxHp !== undefined && (
                          <span className="target-hp-chip" title="Remaining HP">
                            ❤️ {entry.targetHp}/{entry.targetMaxHp}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // Fallback Generic
              return (
                <div key={idx} className={`log-card log-generic-card ${isNewest ? 'entry-fresh' : ''}`}>
                  <span className="log-turn-pill">T{entry.turn}</span>
                  <span className="generic-msg">{entry.rawMessage}</span>
                </div>
              );
            })();

            const entryActor = 'actor' in entry ? (entry as { actor: string }).actor : undefined;

            return (
              <Fragment key={idx}>
                {showTurnDivider && (
                  <div
                    className={`log-turn-divider ${
                      entry.turn === 0
                        ? 'init-turn'
                        : entry.faction === 'PLAYER'
                        ? 'player-turn'
                        : entry.faction === 'ENEMY'
                        ? 'enemy-turn'
                        : 'neutral-turn'
                    }`}
                    data-testid={`log-turn-divider-${entry.turn}`}
                  >
                    <div className="log-turn-divider-title">
                      {entry.turn === 0 ? (
                        <>
                          <span className="log-turn-divider-icon">⏳</span>
                          <span>Opening Initiative</span>
                        </>
                      ) : (
                        <>
                          <span className="log-turn-divider-badge">Turn {entry.turn}</span>
                          <span className="log-turn-divider-actor">
                            {entryActor ? entryActor : entry.faction === 'PLAYER' ? 'Player Turn' : 'Enemy Turn'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
                {card}
              </Fragment>
            );
          })
        )}
      </div>
    </div>
  );
}
