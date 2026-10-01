import { useMemo } from 'react';
import { Unit } from '../../core/types/unit';
import { InBattleXp } from '../../core/combat/types';
import './BattleVictoryModal.css';

export interface SquadMemberVictorySummary {
  readonly unit: Unit;
  readonly earnedXp: InBattleXp;
}

export interface BattleVictoryModalProps {
  readonly isOpen: boolean;
  readonly squadMembers?: readonly SquadMemberVictorySummary[];
  readonly activeSquadUnitId?: string;
  readonly onSelectSquadUnit?: (unitId: string) => void;
  readonly onRematch: () => void;
  readonly onDismiss: () => void;
  readonly onProceedToCamp?: () => void;
}

export function BattleVictoryModal({
  isOpen,
  squadMembers,
  activeSquadUnitId,
  onSelectSquadUnit,
  onRematch,
  onDismiss,
  onProceedToCamp
}: BattleVictoryModalProps) {
  const currentSquadMember = useMemo(() => {
    if (!squadMembers || squadMembers.length === 0) return undefined;
    return squadMembers.find((s) => s.unit.id === activeSquadUnitId) ?? squadMembers[0];
  }, [squadMembers, activeSquadUnitId]);

  if (!isOpen || !currentSquadMember) {
    return null;
  }

  const activeUnit = currentSquadMember.unit;
  const earnedXp = currentSquadMember.earnedXp;

  return (
    <div className="victory-modal-backdrop" role="dialog" aria-modal="true">
      <div className="victory-modal-card">
        {/* Header */}
        <div className="victory-header">
          <span className="victory-title-badge">✦ Trial Complete</span>
          <h2>Trial Triumph!</h2>
          <p>The trial has been overcome. Your vanguard returns victorious.</p>
        </div>

        {/* Squad Member Selection Tabs */}
        {squadMembers && squadMembers.length > 1 && (
          <div className="victory-squad-tabs">
            {squadMembers.map((member) => {
              const isSelected = member.unit.id === activeUnit.id;
              const totalXp =
                member.earnedXp.fighter +
                member.earnedXp.rogue +
                member.earnedXp.mage;
              return (
                <button
                  key={member.unit.id}
                  type="button"
                  className={`victory-squad-tab-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelectSquadUnit?.(member.unit.id)}
                >
                  <span className="tab-unit-name">{member.unit.name.split(' ')[0]}</span>
                  <span className="tab-unit-xp">+{totalXp} XP</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Archetype XP Breakdown */}
        <div>
          <div className="victory-section-title">Archetype XP Earned ({activeUnit.name})</div>
          <div className="xp-breakdown-row">
            <div className="xp-stat-box fighter">
              <div className="xp-stat-label">⚔️ Fighter</div>
              <div className="xp-stat-value">+{earnedXp.fighter} XP</div>
            </div>
            <div className="xp-stat-box rogue">
              <div className="xp-stat-label">🗡️ Rogue</div>
              <div className="xp-stat-value">+{earnedXp.rogue} XP</div>
            </div>
            <div className="xp-stat-box mage">
              <div className="xp-stat-label">🔮 Mage</div>
              <div className="xp-stat-value">+{earnedXp.mage} XP</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="victory-modal-actions">
          {onProceedToCamp ? (
            <button
              type="button"
              className="btn-rematch-action primary-gold"
              onClick={onProceedToCamp}
              data-testid="victory-proceed-camp-btn"
            >
              ✦ Return to The Nexus
            </button>
          ) : (
            <button type="button" className="btn-rematch-action" onClick={onRematch}>
              ⚔️ Retry Trial
            </button>
          )}
          <button type="button" className="btn-dismiss-action" onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
