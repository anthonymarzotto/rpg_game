import { useMemo } from 'react';
import { PostBattleReconciliationResult } from '../../core/progression/postBattle';
import { Archetype } from '../../core/types/class';
import { Ability } from '../../core/types/ability';
import { getClassAbilities } from '../../data/abilities';
import './BattleVictoryModal.css';

export interface BattleVictoryModalProps {
  readonly isOpen: boolean;
  readonly reconciliationResult: PostBattleReconciliationResult | null;
  readonly currentAbilities: readonly Ability[];
  readonly onSelectArchetypeChoice: (archetype: Archetype) => void;
  readonly onSwapAbility: (slotIndex: number, newAbility: Ability) => void;
  readonly onRematch: () => void;
  readonly onDismiss: () => void;
}

export function BattleVictoryModal({
  isOpen,
  reconciliationResult,
  currentAbilities,
  onSelectArchetypeChoice,
  onSwapAbility,
  onRematch,
  onDismiss
}: BattleVictoryModalProps) {
  if (!isOpen || !reconciliationResult) {
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
  } = reconciliationResult;

  // Retrieve bespoke abilities defined for the unlocked class
  const newClassAbilities = useMemo(() => {
    return unlockedClass ? getClassAbilities(unlockedClass.id) : [];
  }, [unlockedClass]);

  const signatureAbility = newClassAbilities[0] as Ability | undefined;

  // Filter combat action slots (exclude Move / Wait universal actions)
  const activeClassSlots = useMemo(() => {
    return currentAbilities.filter((a) => a.id !== 'move' && a.id !== 'wait').slice(0, 3);
  }, [currentAbilities]);

  return (
    <div className="victory-modal-backdrop" role="dialog" aria-modal="true">
      <div className="victory-modal-card">
        {/* Header */}
        <div className="victory-header">
          <span className="victory-title-badge">🏆 Objective Complete</span>
          <h2>Trial Victory!</h2>
          <p>You have satisfied the combat trial milestone.</p>
        </div>

        {/* Archetype XP Breakdown */}
        <div>
          <div className="victory-section-title">Archetype XP Earned</div>
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
            <div className="victory-section-title" style={{ color: '#fbbf24' }}>
              ✦ Multiple Paths Available!
            </div>
            <p style={{ margin: '0.2rem 0', fontSize: '0.82rem', color: '#cbd5e1' }}>
              Your actions qualified for multiple archetypes. Choose which path to advance first:
            </p>
            <div className="choice-buttons-grid">
              {qualifyingArchetypes.map((archetype) => (
                <button
                  key={archetype}
                  className="btn-choice"
                  onClick={() => onSelectArchetypeChoice(archetype)}
                >
                  {archetype === 'FIGHTER' && '⚔️ Advance Warrior (Fighter)'}
                  {archetype === 'ROGUE' && '🗡️ Advance Thief (Rogue)'}
                  {archetype === 'MAGE' && '🔮 Advance Wizard (Mage)'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Unlocked Class & Stat Growth */}
        {unlockedClass && (
          <div className="level-unlock-card">
            <div className="level-unlock-header">
              <div className="class-title-glow">
                🌟 Unlocked: {unlockedClass.name}
              </div>
              <span className="level-tier-badge">Tier {unlockedClass.totalPoints} • Level 1</span>
            </div>

            <div className="unlock-stats-grid">
              <div>
                Health: <strong>{updatedVitals.maxHp} HP</strong> <span className="stat-gain">(+5 HP)</span>
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

        {/* Ability Loadout Customizer */}
        {signatureAbility && (
          <div className="ability-swap-section">
            <div className="victory-section-title">New Signature Ability</div>
            <div className="new-ability-preview">
              <div className="ability-info">
                <h4>{signatureAbility.name} ({signatureAbility.apCost} AP)</h4>
                <p>{signatureAbility.description}</p>
              </div>
            </div>

            <div className="victory-section-title" style={{ fontSize: '0.72rem', marginTop: '0.5rem' }}>
              Click an Active Slot below to Swap In this ability:
            </div>
            <div className="swap-slots-grid">
              {activeClassSlots.map((ability, idx) => {
                const isEquipped = ability.id === signatureAbility.id;
                return (
                  <button
                    key={ability.id}
                    className={`slot-swap-btn ${isEquipped ? 'active-skill' : ''}`}
                    onClick={() => onSwapAbility(idx, signatureAbility)}
                    title={isEquipped ? 'Currently equipped' : `Click to swap ${ability.name} with ${signatureAbility.name}`}
                  >
                    <span className="slot-number">Slot {idx + 1}</span>
                    <span className="slot-ability-name">
                      {isEquipped ? `✓ ${ability.name}` : `⇄ ${ability.name}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="victory-modal-actions">
          <button className="btn-rematch-action" onClick={onRematch}>
            ⚔️ Continue / Rematch with {unlockedClass ? unlockedClass.name : 'Unit'}
          </button>
          <button className="btn-dismiss-action" onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
