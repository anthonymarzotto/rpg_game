# Proposal: Camp Hub & Progression Loop (Phase 3.2)

## Why

With Phase 3.1 complete, the core campaign domain models (`CampaignState`, transitions, and dynamic threat-budgeted encounter generation) are fully tested and functional in headless TypeScript. However, the game currently lacks a graphical meta-game interface: players cannot see or manage their persistent party, level up heroes outside combat, inspect reserve units, recruit new novices, view expedition enemy reconnaissance, or navigate between battles.

Phase 3.2 bridges the headless campaign engine with the tactical arena, establishing a cohesive visual loop: `Start Screen -> Camp Hub -> Combat Arena -> Victory/Defeat Reconciliation -> Return to Camp`.

## What Changes

- **Root Screen Flow & Lifecycle (`src/App.tsx`)**:
  - Implement top-level view routing: `START`, `CAMP`, `ARENA`, and discreet `DEV_SANDBOX` toggle.
  - Implement `StartScreen` with active `New Game` button and disabled `Continue` placeholder (noting saves arrive in Phase 3.3).
  - Connect combat victory/defeat transitions to campaign state reconciliations (`resolveCampaignVictory` and `resolveCampaignDefeat`), ensuring both paths route back to Camp without in-arena rematch on squad wipe.
- **Camp Hub Interface (`src/ui/camp/`)**:
  - **Active Vanguard Dock**: Prominent hero cards for 1–3 deployed combatants displaying vitals, archetype XP progress bars, glowing `✦ LEVEL READY` alerts, `[ Bench ]`, and `[ Swap ]` controls.
  - **Reserve Barracks Tray**: Horizontally scrollable roster drawer with filter chips (`All`, `Level Ready`, classes) and `[ + Recruit Novice ]` button to spawn starter Level-0 units.
  - **Smart Two-Way Unit Swapping**: 1-click `[ Deploy ]` when squad has $< 3$ units; explicit 1-click slot replacement when squad is full ($3/3$).
  - **Expedition War Room Panel**: Stage briefing displaying stage name, threat budget rating, full detected enemy intel (pixel token chips and class tags), and `[ DEPLOY SQUAD ]` action.
- **Hero Progression Drawer (`src/ui/camp/HeroProgressionDrawer.tsx`)**:
  - Slide-in side drawer/modal overlay for focused hero inspection.
  - Embeds the interactive `ConstellationChart` pyramid with archetype XP spend buttons for leveling up.
  - Houses wildcard ability and passive slot pickers calling `configureUnitLoadout`.
- **Combat Arena Integration (`src/ui/combat/CombatArena.tsx`)**:
  - Accept optional `encounter` and campaign completion callbacks (`onVictory`, `onDefeat`).
  - Update `BattleVictoryModal` with a primary `[ Proceed to Camp ]` CTA.
  - Update `BattleDefeatModal` with a primary `[ Retreat to Camp ]` CTA.

## Capabilities

### New Capabilities
- `camp-hub`: Interactive Camp / Barracks UI hub providing the Active Vanguard dock, Reserve Barracks tray, Smart Two-Way unit swapping, Recruit Novice action, and Expedition War Room with enemy reconnaissance.
- `hero-progression-drawer`: In-camp slide-over drawer embedding the constellation pyramid, archetype point allocation, and wildcard loadout customization for inspected heroes.
- `campaign-game-loop`: Root application navigation lifecycle coordinating `StartScreen`, `CampHub`, `CombatArena`, and victory/defeat campaign routing with dev mode scaffolding.

### Modified Capabilities
*(None: Existing `campaign-progression` and `encounter-generation` domain requirements remain intact and valid; Phase 3.2 builds the presentation and loop on top of them).*

## Impact

- **Components Added**: `src/ui/camp/CampHub.tsx`, `ActiveSquadDock.tsx`, `ReserveBarracksTray.tsx`, `HeroCard.tsx`, `HeroProgressionDrawer.tsx`, `ExpeditionWarRoom.tsx`, `src/ui/start/StartScreen.tsx`.
- **Components Modified**: `src/App.tsx`, `src/ui/combat/CombatArena.tsx`, `src/ui/combat/BattleVictoryModal.tsx`, `src/ui/combat/BattleDefeatModal.tsx`.
- **Dependencies**: Uses existing `DESIGN.md` tokens (`tokens.css`, `utilities.css`), pixel tokens (`public/assets/tokens/pixel/`), and Phase 3.1 domain functions (`src/core/campaign/`). No new npm packages required.
