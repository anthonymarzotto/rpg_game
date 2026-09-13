import { useState, useMemo } from 'react';
import { Archetype, ClassDefinition, UnitProgression } from '../core/types/class';
import { CLASS_CATALOG, CLASSES_BY_ID } from '../data/classes';
import {
  advanceArchetypeLevel,
  advanceMultipleLevels,
  createInitialProgression,
  isClassEligibleNextLevel,
  isClassLockedOut,
  MAX_ARCHETYPE_POINTS,
  MAX_LEVEL
} from '../core/progression/pyramid';
import './ConstellationChart.css';

export type ProjectionMode = 'triangle-mosaic' | 'triangle-grid';

export interface TriangleGeometry {
  readonly row: number;
  readonly col: number;
  readonly orientation: 'up' | 'down';
  readonly pointsStr: string;
  readonly centroidX: number;
  readonly centroidY: number;
}

export interface StarPoint {
  readonly cls: ClassDefinition;
  readonly x: number;
  readonly y: number;
  readonly color: string;
  readonly triangle: TriangleGeometry;
}

// Fixed equilateral pyramid geometric dimensions
const PYRAMID_HEIGHT = 620;
const PYRAMID_ROWS = 10;
const ROW_HEIGHT = PYRAMID_HEIGHT / PYRAMID_ROWS;
const TILE_SIDE = (2 * ROW_HEIGHT) / Math.sqrt(3);
const PYRAMID_TOP_Y = (-2 / 3) * PYRAMID_HEIGHT;

// Precompute 100 pyramid class positions once at module initialization
export const STAR_POINTS: readonly StarPoint[] = Object.freeze(
  CLASS_CATALOG.map((cls, index) => {
    const f = cls.requirements.fighter;
    const r = cls.requirements.rogue;
    const m = cls.requirements.mage;
    const total = cls.totalPoints;

    // Triangle subdivision geometry (100 = 10^2 cells)
    const row = Math.floor(Math.sqrt(index));
    const col = index - row * row;
    const yTopR = PYRAMID_TOP_Y + row * ROW_HEIGHT;
    const yBotR = PYRAMID_TOP_Y + (row + 1) * ROW_HEIGHT;
    const isUpright = col % 2 === 0;

    let v1: [number, number];
    let v2: [number, number];
    let v3: [number, number];
    let centroidX: number;
    let centroidY: number;

    if (isUpright) {
      const k = col / 2;
      const xTop = -row * (TILE_SIDE / 2) + k * TILE_SIDE;
      v1 = [xTop, yTopR];
      v2 = [xTop - TILE_SIDE / 2, yBotR];
      v3 = [xTop + TILE_SIDE / 2, yBotR];
      centroidX = xTop;
      centroidY = yTopR + (2 / 3) * ROW_HEIGHT;
    } else {
      const k = (col - 1) / 2;
      const xBot = -row * (TILE_SIDE / 2) + (k + 0.5) * TILE_SIDE;
      v1 = [xBot - TILE_SIDE / 2, yTopR];
      v2 = [xBot + TILE_SIDE / 2, yTopR];
      v3 = [xBot, yBotR];
      centroidX = xBot;
      centroidY = yTopR + (1 / 3) * ROW_HEIGHT;
    }

    const pointsStr = `${v1[0].toFixed(1)},${v1[1].toFixed(1)} ${v2[0].toFixed(1)},${v2[1].toFixed(1)} ${v3[0].toFixed(1)},${v3[1].toFixed(1)}`;

    const triangle: TriangleGeometry = {
      row,
      col,
      orientation: isUpright ? 'up' : 'down',
      pointsStr,
      centroidX: Number(centroidX.toFixed(1)),
      centroidY: Number(centroidY.toFixed(1))
    };

    const x = triangle.centroidX;
    const y = triangle.centroidY;

    // Color interpolation based on archetype weights
    const rf = Math.round((f / total) * 239);
    const gg = Math.round((r / total) * 210);
    const bb = Math.round((m / total) * 246);
    const color = `rgb(${Math.max(70, rf)}, ${Math.max(70, gg)}, ${Math.max(70, bb)})`;

    return { cls, x, y, color, triangle };
  })
);

