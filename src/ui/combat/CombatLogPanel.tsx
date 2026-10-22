import { useEffect, useRef, useState } from 'react';
import { CombatLogEntry } from '../../core/combat/types';

export interface CombatLogPanelProps {
  readonly logEntries: readonly CombatLogEntry[];
  readonly turnNumber: number;
}

type LogFilter = 'ALL' | 'COMBAT' | 'MOVE';

export type ParsedLogEntry =
  | {
      type: 'ATTACK';
      turn: number;
      actor: string;
      isPlayer: boolean;
      ability: string;
      target: string;
      d20: string;
      defenseTarget: number;
      hitOutcome: string;
      damageTotal: string;
      damageBreakdown: string;
      targetHp: number;
      targetMaxHp: number;
      secondaryDetail: string;
      rawMessage: string;
    }
  | {
      type: 'MOVE';
      turn: number;
      actor: string;
      isPlayer: boolean;
      coord: { q: number; r: number };
      remainingAp: number;
      rawMessage: string;
    }
  | {
      type: 'BUFF';
      turn: number;
      actor: string;
      isPlayer: boolean;
      ability: string;
      target?: string;
      effectDetail: string;
      rawMessage: string;
    }
  | {
      type: 'UTILITY';
      turn: number;
      actor: string;
      isPlayer: boolean;
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
      type: 'INITIATIVE';
      turn: number;
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
      isPlayer: boolean;
      actionName: string;
      reason: string;
      rawMessage: string;
    }
  | {
      type: 'GENERIC';
      turn: number;
      actor: string;
      isPlayer: boolean;
      rawMessage: string;
    };

export function parseCombatLogMessage(entry: CombatLogEntry): ParsedLogEntry {
  if (!entry) {
    return {
      type: 'GENERIC',
      turn: 0,
      actor: '',
      isPlayer: false,
      rawMessage: 'This action is not yet defined'
    };
  }

  const turn = entry.turnNumber ?? 0;
  const actorUnitId = entry.actorUnitId || '';
  const isPlayer = actorUnitId.startsWith('player');
  const msg = entry.message || '';
  const meta = entry.metadata;

  if (meta?.type === 'MOVE') {
    return {
      type: 'MOVE',
      turn,
      actor: meta.actor,
      isPlayer,
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
      isPlayer,
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
      isPlayer,
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
      isPlayer,
      ability: meta.ability,
      target: meta.target,
      d20: meta.d20,
      defenseTarget: meta.defenseTarget,
      hitOutcome: meta.hitOutcome,
      damageTotal: meta.damageTotal,
      damageBreakdown: meta.damageBreakdown,
      targetHp: meta.targetHp,
      targetMaxHp: meta.targetMaxHp,
      secondaryDetail: meta.secondaryDetail ?? '',
      rawMessage: msg
    };
  }

  if (meta?.type === 'INITIATIVE') {
    return {
      type: 'INITIATIVE',
      turn,
      rolls: meta.rolls,
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
      isPlayer,
      actionName: rawActionName || 'Action',
      reason: msg,
      rawMessage: msg
    };
  }

  return {
    type: 'GENERIC',
    turn,
    actor: meta?.actor || actorUnitId,
    isPlayer,
    rawMessage: msg || meta?.text || 'This action is not yet defined'
  };
}

