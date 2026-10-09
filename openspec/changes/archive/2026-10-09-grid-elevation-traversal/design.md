# Design

## Context

The spatial arena container (`src/core/grid/arena.ts`) manages `HexTile` objects with an integer `elevation: number` field, but its current pathfinder (`getReachableHexes`) uses a uniform-weight BFS that enforces a symmetric jump limit (`Math.abs(delta) > maxJumpElevation`), preventing units from stepping down ledges and treating climbing as costing the same 1 MP as flat ground. Similarly, `hasLineOfSight` checks only if intermediate tiles exceed `Math.max(from, to)`, failing to account for 3D slopes where high-ground units look down over intermediate cover. Movement execution (`executeMove` in `src/core/combat/resolver.ts`) directly teleports units to destination coordinates without evaluating intermediate step costs or fall impact.

## Goals / Non-Goals

**Goals:**
* Implement weighted Dijkstra pathfinding in `Arena.getReachableHexes` with step costs: $1 + \max(0, \Delta h)$ MP.
* Implement safe-route path prioritization: route units along 0-damage ramps whenever reachable within the movement budget, while permitting cliff drops when necessary.
* Calculate and apply direct, unmitigated Fall Impact Damage ($|\Delta h| \times 4$) in `executeMove` when a unit traverses a drop of $\Delta h \le -2$.
* Surface movement path hazard metadata (`path`, `cost`, `fallDamage`) so downstream UI and AI can inspect the chosen route and display fall warning badges.
* Implement continuous 3D slope raycasting in `Arena.hasLineOfSight` accounting for tile heights, intervening obstacles, and unit screening.

**Non-Goals:**
* Elevation combat modifiers (Ranged +1 range, +2/-2 to-hit, Advantage/Disadvantage, melee reach limits) — Deferred to Phase 6.2.
* Plunging knockback displacement physics and cliff slam collisions — Deferred to Phase 6.2.
* Faux-3D SVG prism wall rendering and procedural multi-peak arena generation — Deferred to Phase 6.3.
* Specialized verticality class skills (*Rooftop Vault*, *Feline Grace*) — Deferred to Phase 6b.

## Decisions

### 1. Weighted Dijkstra Pathfinding & Safe-Route Selection
* **Data Model**:
  Replace the unweighted BFS queue in `getReachableHexes` with a Dijkstra search over the hex graph.
  Each visited tile tracks:
  ```ts
  interface PathNode {
    coord: HexCoord;
    mpSpent: number;
    fallDamage: number;
    path: HexCoord[];
  }
  ```
* **Edge Cost Rules**:
  * Step cost: `1 + Math.max(0, nextTile.elevation - currentTile.elevation)`.
  * Impassable rise: If $\Delta h \ge +3$, edge is strictly impassable.
  * Ledge drop: If $\Delta h \le -2$, edge incurs `fallDamage = Math.abs(dh) * 4`.
* **Path Selection Priority**:
  When multiple paths reach the same hex, the comparator prioritizes:
  1. Minimum `fallDamage` (prefers 0-damage routes whenever within budget).
  2. Minimum `mpSpent` (shortest path among equally safe routes).
* **Alternatives Considered**:
  * *Separate BFS passes*: Run one pass without drops, then another with drops. Rejected: redundant graph traversals and cannot handle non-uniform MP step costs ($1, 2, 3$ MP).

### 2. Direct Unmitigated Fall Damage Execution
* When `executeMove` executes in `src/core/combat/resolver.ts`:
  * Query the optimal path from origin to destination via `arena.findPath(from, to, effectiveMove)`.
  * For each step in the path where `toTile.elevation - fromTile.elevation <= -2`:
    * Compute fall damage: `Math.abs(dh) * 4`.
    * Apply directly to `cu.currentHp` with a `DAMAGE` event (`reason: 'FALL'`, `damageType: 'PHYSICAL'`).
    * Direct fall damage strictly ignores `Armor` and `Ward` ratings.
* **Alternatives Considered**:
  * *Mitigating with Armor*: Rejected during Phase 6 exploration. Armor adds heavy bulk that worsens gravity impact; allowing armor mitigation would incentivize tanks to leap recklessly off cliffs.

### 3. Continuous 3D Line-of-Sight Raycasting
* Given origin $(q_1, r_1, h_1)$ and target $(q_2, r_2, h_2)$:
  * Sample hexes along `getHexLine(from, to)`.
  * For each intermediate hex at step index $i \in [1, N-1]$, compute normalized progress $t = i / N$:
    $$h_{\text{ray}}(t) = h_1 + t \times (h_2 - h_1)$$
  * The step blocks LoS if:
    * Hex does not exist in arena (void).
    * Hex has an obstacle (`!tile.isWalkable`).
    * Hex is occupied by another unit (`tile.occupiedByUnitId`).
    * Tile elevation satisfies: `tile.elevation >= h_ray(t) - EPSILON`.
* **Alternatives Considered**:
  * *Bounding box height check*: Intermediate hex $> \max(h_1, h_2)$. Rejected: allows shooting through hills when shooting downhill.

### 4. Hazard Preview Metadata for UI & AI
* Provide an enriched helper `arena.getReachableHexInfo(origin, moveBudget)` returning a map of destination coordinates to `{ cost: number, fallDamage: number, path: HexCoord[] }`.
* This allows UI hover listeners to inspect `info.fallDamage > 0` and display `⚠️ Fall Hazard: -X HP` without re-running pathfinding.

## Risks / Trade-offs

* **[Risk] Pathfinding Computational Overhead**:
  * *Mitigation*: Astral Tactics arenas have radius 3–4 (37–61 tiles). Running Dijkstra on $\le 61$ nodes with 6 neighbors takes $< 0.1\text{ms}$, well within the 16ms animation frame budget.
* **[Risk] Units Trapped on Elevated Ledges**:
  * *Mitigation*: Because stepping down is permitted (costing 1 MP, either 0 damage for $\Delta h = -1$ or fall damage for $\Delta h \le -2$), units are never physically trapped on high ground even if they have only 1 MP remaining.
