import { CombatUnit } from '../../core/combat/types';
import { TokenAesthetic, resolveTokenAssetPath, isPixelAsset } from './tokenAssets';

export interface EnemyTurnBannerProps {
  readonly activeCu: CombatUnit | undefined;
  readonly actionDescription: string | null;
  readonly tokenAesthetic?: TokenAesthetic;
}

export function EnemyTurnBanner({
  activeCu,
  actionDescription,
  tokenAesthetic = 'stained-glass'
}: EnemyTurnBannerProps) {
  if (!activeCu) return null;

  const currentAp = activeCu.currentAp;
  const tokenSrc = resolveTokenAssetPath(activeCu.unit, tokenAesthetic);
  const isPixel = isPixelAsset(tokenSrc);

  return (
    <div className="combat-action-bar-container enemy-turn-bar">
      {/* Unit Thumbnail */}
      <div className="enemy-turn-avatar-block">
        {tokenSrc ? (
          <img
            src={tokenSrc}
            alt={activeCu.unit.name}
            className="enemy-turn-avatar-img"
            style={isPixel ? { imageRendering: 'pixelated' } : undefined}
          />
        ) : (
          <span className="enemy-turn-avatar-fallback" role="img" aria-label="Hostile unit">🎯</span>
        )}
      </div>

      {/* Unit Identification */}
      <div className="enemy-turn-identity">
        <div className="enemy-turn-tag-row">
          <span className="enemy-badge">Hostile Turn</span>
        </div>
        <span className="enemy-turn-name">{activeCu.unit.name}</span>
      </div>

      {/* Live Action Status Banner */}
      <div className="enemy-intent-pill">
        <span className="enemy-intent-pulse" />
        <span className="enemy-intent-text">
          {actionDescription ?? 'Evaluating tactical positions...'}
        </span>
      </div>

      {/* Hostile AP Counter */}
      <div
        className="ap-counter-pill hostile-ap"
        title={`Action Points: ${currentAp} / 3`}
      >
        <span className="ap-label hostile">AP</span>
        <div className="ap-dots">
          {[0, 1, 2].map((pip) => (
            <div
              key={pip}
              className={`ap-dot hostile ${pip < currentAp ? 'filled' : 'spent'}`}
            />
          ))}
        </div>
        <span className="ap-text">{currentAp}/3</span>
      </div>
    </div>
  );
}
