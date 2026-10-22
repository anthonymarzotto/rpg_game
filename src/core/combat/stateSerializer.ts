import { CombatState, CombatUnit, SerializedCombatState } from './types';
import { Arena } from '../grid/arena';
import { HexCoord } from '../grid/hex';

export const TRIAL_SERIALIZATION_VERSION = 1;

/**
 * Serializes an active or concluded CombatState into a JSON-safe plain object.
 * Unpacks Map collections (Arena tiles, unit positions, units map) into arrays/records.
 */
export function serializeCombatState(state: CombatState): SerializedCombatState {
  const allTiles = state.arena.getAllTiles().map((t) => ({
    coord: { q: t.coord.q, r: t.coord.r },
    elevation: t.elevation,
    isWalkable: t.isWalkable,
    label: t.label,
    terrainType: t.terrainType,
    occupiedByUnitId: t.occupiedByUnitId
  }));

  const unitPositions: [string, HexCoord][] = [];
  for (const unitId of state.units.keys()) {
    const pos = state.arena.getUnitPosition(unitId);
    if (pos) {
      unitPositions.push([unitId, { q: pos.q, r: pos.r }]);
    }
  }

  const serializedUnits: Record<string, CombatUnit> = {};
  for (const [id, cu] of state.units.entries()) {
    serializedUnits[id] = JSON.parse(JSON.stringify(cu));
  }

  return {
    version: TRIAL_SERIALIZATION_VERSION,
    arena: {
      tiles: allTiles,
      unitPositions
    },
    units: serializedUnits,
    activeUnitId: state.activeUnitId,
    turnNumber: state.turnNumber,
    combatLog: state.combatLog.map((entry) => ({ ...entry })),
    outcome: state.outcome,
    objectives: state.objectives ? [...state.objectives] : undefined,
    aiDecisionLog: state.aiDecisionLog ? [...state.aiDecisionLog] : undefined,
    partyXpPool: state.partyXpPool ? { ...state.partyXpPool } : { fighter: 0, rogue: 0, mage: 0 },
    exportedAt: Date.now()
  };
}

/**
 * Deserializes a SerializedCombatState payload back into a fully operational CombatState.
 * Reconstructs the Arena instance, two-way spatial occupancy, and units Map.
 */
export function deserializeCombatState(payload: SerializedCombatState): CombatState {
  // Strip preexisting occupiedByUnitId from tiles so setUnitPosition binds two-way occupancy cleanly
  const cleanTiles = payload.arena.tiles.map((tile) => ({
    ...tile,
    occupiedByUnitId: undefined
  }));

  const arena = new Arena(cleanTiles);
  for (const [unitId, coord] of payload.arena.unitPositions) {
    arena.setUnitPosition(unitId, coord);
  }

  const units = new Map<string, CombatUnit>();
  for (const [id, cu] of Object.entries(payload.units)) {
    units.set(id, JSON.parse(JSON.stringify(cu)));
  }

  return {
    arena,
    units,
    activeUnitId: payload.activeUnitId,
    turnNumber: payload.turnNumber,
    combatLog: payload.combatLog ? [...payload.combatLog] : [],
    outcome: payload.outcome ?? 'IN_PROGRESS',
    objectives: payload.objectives ? [...payload.objectives] : undefined,
    aiDecisionLog: payload.aiDecisionLog ? [...payload.aiDecisionLog] : undefined,
    partyXpPool: payload.partyXpPool ? { ...payload.partyXpPool } : { fighter: 0, rogue: 0, mage: 0 }
  };
}

/**
 * Serializes a CombatState to formatted JSON string.
 */
export function exportTrialJson(state: CombatState): string {
  const serialized = serializeCombatState(state);
  return JSON.stringify(serialized, null, 2);
}

/**
 * Parses and validates an imported JSON string into a functional CombatState.
 */
export function importTrialJson(jsonString: string): CombatState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('Malformed trial JSON: Unable to parse string.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid trial JSON: Expected root object.');
  }

  const payload = parsed as Partial<SerializedCombatState>;
  if (!payload.arena || !payload.units) {
    throw new Error('Invalid trial JSON: Missing arena or units payload.');
  }

  return deserializeCombatState(payload as SerializedCombatState);
}
