import { UnitProgression } from '../../core/types/class';
import {
  isClassEligibleNextLevel,
  isClassLockedOut
} from '../../core/progression/pyramid';
import { ProjectionMode, STAR_POINTS } from './geometry';

export interface ConstellationSvgProps {
  readonly mode: ProjectionMode;
  readonly progression: UnitProgression;
  readonly unlockedSet: ReadonlySet<string>;
  readonly hoveredClassId: string | null;
  readonly constellationPathD: string;
  readonly onHoverNode: (classId: string | null) => void;
}

export function ConstellationSvg({
  mode,
  progression,
  unlockedSet,
  hoveredClassId,
  constellationPathD,
  onHoverNode
}: ConstellationSvgProps) {
  return (
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
                onMouseEnter={() => onHoverNode(pt.cls.id)}
                onMouseLeave={() => onHoverNode(null)}
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

                {/* Tile Label */}
                {(isHovered ||
                  isUnlocked ||
                  pt.cls.id === 'warrior' ||
                  pt.cls.id === 'thief' ||
                  pt.cls.id === 'wizard' ||
                  pt.cls.id === 'bard') && (
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
              onMouseEnter={() => onHoverNode(pt.cls.id)}
              onMouseLeave={() => onHoverNode(null)}
            >
              {/* Hit area for reliable hover detection on small nodes */}
              <circle r="14" fill="transparent" style={{ pointerEvents: 'all' }} />

              {/* Inner visual group scaled on hover */}
              <g className="star-visual">
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
              {(isUnlocked ||
                isHovered ||
                isEligible ||
                pt.cls.totalPoints === 1 ||
                pt.cls.totalPoints === 9) && (
                <text
                  y={isUnlocked ? -13 : -9}
                  fill={
                    isUnlocked
                      ? '#fcd34d'
                      : isHovered
                      ? '#fff'
                      : isEligible
                      ? '#fcd34d'
                      : 'rgba(255,255,255,0.6)'
                  }
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
  );
}
