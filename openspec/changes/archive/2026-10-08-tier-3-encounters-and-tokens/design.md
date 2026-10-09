# Design: Campaign Tier 3 Encounters & Token Mapping

## Context

The game features 100 classes arranged in a triangular archetype pyramid. Foundational systems through Phase 4 support Novices (L0), Tier 1 (L1), and Tier 2 (L2) classes in the campaign encounter loop (`src/core/campaign/encounterGenerator.ts`). In Phases 5.1–5.6, all 5 active Tier 3 hybrid classes (Cavalier, Berserker, Highwayman, Warlock, Witch) were authored with bespoke ability packages, passives, and AI decision heuristics.

Currently:
1. `encounterGenerator.ts` defines `EnemyTier1Class` and `EnemyTier2Class`, but has no awareness of Tier 3 classes.
2. `createEnemyUnit` advances units purely in their primary archetype for `level` steps, which produces valid constellations for pure archetypes but fails to satisfy the dual requirements of hybrid classes.
3. `assembleEnemySquad` only considers Tier 2 (Stage 3+, 40 threat) and Tier 1 (Stage 2+, 25 threat), capping difficulty below the intended 60–80+ point budget of Stage 5+.
4. `tokenAssets.ts` whitelists Tier 3 sprite directories in `AVAILABLE_PIXEL_TOKENS` and maps most badge colors, but lacks `infiltrator` and `sorcerer` in `CLASS_BADGE_PALETTES` and lacks a centralized lookup helper.
5. In-combat status displays in `UnitStatusCard.tsx` use a hardcoded cyan color badge for unit roles regardless of unit class.

## Goals / Non-Goals

**Goals:**
- Extend `encounterGenerator.ts` to support `EnemyTier3Class` (`cavalier`, `berserker`, `highwayman`, `warlock`, `witch`).
- Implement accurate multi-archetype advancement in `createEnemyUnit` so hybrid units unlock their prerequisite classes and active class in `progression.constellation`.
- Calibrate `assembleEnemySquad` to spawn Tier 3 enemies (55 threat cost) at Stage 5+ with higher threat budgets (60–80+ points) within the 2–4 unit squad limit.
- Provide complete badge color palettes for all 12 authored classes and export `getClassBadgePalette` in `tokenAssets.ts`.
- Integrate dynamic class badge styling into `UnitStatusCard.tsx`.
- Maintain 100% test pass rate across existing test suites while adding comprehensive coverage for Stage 5+ encounter generation and token resolution.

**Non-Goals:**
- Implementing Phase 6 elevation / verticality mechanics (deferred to Phase 6).
- Authoring the Cat-burglar class package (deferred to Phase 6b for elevation synergy).
- Modifying player progression mechanics or campaign save structures.

## Decisions

### 1. Dominant-First Archetype Progression for Hybrid Adversaries
In `createEnemyUnit`, instead of advancing `level` times in a single archetype, we inspect the class requirements:
- Cavalier `(2, 1, 0)`: 2 Fighter, then 1 Rogue (unlocks `warrior` -> `knight` -> `cavalier`).
- Berserker `(2, 0, 1)`: 2 Fighter, then 1 Mage (unlocks `warrior` -> `knight` -> `berserker`).
- Highwayman `(1, 2, 0)`: 2 Rogue, then 1 Fighter (unlocks `thief` -> `infiltrator` -> `highwayman`).
- Warlock `(1, 0, 2)`: 2 Mage, then 1 Fighter (unlocks `wizard` -> `sorcerer` -> `warlock`).
- Witch `(0, 1, 2)`: 2 Mage, then 1 Rogue (unlocks `wizard` -> `sorcerer` -> `witch`).

Advancing the dominant archetype first ensures valid intermediate pyramid unlocks, populating `progression.constellation` so the unit loadout validator passes. Attributes and vitals are scaled accordingly.

*Alternative considered*: Hardcoding constellation arrays directly on recruit units. Rejected because `advanceArchetypeLevel` is the single source of truth for pyramid progression and properly updates points and milestones.

### 2. Stage 5+ Threat Budgeting and Squad Assembly
`computeUnitThreat` assigns 55 threat points to a Level 3 unit ($10 + 3 \times 15$).
In `assembleEnemySquad`:
- For `stage >= 5 && remaining >= 55`: allow spawning a Tier 3 hybrid adversary with probability (e.g. 0.6) and deduct 55 points.
- Remaining budget (if $\ge 40$, $\ge 25$, or $\ge 10$) continues down the waterfall to spawn accompanying Tier 2, Tier 1, or Novice adversaries, bounded by `squad.length < 4`.
- In `generateStageEncounter`: for Stage 5+, apply an encounter threat budget floor of at least 60 points (`Math.max(targetBudget, 60)`) so Stage 5+ encounters consistently have budget to field Tier 3 adversaries even when tested with starter recruits.

*Alternative considered*: Creating completely separate assembly routines for early vs late stages. Rejected to keep `assembleEnemySquad` unified, procedural, and deterministic across all campaign stages.

### 3. Palette Standardization & Lookup Helper
Expand `CLASS_BADGE_PALETTES` in `src/ui/combat/tokenAssets.ts` with:
- `infiltrator`: `{ primary: '#047857', border: '#34d399' }` (Teal / Emerald)
- `sorcerer`: `{ primary: '#6d28d9', border: '#a78bfa' }` (Arcane Violet)

Export `getClassBadgePalette(classId?: string)`:
```typescript
export function getClassBadgePalette(classId?: string): { primary: string; border: string } {
  if (!classId) return CLASS_BADGE_PALETTES.novice;
  const key = classId.toLowerCase();
  return CLASS_BADGE_PALETTES[key] ?? CLASS_BADGE_PALETTES.novice;
}
```

*Alternative considered*: Storing badge colors in CSS classes only. Rejected because SVG and canvas rendering, as well as React inline styling across modal overlays and HUD cards, require direct access to hex tokens.

### 4. Dynamic Role Badges in UnitStatusCard
In `src/ui/combat/UnitStatusCard.tsx`, use `getClassBadgePalette(cu.unit.loadout?.activeClassId)` to dynamically apply palette colors to `.unit-role-badge` for active and hovered/inspected units.

## Risks / Trade-offs

- **[Risk] RNG sequence alteration breaking existing tests**:
  - *Mitigation*: The `stage >= 5` guard ensures that for Stage 1, 2, 3, and 4 encounters, no additional RNG calls occur. Existing tests for Stage 1, 2, and 3 produce identical random sequences and outputs.
- **[Risk] High-threat budget overfilling squad capacity**:
  - *Mitigation*: Squad size is strictly capped at `squad.length < 4` and clamped to `enemyCoords.length` (4 maximum in radial arena). Excess budget beyond 4 units is safely ignored.
- **[Risk] Missing packages for new classes in future expansions**:
  - *Mitigation*: `createEnemyUnit` verifies class definitions in `CLASSES_BY_ID` and defaults wildcard passives cleanly, throwing clear descriptive errors if an unknown class is supplied.
