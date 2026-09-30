import { Archetype, UnitProgression } from '../../core/types/class';
import { MAX_ARCHETYPE_POINTS, MAX_LEVEL } from '../../core/progression/pyramid';

export interface LevelUpSimulatorProps {
  readonly progression: UnitProgression;
  readonly onLevelUp: (archetype: Archetype) => void;
  readonly onApplyPreset: (archetypes: readonly Archetype[]) => void;
  readonly onReset: () => void;
}

export function LevelUpSimulator({
  progression,
  onLevelUp,
  onApplyPreset,
  onReset
}: LevelUpSimulatorProps) {
  const isCapped = progression.currentLevel >= MAX_LEVEL;

  return (
    <>
      {/* Level Up Simulator Controls */}
      <div className="sim-controls">
        <div className="sim-section-label">Ascend Archetype Level</div>
        <div className="point-buttons">
          <button
            className="btn-point fighter"
            disabled={
              isCapped ||
              progression.archetypePoints.fighter >= MAX_ARCHETYPE_POINTS
            }
            onClick={() => onLevelUp('FIGHTER')}
          >
            <span>+ Fighter</span>
          </button>
          <button
            className="btn-point rogue"
            disabled={
              isCapped ||
              progression.archetypePoints.rogue >= MAX_ARCHETYPE_POINTS
            }
            onClick={() => onLevelUp('ROGUE')}
          >
            <span>+ Rogue</span>
          </button>
          <button
            className="btn-point mage"
            disabled={
              isCapped ||
              progression.archetypePoints.mage >= MAX_ARCHETYPE_POINTS
            }
            onClick={() => onLevelUp('MAGE')}
          >
            <span>+ Mage</span>
          </button>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="sim-controls">
        <div className="sim-section-label">Constellation Presets</div>
        <div className="presets-grid">
          <button
            className="btn-preset"
            onClick={() =>
              onApplyPreset([
                'FIGHTER', 'FIGHTER', 'MAGE', 'FIGHTER', 'FIGHTER', 'FIGHTER', 'MAGE', 'ROGUE', 'ROGUE'
              ])
            }
          >
            Warlord (5F 2R 2M)
          </button>
          <button
            className="btn-preset"
            onClick={() =>
              onApplyPreset([
                'FIGHTER', 'FIGHTER', 'MAGE', 'FIGHTER', 'MAGE', 'FIGHTER', 'MAGE', 'FIGHTER', 'MAGE'
              ])
            }
          >
            Paladin (5F 0R 4M)
          </button>
          <button
            className="btn-preset"
            onClick={() =>
              onApplyPreset([
                'ROGUE', 'ROGUE', 'MAGE', 'ROGUE', 'ROGUE', 'MAGE', 'ROGUE', 'MAGE', 'MAGE'
              ])
            }
          >
            Shadow-mancer (0F 5R 4M)
          </button>
          <button
            className="btn-preset"
            onClick={() =>
              onApplyPreset([
                'FIGHTER', 'ROGUE', 'MAGE', 'FIGHTER', 'ROGUE', 'MAGE', 'FIGHTER', 'ROGUE', 'MAGE'
              ])
            }
          >
            Bard (3F 3R 3M)
          </button>
          <button
            className="btn-preset"
            onClick={() =>
              onApplyPreset([
                'FIGHTER', 'ROGUE', 'MAGE', 'FIGHTER', 'ROGUE', 'FIGHTER', 'MAGE', 'FIGHTER', 'FIGHTER'
              ])
            }
          >
            Min Path (3 Classes)
          </button>
          <button
            className="btn-preset"
            onClick={() =>
              onApplyPreset([
                'FIGHTER', 'FIGHTER', 'ROGUE', 'FIGHTER', 'ROGUE', 'FIGHTER', 'ROGUE', 'FIGHTER', 'ROGUE'
              ])
            }
          >
            Max Path (9 Classes)
          </button>
        </div>

        <button className="btn-reset" onClick={onReset}>
          ↺ Reset to Novice (Level 0)
        </button>
      </div>
    </>
  );
}
