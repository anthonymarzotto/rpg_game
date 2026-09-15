import { useMemo } from 'react';
import { HexCoord, toHexKey } from '../../core/grid/hex';
import { CombatState } from '../../core/combat/types';
import { FloatingText, TargetPreview } from './useCombatSimulation';

export interface HexGridSvgProps {
  readonly state: CombatState;
  readonly reachableCoords: readonly HexCoord[];
  readonly abilityRangeCoords: readonly HexCoord[];
  readonly candidateTargetCoords: readonly HexCoord[];
  readonly hoveredCoord: HexCoord | null;
  readonly floatingTexts: readonly FloatingText[];
  readonly targetPreview: TargetPreview | null;
  readonly onTileClick: (coord: HexCoord) => void;
  readonly onTileHover: (coord: HexCoord | null) => void;
}

const HEX_RADIUS = 38;
const SQRT3 = Math.sqrt(3);

function hexToPixel(coord: HexCoord): { x: number; y: number } {
  const x = HEX_RADIUS * (SQRT3 * coord.q + (SQRT3 / 2) * coord.r);
  const y = HEX_RADIUS * (1.5 * coord.r);
  return { x, y };
}

function getHexPolygonPoints(cx: number, cy: number, radius = HEX_RADIUS - 1.5): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angleRad = ((60 * i - 30) * Math.PI) / 180;
    const x = (cx + radius * Math.cos(angleRad)).toFixed(1);
    const y = (cy + radius * Math.sin(angleRad)).toFixed(1);
    points.push(`${x},${y}`);
  }
  return points.join(' ');
}

