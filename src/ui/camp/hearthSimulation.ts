import { Unit } from '../../core/types/unit';
import { PixelRotation } from '../combat/tokenAssets';
import { checkHeroLevelReady } from './heroUtils';

export interface HearthSpot {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly ring: 'inner' | 'outer';
}

export interface PlazaEdge {
  readonly id: 'west' | 'east';
  readonly x: number;
  readonly y: number;
}

export const CAMPFIRE_POS = { x: 50, y: 58 } as const;
export const MAX_HEARTH_VISIBLE = 10;

export const INNER_HEARTH_SPOTS: readonly HearthSpot[] = [
  { id: 'inner-nw', x: 36, y: 40, ring: 'inner' },
  { id: 'inner-ne', x: 64, y: 40, ring: 'inner' },
  { id: 'inner-w', x: 31, y: 58, ring: 'inner' },
  { id: 'inner-e', x: 69, y: 58, ring: 'inner' },
  { id: 'inner-sw', x: 38, y: 76, ring: 'inner' },
  { id: 'inner-se', x: 62, y: 76, ring: 'inner' }
];

export const OUTER_HEARTH_SPOTS: readonly HearthSpot[] = [
  { id: 'outer-nnw', x: 22, y: 34, ring: 'outer' },
  { id: 'outer-nne', x: 78, y: 34, ring: 'outer' },
  { id: 'outer-wnw', x: 15, y: 50, ring: 'outer' },
  { id: 'outer-ene', x: 85, y: 50, ring: 'outer' },
  { id: 'outer-wsw', x: 18, y: 70, ring: 'outer' },
  { id: 'outer-ese', x: 82, y: 70, ring: 'outer' },
  { id: 'outer-sw', x: 27, y: 82, ring: 'outer' },
  { id: 'outer-se', x: 73, y: 82, ring: 'outer' }
];

export const ALL_HEARTH_SPOTS: readonly HearthSpot[] = [
  ...INNER_HEARTH_SPOTS,
  ...OUTER_HEARTH_SPOTS
];

export const PLAZA_EDGES: Readonly<Record<'west' | 'east', PlazaEdge>> = {
  west: { id: 'west', x: 3, y: 56 },
  east: { id: 'east', x: 97, y: 56 }
};

export type HearthActorPhase = 'resting' | 'walking' | 'departing' | 'arriving';

export interface HearthActor {
  readonly unitId: string;
  readonly isStaged: boolean;
  readonly spotId: string | null;
  readonly x: number;
  readonly y: number;
  readonly facing: PixelRotation;
  readonly phase: HearthActorPhase;
  readonly opacity: number;
  readonly entryEdge?: 'west' | 'east';
}

export interface HearthSimulationState {
  readonly actors: readonly HearthActor[];
  readonly lastMovedUnitId: string | null;
}

/**
 * Maps a 2D screen-space delta (dx right, dy down) to the closest 8-way pixel sprite rotation.
 */
export function vectorToPixelRotation(dx: number, dy: number): PixelRotation {
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    return 'south';
  }
  const deg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
  if (deg >= 337.5 || deg < 22.5) return 'east';
  if (deg < 67.5) return 'south-east';
  if (deg < 112.5) return 'south';
  if (deg < 157.5) return 'south-west';
  if (deg < 202.5) return 'west';
  if (deg < 247.5) return 'north-west';
  if (deg < 292.5) return 'north';
  return 'north-east';
}

export function faceTowardCampfire(x: number, y: number): PixelRotation {
  return vectorToPixelRotation(CAMPFIRE_POS.x - x, CAMPFIRE_POS.y - y);
}

function prioritizeRoster(
  roster: readonly Unit[],
  activeSquadIds: readonly string[]
): Unit[] {
  const stagedSet = new Set(activeSquadIds);
  const staged: Unit[] = [];
  for (const id of activeSquadIds) {
    const unit = roster.find((u) => u.id === id);
    if (unit) staged.push(unit);
  }

  const reserves = roster.filter((u) => !stagedSet.has(u.id));
  const readyReserves = reserves.filter((u) => checkHeroLevelReady(u).isReady);
  const otherReserves = reserves.filter((u) => !checkHeroLevelReady(u).isReady);

  return [...staged, ...readyReserves, ...otherReserves];
}

