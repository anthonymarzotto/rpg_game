import { getHexesInRange } from './hex';
import { Arena, HexTile } from './arena';

/**
 * Creates a standard radial hexagonal arena centered at (0, 0).
 */
export function createRadialArena(radius: number, defaultElevation = 0): Arena {
  const coords = getHexesInRange({ q: 0, r: 0 }, radius);
  const tiles: HexTile[] = coords.map((coord) => ({
    coord,
    elevation: defaultElevation,
    isWalkable: true
  }));
  return new Arena(tiles);
}
