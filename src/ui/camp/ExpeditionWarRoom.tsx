import { EncounterDefinition } from '../../core/combat/encounter';
import { resolveTokenAssetPath } from '../combat/tokenAssets';
import { computeUnitThreat, getStageDeploymentBudget } from '../../core/campaign/threatBudget';
import { isLocalhost } from '../../core/config/environment';
import './ExpeditionWarRoom.css';

export interface ExpeditionWarRoomProps {
  readonly stage: number;
  readonly encounter?: EncounterDefinition;
  readonly activeSquadCount: number;
  readonly activeSquadThreat?: number;
  readonly deploymentBudget?: number;
  readonly minSquadRequired?: number;
  readonly onDeploySquad: () => void;
  readonly onRerollEncounter?: () => void;
}

export function ExpeditionWarRoom({
  stage,
  encounter,
  activeSquadCount,
  activeSquadThreat,
  deploymentBudget,
  minSquadRequired = 1,
  onDeploySquad,
  onRerollEncounter
}: ExpeditionWarRoomProps) {
  const stageBudget = deploymentBudget ?? getStageDeploymentBudget(stage);
  const isOverBudget = activeSquadThreat != null && activeSquadThreat > stageBudget;
  const isDevEnvironment = isLocalhost();
  const isBudgetValid = !isOverBudget || isDevEnvironment;
  const isSquadReady = activeSquadCount >= minSquadRequired && isBudgetValid;

  const enemyUnits = encounter
    ? encounter.units.filter((u) => u.unit.faction === 'ENEMY')
    : [];

  const estimatedThreat = enemyUnits.reduce(
    (sum, u) => sum + computeUnitThreat(u.unit),
    0
  );

  return (
    <aside className="expedition-war-room" data-testid="expedition-war-room">
      {/* Header */}
      <div className="war-room-header">
        <div className="war-room-header-left">
          <span className="war-room-badge font-mono">Upcoming Tournament Bout</span>
          <h2 className="war-room-stage-title font-display">
            Trial {stage}: {encounter?.name ?? 'Approaching Bout'}
          </h2>
        </div>
        {onRerollEncounter && (
          <button
            type="button"
            className="reroll-trial-btn font-ui"
            onClick={onRerollEncounter}
            title="Find another match: Scout a different Rival Company bout"
            aria-label="Scout Another Bout"
            data-testid="reroll-trial-btn"
          >
            ⟳
          </button>
        )}
      </div>

      {/* Contenders / Intel */}
      <div className="war-room-intel-section">
        <div className="intel-section-title font-ui">
          <span>Contenders ({enemyUnits.length})</span>
          <span className="threat-budget-pill font-mono">
            Budget: {estimatedThreat || 30} pts
          </span>
        </div>

        <div className="enemy-tokens-list">
          {enemyUnits.length === 0 ? (
            <div className="text-muted font-ui">Scouting the Trial Grounds...</div>
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

      {/* Staging Dais Readiness Check */}
      <div className="readiness-section">
        <div className="readiness-label font-ui">
          <span>Readiness:</span>
          <span className={isSquadReady ? 'readiness-status-ready' : 'readiness-status-empty'}>
            {activeSquadThreat != null
              ? `${activeSquadCount} Staged (${activeSquadThreat} / ${stageBudget} Pts)`
              : `${activeSquadCount} / 3 Wayfarers Staged`}
          </span>
        </div>
        {activeSquadCount < minSquadRequired && (
          <span className="readiness-warning font-ui">
            Stage at least 1 wayfarer on The Staging Dais before entering the bout.
          </span>
        )}
      </div>


      {/* Enter Bout Primary CTA */}
      <button
        type="button"
        className="deploy-squad-btn font-ui"
        onClick={onDeploySquad}
        disabled={!isSquadReady}
        title={
          !isSquadReady
            ? activeSquadCount < minSquadRequired
              ? 'Stage at least 1 wayfarer on The Staging Dais before entering the bout.'
              : `Staged weight (${activeSquadThreat} pts) exceeds Trial Budget (${stageBudget} pts)`
            : isOverBudget && isDevEnvironment
              ? `Enter the tournament bout (Dev Mode: Staged weight ${activeSquadThreat} pts exceeds ${stageBudget} pts Trial Budget)`
              : 'Step onto the Celestial Trial Grounds'
        }
        data-testid="deploy-squad-btn"
      >
        ✦ ENTER BOUT
      </button>
    </aside>
  );
}
