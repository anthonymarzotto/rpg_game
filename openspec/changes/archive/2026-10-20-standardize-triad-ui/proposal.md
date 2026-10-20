# Proposal

## Why

Throughout earlier development iterations, the three vertices of the 100-class constellation were colloquially labeled after classic tabletop tropes ("Fighter", "Rogue", "Mage") in certain legacy menus and modals. However, Astral Tactics establishes canonical lore and combat mechanics around the **Triad Vector**: **Force** (power, armor, HP), **Finesse** (speed, movement, precision), and **Focus** (range, AoE, ward, resolve).

Because the 100-class catalog features classes like *Warrior*, *Thief*, and *Wizard* rather than "Fighter", "Rogue", or "Mage", residual references to "Fighter/Rogue/Mage" create cognitive dissonance and class identity confusion for players (e.g. asking why a Warrior earns Fighter XP or why a Thief ascends with Rogue points). Furthermore, standardizing on Force, Finesse, and Focus creates a unified gameplay loop where abilities scaling with Force deal Force damage, earn Force XP, and advance the hero's Force attribute.

## What Changes

- **Centralized Discipline Presentation**: Introduce shared presentation formatters (`formatDisciplineName`, `formatDisciplineShort`, `formatDisciplineBadge`) to reliably map internal archetype enums to `Force`, `Finesse`, and `Focus` across all UI layers.
- **Camp Hub & Vanguard Cards**: Update hero card XP progress bar labels from `Fighter`, `Rogue`, `Mage` to `Force`, `Finesse`, `Focus`.
- **Hero Progression Drawer**:
  - Update ascension spend button labels from `Ascend: Fighter (+1 Force)` to `Ascend: Force (+1 Force)`, `Ascend: Finesse (+1 Finesse)`, and `Ascend: Focus (+1 Focus)`.
  - Update wildcard ability dropdown options from `(Fighter · 1 AP)` to `(Force · 1 AP)`.
  - Update slotted wildcard header tags to render `FORCE`, `FINESSE`, `FOCUS` instead of raw enum strings.
  - Update node scanner requirement indicators from `1F / 1R / 0M` to `1 FRC / 1 FIN / 0 FOC` to eliminate the single-letter "F" collision between Force, Finesse, and Focus.
- **Wayfarer Milestone Dialog**:
  - Update defensive attunement card badges to display `FORCE`, `FINESSE`, `FOCUS`.
  - Update empty domain ability fallback copy to reference the appropriate discipline name (e.g. `No unlearned Finesse domain abilities...`).
- **Combat Victory Modal**: Update post-battle XP breakdown cards from `⚔️ Fighter`, `🗡️ Rogue`, `🔮 Mage` to `⚔️ Force`, `🗡️ Finesse`, `🔮 Focus`.
- **Combat Action Bar & Ability Tooltips**: Map ability hover tooltip tags to display `Force`, `Finesse`, `Focus`.
- **Ability Descriptions & Combat Logs**: Update Sorcerer's *Spell Sculpt* ability tooltip and Astral Chronicle log text from "next Mage spell" to "next Focus spell".
- **Sandbox Encounter**: Rename the novice sandbox training dummy from `Bandit Fighter A` to `Bandit Brute A` to prevent class identity confusion.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `camp-hub`: Update hero card archetype XP meter requirement to specify Force, Finesse, and Focus display labels.
- `hero-progression-drawer`: Update in-camp level advancement spend buttons, wildcard selection options/badges, and node scanner requirement shorthand to standardize on Force, Finesse, and Focus.

## Impact

- **Affected Code**: `src/ui/combat/combatXpUtils.ts`, `src/ui/combat/BattleVictoryModal.tsx`, `src/ui/camp/HeroCard.tsx`, `src/ui/camp/HeroProgressionDrawer.tsx`, `src/ui/camp/OffNodeChoiceModal.tsx`, `src/ui/combat/ActionBar.tsx`, `src/core/combat/effects/spellSculptHandler.ts`, `src/data/packages/sorcerer.ts`, `src/data/encounters/noviceSandbox.ts`.
- **Affected Tests**: `HeroProgressionDrawer.test.tsx`, `CombatLogPanel.test.ts`, `combatXpUtils.test.ts`.
- **Persistence & API Compatibility**: Zero breaking changes to campaign save schemas or game engine data contracts. Internal `ArchetypePoints` (`{ fighter, rogue, mage }`) and `Archetype` enums remain stable for storage and catalog verification.
