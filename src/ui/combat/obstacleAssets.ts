import { HexCoord } from '../../core/grid/hex';
import { preloadImageUrls } from './tokenAssets';

/**
 * The 8 directional rotations available for obstacle prop tokens.
 */
export const RUINS_ROTATIONS = [
  'south',
  'south-east',
  'east',
  'north-east',
  'north',
  'north-west',
  'west',
  'south-west'
] as const;

export type ObstacleRotation = (typeof RUINS_ROTATIONS)[number];

const rawBase = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL ? import.meta.env.BASE_URL : './';
const BASE_URL = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

/**
 * Deterministically resolves one of the 8 obstacle rotations based on axial hex coordinates.
 * Using coprime multipliers ensures diverse visual rotation across adjacent hexes,
 * while guaranteeing identical orientation across re-renders and hovers without state jitter.
 */
export function getObstacleRotation(coord: HexCoord): ObstacleRotation {
  const index = Math.abs(coord.q * 37 + coord.r * 19) % RUINS_ROTATIONS.length;
  return RUINS_ROTATIONS[index];
}

/**
 * Resolves the asset URL for an obstacle token given its type and rotation.
 * Returns null if the obstacle type does not have asset graphics available.
 */
export function resolveObstacleAssetPath(
  obstacleType: string = 'ruins',
  rotation: ObstacleRotation = 'south'
): string | null {
  const normalizedType = obstacleType.toLowerCase();
  if (normalizedType !== 'ruins' && normalizedType !== 'pillar' && normalizedType !== 'obstacle') {
    return null;
  }
  return `${BASE_URL}assets/objects/ruins/rotations/${rotation}.png`;
}

/**
 * Returns all asset URLs across all 8 rotations for an obstacle token set to support preloading.
 */
export function getObstacleTokenUrls(obstacleType: string = 'ruins'): string[] {
  const normalizedType = obstacleType.toLowerCase();
  if (normalizedType !== 'ruins' && normalizedType !== 'pillar' && normalizedType !== 'obstacle') {
    return [];
  }
  return RUINS_ROTATIONS.map((rot) => `${BASE_URL}assets/objects/ruins/rotations/${rot}.png`);
}

/**
 * Eagerly preloads rotation assets for specified obstacle types.
 */
export function preloadObstacleTokens(obstacleTypes: Iterable<string> = ['ruins']): Promise<void[]> {
  const urlSet = new Set<string>();
  for (const type of obstacleTypes) {
    const urls = getObstacleTokenUrls(type);
    for (const url of urls) {
      urlSet.add(url);
    }
  }
  return preloadImageUrls(urlSet);
}
