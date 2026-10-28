import { useState, useMemo, useEffect, useCallback } from 'react';
import { Unit } from '../../core/types/unit';
import { InBattleXp } from '../../core/combat/types';
import { calculateRetainedPartyXp } from '../../core/campaign/transitions';
import { LEVEL_XP_THRESHOLDS } from '../../core/config/balance';
import { MAX_LEVEL } from '../../core/progression/pyramid';
import { resolveTokenAssetPath } from './tokenAssets';
import './HarvestDistributionModal.css';

export interface HarvestDistributionModalProps {
  readonly isOpen: boolean;
  readonly outcome: 'VICTORY' | 'DEFEAT';
  readonly squadUnits: readonly Unit[];
  readonly earnedPool: InBattleXp;
  readonly onConfirm: (allocations: Record<string, InBattleXp>) => void;
}

const ARCHETYPES: { key: keyof InBattleXp; label: string; icon: string; tag: string }[] = [
  { key: 'fighter', label: 'Force', icon: '⚔️', tag: 'FORCE' },
  { key: 'rogue', label: 'Finesse', icon: '🗡️', tag: 'FINESSE' },
  { key: 'mage', label: 'Focus', icon: '✨', tag: 'FOCUS' }
];

export function autoFillPool(
  retainedPool: InBattleXp,
  squadUnitIds: readonly string[]
): Record<string, InBattleXp> {
  const allocations: Record<string, InBattleXp> = {};
  for (const id of squadUnitIds) {
    allocations[id] = { fighter: 0, rogue: 0, mage: 0 };
  }
  if (squadUnitIds.length === 0) return allocations;

  const archetypes: (keyof InBattleXp)[] = ['fighter', 'rogue', 'mage'];
  for (const arch of archetypes) {
    const total = retainedPool[arch] ?? 0;
    const base = Math.floor(total / squadUnitIds.length);
    let remainder = total % squadUnitIds.length;

    for (let i = 0; i < squadUnitIds.length; i++) {
      const extra = remainder > 0 ? 1 : 0;
      if (remainder > 0) remainder--;
      allocations[squadUnitIds[i]][arch] = base + extra;
    }
  }

  return allocations;
}

