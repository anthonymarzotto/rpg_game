import { useMemo } from 'react';
import { HexCoord, HexDirection, hexEquals, toHexKey, getFacingAngleDegrees, hexDistance } from '../../core/grid/hex';
import { CombatState, CombatUnit } from '../../core/combat/types';
import { TargetPreview } from '../../core/combat/targetPreview';
import { FloatingText } from './useFloatingCombatText';
import { resolveTokenAssetPath } from './tokenAssets';
import { getObstacleRotation, resolveObstacleAssetPath } from './obstacleAssets';
import {
  hexToPixel,
  projectElevationY,
  getHexPolygonPoints,
  getExtrudedPrismWalls,
  DEFAULT_HEX_RADIUS
} from './elevationGeometry';
import { MovePathPreview } from './useCombatSimulation';
import { formatConditionBadge, formatModifierBadge } from './conditionBadges';
import { ConditionTooltipContent } from './UnitStatusCard';

export interface HexGridSvgProps {
  readonly state: CombatState;
  readonly reachableCoords: readonly HexCoord[];
  readonly abilityRangeCoords: readonly HexCoord[];
  readonly candidateTargetCoords: readonly HexCoord[];
  readonly hoveredCoord: HexCoord | null;
  readonly floatingTexts: readonly FloatingText[];
  readonly targetPreview: TargetPreview | null;
  readonly movePreview?: MovePathPreview | null;
  readonly zoom?: number;
  readonly facingCompassCoord?: HexCoord | null;
  readonly onSelectFacing?: (direction: HexDirection) => void;
  readonly highlightedUnitId?: string | null;
  readonly pinnedUnitId?: string | null;
  readonly onTileClick: (coord: HexCoord) => void;
  readonly onTileHover: (coord: HexCoord | null) => void;
}

const ALL_HEX_DIRECTIONS: readonly HexDirection[] = [0, 1, 2, 3, 4, 5];

interface StandeeStatusBubbleProps {
  readonly unitId: string;
  readonly cu: CombatUnit;
  readonly statusIcons: readonly string[];
  readonly statusBubbleWidth: number;
  readonly statusBubbleStroke: string;
  readonly yOffset: number;
  readonly state: CombatState;
}

function StandeeStatusBubble({
  unitId,
  cu,
  statusIcons,
  statusBubbleWidth,
  statusBubbleStroke,
  yOffset,
  state
}: StandeeStatusBubbleProps) {
  const badges = useMemo(() => {
    return [
      ...(cu.activeConditions ?? []).map((c) =>
        formatConditionBadge(c, (id) => state.units.get(id)?.unit.name ?? id)
      ),
      ...(cu.activeModifiers ?? []).map((m) =>
        formatModifierBadge(m)
      )
    ];
  }, [cu.activeConditions, cu.activeModifiers, state.units]);

  return (
    <g
      transform={`translate(0, ${yOffset})`}
      className="standee-status-bubble"
      data-testid={`standee-status-bubble-${unitId}`}
      pointerEvents="all"
    >
      <rect
        x={-statusBubbleWidth / 2}
        y="-6"
        width={statusBubbleWidth}
        height="12"
        rx="6"
        fill="rgba(15, 23, 42, 0.92)"
        stroke={statusBubbleStroke}
        strokeWidth="1"
        className="bubble-badge"
        pointerEvents="all"
      />
      <text
        x="0"
        y="3"
        fontSize="7.5"
        textAnchor="middle"
        pointerEvents="none"
      >
        {statusIcons.join('')}
      </text>

      {/* Same In-Engine Condition Tooltip Component as Pinned Card */}
      <foreignObject
        x="-125"
        y="-230"
        width="250"
        height="220"
        className="standee-tooltip-popup"
        pointerEvents="none"
      >
        <div className="standee-tooltip-fo-container">
          <div className="standee-tooltip-wrapper">
            {badges.map((b, idx) => (
              <ConditionTooltipContent key={idx} tooltip={b.tooltip} />
            ))}
          </div>
        </div>
      </foreignObject>
    </g>
  );
}

