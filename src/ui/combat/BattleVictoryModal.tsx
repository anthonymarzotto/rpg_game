import { useMemo } from 'react';
import { PostBattleReconciliationResult } from '../../core/progression/postBattle';
import { Archetype } from '../../core/types/class';
import { Unit } from '../../core/types/unit';
import './BattleVictoryModal.css';

export interface BattleVictoryModalProps {
  readonly isOpen: boolean;
  readonly reconciliationResult: PostBattleReconciliationResult | null;
  readonly playerUnit: Unit | undefined;
  readonly squadMembers?: readonly {
    readonly unit: Unit;
    readonly result: PostBattleReconciliationResult;
  }[];
  readonly activeSquadUnitId?: string;
  readonly onSelectSquadUnit?: (unitId: string) => void;
  readonly onSelectArchetypeChoice: (archetype: Archetype) => void;
  readonly onRematch: () => void;
  readonly onDismiss: () => void;
  readonly onProceedToCamp?: () => void;
}

export function BattleVictoryModal({
  isOpen,
  reconciliationResult,
  playerUnit,
  squadMembers,
  activeSquadUnitId,
  onSelectSquadUnit,
  onSelectArchetypeChoice,
  onRematch,
  onDismiss,
  onProceedToCamp
}: BattleVictoryModalProps) {
  const currentSquadMember = useMemo(() => {
    if (!squadMembers || squadMembers.length === 0) return undefined;
    return squadMembers.find((s) => s.unit.id === activeSquadUnitId) ?? squadMembers[0];
  }, [squadMembers, activeSquadUnitId]);

  const activeUnit = currentSquadMember?.unit ?? playerUnit;
  const activeResult = currentSquadMember?.result ?? reconciliationResult;

  if (!isOpen || !activeResult) {
    return null;
  }

  const {
    earnedXp,
    carryoverXp,
    unlockedClass,
    requiresChoice,
    qualifyingArchetypes,
    updatedVitals,
    updatedAttributes
  } = activeResult;

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
              const isSelected = member.unit.id === activeUnit?.id;
              const totalXp =
                member.result.earnedXp.fighter +
                member.result.earnedXp.rogue +
                member.result.earnedXp.mage;
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
          <div className="victory-section-title">Archetype XP Earned ({activeUnit?.name})</div>
          <div className="xp-breakdown-row">
            <div className="xp-stat-box fighter">
              <div className="xp-stat-label">⚔️ Fighter</div>
              <div className="xp-stat-value">+{earnedXp.fighter} XP</div>
              <div className="xp-stat-sub">Carryover: {carryoverXp.fighter} XP</div>
            </div>
            <div className="xp-stat-box rogue">
              <div className="xp-stat-label">🗡️ Rogue</div>
              <div className="xp-stat-value">+{earnedXp.rogue} XP</div>
              <div className="xp-stat-sub">Carryover: {carryoverXp.rogue} XP</div>
            </div>
            <div className="xp-stat-box mage">
              <div className="xp-stat-label">🔮 Mage</div>
              <div className="xp-stat-value">+{earnedXp.mage} XP</div>
              <div className="xp-stat-sub">Carryover: {carryoverXp.mage} XP</div>
            </div>
          </div>
        </div>

        {/* Choice Prompt if Multiple Qualified */}
        {requiresChoice && (
          <div className="choice-prompt-card">
            <div className="victory-section-title text-gold">
              ✦ Multiple Disciplines Ready!
            </div>
            <p className="choice-prompt-desc">
              Your actions qualified for multiple disciplines. Choose which path to ascend first:
            </p>
            <div className="choice-buttons-grid">
              {qualifyingArchetypes.map((archetype) => (
                <button
                  key={archetype}
                  type="button"
                  className="btn-choice"
                  onClick={() => onSelectArchetypeChoice(archetype)}
                >
                  {archetype === 'FIGHTER' && '⚔️ Ascend: Warrior (Fighter)'}
                  {archetype === 'ROGUE' && '🗡️ Ascend: Thief (Rogue)'}
                  {archetype === 'MAGE' && '🔮 Ascend: Wizard (Mage)'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Unlocked Class & Stat Growth Celebration */}
        {unlockedClass && (
          <div className="level-unlock-card">
            <div className="level-unlock-header">
              <div className="class-title-glow">
                🌟 Class Unlocked: {unlockedClass.name}
              </div>
              <span className="level-tier-badge">Tier {unlockedClass.totalPoints} • Level 1</span>
            </div>

            <div className="unlock-stats-grid">
              <div>
                Health: <strong>{updatedVitals.maxHp} HP</strong>
              </div>
              <div>
                Force: <strong>{updatedAttributes.force}</strong> | Finesse: <strong>{updatedAttributes.finesse}</strong> | Focus: <strong>{updatedAttributes.focus}</strong>
              </div>
              <div>
                Mitigation: <strong>{updatedVitals.armor} Armor</strong> / <strong>{updatedVitals.ward} Ward</strong>
              </div>
              <div>
                Initiative: <strong>{updatedVitals.speed} Speed</strong> / <strong>{updatedVitals.move} Move</strong>
              </div>
            </div>
          </div>
        )}

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
