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
      effectDetail: string;
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
      rawMessage: ''
    };
  }

  const turn = entry.turnNumber ?? 0;
  const actorUnitId = entry.actorUnitId || '';
  const isPlayer = actorUnitId.startsWith('player');
  const msg = entry.message || '';

  try {
    // 1. Universal Move Action pattern: "Alden (Warrior) moved to (1, 0). [Remaining AP: 2]"
    const moveMatch = msg.match(
      /^(.*?)\s+moved to\s+\(([-\d]+),\s*([-\d]+)\)\.\s*\[Remaining AP:\s*(\d+)\]/i
    );
    if (moveMatch) {
      return {
        type: 'MOVE',
        turn,
        actor: moveMatch[1].trim(),
        isPlayer,
        coord: { q: parseInt(moveMatch[2], 10), r: parseInt(moveMatch[3], 10) },
        remainingAp: parseInt(moveMatch[4], 10),
        rawMessage: msg
      };
    }

    // 2. Damaging Attack Resolution pattern:
    // Format: `${actor} used ${ability} on ${target}: [d20: ${d20}+${mod} vs DC ${dc} -> ${outcome}] [Damage: ${breakdown}] (HP: ${hp}/${maxHp})${secondary}`
    const attackMatch = msg.match(
      /^(.*?)\s+used\s+(.*?)\s+on\s+(.*?):\s*\[d20:\s*([^\s]+)\s+vs\s+DC\s*(\d+)\s*->\s*([^\]]+)\]\s*\[Damage:\s*([^\]]*)\]\s*\(HP:\s*([-\d]+)\/([-\d]+)\)(.*)$/i
    );
    if (attackMatch) {
      const rawDamage = attackMatch[7].trim();
      const hitOutcome = attackMatch[6].trim();
      let damageTotal = '0';
      let damageBreakdown = rawDamage;

      if (hitOutcome.toUpperCase() === 'MISS') {
        damageTotal = '0';
        damageBreakdown = rawDamage.includes('Miss') ? rawDamage : 'Miss';
      } else if (rawDamage.includes('->')) {
        const parts = rawDamage.split('->');
        damageTotal = parts[parts.length - 1].trim();
        damageBreakdown = parts.slice(0, -1).join('->').trim();
      } else if (rawDamage.includes('=')) {
        const parts = rawDamage.split('=');
        damageTotal = parts[parts.length - 1].trim();
        damageBreakdown = parts.slice(0, -1).join('=').trim();
      } else {
        damageTotal = rawDamage.trim();
      }

      return {
        type: 'ATTACK',
        turn,
        actor: attackMatch[1].trim(),
        isPlayer,
        ability: attackMatch[2].trim(),
        target: attackMatch[3].trim(),
        d20: attackMatch[4].trim(),
        defenseTarget: parseInt(attackMatch[5], 10),
        hitOutcome,
        damageTotal,
        damageBreakdown,
        targetHp: parseInt(attackMatch[8], 10),
        targetMaxHp: parseInt(attackMatch[9], 10),
        secondaryDetail: attackMatch[10]?.trim() ?? '',
        rawMessage: msg
      };
    }

    // 3. Buff/Self-Target ability pattern: "Vael (Wizard) used Minor Ward. 🛡️ [Armor Buff: +2 Armor for 2 turn(s)]"
    const buffMatch = msg.match(/^(.*?)\s+used\s+([^.]+)\.(.*)$/i);
    if (buffMatch && entry.actionId !== 'move') {
      return {
        type: 'BUFF',
        turn,
        actor: buffMatch[1].trim(),
        isPlayer,
        ability: buffMatch[2].trim(),
        effectDetail: buffMatch[3]?.trim() ?? '',
        rawMessage: msg
      };
    }

    // 4. Fallback Generic
    return {
      type: 'GENERIC',
      turn,
      actor: entry.actorUnitId || '',
      isPlayer,
      rawMessage: msg
    };
  } catch {
    return {
      type: 'GENERIC',
      turn,
      actor: entry.actorUnitId || '',
      isPlayer,
      rawMessage: msg
    };
  }
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
                  {entry.effectDetail && (
                    <div className="log-buff-detail">
                      <span>✨ {entry.effectDetail}</span>
                    </div>
                  )}
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
