import React, { useState, useMemo } from 'react';
import { Unit } from '../../core/types/unit';
import { Archetype, ArchetypePoints } from '../../core/types/class';
import {
  WayfarerAttunementId,
  getAvailableAttunements,
  ALL_ASTRAL_SHARDS,
  getEligibleDomainUnlocks
} from '../../core/progression/harmonization';
import './OffNodeChoiceModal.css';

export interface OffNodeChoiceModalProps {
  readonly isOpen: boolean;
  readonly hero: Unit;
  readonly archetype: Archetype;
  readonly targetPoints: ArchetypePoints;
  readonly onConfirm: (choice: {
    readonly attunementId: WayfarerAttunementId;
    readonly unlockedAbilityId?: string;
    readonly earnedShardId?: string;
  }) => void;
  readonly onCancel: () => void;
}

export const OffNodeChoiceModal: React.FC<OffNodeChoiceModalProps> = ({
  isOpen,
  hero,
  archetype,
  targetPoints,
  onConfirm,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedAttunementId, setSelectedAttunementId] = useState<WayfarerAttunementId | null>(null);
  const [step2Mode, setStep2Mode] = useState<'DOMAIN' | 'SHARD'>('DOMAIN');
  const [selectedAbilityId, setSelectedAbilityId] = useState<string | null>(null);
  const [selectedShardId, setSelectedShardId] = useState<string | null>(null);

  // Available attunements for this coordinate (includes Zenith if tri-centroid)
  const availableAttunements = useMemo(() => {
    return getAvailableAttunements(targetPoints);
  }, [targetPoints]);

  // Target level after advancing
  const targetLevel = hero.progression.currentLevel + 1;

  // Query eligible unlearned domain abilities for this archetype
  const eligibleDomainAbilities = useMemo(() => {
    return getEligibleDomainUnlocks(hero, archetype, targetLevel);
  }, [hero, archetype, targetLevel]);

  if (!isOpen) {
    return null;
  }

  const handleProceedToStep2 = () => {
    if (!selectedAttunementId) return;
    setCurrentStep(2);
    // If no eligible domain abilities, default to shard mode
    if (eligibleDomainAbilities.length === 0) {
      setStep2Mode('SHARD');
    }
  };

  const handleConfirm = () => {
    if (!selectedAttunementId) return;
    if (step2Mode === 'DOMAIN' && selectedAbilityId) {
      onConfirm({
        attunementId: selectedAttunementId,
        unlockedAbilityId: selectedAbilityId
      });
    } else if (step2Mode === 'SHARD' && selectedShardId) {
      onConfirm({
        attunementId: selectedAttunementId,
        earnedShardId: selectedShardId
      });
    }
  };

  const canConfirmStep2 =
    (step2Mode === 'DOMAIN' && Boolean(selectedAbilityId)) ||
    (step2Mode === 'SHARD' && Boolean(selectedShardId));

  return (
    <div className="offnode-modal-backdrop" data-testid="offnode-choice-modal">
      <div className="offnode-modal-panel">
        {/* Header */}
        <header className="offnode-modal-header">
          <div className="offnode-header-title-wrap">
            <h3 className="offnode-modal-title font-display">✦ Wayfarer Milestone Reached</h3>
            <span className="offnode-modal-subtitle font-ui">
              {hero.name} reaches Level {targetLevel} • Off-Node Starlight Waypoint
            </span>
          </div>

          <div className="offnode-step-indicators font-mono">
            <span className={`offnode-step-pill ${currentStep === 1 ? 'active' : 'completed'}`}>
              1. Attunement
            </span>
            <span className={`offnode-step-pill ${currentStep === 2 ? 'active' : ''}`}>
              2. Specialization
            </span>
          </div>
        </header>

        {/* Body */}
        <div className="offnode-modal-body">
          {currentStep === 1 && (
            <>
              <p className="offnode-section-prompt font-ui">
                Harmonize your soul with the constellation. Select a permanent Wayfarer Attunement to
                reinforce your defensive vitals:
              </p>

              <div className="offnode-cards-grid">
                {availableAttunements.map((attunement) => {
                  const isSelected = selectedAttunementId === attunement.id;
                  const isZenith = attunement.id === 'wayfarer_zenith';
                  return (
                    <button
                      key={attunement.id}
                      type="button"
                      className={`offnode-choice-card ${isZenith ? 'zenith' : ''} ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedAttunementId(attunement.id)}
                      data-testid={`btn-attunement-${attunement.id}`}
                    >
                      <div className="offnode-card-top">
                        <span className="offnode-card-icon">{attunement.icon}</span>
                        <span className="offnode-card-tag font-mono">{attunement.archetype}</span>
                      </div>
                      <h4 className="offnode-card-name font-display">{attunement.name}</h4>
                      <p className="offnode-card-deltas font-mono">{attunement.description}</p>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {currentStep === 2 && (
            <>
              <p className="offnode-section-prompt font-ui">
                Choose your strategic milestone: expand your tactical breadth with a Domain Skill
                Unlock, or augment your abilities with an Astral Shard:
              </p>

              {/* Mode Switcher */}
              <div className="offnode-tab-switcher font-ui">
                <button
                  type="button"
                  className={`offnode-tab-btn ${step2Mode === 'DOMAIN' ? 'active' : ''}`}
                  onClick={() => setStep2Mode('DOMAIN')}
                  data-testid="tab-domain-skills"
                >
                  ✦ Domain Skill Unlock ({eligibleDomainAbilities.length})
                </button>
                <button
                  type="button"
                  className={`offnode-tab-btn ${step2Mode === 'SHARD' ? 'active' : ''}`}
                  onClick={() => setStep2Mode('SHARD')}
                  data-testid="tab-astral-shards"
                >
                  💠 Astral Augment Shard ({ALL_ASTRAL_SHARDS.length})
                </button>
              </div>

              {/* Tab: Domain Skill Unlocks */}
              {step2Mode === 'DOMAIN' && (
                <div className="offnode-ability-list">
                  {eligibleDomainAbilities.length === 0 ? (
                    <div className="offnode-empty-msg font-ui">
                      No unlearned {archetype} domain abilities available at Tier ≤ {targetLevel}.
                      Please select an Astral Augment Shard instead.
                    </div>
                  ) : (
                    eligibleDomainAbilities.map((ability) => {
                      const isSelected = selectedAbilityId === ability.id;
                      return (
                        <button
                          key={ability.id}
                          type="button"
                          className={`offnode-ability-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedAbilityId(ability.id)}
                          data-testid={`btn-domain-ability-${ability.id}`}
                        >
                          <div className="offnode-ability-head">
                            <span className="offnode-ability-title font-display">{ability.name}</span>
                            <div className="offnode-ability-badges font-mono">
                              <span className="offnode-badge-ap">{ability.apCost} AP</span>
                              <span className="offnode-badge-range">Range {ability.range}</span>
                            </div>
                          </div>
                          <p className="offnode-ability-desc font-ui">{ability.description}</p>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* Tab: Astral Augment Shards */}
              {step2Mode === 'SHARD' && (
                <div className="offnode-shards-grid">
                  {ALL_ASTRAL_SHARDS.map((shard) => {
                    const isSelected = selectedShardId === shard.id;
                    return (
                      <button
                        key={shard.id}
                        type="button"
                        className={`offnode-shard-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedShardId(shard.id)}
                        data-testid={`btn-astral-shard-${shard.id}`}
                      >
                        <div className="offnode-shard-head">
                          <span className="offnode-shard-icon">{shard.icon}</span>
                          <span className="offnode-shard-name font-display">{shard.name}</span>
                        </div>
                        <p className="offnode-shard-desc font-ui">{shard.description}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <footer className="offnode-modal-footer">
          <div className="offnode-footer-left">
            {currentStep === 1 ? (
              <button
                type="button"
                className="btn-offnode-secondary font-ui"
                onClick={onCancel}
                data-testid="btn-cancel-offnode"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                className="btn-offnode-secondary font-ui"
                onClick={() => setCurrentStep(1)}
                data-testid="btn-back-step1"
              >
                ← Back
              </button>
            )}
          </div>

          <div className="offnode-footer-right">
            {currentStep === 1 ? (
              <button
                type="button"
                className="btn-offnode-primary font-ui"
                onClick={handleProceedToStep2}
                disabled={!selectedAttunementId}
                data-testid="btn-proceed-step2"
              >
                Proceed to Specialization →
              </button>
            ) : (
              <button
                type="button"
                className="btn-offnode-primary font-ui"
                onClick={handleConfirm}
                disabled={!canConfirmStep2}
                data-testid="btn-confirm-offnode"
              >
                Confirm Wayfarer Milestone ✦
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};
