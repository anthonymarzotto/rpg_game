import { useMemo } from 'react';
import { HexCoord, toHexKey, getFacingAngleDegrees } from '../../core/grid/hex';
import { CombatState } from '../../core/combat/types';
import { TargetPreview } from '../../core/combat/targetPreview';
import { FloatingText } from './useFloatingCombatText';
import { resolveTokenAssetPath } from './tokenAssets';

export interface HexGridSvgProps {
  readonly state: CombatState;
  readonly reachableCoords: readonly HexCoord[];
  readonly abilityRangeCoords: readonly HexCoord[];
  readonly candidateTargetCoords: readonly HexCoord[];
  readonly hoveredCoord: HexCoord | null;
  readonly floatingTexts: readonly FloatingText[];
  readonly targetPreview: TargetPreview | null;
  readonly zoom?: number;
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
  zoom = 1,
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

  // Dynamically collect all arena tiles from the spatial model
  const allTiles = useMemo(() => {
    return state.arena.getAllTiles();
  }, [state.arena]);

  // Compute dynamic viewBox and backdrop radius based on arena bounds and zoom
  const { viewBox, backdropRadius } = useMemo(() => {
    if (allTiles.length === 0) {
      return { viewBox: '-320 -280 640 560', backdropRadius: 230 };
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const tile of allTiles) {
      const { x, y } = hexToPixel(tile.coord);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const paddingX = HEX_RADIUS + 35;
    const paddingY = HEX_RADIUS + 45;
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
    const backdropRadius = Math.round(maxDimension / 2 + HEX_RADIUS * 0.7);

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
        {/* Pedestal Ground Blur Shadow */}
        <filter id="pedestal-ground-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" />
        </filter>
      </defs>

      {/* Grid Backdrop Grid Glow */}
      <circle cx="0" cy="0" r={backdropRadius} fill="rgba(30, 41, 59, 0.35)" />

      {/* 1. Base Terrain Hexes */}
      <g className="tiles-layer">
        {allTiles.map((tile) => {
          const coord = tile.coord;
          const key = toHexKey(coord);
          const isObstacle = !tile.isWalkable;
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
            >
              <polygon
                points={polyPoints}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                filter={filter}
              />

              {/* Obstacle pattern with data-driven label */}
              {isObstacle && (
                <g className="pointer-events-none">
                  <circle cx={x} cy={y} r="12" fill="rgba(100, 116, 139, 0.4)" />
                  <text
                    x={x}
                    y={y + 3}
                    fill="#94a3b8"
                    fontSize="8.5"
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {tile.label ?? 'BLOCK'}
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
            const pixel = pos ? hexToPixel(pos) : { x: 0, y: 0 };
            return { unitId, cu, pos, pixel };
          })
          .filter((item): item is typeof item & { pos: HexCoord } => item.pos != null)
          .sort((a, b) => a.pixel.y - b.pixel.y)
          .map(({ unitId, cu, pos, pixel: { x, y } }) => {
            const faction = cu.faction;
            const isPlayer = faction === 'PLAYER';
            const isEnemy = faction === 'ENEMY';
            const isActiveActor = state.activeUnitId === unitId;
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
            const nameColor = isActiveActor
              ? '#fef08a'
              : isPlayer
              ? '#7dd3fc'
              : isEnemy
              ? '#fca5a5'
              : '#e2e8f0';
            const badgeSymbol = isPlayer ? '🛡️' : isEnemy ? '🎯' : '⚪';
            const hpBarFill = isPlayer ? '#10b981' : hpPercent < 40 ? '#ef4444' : '#f59e0b';

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
                c.type === 'CHALLENGED' ? '⚔️' : '✨'
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
                (c) => c.type === 'POISON' || c.type === 'BURN' || c.type === 'CHALLENGED'
              );
            const statusBubbleStroke = isStealthed ? '#c084fc' : hasDebuff ? '#f87171' : '#fbbf24';
            const statusBubbleWidth = Math.max(statusIcons.length * 13 + 6, 20);

            return (
              <g key={unitId} transform={`translate(${x}, ${y})`}>
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
                      filter="url(#standee-drop-shadow)"
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
                      {cu.unit.name.split(' ')[0]}
                    </text>

                    {/* Active Status Effects on Standee */}
                    {statusIcons.length > 0 && (
                      <g transform="translate(0, -74)">
                        <rect
                          x={-statusBubbleWidth / 2}
                          y="-6"
                          width={statusBubbleWidth}
                          height="12"
                          rx="6"
                          fill="rgba(15, 23, 42, 0.92)"
                          stroke={statusBubbleStroke}
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="3"
                          fontSize="7.5"
                          textAnchor="middle"
                        >
                          {statusIcons.join('')}
                        </text>
                      </g>
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
                      {cu.unit.name.split(' ')[0]}
                    </text>

                    {/* Active Status Effects on Token */}
                    {statusIcons.length > 0 && (
                      <g transform="translate(0, -34)">
                        <rect
                          x={-statusBubbleWidth / 2}
                          y="-6"
                          width={statusBubbleWidth}
                          height="12"
                          rx="6"
                          fill="rgba(15, 23, 42, 0.92)"
                          stroke={statusBubbleStroke}
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="3"
                          fontSize="7.5"
                          textAnchor="middle"
                        >
                          {statusIcons.join('')}
                        </text>
                      </g>
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

      {/* 3. Floating Combat Feedback Numbers */}
      <g className="floating-text-layer pointer-events-none">
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
