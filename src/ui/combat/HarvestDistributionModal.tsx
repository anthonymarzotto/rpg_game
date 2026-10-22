import { useState, useMemo, useEffect, useCallback } from 'react';
import { Unit } from '../../core/types/unit';
import { InBattleXp } from '../../core/combat/types';
import { calculateRetainedPartyXp } from '../../core/campaign/transitions';
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
  { key: 'fighter', label: 'Force', icon: '⚔️', tag: 'FRC' },
  { key: 'rogue', label: 'Finesse', icon: '🗡️', tag: 'FIN' },
  { key: 'mage', label: 'Focus', icon: '✨', tag: 'FOC' }
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

  useEffect(() => {
    if (isOpen) {
      setAllocations(initialAllocations);
    }
  }, [isOpen, squadUnitIds]);

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

        {/* Squad Unit Steppers Grid */}
        <div className="harvest-squad-grid" data-testid="harvest-squad-grid">
          {squadUnits.map((unit) => {
            const tokenSrc = resolveTokenAssetPath(unit);
            const unitAlloc = allocations[unit.id] ?? { fighter: 0, rogue: 0, mage: 0 };
            const baseAcc = unit.progression?.accumulatedXp ?? { fighter: 0, rogue: 0, mage: 0 };

            return (
              <div key={unit.id} className="harvest-unit-card" data-testid={`harvest-unit-${unit.id}`}>
                <div className="unit-card-header">
                  {tokenSrc ? (
                    <img src={tokenSrc} alt={unit.name} className="unit-card-token pixel-art" />
                  ) : (
                    <div className="unit-card-token-fallback">{unit.name.charAt(0)}</div>
                  )}
                  <div className="unit-card-meta">
                    <span className="unit-name">{unit.name}</span>
                    <span className="unit-class-badge">
                      {unit.loadout?.activeClassId ? unit.loadout.activeClassId.toUpperCase() : 'NOVICE'}
                    </span>
                  </div>
                </div>

                <div className="unit-stepper-list">
                  {ARCHETYPES.map(({ key, label, icon, tag }) => {
                    const currentAlloc = unitAlloc[key] ?? 0;
                    const baseVal = baseAcc[key] ?? 0;
                    const canAdd = remainingPool[key] > 0;
                    const canSubtract = currentAlloc > 0;

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
                            +{currentAlloc}
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

                        <div className="stepper-projected">
                          <span className="projected-label">Total:</span>
                          <span className="projected-val">{baseVal + currentAlloc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="harvest-footer">
          <div className="harvest-footer-status">
            {!isPoolDepleted && (
              <span className="status-warning" data-testid="harvest-status-warning">
                Allocate all remaining XP to continue (or click Distribute Evenly)
              </span>
            )}
          </div>

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
  );
}
