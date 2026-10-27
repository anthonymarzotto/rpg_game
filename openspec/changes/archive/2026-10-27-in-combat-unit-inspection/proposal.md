# Proposal: In-Combat Unit Inspection & Effect Tooltips

## Why

During combat, players frequently encounter unfamiliar active status conditions (such as `CHALLENGED` or `EXPOSED`), but the UI only renders cryptic badges like `CHALLENGED (2t)` with no explanation of the rule, who applied it, or its consequences. Furthermore, when hovering to target a unit with an ability, moving the cursor to inspect the target preview HUD immediately dismisses the preview card, making condition tooltips physically unreachable. Outside of targeting, units cannot currently be selected or pinned to inspect their equipped ability loadout, remaining AP, or full passives.

Adding pinned unit inspection, zero-hover smart condition pills, instant rich condition tooltips, and ability loadout visibility gives players total tactical clarity during battle.

## What Changes

- **In-Combat Unit Pinning**: Clicking any combatant (ally or enemy) on the hex arena grid or CTB initiative ribbon in `IDLE` mode pins that unit into the secondary inspection slot under the active unit HUD. Moving the cursor across the screen maintains the pinned card. Clicking empty ground, pressing `Escape`, or clicking the close button unpins the card.
- **Unit Loadout & AP Visibility**: The pinned inspection card displays the combatant's equipped active abilities (name, AP cost, range, damage type, and description) alongside their remaining AP, CTB gauge, and effective defense vitals.
- **Smart Condition Pills with Source Attribution**: Condition badges in the HUD and Target Preview Card now display the source unit attribution (e.g. `by Garrick`) and a compact mnemonic tag for the core effect (e.g. `Disadv`, `+Adv`, `2 dmg`), removing the memory burden during quick targeting.
- **Rich Instant Tooltips**: Hovering any condition badge or stat modifier (on the active unit card, pinned inspector card, timeline ribbon chips, or hex standee bubbles) displays an instant, styled in-engine floating tooltip detailing the condition title, duration, source unit, and full mechanical rules without browser `title` latency.
- **Standee Status Tooltips in Arena**: Hovering over the status bubble above a unit standee on the hex board displays the rich condition tooltip directly in world space, enabling inspection during ability targeting without losing cursor focus.
- **Right-Click Target Cancellation**: Right-clicking anywhere on the hex arena while in `ABILITY` targeting mode cancels targeting and returns the player to `IDLE` mode.
- **Semantic Version Bump**: Requires a minor version bump from `0.6.0` to `0.7.0` according to Semantic Versioning, introducing backwards-compatible tactical inspection and UI interaction features.

## Capabilities

### New Capabilities
*(None; builds on existing arena UI and timeline architecture)*

### Modified Capabilities
- `arena-timeline-ux`: Update requirements and scenarios to specify unit pinning on click, pinned ability loadout and AP inspection, smart condition badge attribution and formatting, instant in-engine condition tooltips, standee status bubble hover, and right-click targeting cancellation.

## Impact

- **UI Components**: `src/ui/combat/UnitStatusCard.tsx`, `src/ui/combat/HexGridSvg.tsx`, `src/ui/combat/CombatArena.tsx`, `src/ui/combat/CombatArena.css`, `src/ui/combat/InitiativeRibbon.tsx`.
- **Combat Simulation & Interaction Hooks**: `src/ui/combat/useCombatSimulation.ts` to manage `pinnedUnitId`, tile click selection in `IDLE` mode, and right-click canvas cancellation.
- **Package & Documentation**: `package.json` (bump to `0.7.0`), `CHANGELOG.md`, `docs/plans/ACTIVE.md`.