function pickOpenSpot(
  preferredRing: 'inner' | 'outer',
  occupiedSpotIds: ReadonlySet<string>,
  rng?: () => number
): HearthSpot | null {
  const primaryPool = (preferredRing === 'inner' ? INNER_HEARTH_SPOTS : OUTER_HEARTH_SPOTS).filter(
    (s) => !occupiedSpotIds.has(s.id)
  );
  const fallbackPool = (preferredRing === 'inner' ? OUTER_HEARTH_SPOTS : INNER_HEARTH_SPOTS).filter(
    (s) => !occupiedSpotIds.has(s.id)
  );
  const pool = primaryPool.length > 0 ? primaryPool : fallbackPool;
  if (pool.length === 0) return null;
  if (!rng) return pool[0];
  const idx = Math.floor(rng() * pool.length) % pool.length;
  return pool[idx];
}

function getNearestEdge(x: number): PlazaEdge {
  return x < CAMPFIRE_POS.x ? PLAZA_EDGES.west : PLAZA_EDGES.east;
}

/**
 * Builds the deterministic initial hearth layout with staged Wayfarers on the inner ring
 * and resting Wayfarers on the outer perimeter, all facing inward toward the fire.
 */
export function createInitialHearthState(
  roster: readonly Unit[],
  activeSquadIds: readonly string[]
): HearthSimulationState {
  const stagedSet = new Set(activeSquadIds);
  const selected = prioritizeRoster(roster, activeSquadIds).slice(0, MAX_HEARTH_VISIBLE);
  const occupied = new Set<string>();
  const actors: HearthActor[] = [];

  for (const unit of selected) {
    const isStaged = stagedSet.has(unit.id);
    const spot = pickOpenSpot(isStaged ? 'inner' : 'outer', occupied);
    if (!spot) break;
    occupied.add(spot.id);
    actors.push({
      unitId: unit.id,
      isStaged,
      spotId: spot.id,
      x: spot.x,
      y: spot.y,
      facing: faceTowardCampfire(spot.x, spot.y),
      phase: 'resting',
      opacity: 1
    });
  }

  return {
    actors,
    lastMovedUnitId: null
  };
}

/**
 * Settles any in-flight walking, arriving, or departing transitions so settled actors
 * turn back toward the fire and departed actors leave the active hearth list.
 */
export function finishHearthTransitions(
  state: HearthSimulationState
): HearthSimulationState {
  const nextActors: HearthActor[] = [];

  for (const actor of state.actors) {
    if (actor.phase === 'departing') {
      continue;
    }
    if (actor.phase === 'walking' || actor.phase === 'arriving') {
      nextActors.push({
        ...actor,
        facing: faceTowardCampfire(actor.x, actor.y),
        phase: 'resting',
        opacity: 1,
        entryEdge: undefined
      });
    } else {
      nextActors.push(actor);
    }
  }

  return {
    ...state,
    actors: nextActors
  };
}

/**
 * Reconciles the Hearth scene whenever the company roster or active staged squad changes
 * (recruiting a Novice, staging, resting, or swapping).
 */
export function syncHearthRoster(
  state: HearthSimulationState,
  roster: readonly Unit[],
  activeSquadIds: readonly string[],
  rng: () => number = Math.random
): HearthSimulationState {
  const rosterIds = new Set(roster.map((u) => u.id));
  const stagedSet = new Set(activeSquadIds);

  // Keep existing valid actors and refresh their staged flag
  let actors: HearthActor[] = state.actors
    .filter((a) => rosterIds.has(a.unitId))
    .map((a) => ({
      ...a,
      isStaged: stagedSet.has(a.unitId)
    }));

  const presentIds = new Set(actors.map((a) => a.unitId));
  const occupied = new Set<string>(
    actors.map((a) => a.spotId).filter((id): id is string => Boolean(id))
  );

  // Ensure every staged Wayfarer is visible (freeing a resting slot if at cap)
  for (const unit of prioritizeRoster(roster, activeSquadIds)) {
    if (presentIds.has(unit.id)) continue;

    const isStaged = stagedSet.has(unit.id);
    if (actors.length >= MAX_HEARTH_VISIBLE) {
      if (!isStaged) break;
      const restingIdx = actors.findIndex((a) => !a.isStaged);
      if (restingIdx === -1) break;
      const removed = actors[restingIdx];
      if (removed.spotId) occupied.delete(removed.spotId);
      actors = [...actors.slice(0, restingIdx), ...actors.slice(restingIdx + 1)];
      presentIds.delete(removed.unitId);
    }

    const spot = pickOpenSpot(isStaged ? 'inner' : 'outer', occupied, rng);
    if (!spot) break;
    occupied.add(spot.id);
    presentIds.add(unit.id);

    const edge = getNearestEdge(spot.x);
    actors = [
      ...actors,
      {
        unitId: unit.id,
        isStaged,
        spotId: spot.id,
        x: spot.x,
        y: spot.y,
        facing: vectorToPixelRotation(spot.x - edge.x, spot.y - edge.y),
        phase: 'arriving',
        opacity: 1,
        entryEdge: edge.id
      }
    ];
  }

  return {
    ...state,
    actors
  };
}

