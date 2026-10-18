import { UnitProgression } from '../../core/types/class';
import {
  isClassEligibleNextLevel,
  isClassLockedOut
} from '../../core/progression/pyramid';
import { toCoordKey } from '../../core/progression/registry';
import { isOffNodeCoordinate } from '../../core/progression/harmonization';
import { STAR_POINTS, getOffNodeWaypoint } from './geometry';
import './ConstellationSvg.css';

export interface ConstellationSvgProps {
  readonly progression: UnitProgression;
  readonly unlockedSet: ReadonlySet<string>;
  readonly hoveredClassId: string | null;
  readonly constellationPathD: string;
  readonly onHoverNode: (classId: string | null) => void;
  readonly selectedClassId?: string | null;
  readonly onClickNode?: (classId: string) => void;
  readonly viewBox?: string;
  readonly hoveredWaypointKey?: string | null;
  readonly onHoverWaypoint?: (coordKey: string | null) => void;
}

export function ConstellationSvg({
  progression,
  unlockedSet,
  hoveredClassId,
  constellationPathD,
  onHoverNode,
  selectedClassId,
  onClickNode,
  viewBox = '-390 -455 920 730',
  hoveredWaypointKey,
  onHoverWaypoint
}: ConstellationSvgProps) {
  // Off-Node Starlight Waypoints: unlocked and eligible
  const rootClassId = progression.constellation?.[0];
  const unlockedOffNodes = progression.offNodeMilestones ?? [];
  const visibleWaypoints: {
    coordKey: string;
    points: { fighter: number; rogue: number; mage: number };
    x: number;
    y: number;
    isUnlocked: boolean;
    isEligible: boolean;
  }[] = [];
  const addedWaypointKeys = new Set<string>();

  for (const key of unlockedOffNodes) {
    const wp = getOffNodeWaypoint(key, rootClassId);
    addedWaypointKeys.add(key);
    visibleWaypoints.push({
      ...wp,
      isUnlocked: true,
      isEligible: false
    });
  }

  // Next level eligible off-node waypoints
  const archKeys: readonly ('fighter' | 'rogue' | 'mage')[] = ['fighter', 'rogue', 'mage'];
  for (const arch of archKeys) {
    const nextPoints = {
      ...progression.archetypePoints,
      [arch]: progression.archetypePoints[arch] + 1
    };
    if (isOffNodeCoordinate(nextPoints)) {
      const key = toCoordKey(nextPoints);
      if (!addedWaypointKeys.has(key)) {
        addedWaypointKeys.add(key);
        const wp = getOffNodeWaypoint(key, rootClassId);
        visibleWaypoints.push({
          ...wp,
          isUnlocked: false,
          isEligible: true
        });
      }
    }
  }

  return (
    <svg
      className="chart-svg"
      viewBox={viewBox}
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
      <circle cx="0" cy="-90" r="390" fill="url(#nebula)" />


      {/* Archetype Directional Apex Markers */}
      <g opacity="0.95">
        <text
          x="0"
          y={-428}
          fill="#ef4444"
          fontSize="16"
          fontWeight="900"
          textAnchor="middle"
          letterSpacing="0.06em"
        >
          ▲ FORCE
        </text>
        <text
          x={-355}
          y={252}
          fill="#10b981"
          fontSize="16"
          fontWeight="900"
          textAnchor="middle"
          letterSpacing="0.06em"
        >
          ◀ FINESSE
        </text>
        <text
          x={355}
          y={252}
          fill="#8b5cf6"
          fontSize="16"
          fontWeight="900"
          textAnchor="middle"
          letterSpacing="0.06em"
        >
          FOCUS ▶
        </text>
      </g>

      {/* 100 Triangular Mosaic Tiles */}
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
            const isSelected = selectedClassId === pt.cls.id;

            const baseFill = isSelected
              ? '#fbbf24'
              : isUnlocked
              ? '#f59e0b'
              : isHovered
              ? '#fff'
              : isEligible
              ? 'rgba(245, 158, 11, 0.45)'
              : isLocked
              ? 'rgba(15, 23, 42, 0.68)'
              : pt.color;

            const fillOpacity = isSelected
              ? 1
              : isUnlocked
              ? 0.85
              : isHovered
              ? 0.95
              : isEligible
              ? 0.55
              : isLocked
              ? 0.25
              : 0.42;

            const strokeColor = isSelected
              ? '#38bdf8'
              : isUnlocked
              ? '#fbbf24'
              : isHovered
              ? '#ffffff'
              : isEligible
              ? '#fcd34d'
              : isLocked
              ? 'rgba(255, 255, 255, 0.07)'
              : 'rgba(255, 255, 255, 0.2)';

            const strokeWidth = isSelected ? 3 : isUnlocked ? 2 : isHovered ? 2.5 : isEligible ? 1.5 : 1;

            return (
              <g
                key={`mosaic-${pt.cls.id}`}
                className={`mosaic-tile ${isUnlocked ? 'unlocked' : ''} ${isHovered ? 'hovered' : ''} ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''} ${isEligible ? 'eligible' : ''}`}
                onMouseEnter={() => onHoverNode(pt.cls.id)}
                onMouseLeave={() => onHoverNode(null)}
                onClick={() => onClickNode?.(pt.cls.id)}
                style={onClickNode ? { cursor: 'pointer' } : undefined}
                data-testid={`tile-${pt.cls.id}`}
              >
                <polygon
                  points={pt.triangle.pointsStr}
                  className="tile-polygon"
                  fill={baseFill}
                  fillOpacity={fillOpacity}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={isEligible ? '4 2' : undefined}
                  filter={isUnlocked || isHovered || isSelected ? 'url(#star-glow)' : undefined}
                />

                {/* Centroid Waypoint Beacon for Unlocked & Selected Only */}
                {(isUnlocked || isSelected) && (
                  <circle
                    cx={pt.triangle.centroidX}
                    cy={pt.triangle.centroidY}
                    r={isSelected ? 5 : 4}
                    fill={isSelected ? '#38bdf8' : '#fff'}
                    filter="url(#star-glow)"
                    className="pointer-events-none"
                  />
                )}

                {/* Pulse Selection Indicator */}
                {isSelected && (
                  <circle
                    cx={pt.triangle.centroidX}
                    cy={pt.triangle.centroidY}
                    r={10}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth={1.5}
                    strokeDasharray="3 2"
                    className="pointer-events-none"
                  />
                )}

                {/* Tile Label - only for key classes or unlocked/selected, dark text when hovered */}
                {(isSelected ||
                  isUnlocked ||
                  pt.cls.id === 'warrior' ||
                  pt.cls.id === 'thief' ||
                  pt.cls.id === 'wizard') && (
                  <text
                    x={pt.triangle.centroidX}
                    y={pt.triangle.centroidY + (pt.triangle.orientation === 'up' ? 8 : -8)}
                    fill={
                      isHovered
                        ? '#0b0f19'
                        : isSelected
                        ? '#38bdf8'
                        : isUnlocked
                        ? '#fcd34d'
                        : 'rgba(255,255,255,0.85)'
                    }
                    fontSize="8.5"
                    fontWeight="700"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="pointer-events-none"
                  >
                    {pt.cls.name}
                  </text>
                )}
              </g>
            );
          })}
        </g>

      {/* Active Constellation Traversal Lines */}
      {constellationPathD && (
        <g className="pointer-events-none">
          <path d={constellationPathD} fill="none" className="constellation-path-glow" />
          <path d={constellationPathD} fill="none" className="constellation-path-core" />
        </g>
      )}

      {/* Luminous Starlight Waypoints (unlocked & eligible off-nodes) */}
      {visibleWaypoints.length > 0 && (
        <g className="starlight-waypoints-layer">
          {visibleWaypoints.map((wp) => {
            const isHovered = hoveredWaypointKey === wp.coordKey;
            return (
              <g
                key={`waypoint-${wp.coordKey}`}
                className={`starlight-waypoint ${wp.isUnlocked ? 'unlocked' : 'eligible'} ${isHovered ? 'hovered' : ''}`}
                transform={`translate(${wp.x}, ${wp.y})`}
                onMouseEnter={() => onHoverWaypoint?.(wp.coordKey)}
                onMouseLeave={() => onHoverWaypoint?.(null)}
                data-testid={`waypoint-${wp.coordKey}`}
              >
                {/* Hit area */}
                <circle r="16" fill="transparent" className="pointer-events-all" />

                {/* Isolated Visual Container (handles scaling/pulsing without overriding translate) */}
                <g className="waypoint-visual">
                  {/* Glow Halo - cyan solid for unlocked, amber dashed for eligible */}
                  <circle
                    r={wp.isUnlocked ? 12 : 9.5}
                    fill="none"
                    stroke={wp.isUnlocked ? '#38bdf8' : '#f59e0b'}
                    strokeWidth={wp.isUnlocked ? 1.6 : 1.3}
                    strokeDasharray={wp.isUnlocked ? undefined : '3 2'}
                    filter="url(#star-glow)"
                    opacity={wp.isUnlocked ? 0.95 : 0.85}
                  />

                  {/* Diamond Starlight Glyph - solid white/cyan for unlocked, hollow ghost amber for eligible */}
                  <polygon
                    points="0,-7 7,0 0,7 -7,0"
                    fill={wp.isUnlocked ? '#f8fafc' : 'rgba(245, 158, 11, 0.08)'}
                    stroke={wp.isUnlocked ? '#38bdf8' : '#fbbf24'}
                    strokeWidth={wp.isUnlocked ? 1.2 : 1.4}
                    strokeDasharray={wp.isUnlocked ? undefined : '3 2'}
                    filter="url(#star-glow)"
                  />

                  {/* Centroid Pip */}
                  <circle
                    r={wp.isUnlocked ? 2.5 : 1.8}
                    fill={wp.isUnlocked ? '#fff' : 'rgba(251, 191, 36, 0.6)'}
                    className="pointer-events-none"
                  />
                </g>

                {/* Waypoint Label */}
                <text
                  y={-12}
                  fill={wp.isUnlocked ? '#38bdf8' : '#fbbf24'}
                  fontSize="8.5"
                  fontWeight="700"
                  textAnchor="middle"
                  className="pointer-events-none font-mono"
                >
                  {wp.isUnlocked ? `★ ${wp.coordKey}` : `◇ ${wp.coordKey} [Next]`}
                </text>
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
}