export function HexGridSvg({
  state,
  reachableCoords,
  abilityRangeCoords,
  candidateTargetCoords,
  hoveredCoord,
  highlightedUnitId,
  pinnedUnitId,
  floatingTexts,
  targetPreview,
  movePreview,
  zoom = 1,
  facingCompassCoord,
  onSelectFacing,
  onTileClick,
  onTileHover
}: HexGridSvgProps) {
  const reachableSet = useMemo(
    () => new Set(reachableCoords.map(toHexKey)),
    [reachableCoords]
  );
  const rangeSet = useMemo(
    () => new Set(abilityRangeCoords.map(toHexKey)),
    [abilityRangeCoords]
  );
  const candidateSet = useMemo(
    () => new Set(candidateTargetCoords.map(toHexKey)),
    [candidateTargetCoords]
  );

  // Memoized movement path step lookup map for lifted stepping stones (UX.1)
  const pathStepMap = useMemo(() => {
    if (!movePreview?.path || movePreview.path.length <= 1) {
      return new Map<string, { stepNumber: number; isDestination: boolean; isHazard: boolean }>();
    }
    const map = new Map<string, { stepNumber: number; isDestination: boolean; isHazard: boolean }>();
    const path = movePreview.path;
    for (let i = 1; i < path.length; i++) {
      const coord = path[i];
      const prevCoord = path[i - 1];
      const elev = state.arena.getElevation(coord) ?? 0;
      const prevElev = state.arena.getElevation(prevCoord) ?? 0;
      const isHazard = elev - prevElev <= -2;
      const isDestination = i === path.length - 1;
      map.set(toHexKey(coord), {
        stepNumber: i,
        isDestination,
        isHazard
      });
    }
    return map;
  }, [movePreview, state.arena]);

  // Dynamically collect all arena tiles from the spatial model
  const allTiles = useMemo(() => {
    return state.arena.getAllTiles();
  }, [state.arena]);

  // Painter's algorithm: sort North-to-South (row r ascending, then column q ascending)
  const sortedTiles = useMemo(() => {
    return [...allTiles].sort((a, b) => a.coord.r - b.coord.r || a.coord.q - b.coord.q);
  }, [allTiles]);

  // Compute dynamic viewBox and backdrop radius based on arena bounds, elevation offsets, and zoom
  const { viewBox, backdropRadius } = useMemo(() => {
    if (allTiles.length === 0) {
      return { viewBox: '-320 -280 640 560', backdropRadius: 230 };
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const tile of allTiles) {
      const base = hexToPixel(tile.coord);
      const elev = tile.elevation ?? 0;
      const projY = projectElevationY(base.y, elev);
      if (base.x < minX) minX = base.x;
      if (base.x > maxX) maxX = base.x;
      if (projY < minY) minY = projY;
      if (base.y > maxY) maxY = base.y;
    }
    const paddingX = DEFAULT_HEX_RADIUS + 35;
    const paddingY = DEFAULT_HEX_RADIUS + 55;
    const origWidth = Math.round(maxX - minX + paddingX * 2);
    const origHeight = Math.round(maxY - minY + paddingY * 2);
    const origX = Math.round(minX - paddingX);
    const origY = Math.round(minY - paddingY);

    const safeZoom = Math.max(0.5, Math.min(2.2, zoom));
    const width = Math.round(origWidth / safeZoom);
    const height = Math.round(origHeight / safeZoom);
    const x = Math.round(origX + (origWidth - width) / 2);
    const y = Math.round(origY + (origHeight - height) / 2);

    const maxDimension = Math.max(maxX - minX, maxY - minY);
    const backdropRadius = Math.round(maxDimension / 2 + DEFAULT_HEX_RADIUS * 0.7);

    return {
      viewBox: `${x} ${y} ${width} ${height}`,
      backdropRadius
    };
  }, [allTiles, zoom]);

  return (
    <svg
      className="arena-hex-svg"
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Glow Filters */}
        <filter id="tile-glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="tile-glow-amber" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Standee Cutout Drop Shadow */}
        <filter id="standee-drop-shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="3.5" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.8" />
        </filter>
        {/* Occluded Standee High-Visibility Silhouettes */}
        <filter id="standee-occlusion-glow-player" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#38bdf8" floodOpacity="0.9" />
        </filter>
        <filter id="standee-occlusion-glow-enemy" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#f87171" floodOpacity="0.9" />
        </filter>
        {/* Pedestal Ground Blur Shadow */}
        <filter id="pedestal-ground-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" />
        </filter>
        {/* Extruded Prism Side Wall Directional Gradients */}
        <linearGradient id="prism-wall-sw" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#090d16" stopOpacity="0.98" />
        </linearGradient>
        <linearGradient id="prism-wall-se" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#334155" stopOpacity="0.96" />
          <stop offset="100%" stopColor="#1e293b" stopOpacity="0.98" />
        </linearGradient>
      </defs>

      {/* Grid Backdrop Grid Glow */}
      <circle cx="0" cy="0" r={backdropRadius} fill="rgba(30, 41, 59, 0.35)" />

      {/* 1. Base Terrain Hexes (Sorted North-to-South / Back-to-Front) */}
      <g className="tiles-layer">
        {sortedTiles.map((tile) => {
          const coord = tile.coord;
          const key = toHexKey(coord);
          const isObstacle = !tile.isWalkable;
          const obstacleType = tile.label ?? tile.terrainType ?? 'ruins';
          const obstacleRotation = isObstacle ? getObstacleRotation(coord) : undefined;
          const obstacleAssetSrc = isObstacle
            ? resolveObstacleAssetPath(obstacleType, obstacleRotation)
            : null;
          const isReachable = reachableSet.has(key);
          const isRange = rangeSet.has(key);
          const isCandidate = candidateSet.has(key);
          const isHovered =
            hoveredCoord && hoveredCoord.q === coord.q && hoveredCoord.r === coord.r;

          const pathInfo = pathStepMap.get(key);
          const isPathStep = pathInfo != null;
          const liftY = isPathStep ? 5 : 0;

          const elevation = tile.elevation ?? 0;
          const basePixel = hexToPixel(coord);
          const topY = projectElevationY(basePixel.y, elevation);
          const liftedTopY = topY - liftY;
          const polyPoints = getHexPolygonPoints(basePixel.x, liftedTopY);
          const prismWalls = getExtrudedPrismWalls(basePixel.x, basePixel.y, elevation);

          // Dynamic see-through cutaway: transparent if this tile is south of and occludes the hovered/active tile
          const focusCoord =
            hoveredCoord ??
            (state.activeUnitId ? state.arena.getUnitPosition(state.activeUnitId) : null);
          let isCutaway = false;
          if (focusCoord && (coord.q !== focusCoord.q || coord.r !== focusCoord.r)) {
            const focusBase = hexToPixel(focusCoord);
            const focusElevation = state.arena.getElevation(focusCoord);
            const isSouthOfFocus = basePixel.y > focusBase.y + 5;
            const isNearFocus = hexDistance(coord, focusCoord) <= 2;
            if (isSouthOfFocus && isNearFocus && elevation > focusElevation) {
              isCutaway = true;
            }
          }

          // Tile Styling
          let fillColor = 'rgba(15, 23, 42, 0.75)';
          let strokeColor = 'rgba(148, 163, 184, 0.15)';
          let strokeWidth = 1;
          let filter: string | undefined;

          // Distinct stepped terrace plateau styling based on elevation tier
          if (elevation === 1) {
            fillColor = 'rgba(30, 41, 59, 0.88)';
            strokeColor = 'rgba(56, 189, 248, 0.35)';
            strokeWidth = 1.3;
          } else if (elevation >= 2) {
            fillColor = 'rgba(51, 65, 85, 0.94)';
            strokeColor = 'rgba(245, 158, 11, 0.55)';
            strokeWidth = 1.6;
          }

          let strokeDasharray: string | undefined;

          if (isObstacle) {
            fillColor = elevation >= 2
              ? 'rgba(40, 48, 64, 0.96)'
              : elevation === 1
                ? 'rgba(30, 38, 54, 0.94)'
                : 'rgba(24, 30, 42, 0.92)';
            strokeColor = elevation >= 2 ? '#fbbf24' : elevation === 1 ? '#38bdf8' : '#94a3b8';
            strokeWidth = 2;
            strokeDasharray = '4 2';
          } else if (isPathStep) {
            if (pathInfo.isHazard) {
              fillColor = isHovered ? 'rgba(239, 68, 68, 0.48)' : 'rgba(239, 68, 68, 0.32)';
              strokeColor = '#ef4444';
              strokeWidth = 2.4;
            } else {
              fillColor = isHovered || pathInfo.isDestination
                ? 'rgba(245, 158, 11, 0.48)'
                : 'rgba(245, 158, 11, 0.32)';
              strokeColor = '#fbbf24';
              strokeWidth = pathInfo.isDestination ? 2.6 : 2;
              filter = 'url(#tile-glow-amber)';
            }
          } else if (isReachable) {
            fillColor = isHovered
              ? 'rgba(6, 182, 212, 0.4)'
              : 'rgba(6, 182, 212, 0.22)';
            strokeColor = '#06b6d4';
            strokeWidth = isHovered ? 2.5 : 1.8;
            filter = 'url(#tile-glow-cyan)';
          } else if (isCandidate) {
            const isBlocked = targetPreview && isHovered && targetPreview.isBlockedLoS;
            if (isBlocked) {
              fillColor = 'rgba(239, 68, 68, 0.25)';
              strokeColor = '#ef4444';
            } else {
              fillColor = isHovered
                ? 'rgba(245, 158, 11, 0.45)'
                : 'rgba(245, 158, 11, 0.28)';
              strokeColor = '#f59e0b';
              filter = 'url(#tile-glow-amber)';
            }
            strokeWidth = isHovered ? 2.5 : 2;
          } else if (isRange) {
            // Soft ability range field highlighting tiles within the skill's reach
            fillColor = isHovered
              ? 'rgba(245, 158, 11, 0.16)'
              : 'rgba(245, 158, 11, 0.08)';
            strokeColor = 'rgba(245, 158, 11, 0.45)';
            strokeWidth = 1.2;
          } else if (isHovered) {
            fillColor = elevation >= 2
              ? 'rgba(71, 85, 105, 0.95)'
              : elevation === 1
                ? 'rgba(51, 65, 85, 0.92)'
                : 'rgba(255, 255, 255, 0.08)';
            strokeColor = elevation >= 2
              ? '#fbbf24'
              : elevation === 1
                ? '#38bdf8'
                : 'rgba(255, 255, 255, 0.4)';
            strokeWidth = 1.8;
          }

          return (
            <g
              key={key}
              className={`hex-tile-group ${isPathStep ? 'path-step-tile' : ''} ${pathInfo?.isDestination ? 'path-step-destination-tile' : ''} ${isReachable ? 'reachable' : ''} ${isRange ? 'in-range' : ''} ${isCandidate ? 'candidate' : ''} ${isCutaway ? 'cutaway-translucent' : ''}`}
              style={isCutaway ? { opacity: 0.35, transition: 'opacity 0.15s ease' } : undefined}
              onClick={() => onTileClick(coord)}
              onMouseEnter={() => onTileHover(coord)}
              onMouseLeave={() => onTileHover(null)}
            >
              {/* Extruded Prism Side Walls (strictly pointer-events-none) */}
              {prismWalls.length > 0 && (
                <g className="prism-walls pointer-events-none">
                  {prismWalls.map((wall) => {
                    const isSw = wall.id === 'southwest';
                    return (
                      <polygon
                        key={wall.id}
                        points={wall.points}
                        fill={isSw ? 'url(#prism-wall-sw)' : 'url(#prism-wall-se)'}
                        stroke={isSw ? 'rgba(71, 85, 105, 0.75)' : 'rgba(100, 116, 139, 0.75)'}
                        strokeWidth="1.2"
                      />
                    );
                  })}
                </g>
              )}

              {/* 3D Under-lip shadow for lifted stepping stone */}
              {isPathStep && pathInfo && (
                <polygon
                  points={getHexPolygonPoints(basePixel.x, topY)}
                  fill="rgba(10, 15, 26, 0.85)"
                  stroke="rgba(0, 0, 0, 0.6)"
                  strokeWidth="1.2"
                  className="stepping-stone-lip"
                  style={{
                    animationDelay: `${(pathInfo.stepNumber - 1) * 35}ms`
                  }}
                />
              )}

              {/* Lifted Surface & Badges with Cascading Domino Lift */}
              <g
                key={isPathStep && pathInfo ? `path-step-${pathInfo.stepNumber}` : undefined}
                className={isPathStep ? 'lifted-tile-cap' : undefined}
                style={isPathStep && pathInfo ? { animationDelay: `${(pathInfo.stepNumber - 1) * 35}ms` } : undefined}
              >
                {/* Top Surface Hex Polygon */}
                <polygon
                  points={polyPoints}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  filter={filter}
                />

                {/* Obstacle / Ruins Token Standee */}
                {isObstacle && (
                  <g className="pointer-events-none obstacle-ruins-glyph">
                    {obstacleAssetSrc ? (
                      <image
                        href={obstacleAssetSrc}
                        x={basePixel.x - 34}
                        y={topY - 48}
                        width="68"
                        height="68"
                        preserveAspectRatio="xMidYMax meet"
                        className="pixel-art"
                        filter="url(#standee-drop-shadow)"
                      />
                    ) : (
                      <>
                        {/* Left Ruin Pillar */}
                        <rect
                          x={basePixel.x - 12}
                          y={topY - 14}
                          width={9}
                          height={16}
                          rx={2}
                          fill="rgba(15, 23, 42, 0.92)"
                          stroke={elevation >= 2 ? '#fbbf24' : elevation === 1 ? '#38bdf8' : '#94a3b8'}
                          strokeWidth="1.2"
                        />
                        {/* Right Ruin Pillar (taller) */}
                        <rect
                          x={basePixel.x + 3}
                          y={topY - 20}
                          width={9}
                          height={22}
                          rx={2}
                          fill="rgba(15, 23, 42, 0.92)"
                          stroke={elevation >= 2 ? '#fbbf24' : elevation === 1 ? '#38bdf8' : '#94a3b8'}
                          strokeWidth="1.2"
                        />
                        {/* Crossbeam / fallen lintel cap */}
                        <line
                          x1={basePixel.x - 14}
                          y1={topY - 14}
                          x2={basePixel.x - 1}
                          y2={topY - 14}
                          stroke="#e2e8f0"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        <line
                          x1={basePixel.x + 1}
                          y1={topY - 20}
                          x2={basePixel.x + 14}
                          y2={topY - 20}
                          stroke="#e2e8f0"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </>
                    )}
                    {/* Obstacle / Ruins Label Badge */}
                    <rect
                      x={basePixel.x - 20}
                      y={topY + 6}
                      width={40}
                      height={12}
                      rx={3}
                      fill="rgba(15, 23, 42, 0.85)"
                      stroke={elevation >= 2 ? '#fbbf24' : elevation === 1 ? '#38bdf8' : '#64748b'}
                      strokeWidth="0.8"
                    />
                    <text
                      x={basePixel.x}
                      y={topY + 15}
                      fill={elevation >= 2 ? '#fbbf24' : elevation === 1 ? '#7dd3fc' : '#cbd5e1'}
                      fontSize="7.5"
                      fontWeight="800"
                      letterSpacing="0.6"
                      textAnchor="middle"
                    >
                      {tile.label || 'RUINS'}
                    </text>
                  </g>
                )}

                {/* Elevation Contour Badge */}
                {elevation > 0 && (
                  <g className="pointer-events-none elevation-badge">
                    <rect
                      x={basePixel.x + 8}
                      y={liftedTopY - 24}
                      width={18}
                      height={12}
                      rx={4}
                      fill="rgba(15, 23, 42, 0.88)"
                      stroke={elevation >= 2 ? '#f59e0b' : '#38bdf8'}
                      strokeWidth="1"
                    />
                    <text
                      x={basePixel.x + 17}
                      y={liftedTopY - 15}
                      fill={elevation >= 2 ? '#fbbf24' : '#7dd3fc'}
                      fontSize="8"
                      fontWeight="800"
                      textAnchor="middle"
                    >
                      {`+${elevation}`}
                    </text>
                  </g>
                )}

                {/* Fall Hazard Warning on Hovered Reachable Tile */}
                {movePreview && movePreview.fallDamage > 0 && isHovered && (
                  <g className="pointer-events-none fall-hazard-badge">
                    <rect
                      x={basePixel.x - 54}
                      y={liftedTopY - 40}
                      width={108}
                      height={18}
                      rx={9}
                      fill="rgba(220, 38, 38, 0.95)"
                      stroke="#fca5a5"
                      strokeWidth="1.5"
                    />
                    <text
                      x={basePixel.x}
                      y={liftedTopY - 28}
                      fill="#ffffff"
                      fontSize="9.5"
                      fontWeight="800"
                      textAnchor="middle"
                    >
                      {`⚠️ Fall Hazard: -${movePreview.fallDamage} HP`}
                    </text>
                  </g>
                )}

                {/* Step Number Badge (UX.1: Stepping Stones) */}
                {isPathStep && (
                  <g
                    className={`pointer-events-none path-step-badge ${pathInfo.isHazard ? 'path-step-hazard' : 'path-step-safe'} ${pathInfo.isDestination ? 'path-step-destination' : ''}`}
                    data-testid={`path-step-badge-${pathInfo.stepNumber}`}
                  >
                    {/* Destination Outer Pulse Ring */}
                    {pathInfo.isDestination && (
                      <circle
                        cx={basePixel.x}
                        cy={liftedTopY}
                        r={13}
                        fill="none"
                        stroke={pathInfo.isHazard ? '#ef4444' : '#fbbf24'}
                        strokeWidth="1.2"
                        strokeDasharray="3 2"
                        className="path-dest-ring"
                      />
                    )}

                    {/* Badge Background */}
                    {pathInfo.isHazard ? (
                      <rect
                        x={basePixel.x - 14}
                        y={liftedTopY - 8}
                        width={28}
                        height={16}
                        rx={8}
                        fill="rgba(185, 28, 28, 0.95)"
                        stroke="#fca5a5"
                        strokeWidth="1.2"
                        className="path-step-bg"
                      />
                    ) : (
                      <circle
                        cx={basePixel.x}
                        cy={liftedTopY}
                        r={8.5}
                        fill="rgba(15, 23, 42, 0.92)"
                        stroke={pathInfo.isDestination ? '#fbbf24' : '#f59e0b'}
                        strokeWidth="1.2"
                        className="path-step-bg"
                      />
                    )}

                    {/* Step Number Text */}
                    <text
                      x={basePixel.x}
                      y={liftedTopY + 3.2}
                      fill={pathInfo.isHazard ? '#ffffff' : '#fef08a'}
                      fontSize={pathInfo.isHazard ? '8' : '8.5'}
                      fontWeight="800"
                      textAnchor="middle"
                      className="path-step-text"
                    >
                      {pathInfo.isHazard ? `⚠️${pathInfo.stepNumber}` : pathInfo.stepNumber}
                    </text>
                  </g>
                )}
              </g>

              {/* Subtle coordinate labels (hidden on obstacles and path steps) */}
              {!isObstacle && !isPathStep && (
                <text
                  x={basePixel.x}
                  y={topY + 13}
                  fill="rgba(255, 255, 255, 0.2)"
                  fontSize="7"
                  textAnchor="middle"
                  className="pointer-events-none"
                >
                  {coord.q},{coord.r}
                </text>
              )}
            </g>
          );
        })}
      </g>

      {/* 2. Unit Tokens Layer */}
      <g className="units-layer pointer-events-none">
        {Array.from(state.units.entries())
          .filter(([_, cu]) => !cu.isDefeated)
          .map(([unitId, cu]) => {
            const pos = state.arena.getUnitPosition(unitId);
            const basePixel = pos ? hexToPixel(pos) : { x: 0, y: 0 };
            const elev = pos ? (state.arena.getElevation(pos) ?? 0) : 0;
            const pixel = pos
              ? { x: basePixel.x, y: projectElevationY(basePixel.y, elev) }
              : { x: 0, y: 0 };

            // Check if unit is behind higher terrain (adjacent tile to the south has higher elevation)
            let isBehindCliff = false;
            if (pos) {
              const southNeighbors = [
                { q: pos.q, r: pos.r + 1 },
                { q: pos.q + 1, r: pos.r },
                { q: pos.q - 1, r: pos.r + 1 }
              ];
              for (const n of southNeighbors) {
                if (state.arena.getElevation(n) > elev) {
                  isBehindCliff = true;
                  break;
                }
              }
            }

            return { unitId, cu, pos, basePixel, pixel, isBehindCliff };
          })
          .filter((item): item is typeof item & { pos: HexCoord } => item.pos != null)
          .sort((a, b) => a.basePixel.y - b.basePixel.y)
          .map(({ unitId, cu, pos, pixel: { x, y }, isBehindCliff }) => {
            const faction = cu.faction;
            const isPlayer = faction === 'PLAYER';
            const isEnemy = faction === 'ENEMY';
            const isActiveActor = state.activeUnitId === unitId;
            const isHighlighted = highlightedUnitId != null && unitId === highlightedUnitId;
            const hpPercent = (cu.currentHp / cu.unit.effectiveVitals.maxHp) * 100;

            // Visual theme by faction & active status
            const tokenFill = isPlayer ? '#0f2937' : isEnemy ? '#450a0a' : '#1c1917';
            const tokenStroke = isActiveActor
              ? '#fbbf24'
              : isPlayer
                ? '#38bdf8'
                : isEnemy
                  ? '#f87171'
                  : '#a8a29e';
            const nameColor = isHighlighted
              ? '#ffffff'
              : isActiveActor
                ? '#fef08a'
                : isPlayer
                  ? '#7dd3fc'
                  : isEnemy
                    ? '#fca5a5'
                    : '#e2e8f0';
            const badgeSymbol = isPlayer ? '🛡️' : isEnemy ? '🎯' : '⚪';
            const hpBarFill = isPlayer ? '#10b981' : hpPercent < 40 ? '#ef4444' : '#f59e0b';
            const displayName = isPlayer ? cu.unit.name.split(' ')[0] : cu.unit.name;

            const tokenAssetSrc = resolveTokenAssetPath(cu.unit, cu.facing);
            const isCandidate = candidateSet.has(toHexKey(pos));
            const candidateReticleStroke = isPlayer ? '#10b981' : '#f59e0b';
            const candidateGlowFilter = isPlayer ? 'url(#tile-glow-cyan)' : 'url(#tile-glow-amber)';

            const isStealthed = (cu.activeConditions ?? []).some((c) => c.type === 'STEALTH');
            const statusIcons: string[] = [
              ...(cu.activeConditions ?? []).map((c) =>
                c.type === 'STEALTH' ? '👤' :
                  c.type === 'POISON' ? '🧪' :
                    c.type === 'BURN' ? '🔥' :
                      c.type === 'CHALLENGED' ? '⚔️' :
                        c.type === 'EXPOSED' ? '🎯' : '✨'
              ),
              ...(cu.activeModifiers ?? []).map((m) =>
                m.stat === 'move' && m.value < 0 ? '❄️' :
                  m.stat === 'move' && m.value > 0 ? '💨' :
                    m.stat === 'armor' ? '🛡️' :
                      m.stat === 'ward' ? '🔮' :
                        m.stat === 'speed' ? '⚡' : '✨'
              )
            ];
            const hasDebuff =
              (cu.activeModifiers ?? []).some((m) => m.value < 0) ||
              (cu.activeConditions ?? []).some(
                (c) => c.type === 'POISON' || c.type === 'BURN' || c.type === 'CHALLENGED' || c.type === 'EXPOSED'
              );
            const statusBubbleStroke = isStealthed ? '#c084fc' : hasDebuff ? '#f87171' : '#fbbf24';
            const statusBubbleWidth = Math.max(statusIcons.length * 13 + 6, 20);



            return (
              <g
                key={unitId}
                transform={`translate(${x}, ${y})`}
                className={`unit-render-group ${isHighlighted ? 'unit-highlighted' : ''}`}
                data-testid={`unit-group-${unitId}`}
                onMouseEnter={() => onTileHover(pos)}
              >
                {tokenAssetSrc ? (
                  /* Pixel Token Presentation */
                  <>
                    {/* Base Ground Blur Shadow */}
                    <ellipse
                      cx="0"
                      cy="4"
                      rx="20"
                      ry="7"
                      fill="rgba(0, 0, 0, 0.45)"
                      filter="url(#pedestal-ground-shadow)"
                    />

                    {/* Hover Astral Halo */}
                    {isHighlighted && (
                      <ellipse
                        cx="0"
                        cy="2"
                        rx="23.5"
                        ry="9"
                        fill={isPlayer ? 'rgba(56, 189, 248, 0.22)' : 'rgba(248, 113, 113, 0.22)'}
                        stroke={isPlayer ? '#38bdf8' : '#f87171'}
                        strokeWidth="2.2"
                        filter={isPlayer ? 'url(#tile-glow-cyan)' : 'url(#tile-glow-amber)'}
                        className="unit-hover-halo"
                        data-testid={`unit-hover-halo-${unitId}`}
                      />
                    )}

                    {/* Active Unit Golden Halo */}
                    {isActiveActor && (
                      <ellipse
                        cx="0"
                        cy="2"
                        rx="22"
                        ry="8.5"
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="2.5"
                        filter="url(#tile-glow-amber)"
                      />
                    )}

                    {/* Pinned Unit Celestial Selection Bracket */}
                    {unitId === pinnedUnitId && (
                      <ellipse
                        cx="0"
                        cy="2"
                        rx="25"
                        ry="9.5"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="2"
                        strokeDasharray="6 3"
                        filter="url(#tile-glow-cyan)"
                        className="unit-pinned-ring"
                        data-testid={`unit-pinned-ring-${unitId}`}
                      />
                    )}

                    {/* 3D Pedestal Base Rim / Bevel */}
                    <path
                      d="M -18 2 C -18 8, 18 8, 18 2 L 18 5 C 18 11, -18 11, -18 5 Z"
                      fill={isPlayer ? '#0f172a' : isEnemy ? '#270707' : '#1c1917'}
                      stroke={tokenStroke}
                      strokeWidth={isActiveActor ? 1.5 : 1}
                    />

                    {/* 3D Pedestal Base Top Surface */}
                    <ellipse
                      cx="0"
                      cy="2"
                      rx="18"
                      ry="6.5"
                      fill={tokenFill}
                      stroke={tokenStroke}
                      strokeWidth={isActiveActor ? 2.5 : isPlayer ? 2 : 1.5}
                    />

                    {/* Directional Facing Chevron on Pedestal */}
                    <g transform={`translate(0, 2) rotate(${getFacingAngleDegrees(cu.facing)})`}>
                      <polygon
                        points="13,-3.5 19,0 13,3.5"
                        fill={tokenStroke}
                        stroke="#0f172a"
                        strokeWidth="0.8"
                      />
                    </g>

                    {/* Target Candidate Reticle (Elliptical base ring: Emerald for allies, Amber for enemies) */}
                    {isCandidate && (
                      <ellipse
                        cx="0"
                        cy="2"
                        rx="23"
                        ry="8.5"
                        fill="none"
                        stroke={candidateReticleStroke}
                        strokeWidth="2"
                        strokeDasharray="4 3"
                        filter={candidateGlowFilter}
                      />
                    )}

                    {/* Stealthed Smoke Aura Halo on Pedestal */}
                    {isStealthed && (
                      <ellipse
                        cx="0"
                        cy="2"
                        rx="21"
                        ry="8"
                        fill="rgba(168, 85, 247, 0.22)"
                        stroke="#c084fc"
                        strokeWidth="1.8"
                        strokeDasharray="4 3"
                      />
                    )}

                    {/* Upright Pixel Sprite Image (Native 6-way rotations) */}
                    <image
                      href={tokenAssetSrc}
                      x="-30"
                      y="-58"
                      width="60"
                      height="60"
                      preserveAspectRatio="xMidYMax meet"
                      filter={
                        isBehindCliff
                          ? isPlayer
                            ? 'url(#standee-occlusion-glow-player)'
                            : 'url(#standee-occlusion-glow-enemy)'
                          : 'url(#standee-drop-shadow)'
                      }
                      className="pixel-art"
                      opacity={isStealthed ? 0.52 : 1}
                    />


                    {/* Unit Name Plate (above head) */}
                    <text
                      x="0"
                      y="-62"
                      fill={nameColor}
                      fontSize="8.5"
                      fontWeight="700"
                      textAnchor="middle"
                      className="token-name-label"
                    >
                      {displayName}
                    </text>

                    {/* Active Status Effects on Standee */}
                    {statusIcons.length > 0 && (
                      <StandeeStatusBubble
                        unitId={unitId}
                        cu={cu}
                        statusIcons={statusIcons}
                        statusBubbleWidth={statusBubbleWidth}
                        statusBubbleStroke={statusBubbleStroke}
                        yOffset={-74}
                        state={state}
                      />
                    )}

                    {/* Health Bar (below base) */}
                    <rect
                      x="-14"
                      y="14"
                      width="28"
                      height="4"
                      fill="#0f172a"
                      rx="2"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="0.5"
                    />
                    <rect
                      x="-14"
                      y="14"
                      width={Math.max(0, (28 * hpPercent) / 100)}
                      height="4"
                      fill={hpBarFill}
                      rx="2"
                    />

                    {/* Active Player AP pips */}
                    {isActiveActor && isPlayer && (
                      <g transform="translate(0, 22)">
                        {[0, 1, 2].map((pip) => (
                          <circle
                            key={pip}
                            cx={(pip - 1) * 7}
                            cy="0"
                            r="2"
                            fill={pip < cu.currentAp ? '#38bdf8' : 'rgba(255,255,255,0.2)'}
                          />
                        ))}
                      </g>
                    )}
                  </>
                ) : (
                  /* Classic Vector Token Fallback */
                  <>
                    {/* Hover Astral Halo in Vector Fallback */}
                    {isHighlighted && (
                      <circle
                        r="22.5"
                        fill={isPlayer ? 'rgba(56, 189, 248, 0.22)' : 'rgba(248, 113, 113, 0.22)'}
                        stroke={isPlayer ? '#38bdf8' : '#f87171'}
                        strokeWidth="2.2"
                        filter={isPlayer ? 'url(#tile-glow-cyan)' : 'url(#tile-glow-amber)'}
                        className="unit-hover-halo"
                        data-testid={`unit-hover-halo-${unitId}`}
                      />
                    )}

                    {/* Active Unit Halo in Vector Fallback */}
                    {isActiveActor && (
                      <circle
                        r="21"
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="2.5"
                        filter="url(#tile-glow-amber)"
                      />
                    )}

                    {/* Unit Token Circle */}
                    <circle
                      r="17"
                      fill={tokenFill}
                      stroke={isStealthed ? '#c084fc' : tokenStroke}
                      strokeWidth={isActiveActor ? 3 : isPlayer ? 2.5 : 2}
                      strokeDasharray={isStealthed ? '4 3' : undefined}
                      opacity={isStealthed ? 0.6 : 1}
                      filter={isPlayer ? 'url(#tile-glow-cyan)' : undefined}
                    />

                    {/* Directional Facing Chevron */}
                    <g transform={`rotate(${getFacingAngleDegrees(cu.facing)})`}>
                      <polygon
                        points="16,-4.5 23.5,0 16,4.5"
                        fill={tokenStroke}
                        stroke="#0f172a"
                        strokeWidth="0.8"
                      />
                    </g>

                    {/* Target Candidate Reticle (Only for valid targets within range) */}
                    {isCandidate && (
                      <circle
                        r="22"
                        fill="none"
                        stroke={candidateReticleStroke}
                        strokeWidth="2"
                        strokeDasharray="4 3"
                        filter={candidateGlowFilter}
                      />
                    )}

                    {/* Unit Symbol / Badge */}
                    <text
                      x="0"
                      y="-1"
                      fill="#ffffff"
                      fontSize="12"
                      fontWeight="800"
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {badgeSymbol}
                    </text>

                    {/* Unit Name Plate */}
                    <text
                      x="0"
                      y="-23"
                      fill={nameColor}
                      fontSize="8.5"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {displayName}
                    </text>

                    {/* Active Status Effects on Token */}
                    {statusIcons.length > 0 && (
                      <StandeeStatusBubble
                        unitId={unitId}
                        cu={cu}
                        statusIcons={statusIcons}
                        statusBubbleWidth={statusBubbleWidth}
                        statusBubbleStroke={statusBubbleStroke}
                        yOffset={-34}
                        state={state}
                      />
                    )}

                    {/* Health Bar */}
                    <rect
                      x="-14"
                      y="19"
                      width="28"
                      height="4"
                      fill="#0f172a"
                      rx="2"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="0.5"
                    />
                    <rect
                      x="-14"
                      y="19"
                      width={Math.max(0, (28 * hpPercent) / 100)}
                      height="4"
                      fill={hpBarFill}
                      rx="2"
                    />

                    {/* Player AP pips */}
                    {isPlayer && (
                      <g transform="translate(0, 27)">
                        {[0, 1, 2].map((pip) => (
                          <circle
                            key={pip}
                            cx={(pip - 1) * 7}
                            cy="0"
                            r="2"
                            fill={pip < cu.currentAp ? '#38bdf8' : 'rgba(255,255,255,0.2)'}
                          />
                        ))}
                      </g>
                    )}
                  </>
                )}
              </g>
            );
          })}
      </g>
 
      {/* 2b. Facing Compass Overlay Layer (rendered above all unit standees to prevent occlusion) */}
      {(() => {
        if (!facingCompassCoord || !state.activeUnitId) return null;
        const activeCu = state.units.get(state.activeUnitId);
        if (!activeCu || activeCu.isDefeated) return null;
        const activePos = state.arena.getUnitPosition(state.activeUnitId);
        if (!activePos || !hexEquals(activePos, facingCompassCoord)) return null;

        const basePixel = hexToPixel(activePos);
        const elev = state.arena.getElevation(activePos) ?? 0;
        const x = basePixel.x;
        const y = projectElevationY(basePixel.y, elev);

        return (
          <g
            className="facing-compass-overlay"
            data-testid="facing-compass-overlay"
            transform={`translate(${x}, ${y})`}
          >
            <g className="facing-compass-ring" data-testid="facing-compass-ring">
              {/* Subtle celestial orbit track at hex perimeter */}
              <circle
                cx="0"
                cy="2"
                r="39"
                fill="none"
                stroke="rgba(56, 189, 248, 0.4)"
                strokeWidth="1.2"
                strokeDasharray="3 3"
                className="compass-orbit-track"
              />
              {ALL_HEX_DIRECTIONS.map((dir) => {
                const isCurrentFacing = dir === activeCu.facing;
                const angle = getFacingAngleDegrees(dir);
                return (
                  <g
                    key={dir}
                    transform={`translate(0, 2) rotate(${angle})`}
                    className={`facing-chevron-group ${isCurrentFacing ? 'active' : 'inactive'}`}
                    data-testid={`facing-chevron-${dir}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectFacing?.(dir);
                    }}
                  >
                    {/* Invisible expanded hit target (diameter 24px) */}
                    <circle
                      cx="39"
                      cy="0"
                      r="12"
                      fill="transparent"
                      className="facing-chevron-hitbox"
                    />
                    {/* Visible Directional Chevron */}
                    <polygon
                      points="34,-6 43,0 34,6 36.5,0"
                      fill={isCurrentFacing ? '#38bdf8' : 'rgba(148, 163, 184, 0.6)'}
                      stroke={isCurrentFacing ? '#ffffff' : 'rgba(203, 213, 225, 0.8)'}
                      strokeWidth={isCurrentFacing ? '1.5' : '1'}
                      filter={isCurrentFacing ? 'url(#tile-glow-cyan)' : undefined}
                      className="facing-chevron-poly"
                    />
                  </g>
                );
              })}
            </g>
          </g>
        );
      })()}

      {/* 3. Floating Combat Feedback Numbers */}
      <g className="floating-text-layer pointer-events-none">
        {floatingTexts.map((ft) => {
          const base = hexToPixel(ft.coord);
          const elev = state.arena.getElevation(ft.coord) ?? 0;
          const x = base.x;
          const y = projectElevationY(base.y, elev);
          let color = '#ffffff';
          let weight = '700';
          let size = '12';
          if (ft.text.includes('Fault')) {
            color = '#f59e0b';
            weight = '800';
            size = '13';
          } else if (ft.type === 'crit') {
            color = '#fbbf24';
            weight = '900';
            size = '14';
          } else if (ft.type === 'damage' || ft.type === 'slam') {
            color = '#f87171';
            size = '13';
          } else if (ft.type === 'graze') {
            color = '#cbd5e1';
            size = '11';
          } else if (ft.type === 'miss') {
            color = '#94a3b8';
          } else if (ft.type === 'xp') {
            color = '#a855f7';
            size = '11';
          } else if (ft.type === 'buff') {
            color = '#38bdf8';
            size = '11';
          } else if (ft.type === 'initiative') {
            color = '#38bdf8';
            weight = '800';
            size = '13';
          }

          return (
            <text
              key={ft.id}
              x={x}
              y={y - 25}
              fill={color}
              fontSize={size}
              fontWeight={weight}
              textAnchor="middle"
              className="floating-combat-text"
            >
              {ft.text}
            </text>
          );
        })}
      </g>
    </svg>
  );
}