/**
 * Advances the Hearth by one cozy, staggered step:
 * - Brings in an off-plaza resting Wayfarer when an outer spot is free, OR
 * - Lets one settled resting Wayfarer wander off toward the twilight plaza edge, OR
 * - Lets one settled Wayfarer stroll leisurely to another unoccupied spot.
 */
export function stepHearthSimulation(
  state: HearthSimulationState,
  roster: readonly Unit[],
  activeSquadIds: readonly string[],
  rng: () => number = Math.random
): HearthSimulationState {
  const settled = finishHearthTransitions(state);
  const stagedSet = new Set(activeSquadIds);
  const presentIds = new Set(settled.actors.map((a) => a.unitId));
  const occupied = new Set<string>(
    settled.actors.map((a) => a.spotId).filter((id): id is string => Boolean(id))
  );

  // 1. If an off-plaza resting Wayfarer is waiting and we have capacity, let one wander in
  const offstageReserves = prioritizeRoster(roster, activeSquadIds).filter(
    (u) => !stagedSet.has(u.id) && !presentIds.has(u.id)
  );
  if (
    offstageReserves.length > 0 &&
    settled.actors.length < Math.min(roster.length, MAX_HEARTH_VISIBLE)
  ) {
    const incoming = offstageReserves[Math.floor(rng() * offstageReserves.length) % offstageReserves.length];
    const openOuter = pickOpenSpot('outer', occupied, rng);
    if (openOuter) {
      const edge = getNearestEdge(openOuter.x);
      return {
        actors: [
          ...settled.actors,
          {
            unitId: incoming.id,
            isStaged: false,
            spotId: openOuter.id,
            x: openOuter.x,
            y: openOuter.y,
            facing: vectorToPixelRotation(openOuter.x - edge.x, openOuter.y - edge.y),
            phase: 'arriving',
            opacity: 1,
            entryEdge: edge.id
          }
        ],
        lastMovedUnitId: incoming.id
      };
    }
  }

  if (settled.actors.length === 0) {
    return settled;
  }

  // 2. Choose one settled actor to move (avoiding moving the exact same Wayfarer twice in a row)
  const candidates =
    settled.actors.length > 1
      ? settled.actors.filter((a) => a.unitId !== settled.lastMovedUnitId)
      : settled.actors;
  const chosen = candidates[Math.floor(rng() * candidates.length) % candidates.length];

  // 3. Resting Wayfarers occasionally stroll off toward the twilight plaza edge
  const shouldDepart =
    !chosen.isStaged &&
    settled.actors.length > 1 &&
    (offstageReserves.length > 0 ? rng() < 0.55 : rng() < 0.28);

  if (shouldDepart) {
    const edge = getNearestEdge(chosen.x);
    return {
      actors: settled.actors.map((a) =>
        a.unitId === chosen.unitId
          ? {
              ...a,
              spotId: null,
              x: edge.x,
              y: edge.y,
              facing: vectorToPixelRotation(edge.x - a.x, edge.y - a.y),
              phase: 'departing',
              opacity: 0
            }
          : a
      ),
      lastMovedUnitId: chosen.unitId
    };
  }

  // 4. Otherwise stroll leisurely to another open spot in their preferred ring
  const targetSpot = pickOpenSpot(chosen.isStaged ? 'inner' : 'outer', occupied, rng);
  if (!targetSpot) {
    return settled;
  }

  return {
    actors: settled.actors.map((a) =>
      a.unitId === chosen.unitId
        ? {
            ...a,
            spotId: targetSpot.id,
            x: targetSpot.x,
            y: targetSpot.y,
            facing: vectorToPixelRotation(targetSpot.x - a.x, targetSpot.y - a.y),
            phase: 'walking',
            opacity: 1
          }
        : a
    ),
    lastMovedUnitId: chosen.unitId
  };
}
