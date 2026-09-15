import { useEffect, useRef } from 'react';
import { CombatLogEntry } from '../../core/combat/types';

export interface CombatLogPanelProps {
  readonly logEntries: readonly CombatLogEntry[];
  readonly turnNumber: number;
}

export function CombatLogPanel({ logEntries, turnNumber }: CombatLogPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logEntries]);

  return (
    <div className="combat-log-container">
      <div className="combat-log-header">
        <span className="log-title">⚔️ Combat Log</span>
        <span className="log-turn-badge">Turn {turnNumber}</span>
      </div>

      <div className="combat-log-messages" ref={scrollRef}>
        {logEntries.length === 0 ? (
          <div className="log-empty-hint">Encounter started. Select an action to begin.</div>
        ) : (
          logEntries.map((entry, index) => {
            const isCrit = entry.message.includes('CRITICAL_HIT');
            const isGraze = entry.message.includes('GRAZE');
            const isMiss = entry.message.includes('MISS');
            const isMove = entry.actionId === 'move';

            let entryClass = 'log-entry';
            if (isCrit) entryClass += ' entry-crit';
            else if (isGraze) entryClass += ' entry-graze';
            else if (isMiss) entryClass += ' entry-miss';
            else if (isMove) entryClass += ' entry-move';

            return (
              <div key={index} className={entryClass}>
                <span className="entry-turn">T{entry.turnNumber}</span>
                <span className="entry-msg">{entry.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
