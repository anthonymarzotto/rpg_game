# Design

## Context

Astral Tactics currently separates combat attribute math from progression catalog keys:
- The attribute layer (`src/core/types/stats.ts`) models derived combat vitals using `TriadAttributes: { force, finesse, focus }`.
- The catalog and progression ledger (`src/core/types/class.ts`, `src/data/classes.ts`) models requirement coordinates and level-up points using `ArchetypePoints: { fighter, rogue, mage }` and `Archetype: 'FIGHTER' | 'ROGUE' | 'MAGE'`.

While the combat HUD and Constellation SVG already use Force, Finesse, and Focus, lingering legacy menus (Camp hero cards, Victory modal, progression spend buttons, and wildcard ability dropdowns) directly render internal archetype keys or trope names ("Fighter", "Rogue", "Mage"). See `proposal.md` for background and motivation.

## Goals / Non-Goals

**Goals:**
- Provide a single source of truth for discipline presentation formatting (`formatDisciplineName`, `formatDisciplineShort`, `formatDisciplineBadge`).
- Ensure 100% of user-facing UI text across Camp, Combat, and modals presents Force, Finesse, and Focus.
- Standardize scanner requirement shorthand on `FRC / FIN / FOC` to resolve the single-letter "F" collision between Force, Finesse, and Focus.
- Maintain complete backward compatibility with serialized campaign save games and data schemas.

**Non-Goals:**
- Do not refactor internal data keys (`fighter`, `rogue`, `mage`) on `ArchetypePoints` or `InBattleXp` (avoids breaking existing `localStorage` saves and rewriting the 100-class catalog).
- Do not modify combat formulas, vitals math, or class requirement logic.

## Decisions

### 1. Presentation Layer Decoupling over Internal Type Refactor
* **Decision**: Retain internal engine types (`ArchetypePoints`, `Archetype`) and perform canonical mapping at the presentation boundary before strings are rendered.
* **Rationale**: Eliminating the internal duality (renaming `ArchetypePoints` to `{ force, finesse, focus }`) would touch over 60 files, invalidate existing save slots in `localStorage`, and require updating all 100 class requirement blocks in `classes.ts`. Decoupling presentation delivers 100% player-facing consistency with minimal risk and zero save-migration friction.
* **Alternatives Considered**:
  - *Full Internal Refactor*: Rejected due to high risk of regressions across 100 classes and breaking campaign saves.
  - *Standardizing UI on Fighter/Rogue/Mage*: Rejected because it would require rewriting the Constellation SVG, in-combat character cards, ability damage formulas (`1d6 + Force`), and ability package descriptions, while perpetuating class identity confusion (e.g. Warrior vs Fighter).

### 2. Centralized Discipline Formatters in `combatXpUtils.ts`
* **Decision**: Export centralized formatters from `src/ui/combat/combatXpUtils.ts`:
  ```ts
  export function formatDisciplineName(arch?: Archetype | string): string {
    if (arch === 'FIGHTER' || arch === 'fighter') return 'Force';
    if (arch === 'ROGUE' || arch === 'rogue') return 'Finesse';
    if (arch === 'MAGE' || arch === 'mage') return 'Focus';
    return arch ?? 'Universal';
  }
  export function formatDisciplineShort(arch?: Archetype | string): string {
    if (arch === 'FIGHTER' || arch === 'fighter') return 'FRC';
    if (arch === 'ROGUE' || arch === 'rogue') return 'FIN';
    if (arch === 'MAGE' || arch === 'mage') return 'FOC';
    return arch ?? 'UNI';
  }
  export function formatDisciplineBadge(arch?: Archetype | string): string {
    return formatDisciplineName(arch).toUpperCase();
  }
  ```
* **Rationale**: `combatXpUtils.ts` already houses the `AttributeXpProgress` mapping for the in-combat character card. Reusing and extending this utility guarantees identical naming, casing, and abbreviations across all UI components.

### 3. Triad Shorthand in Constellation Scanner
* **Decision**: Display `1 FRC / 1 FIN / 0 FOC` instead of legacy `1F / 1R / 0M`.
* **Rationale**: In a Force / Finesse / Focus system, single letters `F / F / F` are ambiguous. Three-letter abbreviations `FRC`, `FIN`, `FOC` fit cleanly within the Node Scanner HUD while preserving clarity.

## Risks / Trade-offs

- **[Risk] Test Assertions Break on Legacy Strings**: Several unit tests assert on legacy strings like `'Ascend: Fighter (+1 Force)'` or `'Bandit Fighter A'`.
  - **Mitigation**: Update assertions in `HeroProgressionDrawer.test.tsx` and `CombatLogPanel.test.ts` concurrently with component updates.
- **[Risk] Missed String Interpolations**: An unmapped tooltip or dialog could still display raw archetype tags.
  - **Mitigation**: Run a strict repository-wide regex search for `\b(fighter|rogue|mage)\b` across all `.tsx` files after implementation.
