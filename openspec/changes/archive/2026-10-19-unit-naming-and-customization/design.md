# Design: Unit Naming & Customization

## Context

See [proposal.md](file:///c:/Repos/rpg_game/openspec/changes/unit-naming-and-customization/proposal.md) for background and motivation.

Currently:
1. `campaignFactory.ts` has a hardcoded array of 20 male names (`FANTASY_MALE_NAMES`).
2. `encounterGenerator.ts` assigns the raw class string as the unit's name (`name: 'Novice'`, `name: 'Warrior'`).
3. `HexGridSvg.tsx` renders standee nameplates using `{cu.unit.name.split(' ')[0]}`, which truncates any second word.
4. `HeroProgressionDrawer.tsx` displays `{hero.name}` as static text with no editing capabilities.

## Goals / Non-Goals

**Goals:**
- Provide a clean, centralized, and easily extensible data catalog (`src/data/names.ts`) so adding names, surnames, and titles requires only appending strings to typed arrays.
- Eliminate identical enemy names within an encounter squad using distinct astral adjective sampling (`Ash Novice`, `Dusk Novice`, `Umbral Novice`).
- Procedurally generate rich player recruit names (`First + Surname/Epithet`) while keeping combat standees uncluttered.
- Implement an inline renaming workflow inside `HeroProgressionDrawer` with keyboard shortcuts and immediate persistence.
- Document the Nemesis naming evolution in `docs/plans/ROADMAP.md`.

**Non-Goals:**
- Calling external web APIs at runtime (preserves deterministic offline PRNG seeds and eliminates network latency).
- Female recruit names in this pass (all active pixel standees in `AVAILABLE_PIXEL_TOKENS` are currently male; female standees and names will arrive in Horizon 4).
- Full Nemesis memory/flee mechanics (only the naming foundation and roadmap documentation are in scope).

## Decisions

### Decision 1: Centralized & Extensible Data Module (`src/data/names.ts`)
- **Choice**: Place all naming datasets and helper functions in `src/data/names.ts`:
  ```ts
  export const MALE_FIRST_NAMES: readonly string[] = [...];
  export const SURNAMES_AND_HOUSES: readonly string[] = [...];
  export const ASTRAL_EPITHETS: readonly string[] = [...];
  export const ENEMY_ASTRAL_ADJECTIVES: readonly string[] = [...];
  ```
- **Rationale**: Completely decouples content authoring from procedural logic. Anyone can add new names or epithets by simply adding a string to an array.
- **Alternatives Considered**: Inlining arrays inside `campaignFactory.ts` and `encounterGenerator.ts`. Rejected because it creates scattered duplication and makes catalog additions harder to discover.

### Decision 2: Adjective-Based Enemy Disambiguation without Replacement
- **Choice**: During `assembleEnemySquad`, shuffle `ENEMY_ASTRAL_ADJECTIVES` deterministically using the encounter PRNG. Assign unique adjectives to enemies across the squad:
  - If 3 Novices spawn: `Ash Novice`, `Dusk Novice`, `Umbral Novice`.
  - If a singular Warrior spawns: `Iron Warrior`.
  - If the adjective pool is ever exhausted, fall back to an alphabetical suffix (`Ash Novice A`, `Ash Novice B`).
- **Rationale**: Natural atmospheric disambiguation. Players and combat logs can distinguish enemies immediately without immersion-breaking numbers like `Novice 1` or `Novice 2`.
- **Alternatives Considered**: Plain numbers (`Novice 1`, `Novice 2`). Rejected during exploration in favor of the rich astral adjectives.

### Decision 3: Faction-Aware Standee Nameplate Rendering
- **Choice**: In `HexGridSvg.tsx`, format the standee nameplate by faction:
  - **PLAYER**: Render first word (`cu.unit.name.split(' ')[0]`, e.g. `Alden`), keeping the standee compact above the 60px sprite while status cards and logs display `Alden Vale`.
  - **ENEMY**: Render the full title (`cu.unit.name`, e.g. `Ash Novice`).
- **Rationale**: Player first names are unique within a squad, so `Alden` is completely unambiguous. Enemies need the two-word adjective (`Ash Novice`) to differentiate from other Novices.
- **Alternatives Considered**: Truncating enemy names to the first word (renders `Ash`, which obscures the unit's class) or displaying the full player name (e.g. `Cassian Voidwalker` occluding adjacent hexes).

### Decision 4: Inline Rename in `HeroProgressionDrawer`
- **Choice**: In the drawer header next to `drawer-overview-name`:
  - Render an edit pencil button `[✎]`.
  - When active, toggle into an inline text input `<input className="drawer-rename-input font-ui" maxLength={24} autoFocus />`.
  - `Enter` or `[✓]` commits via `onUpdateCampaign`; `Escape` or `[✕]` reverts.
  - Validation: 2–24 characters, trimmed, non-empty.
- **Rationale**: Clean, unobtrusive, accessible during hero inspection in camp, and immediately updates `campaign.roster` and `saveManager`.
- **Alternatives Considered**: Renaming modals or renaming directly on `HeroCard`. The drawer is the primary detailed hero management sheet, keeping the Camp Hub cards uncluttered.

## Risks / Trade-offs

- **[Name Length on Timeline Chips]** → The timeline ribbon chip width was recently expanded to 58px. Full enemy titles (`Ash Novice`) and player first names (`Alden`) fit cleanly within 58px. Full player compound names (`Alden Vale`) are celebrated in tooltips and status cards.
- **[Save Game Backwards Compatibility]** → Existing save files store `unit.name` as a string. Existing saves load cleanly without schema migration; new recruits and renamed heroes adopt the new conventions naturally.
