import { Unit } from '../types/unit';
import { HexCoord } from '../grid/hex';
import { createRadialArena } from '../grid/templates';
import { CombatState } from './types';
import { createCombatState } from './resolver';

/**
 * Unit placement on the tactical grid.
 */
export interface PlacedUnit {
  readonly unit: Unit;
  readonly coord: HexCoord;
}

/**
 * Custom tile override for walls, obstacles, or elevation.
 */
export interface EncounterTileOverride {
  readonly coord: HexCoord;
  readonly isWalkable?: boolean;
  readonly elevation?: number;
  readonly label?: string;
  readonly terrainType?: string;
}

/**
 * Declarative definition of a combat encounter map and participant roster.
 */
export interface EncounterDefinition {
  readonly id: string;
  readonly name: string;
  readonly arenaRadius?: number;
  readonly tileOverrides?: readonly EncounterTileOverride[];
  readonly units: readonly PlacedUnit[];
  readonly initialActiveUnitId?: string;
}

/**
 * Instantiates a concrete CombatState from an EncounterDefinition.
 */
export function buildEncounterState(definition: EncounterDefinition): CombatState {
  const radius = definition.arenaRadius ?? 3;
  const arena = createRadialArena(radius);

  if (definition.tileOverrides) {
    for (const override of definition.tileOverrides) {
      const existing = arena.getTile(override.coord);
      if (existing) {
        arena.setTile({
          ...existing,
          isWalkable: override.isWalkable ?? existing.isWalkable,
          elevation: override.elevation ?? existing.elevation,
          label: override.label ?? existing.label,
          terrainType: override.terrainType ?? existing.terrainType
        });
      }
    }
  }

  const units: Unit[] = [];
  for (const placed of definition.units) {
    units.push(placed.unit);
    arena.setUnitPosition(placed.unit.id, placed.coord);
  }

  return createCombatState(arena, units, definition.initialActiveUnitId);
}
