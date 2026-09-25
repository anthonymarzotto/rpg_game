import { Unit } from '../../core/types/unit';
import { TokenAesthetic, resolveTokenAssetPath, isPixelAsset } from './tokenAssets';
import './BattleDefeatModal.css';

export interface BattleDefeatModalProps {
  readonly isOpen: boolean;
  readonly squadMembers: readonly { readonly unit: Unit }[];
  readonly tokenAesthetic?: TokenAesthetic;
  readonly onRetry: () => void;
}

export function BattleDefeatModal({
  isOpen,
  squadMembers,
  tokenAesthetic = 'stained-glass',
  onRetry
}: BattleDefeatModalProps) {
  if (!isOpen) return null;

  return (
    <div className="defeat-modal-backdrop">
      <div className="defeat-modal-card">
        {/* Header */}
        <div className="defeat-header">
          <span className="defeat-title-badge">⚔️ Squad Defeated</span>
          <h2>The Skirmish Was Lost</h2>
          <p className="defeat-subtitle">
            All party members have fallen on the tactical field.
          </p>
        </div>

        {/* Squad Status Grid */}
        <div className="defeat-squad-grid">
          {squadMembers.map(({ unit }) => {
            const tokenSrc = resolveTokenAssetPath(unit, tokenAesthetic);
            const isPixel = isPixelAsset(tokenSrc);
            return (
              <div key={unit.id} className="defeat-squad-member">
                {tokenSrc ? (
                  <img
                    src={tokenSrc}
                    alt={unit.name}
                    className="defeat-member-avatar"
                    style={isPixel ? { imageRendering: 'pixelated' } : undefined}
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
          <button className="btn-defeat-retry" onClick={onRetry}>
            ↺ Retry Skirmish
          </button>
        </div>
      </div>
    </div>
  );
}
