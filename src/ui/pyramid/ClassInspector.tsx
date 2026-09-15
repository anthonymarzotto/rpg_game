import { Archetype, ClassDefinition, UnitProgression } from '../../core/types/class';
import { CLASSES_BY_ID } from '../../data/classes';
import {
  isClassEligibleNextLevel,
  isClassLockedOut,
  MAX_ARCHETYPE_POINTS,
  MAX_LEVEL
} from '../../core/progression/pyramid';
import { ProjectionMode } from './geometry';

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
        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
          #{inspectedClass.no}
        </span>
      </div>
      <div className="inspector-name">{inspectedClass.name}</div>
      <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.35rem' }}>
        Req: <span style={{ color: '#ef4444' }}>{inspectedClass.requirements.fighter}F</span> /{' '}
        <span style={{ color: '#10b981' }}>{inspectedClass.requirements.rogue}R</span> /{' '}
        <span style={{ color: '#8b5cf6' }}>{inspectedClass.requirements.mage}M</span>
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
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
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
            <span style={{ color: 'var(--color-fighter)', fontWeight: 600 }}>Fighter</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${(progression.archetypePoints.fighter / MAX_ARCHETYPE_POINTS) * 100}%`,
                  background: 'var(--color-fighter)'
                }}
              />
            </div>
            <span>
              {progression.archetypePoints.fighter} / {MAX_ARCHETYPE_POINTS}
            </span>
          </div>

          <div className="point-bar-item">
            <span style={{ color: 'var(--color-rogue)', fontWeight: 600 }}>Rogue</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${(progression.archetypePoints.rogue / MAX_ARCHETYPE_POINTS) * 100}%`,
                  background: 'var(--color-rogue)'
                }}
              />
            </div>
            <span>
              {progression.archetypePoints.rogue} / {MAX_ARCHETYPE_POINTS}
            </span>
          </div>

          <div className="point-bar-item">
            <span style={{ color: 'var(--color-mage)', fontWeight: 600 }}>Mage</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${(progression.archetypePoints.mage / MAX_ARCHETYPE_POINTS) * 100}%`,
                  background: 'var(--color-mage)'
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
      <div className="sim-controls">
        <div className="sim-section-label">Advance Archetype Level</div>
        <div className="point-buttons">
          <button
            className="btn-point fighter"
            disabled={
              progression.currentLevel >= MAX_LEVEL ||
              progression.archetypePoints.fighter >= MAX_ARCHETYPE_POINTS
            }
            onClick={() => onLevelUp('FIGHTER')}
          >
            <span>+ Fighter</span>
          </button>
          <button
            className="btn-point rogue"
            disabled={
              progression.currentLevel >= MAX_LEVEL ||
              progression.archetypePoints.rogue >= MAX_ARCHETYPE_POINTS
            }
            onClick={() => onLevelUp('ROGUE')}
          >
            <span>+ Rogue</span>
          </button>
          <button
            className="btn-point mage"
            disabled={
              progression.currentLevel >= MAX_LEVEL ||
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
        <div className="sim-section-label">Demo Constellation Paths</div>
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

      {/* Constellation Traversal History */}
      <div className="sim-controls" style={{ flex: 1 }}>
        <div className="sim-section-label">
          Constellation Path ({progression.constellation.length} Stars Unlocked)
        </div>
        <div className="constellation-timeline">
          {progression.constellation.length === 0 ? (
            <div
              style={{
                fontSize: '0.78rem',
                color: '#6b7280',
                fontStyle: 'italic',
                padding: '0.5rem 0'
              }}
            >
              No stars unlocked yet. Advance an archetype to ignite your first star.
            </div>
          ) : (
            progression.constellation.map((id) => {
              const cls = CLASSES_BY_ID[id];
              if (!cls) return null;
              return (
                <div key={id} className="timeline-node">
                  <span style={{ fontWeight: 600 }}>{cls.name}</span>
                  <span style={{ color: 'var(--color-gold)', fontSize: '0.7rem' }}>
                    Level {cls.totalPoints}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
