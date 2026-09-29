import { EncounterDefinition } from '../../core/combat/encounter';
import { resolveTokenAssetPath } from '../combat/tokenAssets';
import './ExpeditionWarRoom.css';

export interface ExpeditionWarRoomProps {
  readonly stage: number;
  readonly encounter?: EncounterDefinition;
  readonly activeSquadCount: number;
  readonly minSquadRequired?: number;
  readonly onDeploySquad: () => void;
}

export function ExpeditionWarRoom({
  stage,
  encounter,
  activeSquadCount,
  minSquadRequired = 1,
  onDeploySquad
}: ExpeditionWarRoomProps) {
  const isSquadReady = activeSquadCount >= minSquadRequired;

  const enemyUnits = encounter
    ? encounter.units.filter((u) => u.unit.faction === 'ENEMY')
    : [];

  const estimatedThreat = enemyUnits.reduce(
    (sum, u) => sum + (u.unit.progression.currentLevel === 0 ? 10 : 20),
    0
  );

  return (
    <aside className="expedition-war-room" data-testid="expedition-war-room">
      {/* Header */}
      <div className="war-room-header">
        <span className="war-room-badge font-mono">Stage Reconnaissance</span>
        <h2 className="war-room-stage-title font-display">
          Stage {stage}: {encounter?.name ?? 'Approaching Threats'}
        </h2>
      </div>

      {/* Detected Hostiles / Intel */}
      <div className="war-room-intel-section">
        <div className="intel-section-title font-ui">
          <span>Detected Threats ({enemyUnits.length})</span>
          <span className="threat-budget-pill font-mono">
            Threat: {estimatedThreat || 30} pts
          </span>
        </div>

        <div className="enemy-tokens-list">
          {enemyUnits.length === 0 ? (
            <div className="text-muted font-ui">Reconnaissance in progress...</div>
          ) : (
            enemyUnits.map(({ unit }) => {
              const tokenSrc = resolveTokenAssetPath(unit);
              return (
                <div key={unit.id} className="enemy-token-card" data-testid={`enemy-intel-${unit.id}`}>
                  <div className="enemy-token-avatar-wrap">
                    {tokenSrc ? (
                      <img src={tokenSrc} alt={unit.name} className="enemy-token-img pixel-art" />
                    ) : (
                      <span className="enemy-token-fallback">{unit.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="enemy-token-info">
                    <div className="enemy-token-name font-ui">{unit.name}</div>
                    <div className="enemy-token-class font-mono">
                      Lv {unit.progression.currentLevel} {unit.loadout.activeClassId}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Squad Readiness Check */}
      <div className="readiness-section">
        <div className="readiness-label font-ui">
          <span>Squad Readiness:</span>
          <span className={isSquadReady ? 'readiness-status-ready' : 'readiness-status-empty'}>
            {activeSquadCount} / 3 Heroes Ready
          </span>
        </div>
        {!isSquadReady && (
          <span className="readiness-warning font-ui">
            Deploy at least 1 hero into the active vanguard before departing.
          </span>
        )}
      </div>

      {/* Deploy Primary CTA */}
      <button
        type="button"
        className="deploy-squad-btn font-ui"
        onClick={onDeploySquad}
        disabled={!isSquadReady}
        data-testid="deploy-squad-btn"
      >
        ⚔️ DEPLOY SQUAD
      </button>
    </aside>
  );
}