export function HexGridSvg({
  state,
  reachableCoords,
  abilityRangeCoords,
  candidateTargetCoords,
  hoveredCoord,
  floatingTexts,
  targetPreview,
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

  // Collect all arena tiles
  const allCoords = useMemo(() => {
    const coords: HexCoord[] = [];
    const radius = 3;
    for (let q = -radius; q <= radius; q++) {
      const r1 = Math.max(-radius, -q - radius);
      const r2 = Math.min(radius, -q + radius);
      for (let r = r1; r <= r2; r++) {
        coords.push({ q, r });
      }
    }
    return coords;
  }, []);

  return (
    <svg
      className="arena-hex-svg"
      viewBox="-320 -280 640 560"
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
      </defs>

      {/* Grid Backdrop Grid Glow */}
      <circle cx="0" cy="0" r="230" fill="rgba(30, 41, 59, 0.35)" />

      {/* 1. Base Terrain Hexes */}
      <g className="tiles-layer">
        {allCoords.map((coord) => {
          const key = toHexKey(coord);
          const tile = state.arena.getTile(coord);
          const isObstacle = tile ? !tile.isWalkable : false;
          const isReachable = reachableSet.has(key);
          const isRange = rangeSet.has(key);
          const isCandidate = candidateSet.has(key);
          const isHovered =
            hoveredCoord && hoveredCoord.q === coord.q && hoveredCoord.r === coord.r;

          const { x, y } = hexToPixel(coord);
          const polyPoints = getHexPolygonPoints(x, y);

          // Tile Styling
          let fillColor = 'rgba(15, 23, 42, 0.75)';
          let strokeColor = 'rgba(148, 163, 184, 0.15)';
          let strokeWidth = 1;
          let filter: string | undefined;

          if (isObstacle) {
            fillColor = 'rgba(51, 65, 85, 0.9)';
            strokeColor = '#64748b';
            strokeWidth = 1.5;
          } else if (isReachable) {
            fillColor = isHovered
              ? 'rgba(6, 182, 212, 0.35)'
              : 'rgba(6, 182, 212, 0.18)';
            strokeColor = '#06b6d4';
            strokeWidth = isHovered ? 2.5 : 1.5;
            filter = 'url(#tile-glow-cyan)';
          } else if (isCandidate) {
            const isBlocked = targetPreview && isHovered && targetPreview.isBlockedLoS;
            if (isBlocked) {
              fillColor = 'rgba(239, 68, 68, 0.25)';
              strokeColor = '#ef4444';
            } else {
              fillColor = isHovered
                ? 'rgba(245, 158, 11, 0.42)'
                : 'rgba(245, 158, 11, 0.24)';
              strokeColor = '#f59e0b';
              filter = 'url(#tile-glow-amber)';
            }
            strokeWidth = isHovered ? 2.5 : 2;
          } else if (isRange) {
            // Soft ability range field highlighting tiles within the skill's reach
            fillColor = isHovered
              ? 'rgba(245, 158, 11, 0.14)'
              : 'rgba(245, 158, 11, 0.06)';
            strokeColor = 'rgba(245, 158, 11, 0.45)';
            strokeWidth = 1.2;
          } else if (isHovered) {
            fillColor = 'rgba(255, 255, 255, 0.08)';
            strokeColor = 'rgba(255, 255, 255, 0.4)';
            strokeWidth = 1.5;
          }

          return (
            <g
              key={key}
              className={`hex-tile-group ${isReachable ? 'reachable' : ''} ${isRange ? 'in-range' : ''} ${isCandidate ? 'candidate' : ''}`}
              onClick={() => onTileClick(coord)}
              onMouseEnter={() => onTileHover(coord)}
              onMouseLeave={() => onTileHover(null)}
              style={{ cursor: isReachable || isCandidate ? 'pointer' : isRange ? 'crosshair' : 'default' }}
            >
              <polygon
                points={polyPoints}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                filter={filter}
              />

              {/* Obstacle rock pattern */}
              {isObstacle && (
                <g style={{ pointerEvents: 'none' }}>
                  <circle cx={x} cy={y} r="12" fill="rgba(100, 116, 139, 0.4)" />
                  <text
                    x={x}
                    y={y + 3}
                    fill="#94a3b8"
                    fontSize="9"
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    PILLAR
                  </text>
                </g>
              )}

              {/* Subtle coordinate labels */}
              {!isObstacle && (
                <text
                  x={x}
                  y={y + 13}
                  fill="rgba(255, 255, 255, 0.2)"
                  fontSize="7"
                  textAnchor="middle"
                  style={{ pointerEvents: 'none' }}
                >
                  {coord.q},{coord.r}
                </text>
              )}
            </g>
          );
        })}
      </g>

      {/* 2. Unit Tokens Layer */}
      <g className="units-layer" style={{ pointerEvents: 'none' }}>
        {Array.from(state.units.entries()).map(([unitId, cu]) => {
          if (cu.isDefeated) return null;
          const pos = state.arena.getUnitPosition(unitId);
          if (!pos) return null;
          const { x, y } = hexToPixel(pos);
          const isPlayer = unitId === 'player';
          const hpPercent = (cu.currentHp / cu.unit.effectiveVitals.maxHp) * 100;

          return (
            <g key={unitId} transform={`translate(${x}, ${y})`}>
              {/* Unit Token Circle */}
              <circle
                r="17"
                fill={isPlayer ? '#1e1b4b' : '#450a0a'}
                stroke={isPlayer ? '#38bdf8' : '#f87171'}
                strokeWidth={isPlayer ? 2.5 : 2}
                filter="url(#tile-glow-cyan)"
              />

              {/* Target Candidate Reticle (Only for valid targets within range) */}
              {!isPlayer && candidateSet.has(toHexKey(pos)) && (
                <circle
                  r="21"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                  filter="url(#tile-glow-amber)"
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
                {isPlayer ? '🛡️' : '🎯'}
              </text>

              {/* Unit Name Plate */}
              <text
                x="0"
                y="-23"
                fill={isPlayer ? '#7dd3fc' : '#fca5a5'}
                fontSize="8.5"
                fontWeight="700"
                textAnchor="middle"
              >
                {cu.unit.name.split(' ')[0]}
              </text>

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
                fill={isPlayer ? '#10b981' : hpPercent < 40 ? '#ef4444' : '#f59e0b'}
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
            </g>
          );
        })}
      </g>

      {/* 3. Floating Combat Feedback Numbers */}
      <g className="floating-text-layer" style={{ pointerEvents: 'none' }}>
        {floatingTexts.map((ft) => {
          const { x, y } = hexToPixel(ft.coord);
          let color = '#ffffff';
          let weight = '700';
          let size = '12';

          if (ft.type === 'crit') {
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