// Map for fast coord lookup of star points
export const POINTS_BY_ID: ReadonlyMap<string, StarPoint> = new Map(
  STAR_POINTS.map((p) => [p.cls.id, p])
);

export function ConstellationChart() {
  const [progression, setProgression] = useState<UnitProgression>(() =>
    createInitialProgression('hero-1')
  );
  const [mode, setMode] = useState<ProjectionMode>('triangle-mosaic');
  const [hoveredClassId, setHoveredClassId] = useState<string | null>(null);

  // Set of unlocked class IDs for fast lookup
  const unlockedSet = useMemo(() => new Set(progression.constellation), [progression.constellation]);

  // Generate constellation polyline points
  const constellationPathD = useMemo(() => {
    if (progression.constellation.length === 0) return '';
    return progression.constellation
      .map((id, index) => {
        const pt = POINTS_BY_ID.get(id);
        if (!pt) return '';
        return `${index === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
      })
      .filter(Boolean)
      .join(' ');
  }, [progression.constellation]);

  // Active Title
  const activeClass = useMemo(() => {
    if (progression.constellation.length === 0) return null;
    const lastId = progression.constellation[progression.constellation.length - 1];
    return CLASSES_BY_ID[lastId] ?? null;
  }, [progression.constellation]);

  // Current hovered class details
  const inspectedClass = useMemo(() => {
    if (hoveredClassId) return CLASSES_BY_ID[hoveredClassId] ?? null;
    return activeClass;
  }, [hoveredClassId, activeClass]);

  // Handler for manual level-up
  const handleLevelUp = (archetype: Archetype) => {
    try {
      setProgression((prev) => advanceArchetypeLevel(prev, archetype));
    } catch (err) {
      console.warn(err);
    }
  };

  // Handler for presets
  const applyPreset = (archetypes: readonly Archetype[]) => {
    const fresh = createInitialProgression('hero-1');
    const result = advanceMultipleLevels(fresh, archetypes);
    setProgression(result);
  };

  const handleReset = () => {
    setProgression(createInitialProgression('hero-1'));
  };

  return (
    <div className="constellation-app">
      {/* Viewport for Star Chart */}
      <div className="viewport-container">
        {/* Floating Inspector */}
        {inspectedClass && (
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
              {unlockedSet.has(inspectedClass.id) ? (
                <span className="status-unlocked">★ Unlocked in Constellation</span>
              ) : isClassLockedOut(inspectedClass, progression.currentLevel, progression.archetypePoints, unlockedSet.has(inspectedClass.id)) ? (
                <span className="status-locked">
                  ✕ Locked Out {inspectedClass.totalPoints <= progression.currentLevel ? '(Lower Tier)' : '(Archetype Incompatible)'}
                </span>
              ) : isClassEligibleNextLevel(inspectedClass, progression.currentLevel, progression.archetypePoints, unlockedSet.has(inspectedClass.id)) ? (
                <span className="status-eligible">✦ Eligible Next Level</span>
              ) : (
                <span className="status-unreached">○ Future Pathway</span>
              )}
            </div>
          </div>
        )}

        <svg
          className="chart-svg"
          viewBox="-460 -460 920 920"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Glow Filter */}
            <filter id="star-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="nebula" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(139, 92, 246, 0.15)" />
              <stop offset="60%" stopColor="rgba(245, 158, 11, 0.05)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          {/* Cosmic Nebula Backing */}
          <circle cx="0" cy="0" r="420" fill="url(#nebula)" />

          {/* Triangular Wireframe (Star Pyramid mode) */}
          {mode === 'triangle-grid' && (
            <g className="triangle-wireframe" opacity="0.2">
              {STAR_POINTS.map((pt) => (
                <polygon
                  key={`wf-${pt.cls.id}`}
                  points={pt.triangle.pointsStr}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.25)"
                  strokeWidth="0.75"
                />
              ))}
            </g>
          )}

          {/* Archetype Directional Apex Markers */}
          <g opacity="0.65">
            <text
              x="0"
              y={-432}
              fill="#ef4444"
              fontSize="12"
              fontWeight="700"
              textAnchor="middle"
            >
              ▲ FIGHTER APEX (WARRIOR)
            </text>
            <text
              x={-375}
              y={245}
              fill="#10b981"
              fontSize="12"
              fontWeight="700"
              textAnchor="middle"
            >
              ◀ ROGUE APEX (THIEF)
            </text>
            <text
              x={375}
              y={245}
              fill="#8b5cf6"
              fontSize="12"
              fontWeight="700"
              textAnchor="middle"
            >
              MAGE APEX (WIZARD) ▶
            </text>
          </g>

          {/* 100 Triangular Mosaic Tiles (Triangle Mosaic mode) */}
          {mode === 'triangle-mosaic' && (
            <g className="mosaic-layer">
              {STAR_POINTS.map((pt) => {
                const isUnlocked = unlockedSet.has(pt.cls.id);
                const isLocked = isClassLockedOut(
                  pt.cls,
                  progression.currentLevel,
                  progression.archetypePoints,
                  isUnlocked
                );
                const isEligible = isClassEligibleNextLevel(
                  pt.cls,
                  progression.currentLevel,
                  progression.archetypePoints,
                  isUnlocked
                );
                const isHovered = hoveredClassId === pt.cls.id;

                const baseFill = isUnlocked
                  ? '#f59e0b'
                  : isHovered
                  ? '#fff'
                  : isEligible
                  ? 'rgba(245, 158, 11, 0.45)'
                  : isLocked
                  ? 'rgba(15, 23, 42, 0.68)'
                  : pt.color;

                const fillOpacity = isUnlocked
                  ? 0.85
                  : isHovered
                  ? 0.95
                  : isEligible
                  ? 0.55
                  : isLocked
                  ? 0.25
                  : 0.42;

                const strokeColor = isUnlocked
                  ? '#fbbf24'
                  : isHovered
                  ? '#ffffff'
                  : isEligible
                  ? '#fcd34d'
                  : isLocked
                  ? 'rgba(255, 255, 255, 0.07)'
                  : 'rgba(255, 255, 255, 0.2)';

                const strokeWidth = isUnlocked ? 2 : isHovered ? 2.5 : isEligible ? 1.5 : 1;

                return (
                  <g
                    key={`mosaic-${pt.cls.id}`}
                    className={`mosaic-tile ${isUnlocked ? 'unlocked' : ''} ${isHovered ? 'hovered' : ''} ${isLocked ? 'locked' : ''} ${isEligible ? 'eligible' : ''}`}
                    onMouseEnter={() => setHoveredClassId(pt.cls.id)}
                    onMouseLeave={() => setHoveredClassId(null)}
                  >
                    <polygon
                      points={pt.triangle.pointsStr}
                      className="tile-polygon"
                      fill={baseFill}
                      fillOpacity={fillOpacity}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={isEligible ? '4 2' : undefined}
                      filter={isUnlocked || isHovered ? 'url(#star-glow)' : undefined}
                    />

                    {/* Centroid Waypoint Beacon for Unlocked & Hovered */}
                    {(isUnlocked || isHovered || isEligible) && (
                      <circle
                        cx={pt.triangle.centroidX}
                        cy={pt.triangle.centroidY}
                        r={isUnlocked ? 4 : isHovered ? 3.5 : 2.5}
                        fill={isUnlocked ? '#fff' : isHovered ? '#fff' : '#f59e0b'}
                        filter={isUnlocked || isHovered ? 'url(#star-glow)' : undefined}
                        style={{ pointerEvents: 'none' }}
                      />
                    )}

                    {/* Tile Label: corners, bard, unlocked, or hovered */}
                    {(isHovered || isUnlocked || pt.cls.id === 'warrior' || pt.cls.id === 'thief' || pt.cls.id === 'wizard' || pt.cls.id === 'bard') && (
                      <text
                        x={pt.triangle.centroidX}
                        y={pt.triangle.centroidY + (pt.triangle.orientation === 'up' ? 8 : -8)}
                        fill={isUnlocked ? '#fcd34d' : isHovered ? '#fff' : 'rgba(255,255,255,0.85)'}
                        fontSize={isUnlocked || isHovered ? '8.5' : '7.5'}
                        fontWeight={isUnlocked || isHovered ? '700' : '600'}
                        textAnchor="middle"
                        dominantBaseline="central"
                        style={{ pointerEvents: 'none' }}
                      >
                        {pt.cls.name}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* Active Constellation Traversal Lines */}
          {constellationPathD && (
            <g style={{ pointerEvents: 'none' }}>
              <path d={constellationPathD} fill="none" className="constellation-path-glow" />
              <path d={constellationPathD} fill="none" className="constellation-path-core" />
            </g>
          )}

          {/* 100 Star Nodes (Shown in Star Pyramid mode) */}
          {mode !== 'triangle-mosaic' &&
            STAR_POINTS.map((pt) => {
              const isUnlocked = unlockedSet.has(pt.cls.id);
              const isLocked = isClassLockedOut(
                pt.cls,
                progression.currentLevel,
                progression.archetypePoints,
                isUnlocked
              );
              const isEligible = isClassEligibleNextLevel(
                pt.cls,
                progression.currentLevel,
                progression.archetypePoints,
                isUnlocked
              );
              const isHovered = hoveredClassId === pt.cls.id;

              return (
                <g
                  key={pt.cls.id}
                  className="star-node"
                  transform={`translate(${pt.x}, ${pt.y})`}
                  onMouseEnter={() => setHoveredClassId(pt.cls.id)}
                  onMouseLeave={() => setHoveredClassId(null)}
                >
                  {/* Hit area for reliable hover detection on small nodes */}
                  <circle r="14" fill="transparent" style={{ pointerEvents: 'all' }} />

                  {/* Inner visual group scaled on hover */}
                  <g className="star-visual">
                    {/* Unlocked / Eligible Halo Effect */}
                    {isUnlocked && (
                      <circle
                        r={12}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                        opacity="0.8"
                        className="star-halo"
                        strokeDasharray="3 3"
                      />
                    )}
                    {isEligible && (
                      <circle
                        r="10"
                        fill="none"
                        stroke="#fcd34d"
                        strokeWidth="1.2"
                        opacity="0.85"
                        className="star-halo"
                        strokeDasharray="2 2"
                      />
                    )}

                    {/* Star Core */}
                    <circle
                      r={isUnlocked ? 7 : isHovered ? 6 : isEligible ? 5.5 : isLocked ? 3 : 4}
                      fill={isUnlocked ? '#fcd34d' : isEligible ? '#f59e0b' : isLocked ? '#4b5563' : pt.color}
                      stroke={isUnlocked ? '#fff' : isHovered ? '#fff' : isEligible ? '#fcd34d' : 'none'}
                      strokeWidth={isUnlocked || isHovered || isEligible ? 1.5 : 1}
                      filter={isUnlocked || isHovered || isEligible ? 'url(#star-glow)' : undefined}
                      opacity={isLocked ? 0.35 : 1}
                    />
                  </g>

                  {/* Key Capstone / Corner Labels */}
                  {(isUnlocked || isHovered || isEligible || pt.cls.totalPoints === 1 || pt.cls.totalPoints === 9) && (
                    <text
                      y={isUnlocked ? -13 : -9}
                      fill={isUnlocked ? '#fcd34d' : isHovered ? '#fff' : isEligible ? '#fcd34d' : 'rgba(255,255,255,0.6)'}
                      fontSize={isUnlocked ? '10' : '8'}
                      fontWeight={isUnlocked || isEligible ? '700' : '500'}
                      textAnchor="middle"
                      style={{ pointerEvents: 'none' }}
                    >
                      {pt.cls.name}
                    </text>
                  )}
                </g>
              );
            })}
        </svg>
      </div>

      {/* Sidebar Controls & HUD */}
      <div className="hud-sidebar">
        <div className="hud-header">
          <h1>Class Constellation</h1>
          <div className="hud-subtitle">100-Class Pyramid Progression</div>
        </div>

        {/* Projection Mode Toggle */}
        <div className="view-toggle-grid">
          <button
            className={`btn-toggle ${mode === 'triangle-mosaic' ? 'active' : ''}`}
            onClick={() => setMode('triangle-mosaic')}
          >
            ▲ Triangle Mosaic
          </button>
          <button
            className={`btn-toggle ${mode === 'triangle-grid' ? 'active' : ''}`}
            onClick={() => setMode('triangle-grid')}
          >
            ✦ Star Pyramid
          </button>
        </div>

        {/* Unit Status Card */}
        <div className="unit-card">
          <div className="unit-card-title">
            <span className="unit-level-badge">Level {progression.currentLevel} / {MAX_LEVEL}</span>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
              {progression.currentLevel === MAX_LEVEL ? 'Capstone Sealed' : 'Novice Adventurer'}
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
              <span>{progression.archetypePoints.fighter} / {MAX_ARCHETYPE_POINTS}</span>
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
              <span>{progression.archetypePoints.rogue} / {MAX_ARCHETYPE_POINTS}</span>
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
              <span>{progression.archetypePoints.mage} / {MAX_ARCHETYPE_POINTS}</span>
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
              onClick={() => handleLevelUp('FIGHTER')}
            >
              <span>+ Fighter</span>
            </button>
            <button
              className="btn-point rogue"
              disabled={
                progression.currentLevel >= MAX_LEVEL ||
                progression.archetypePoints.rogue >= MAX_ARCHETYPE_POINTS
              }
              onClick={() => handleLevelUp('ROGUE')}
            >
              <span>+ Rogue</span>
            </button>
            <button
              className="btn-point mage"
              disabled={
                progression.currentLevel >= MAX_LEVEL ||
                progression.archetypePoints.mage >= MAX_ARCHETYPE_POINTS
              }
              onClick={() => handleLevelUp('MAGE')}
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
                applyPreset([
                  'FIGHTER', 'FIGHTER', 'MAGE', 'FIGHTER', 'FIGHTER', 'FIGHTER', 'MAGE', 'ROGUE', 'ROGUE'
                ])
              }
            >
              Warlord (5F 2R 2M)
            </button>
            <button
              className="btn-preset"
              onClick={() =>
                applyPreset([
                  'FIGHTER', 'FIGHTER', 'MAGE', 'FIGHTER', 'MAGE', 'FIGHTER', 'MAGE', 'FIGHTER', 'MAGE'
                ])
              }
            >
              Paladin (5F 0R 4M)
            </button>
            <button
              className="btn-preset"
              onClick={() =>
                applyPreset([
                  'ROGUE', 'ROGUE', 'MAGE', 'ROGUE', 'ROGUE', 'MAGE', 'ROGUE', 'MAGE', 'MAGE'
                ])
              }
            >
              Shadow-mancer (0F 5R 4M)
            </button>
            <button
              className="btn-preset"
              onClick={() =>
                applyPreset([
                  'FIGHTER', 'ROGUE', 'MAGE', 'FIGHTER', 'ROGUE', 'MAGE', 'FIGHTER', 'ROGUE', 'MAGE'
                ])
              }
            >
              Bard (3F 3R 3M)
            </button>
            <button
              className="btn-preset"
              onClick={() =>
                applyPreset([
                  'FIGHTER', 'ROGUE', 'MAGE', 'FIGHTER', 'ROGUE', 'FIGHTER', 'MAGE', 'FIGHTER', 'FIGHTER'
                ])
              }
            >
              Min Path (3 Classes)
            </button>
            <button
              className="btn-preset"
              onClick={() =>
                applyPreset([
                  'FIGHTER', 'FIGHTER', 'ROGUE', 'FIGHTER', 'ROGUE', 'FIGHTER', 'ROGUE', 'FIGHTER', 'ROGUE'
                ])
              }
            >
              Max Path (9 Classes)
            </button>
          </div>

          <button className="btn-reset" onClick={handleReset}>
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
              <div style={{ fontSize: '0.78rem', color: '#6b7280', fontStyle: 'italic', padding: '0.5rem 0' }}>
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
    </div>
  );
}
