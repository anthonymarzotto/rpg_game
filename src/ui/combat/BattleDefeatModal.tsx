import { Unit } from '../../core/types/unit';
import { resolveTokenAssetPath } from './tokenAssets';
import './BattleDefeatModal.css';

export interface BattleDefeatModalProps {
  readonly isOpen: boolean;
  readonly squadMembers: readonly { readonly unit: Unit }[];
  readonly onRetry?: () => void;
  readonly onRetreatToCamp?: () => void;
}

export function BattleDefeatModal({
  isOpen,
  squadMembers,
  onRetry,
  onRetreatToCamp
}: BattleDefeatModalProps) {
  if (!isOpen) return null;

  return (
    <div className="defeat-modal-backdrop">
      <div className="defeat-modal-card">
        {/* Header */}
        <div className="defeat-header">
          <span className="defeat-title-badge">⚔️ Vanguard Defeated</span>
          <h2>The Trial Was Lost</h2>
          <p className="defeat-subtitle">
            All wayfarers in The Vanguard have fallen. Returning to The Nexus to regroup.
          </p>
        </div>

        {/* Squad Status Grid */}
        <div className="defeat-squad-grid">
          {squadMembers.map(({ unit }) => {
            const tokenSrc = resolveTokenAssetPath(unit);
            return (
              <div key={unit.id} className="defeat-squad-member">
                {tokenSrc ? (
                  <img
                    src={tokenSrc}
                    alt={unit.name}
                    className="defeat-member-avatar pixel-art"
                  />
                ) : (
                  <div className="defeat-member-avatar-fallback">
                    {unit.name.charAt(0)}
                  </div>
                )}
                <span className="defeat-member-name">
                  {unit.name.split(' ')[0]}
                </span>
                <span className="defeat-member-status">Fallen</span>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="defeat-actions">
          {onRetreatToCamp ? (
            <button
              className="btn-defeat-retry btn-defeat-retreat"
              onClick={onRetreatToCamp}
              data-testid="defeat-retreat-camp-btn"
            >
              ⛺ Retreat to The Nexus
            </button>
          ) : (
            <button className="btn-defeat-retry" onClick={onRetry}>
              ↺ Retry Trial
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
