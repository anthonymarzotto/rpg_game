# Proposal: Unit Naming & Customization

## Why

Currently, all enemy combatants of the same class share identical, generic names (e.g., three Novices all appear as `"Novice"`, and Warriors simply appear as `"Warrior"`), creating severe ambiguity in combat logs, timeline queues, and battlefield targeting. Meanwhile, player recruits draw from a tiny, hardcoded pool of 20 male names (`FANTASY_MALE_NAMES`) without surnames or titles, and players have no ability to personalize or rename their heroes during a campaign run.

This change introduces procedural astral adjective titling for enemies (e.g., `Ash Novice`, `Umbral Novice`, `Iron Warrior`), an easily extensible catalog of masculine fantasy first names, surnames, and astral epithets for player recruits (e.g., `Alden Vale`, `Kieran Frost`, `Theron Dawnseeker`), and an in-game hero renaming interface inside the `HeroProgressionDrawer`.

## What Changes

- **Extensible Name Catalog**: Create a dedicated, modular data module (`src/data/names.ts`) with clean, typed array exports (`MALE_FIRST_NAMES`, `SURNAMES_AND_HOUSES`, `ASTRAL_EPITHETS`, `ENEMY_ASTRAL_ADJECTIVES`) that makes appending new names, houses, and titles frictionless.
- **Procedural Enemy Titling**: Update `encounterGenerator.ts` to assign distinct astral adjectives without replacement per trial squad (`Ash Novice`, `Dusk Novice`, `Umbral Novice`, `Iron Warrior`), eliminating duplicate enemy names.
- **Rich Player Recruit Generation**: Update `campaignFactory.ts` to generate recruits using `First + Surname/Epithet` drawn from the catalog, while maintaining compatibility with deterministic PRNG seeds.
- **In-Game Hero Renaming**: Add an inline edit button `[✎]` beside the hero's name in `HeroProgressionDrawer`, supporting keyboard shortcuts (`Enter` to save, `Escape` to cancel), validation (2–24 characters, non-empty), and immediate campaign state persistence.
- **Battlefield & Timeline Name Rendering**: Ensure `HexGridSvg.tsx` renders full enemy titles (`Ash Novice`) and player first names without unwanted string truncation.
- **Strategic Roadmap Connection**: Document the long-term Nemesis naming progression in `docs/plans/ROADMAP.md` (surviving enemies ascending into true named rivals like `Vael the Sneaky`).

## Capabilities

### New Capabilities

- `unit-naming-and-customization`: Defines requirements for procedural astral enemy titles, modular and extensible player recruit name/epithet generation, and in-game hero renaming.

### Modified Capabilities

None.

## Impact

- `src/data/names.ts`: New centralized catalog for all name pools, prefixes, surnames, and epithets.
- `src/core/campaign/campaignFactory.ts`: Uses extensible name catalog for recruit generation.
- `src/core/campaign/encounterGenerator.ts`: Assigns distinct astral adjectives per enemy squad.
- `src/ui/camp/HeroProgressionDrawer.tsx` & `.css`: Inline rename input and persistence dispatch.
- `src/ui/combat/HexGridSvg.tsx`: Preserves multi-word enemy titles on standee plates.
- `docs/plans/ACTIVE.md`: Tracks completion of Item 4.3.
- `docs/plans/ROADMAP.md`: Updates Nemesis concept note.
