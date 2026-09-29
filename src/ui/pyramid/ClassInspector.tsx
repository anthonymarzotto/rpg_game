import { Archetype, ClassDefinition, UnitProgression } from '../../core/types/class';
import {
  isClassEligibleNextLevel,
  isClassLockedOut,
  MAX_ARCHETYPE_POINTS,
  MAX_LEVEL
} from '../../core/progression/pyramid';
import { ProjectionMode } from './geometry';
import { LevelUpSimulator } from './LevelUpSimulator';
import { ConstellationHistory } from './ConstellationHistory';

export interface ClassInspectorOverlayProps {
  readonly inspectedClass: ClassDefinition | null;
  readonly progression: UnitProgression;
  readonly unlockedSet: ReadonlySet<string>;
}

export function ClassInspectorOverlay({
  inspectedClass,
  progression,
  unlockedSet
}: ClassInspectorOverlayProps) {
  if (!inspectedClass) return null;

  const isUnlocked = unlockedSet.has(inspectedClass.id);
  const isLocked = isClassLockedOut(
    inspectedClass,
    progression.currentLevel,
    progression.archetypePoints,
    isUnlocked
  );
  const isEligible = isClassEligibleNextLevel(
    inspectedClass,
    progression.currentLevel,
    progression.archetypePoints,
    isUnlocked
  );

  return (
    <div className="inspector-overlay">
      <div className="inspector-header">
        <span className="inspector-tier">Tier {inspectedClass.totalPoints}</span>
        <span className="text-dim">
          #{inspectedClass.no}
        </span>
      </div>
      <div className="inspector-name">{inspectedClass.name}</div>
      <div className="inspector-reqs">
        Req: <span className="text-fighter">{inspectedClass.requirements.fighter}F</span> /{' '}
        <span className="text-rogue">{inspectedClass.requirements.rogue}R</span> /{' '}
        <span className="text-mage">{inspectedClass.requirements.mage}M</span>
      </div>
      <div className="inspector-status">
        {isUnlocked ? (
          <span className="status-unlocked">★ Unlocked in Constellation</span>
        ) : isLocked ? (
          <span className="status-locked">
            ✕ Locked Out{' '}
            {inspectedClass.totalPoints <= progression.currentLevel
              ? '(Lower Tier)'
              : '(Archetype Incompatible)'}
          </span>
        ) : isEligible ? (
          <span className="status-eligible">✦ Eligible Next Level</span>
        ) : (
          <span className="status-unreached">○ Future Pathway</span>
        )}
      </div>
    </div>
  );
}

export interface ClassInspectorSidebarProps {
  readonly progression: UnitProgression;
  readonly activeClass: ClassDefinition | null;
  readonly mode: ProjectionMode;
  readonly onToggleMode: (mode: ProjectionMode) => void;
  readonly onLevelUp: (archetype: Archetype) => void;
  readonly onApplyPreset: (archetypes: readonly Archetype[]) => void;
  readonly onReset: () => void;
}

export function ClassInspectorSidebar({
  progression,
  activeClass,
  mode,
  onToggleMode,
  onLevelUp,
  onApplyPreset,
  onReset
}: ClassInspectorSidebarProps) {
  return (
    <div className="hud-sidebar">
      <div className="hud-header">
        <h1>Class Constellation</h1>
        <div className="hud-subtitle">100-Class Pyramid Progression</div>
      </div>

      {/* Projection Mode Toggle */}
      <div className="view-toggle-grid">
        <button
          className={`btn-toggle ${mode === 'triangle-mosaic' ? 'active' : ''}`}
          onClick={() => onToggleMode('triangle-mosaic')}
        >
          ▲ Triangle Mosaic
        </button>
        <button
          className={`btn-toggle ${mode === 'triangle-grid' ? 'active' : ''}`}
          onClick={() => onToggleMode('triangle-grid')}
        >
          ✦ Star Pyramid
        </button>
      </div>

      {/* Unit Status Card */}
      <div className="unit-card">
        <div className="unit-card-title">
          <span className="unit-level-badge">
            Level {progression.currentLevel} / {MAX_LEVEL}
          </span>
          <span className="text-dim">
            {progression.currentLevel === MAX_LEVEL
              ? 'Capstone Sealed'
              : 'Novice Adventurer'}
          </span>
        </div>
        <div className="unit-primary-class">
          {activeClass ? activeClass.name : 'Novice'}
        </div>

        {/* Archetype Points Meters */}
        <div className="points-grid">
          <div className="point-bar-item">
            <span className="text-fighter font-semibold">Fighter</span>
            <div className="bar-track">
              <div
                className="bar-fill bar-fill-fighter"
                style={{
                  width: `${(progression.archetypePoints.fighter / MAX_ARCHETYPE_POINTS) * 100}%`
                }}
              />
            </div>
            <span>
              {progression.archetypePoints.fighter} / {MAX_ARCHETYPE_POINTS}
            </span>
          </div>

          <div className="point-bar-item">
            <span className="text-rogue font-semibold">Rogue</span>
            <div className="bar-track">
              <div
                className="bar-fill bar-fill-rogue"
                style={{
                  width: `${(progression.archetypePoints.rogue / MAX_ARCHETYPE_POINTS) * 100}%`
                }}
              />
            </div>
            <span>
              {progression.archetypePoints.rogue} / {MAX_ARCHETYPE_POINTS}
            </span>
          </div>

          <div className="point-bar-item">
            <span className="text-mage font-semibold">Mage</span>
            <div className="bar-track">
              <div
                className="bar-fill bar-fill-mage"
                style={{
                  width: `${(progression.archetypePoints.mage / MAX_ARCHETYPE_POINTS) * 100}%`
                }}
              />
            </div>
            <span>
              {progression.archetypePoints.mage} / {MAX_ARCHETYPE_POINTS}
            </span>
          </div>
        </div>
      </div>

      {/* Level Up Simulator Controls */}
      <LevelUpSimulator
        progression={progression}
        onLevelUp={onLevelUp}
        onApplyPreset={onApplyPreset}
        onReset={onReset}
      />

      {/* Constellation Traversal History */}
      <ConstellationHistory constellation={progression.constellation} />
    </div>
  );
}