export function CombatLogPanel({ logEntries, turnNumber }: CombatLogPanelProps) {
  const [filter, setFilter] = useState<LogFilter>('ALL');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Directly evaluate without brittle pointer-equality caching
  const entriesList = Array.isArray(logEntries) ? logEntries : [];
  const parsedEntries = entriesList.map(parseCombatLogMessage);

  // Counts for tabs
  let combatCount = 0;
  let moveCount = 0;
  for (const e of parsedEntries) {
    if (e.type === 'MOVE') moveCount++;
    else combatCount++;
  }

  // Filtered and reversed: NEWEST at the TOP
  const filtered = parsedEntries.filter((e) => {
    if (filter === 'COMBAT') return e.type !== 'MOVE';
    if (filter === 'MOVE') return e.type === 'MOVE';
    return true;
  });
  const displayedEntries = [...filtered].reverse();

  // Pin scroll to top whenever new entries arrive or filter changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [entriesList.length, filter]);

  return (
    <div className="combat-log-container">
      {/* Log Header */}
      <div className="combat-log-header">
        <div className="log-header-left">
          <span className="log-title">📜 Astral Chronicle</span>
          <span className="log-turn-badge">Turn {turnNumber}</span>
        </div>

        {/* Filter Controls: All / Combat / Moves */}
        <div className="log-filter-tabs">
          <button
            className={`btn-log-tab ${filter === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilter('ALL')}
            title="Show all combat and movement events"
          >
            All <span className="tab-count">{entriesList.length}</span>
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
            {filter === 'ALL'
              ? '⚔️ Trial started. Nothing logged yet.'
              : filter === 'COMBAT'
              ? 'No combat logged yet.'
              : 'No moves logged yet.'}
          </div>
        ) : (
          displayedEntries.map((entry, idx) => {
            const isNewest = idx === 0;

            if (entry.type === 'ATTACK') {
              const isCrit = entry.hitOutcome.includes('CRIT');
              const isGraze = entry.hitOutcome.includes('GRAZE');
              const isMiss = entry.hitOutcome.includes('MISS');

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
                  className={`log-card log-attack-card ${entry.isPlayer ? 'player-card' : 'enemy-card'} ${
                    isNewest ? 'entry-fresh' : ''
                  }`}
                >
                  {/* Card Header Row */}
                  <div className="log-card-header">
                    <span className="log-turn-pill">T{entry.turn}</span>
                    <span className={`log-actor-name ${entry.isPlayer ? 'actor-player' : 'actor-enemy'}`}>
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
                      <span className="target-hp-chip" title="Target Remaining HP">
                        ❤️ {entry.targetHp}/{entry.targetMaxHp}
                      </span>
                    </div>

                    <div className="log-impact-line">
                      {isMiss ? (
                        <span className="impact-miss">Missed</span>
                      ) : (
                        <span className={`impact-damage ${isCrit ? 'damage-crit' : ''}`}>
                          💥 <strong>{entry.damageTotal}</strong> dmg
                          {entry.damageBreakdown && (
                            <span className="damage-formula" title="Damage Breakdown">
                              ({entry.damageBreakdown})
                            </span>
                          )}
                        </span>
                      )}

                      <span className="log-roll-chip" title="Attack Roll vs Defense DC">
                        🎲 {entry.d20} vs DC {entry.defenseTarget}
                      </span>
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

            if (entry.type === 'MOVE') {
              return (
                <div
                  key={idx}
                  className={`log-card log-move-card ${entry.isPlayer ? 'player-card' : 'enemy-card'} ${
                    isNewest ? 'entry-fresh' : ''
                  }`}
                >
                  <span className="log-turn-pill">T{entry.turn}</span>
                  <span className="move-icon">🏃</span>
                  <span className={`log-actor-name ${entry.isPlayer ? 'actor-player' : 'actor-enemy'}`}>
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
                  className={`log-card log-buff-card ${entry.isPlayer ? 'player-card' : 'enemy-card'} ${
                    isNewest ? 'entry-fresh' : ''
                  }`}
                >
                  <div className="log-card-header">
                    <span className="log-turn-pill">T{entry.turn}</span>
                    <span className={`log-actor-name ${entry.isPlayer ? 'actor-player' : 'actor-enemy'}`}>
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
                  className={`log-card log-utility-card ${entry.isPlayer ? 'player-card' : 'enemy-card'} ${
                    isNewest ? 'entry-fresh' : ''
                  }`}
                >
                  <div className="log-card-header">
                    <span className="log-turn-pill">T{entry.turn}</span>
                    <span className={`log-actor-name ${entry.isPlayer ? 'actor-player' : 'actor-enemy'}`}>
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
                    <span className={`log-actor-name ${entry.isPlayer ? 'actor-player' : 'actor-enemy'}`}>
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

            // Fallback Generic
            return (
              <div key={idx} className={`log-card log-generic-card ${isNewest ? 'entry-fresh' : ''}`}>
                <span className="log-turn-pill">T{entry.turn}</span>
                <span className="generic-msg">{entry.rawMessage}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