export function HarvestDistributionModal({
  isOpen,
  outcome,
  squadUnits,
  earnedPool,
  onConfirm
}: HarvestDistributionModalProps) {
  const retainedPool = useMemo(
    () => calculateRetainedPartyXp(earnedPool, outcome),
    [earnedPool?.fighter, earnedPool?.rogue, earnedPool?.mage, outcome]
  );

  const squadUnitIds = useMemo(
    () => squadUnits.map((u) => u.id).join(','),
    [squadUnits]
  );

  const initialAllocations = useMemo(() => {
    const map: Record<string, InBattleXp> = {};
    for (const u of squadUnits) {
      map[u.id] = { fighter: 0, rogue: 0, mage: 0 };
    }
    return map;
  }, [squadUnitIds]);

  const [allocations, setAllocations] = useState<Record<string, InBattleXp>>(initialAllocations);
  const [selectedUnitId, setSelectedUnitId] = useState<string>(squadUnits[0]?.id ?? '');

  useEffect(() => {
    if (isOpen) {
      setAllocations(initialAllocations);
      if (squadUnits[0]?.id) {
        setSelectedUnitId(squadUnits[0].id);
      }
    }
  }, [isOpen, squadUnitIds]);

  const selectedUnit = useMemo(() => {
    return squadUnits.find((u) => u.id === selectedUnitId) ?? squadUnits[0];
  }, [squadUnits, selectedUnitId]);

  const allocatedTotals = useMemo(() => {
    const totals: InBattleXp = { fighter: 0, rogue: 0, mage: 0 };
    for (const alloc of Object.values(allocations)) {
      totals.fighter += alloc.fighter ?? 0;
      totals.rogue += alloc.rogue ?? 0;
      totals.mage += alloc.mage ?? 0;
    }
    return totals;
  }, [allocations]);

  const remainingPool = useMemo(() => {
    return {
      fighter: Math.max(0, retainedPool.fighter - allocatedTotals.fighter),
      rogue: Math.max(0, retainedPool.rogue - allocatedTotals.rogue),
      mage: Math.max(0, retainedPool.mage - allocatedTotals.mage)
    };
  }, [retainedPool, allocatedTotals]);

  const totalRemaining =
    remainingPool.fighter + remainingPool.rogue + remainingPool.mage;
  const isPoolDepleted = totalRemaining === 0;

  const handleAutoFill = useCallback(() => {
    const unitIds = squadUnits.map((u) => u.id);
    setAllocations(autoFillPool(retainedPool, unitIds));
  }, [squadUnits, retainedPool]);

  const handleAdjust = (unitId: string, archetype: keyof InBattleXp, delta: 1 | -1) => {
    if (delta === 1 && remainingPool[archetype] <= 0) return;
    const current = allocations[unitId]?.[archetype] ?? 0;
    if (delta === -1 && current <= 0) return;

    setAllocations((prev) => ({
      ...prev,
      [unitId]: {
        ...(prev[unitId] ?? { fighter: 0, rogue: 0, mage: 0 }),
        [archetype]: current + delta
      }
    }));
  };

  const handleReset = () => {
    setAllocations(initialAllocations);
  };

  const handleConfirm = () => {
    if (!isPoolDepleted) return;
    onConfirm(allocations);
  };

  if (!isOpen) return null;

  const isVictory = outcome === 'VICTORY';

  return (
    <div className="harvest-modal-backdrop" role="dialog" aria-modal="true" data-testid="harvest-modal">
      <div className="harvest-modal-card">
        {/* Header */}
        <div className="harvest-header">
          <span className={`harvest-badge ${isVictory ? 'victory' : 'defeat'}`}>
            {isVictory ? '✦ Harvest Trial Spoils' : '⚔️ Trial Retreat & Salvage'}
          </span>
          <h2>{isVictory ? 'Distribute Vanguard XP' : 'Salvaged Experience'}</h2>
          <p>
            {isVictory
              ? 'The Vanguard triumphed! Allocate the collective combat experience among your deployed squad.'
              : 'The Vanguard was forced to withdraw. 50% of earned combat experience was salvaged for distribution.'}
          </p>
        </div>

        {/* Pool Summary Ribbon */}
        <div className="harvest-pool-ribbon" data-testid="harvest-pool-ribbon">
          <div className="pool-ribbon-title">
            <span className="pool-label">Available Pool</span>
            <span className="pool-subtext">
              {totalRemaining > 0
                ? `${totalRemaining} XP remaining to allocate`
                : 'All XP distributed!'}
            </span>
          </div>

          <div className="pool-pills">
            {ARCHETYPES.map(({ key, label, icon }) => (
              <div
                key={key}
                className={`pool-pill pool-pill-${key} ${remainingPool[key] > 0 ? 'has-xp' : 'empty'}`}
                data-testid={`pool-pill-${key}`}
              >
                <span className="pill-icon">{icon}</span>
                <span className="pill-name">{label}</span>
                <span className="pill-val">
                  {remainingPool[key]}
                  <span className="pill-total"> / {retainedPool[key]}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="pool-actions">
            <button
              type="button"
              className="btn-harvest-action btn-autofill"
              onClick={handleAutoFill}
              data-testid="harvest-autofill-btn"
            >
              ⚡ Distribute Evenly
            </button>
            <button
              type="button"
              className="btn-harvest-action btn-reset"
              onClick={handleReset}
              data-testid="harvest-reset-btn"
            >
              ↺ Reset
            </button>
          </div>
        </div>

        {/* Main Content Layout: Left Dock, Right Inspector */}
        <div className="harvest-main-layout" data-testid="harvest-main-layout">
          {/* Squad Dock (Left) */}
          <div className="harvest-squad-dock" role="tablist" aria-label="Squad Members" data-testid="harvest-squad-dock">
            <div className="dock-header">
              <span className="dock-title">Vanguard Squad</span>
              <span className="dock-count">{squadUnits.length} Units</span>
            </div>

            <div className="dock-list">
              {squadUnits.map((unit) => {
                const isSelected = unit.id === selectedUnit?.id;
                const tokenSrc = resolveTokenAssetPath(unit);
                const unitAlloc = allocations[unit.id] ?? { fighter: 0, rogue: 0, mage: 0 };
                const baseAcc = unit.progression?.accumulatedXp ?? { fighter: 0, rogue: 0, mage: 0 };
                const currentLevel = unit.progression?.currentLevel ?? 0;
                const isMaxLevel = currentLevel >= MAX_LEVEL;
                const threshold = LEVEL_XP_THRESHOLDS[currentLevel] ?? 5;

                const totalUnitAlloc = (unitAlloc.fighter ?? 0) + (unitAlloc.rogue ?? 0) + (unitAlloc.mage ?? 0);
                const hasLevelReady = !isMaxLevel && (
                  (baseAcc.fighter ?? 0) + (unitAlloc.fighter ?? 0) >= threshold ||
                  (baseAcc.rogue ?? 0) + (unitAlloc.rogue ?? 0) >= threshold ||
                  (baseAcc.mage ?? 0) + (unitAlloc.mage ?? 0) >= threshold
                );

                return (
                  <button
                    key={unit.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    className={`dock-unit-item ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedUnitId(unit.id)}
                    data-testid={`dock-unit-${unit.id}`}
                  >
                    {tokenSrc ? (
                      <img src={tokenSrc} alt={unit.name} className="dock-token pixel-art" />
                    ) : (
                      <div className="dock-token-fallback">{unit.name.charAt(0)}</div>
                    )}
                    <div className="dock-meta">
                      <div className="dock-name-row">
                        <span className="dock-name">{unit.name}</span>
                        {hasLevelReady && (
                          <span className="dock-star-badge" title="Level Up Ready" data-testid={`dock-star-${unit.id}`}>★</span>
                        )}
                      </div>
                      <div className="dock-sub-row">
                        <span className="dock-class">
                          {unit.loadout?.activeClassId ? unit.loadout.activeClassId.toUpperCase() : 'NOVICE'}
                        </span>
                        <span className="dock-level">Lvl {currentLevel}</span>
                      </div>
                      <div className="dock-alloc-row">
                        <span className={`dock-alloc-badge ${totalUnitAlloc > 0 ? 'allocated' : ''}`}>
                          {totalUnitAlloc > 0 ? `+${totalUnitAlloc} XP` : '0 XP'}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Unit Inspector (Right) */}
          {selectedUnit && (() => {
            const unit = selectedUnit;
            const tokenSrc = resolveTokenAssetPath(unit);
            const unitAlloc = allocations[unit.id] ?? { fighter: 0, rogue: 0, mage: 0 };
            const baseAcc = unit.progression?.accumulatedXp ?? { fighter: 0, rogue: 0, mage: 0 };
            const currentLevel = unit.progression?.currentLevel ?? 0;
            const isMaxLevel = currentLevel >= MAX_LEVEL;
            const threshold = LEVEL_XP_THRESHOLDS[currentLevel] ?? 5;

            return (
              <div className="harvest-inspector-panel" data-testid={`harvest-inspector-${unit.id}`}>
                <div className="inspector-header">
                  {tokenSrc ? (
                    <img src={tokenSrc} alt={unit.name} className="inspector-token pixel-art" />
                  ) : (
                    <div className="inspector-token-fallback">{unit.name.charAt(0)}</div>
                  )}
                  <div className="inspector-meta">
                    <span className="inspector-name">{unit.name}</span>
                    <div className="inspector-submeta">
                      <span className="unit-class-badge">
                        {unit.loadout?.activeClassId ? unit.loadout.activeClassId.toUpperCase() : 'NOVICE'}
                      </span>
                      <span className="unit-level-badge" data-testid={`unit-level-badge-${unit.id}`}>
                        Level {currentLevel} {!isMaxLevel ? `(Req: ${threshold} XP)` : '(MAX)'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="unit-stepper-list">
                  {ARCHETYPES.map(({ key, label, icon, tag }) => {
                    const currentAlloc = unitAlloc[key] ?? 0;
                    const baseVal = baseAcc[key] ?? 0;
                    const canAdd = remainingPool[key] > 0;
                    const canSubtract = currentAlloc > 0;
                    const projectedVal = baseVal + currentAlloc;
                    const isThresholdMet = !isMaxLevel && projectedVal >= threshold;

                    return (
                      <div key={key} className={`stepper-row stepper-${key}`}>
                        <div className="stepper-label">
                          <span className="stepper-icon">{icon}</span>
                          <span className="stepper-tag">{tag}</span>
                        </div>

                        <div className="stepper-controls">
                          <button
                            type="button"
                            className="btn-step btn-minus"
                            disabled={!canSubtract}
                            onClick={() => handleAdjust(unit.id, key, -1)}
                            data-testid={`btn-minus-${unit.id}-${key}`}
                            aria-label={`Decrease ${label} XP for ${unit.name}`}
                          >
                            -
                          </button>
                          <span
                            className={`stepper-value ${currentAlloc > 0 ? 'allocated' : ''}`}
                            data-testid={`alloc-val-${unit.id}-${key}`}
                          >
                            {currentAlloc}
                          </span>
                          <button
                            type="button"
                            className="btn-step btn-plus"
                            disabled={!canAdd}
                            onClick={() => handleAdjust(unit.id, key, 1)}
                            data-testid={`btn-plus-${unit.id}-${key}`}
                            aria-label={`Increase ${label} XP for ${unit.name}`}
                          >
                            +
                          </button>
                        </div>

                        <div
                          className={`stepper-projected-pill ${isThresholdMet ? 'threshold-met' : ''} ${currentAlloc > 0 ? 'allocated' : ''}`}
                          data-testid={`projected-pill-${unit.id}-${key}`}
                        >
                          <span className="projected-val">{projectedVal} XP</span>
                          {isThresholdMet && (
                            <span className="milestone-star" data-testid={`milestone-star-${unit.id}-${key}`} aria-label="Level ready">
                              ★
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Footer Actions */}
        <div className="harvest-footer">
          <div
            className="harvest-confirm-wrapper"
            data-testid="harvest-confirm-wrapper"
            title={!isPoolDepleted ? 'Allocate all remaining XP to continue' : undefined}
          >
            <button
              type="button"
              className={`btn-harvest-confirm ${isVictory ? 'btn-victory' : 'btn-defeat'}`}
              disabled={!isPoolDepleted}
              onClick={handleConfirm}
              data-testid="harvest-confirm-btn"
            >
              {isVictory ? '✦ Proceed to Camp' : '↩ Retreat to Camp'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
