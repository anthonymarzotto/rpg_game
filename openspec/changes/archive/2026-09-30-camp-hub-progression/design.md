# Design: Camp Hub & Progression Loop (Phase 3.2)

## Context

The core campaign logic ([transitions.ts](file:///c:/Repos/rpg_game/src/core/campaign/transitions.ts)) and threat-budgeted encounter generator ([encounterGenerator.ts](file:///c:/Repos/rpg_game/src/core/campaign/encounterGenerator.ts)) are implemented and tested. The visual identity has been standardized in [DESIGN.md](file:///c:/Repos/rpg_game/DESIGN.md) with design tokens in [tokens.css](file:///c:/Repos/rpg_game/src/styles/tokens.css) and utility classes in [utilities.css](file:///c:/Repos/rpg_game/src/styles/utilities.css).

See `proposal.md` for motivation and background.

## Goals / Non-Goals

**Goals:**
- Provide a responsive, glassmorphic Camp Hub (`src/ui/camp/`) adhering to `DESIGN.md` tokens.
- Implement the "Active Vanguard Dock + Reserve Barracks Tray" information architecture supporting uncapped roster scaling.
- Implement Smart Two-Way Unit Swapping: 1-click deploy into open slots ($< 3$), benching ($> 1$), and 1-click slot replacement when at squad capacity ($3/3$).
- Provide a slide-in Hero Progression Drawer housing the interactive Constellation pyramid and wildcard loadout customizer.
- Provide an Expedition War Room displaying stage threat ratings and full enemy unit reconnaissance (pixel mini-tokens and class chips).
- Wire top-level navigation in `App.tsx` coordinating `START`, `CAMP`, `ARENA`, and a subtle developer sandbox toggle.
- Integrate `CombatArena` with `CampaignState`, routing victory and defeat outcomes back to Camp via `resolveCampaignVictory` and `resolveCampaignDefeat`.

**Non-Goals:**
- IndexedDB / localStorage client persistence (deferred to Phase 3.3).
- New class authoring (Knight, Infiltrator, Sorcerer) or status condition systems (deferred to Phase 4).
- Permanent character death or persistent wound mechanics.

## Decisions

### Decision 1: Smart Two-Way Unit Swapping Architecture
* **Choice**: Combine 1-click deploy when squad $< 3$ with an active slot swap mode when squad is full ($3/3$).
* **Rationale**: Eliminates the frustration of having to bench a unit first just to test another unit, while avoiding the fragile drag-and-drop complexity across scrollable containers and touch screens.
* **Alternatives Considered**:
  - *Bench & Fill only (Option 2)*: Requires 2 distinct clicks for every replacement.
  - *HTML5 Drag and Drop (Option 3)*: High implementation complexity with awkward scroll interactions on large reserve rosters.
  - *Slot Modal Picker (Option 4)*: Hides the visible reserve drawer behind redundant dialogs.

### Decision 2: Slide-in Progression Drawer over Full Subview
* **Choice**: Render hero inspection and constellation advancement in a slide-over glassmorphic drawer (`HeroProgressionDrawer.tsx`) rather than a full page route.
* **Rationale**: Keeps the player grounded in their expedition preparation context. Players can inspect multiple heroes, level them up, and immediately verify their updated readiness in the Active Vanguard without jarring page transitions.
* **Alternatives Considered**:
  - *Full-page Constellation view*: Loses visual connection to the squad and stage briefing.

### Decision 3: Direct Camp Handoff for Victory & Defeat (No In-Arena Rematch)
* **Choice**: On combat resolution, `BattleVictoryModal` features a primary `[ Proceed to Camp ]` CTA and `BattleDefeatModal` features a primary `[ Retreat to Camp ]` CTA.
* **Rationale**: Squad wipe defeat in campaign mode prompts tactical reconsideration, hero rotation, or ability respec in Camp rather than an instant re-try loop. Defeat reconciles through `resolveCampaignDefeat` (reverting session XP, restoring full HP).
* **Alternatives Considered**:
  - *In-arena rematch button on defeat*: Breaks the campaign state lifecycle and contradicts the design rule established in `DEVELOPMENT_PLAN.md`.

### Decision 4: Full Enemy Intel in Expedition War Room
* **Choice**: The Expedition War Room side panel renders exact detected enemy unit tokens, classes, and threat budget ratings.
* **Rationale**: Pre-generating the stage encounter in `CampaignState.currentEncounter` makes reconnaissance free. Providing enemy composition intel gives strategic purpose to hero switching and wildcard skill selection before embarking.
* **Alternatives Considered**:
  - *Hidden enemy composition*: Reduces pre-combat tactical preparation to guesswork.

### Decision 5: Non-Invasive Developer Mode Access
* **Choice**: Keep a discreet top/corner dropdown or segmented pill in the header to switch between `Campaign Loop`, `Novice Sandbox`, and `Raw Constellation Chart`.
* **Rationale**: Preserves rapid developer iteration on isolated combat features and test fixtures without interfering with the normal player experience.

## Component Architecture & State Hierarchy

```
App.tsx
├── StartScreen.tsx (mode === 'START')
├── CampHub.tsx (mode === 'CAMP')
│   ├── ActiveSquadDock.tsx
│   │   └── HeroCard.tsx (Active Vanguard: 1-3 cards + Empty slots)
│   ├── ReserveBarracksTray.tsx
│   │   ├── ReserveFilterBar.tsx
│   │   ├── HeroMiniCard.tsx (Roster units)
│   │   └── RecruitNoviceButton.tsx
│   ├── ExpeditionWarRoom.tsx (Stage threat, enemy token chips, [DEPLOY])
│   └── HeroProgressionDrawer.tsx (Slide-over drawer)
│       ├── ConstellationChart.tsx (Pyramid)
│       ├── ArchetypeSpendControls.tsx (advanceUnitLevel)
│       └── WildcardLoadoutPicker.tsx (configureUnitLoadout)
├── CombatArena.tsx (mode === 'ARENA')
│   ├── (HexGridSvg, ActionBar, TurnRibbon, CombatLog)
│   ├── BattleVictoryModal.tsx -> onProceedToCamp()
│   └── BattleDefeatModal.tsx -> onRetreatToCamp()
└── DevHeaderNav.tsx (Discreet mode switcher)
```

## Risks / Trade-offs

- **[Risk: Viewport height and scrolling in Camp]** → *Mitigation*: Use a flex layout where Active Vanguard and Expedition War Room take the upper viewport and Reserve Barracks forms a fixed-height, horizontally scrollable tray at the bottom with standard CSS tokens.
- **[Risk: Constellation pyramid sizing inside drawer]** → *Mitigation*: `ConstellationChart` already uses responsive SVG viewBox coordinates; the drawer will constrain max-height and apply `overflow-y: auto`.
- **[Risk: Stale combat simulation state between battles]** → *Mitigation*: Whenever `mode` transitions to `ARENA`, `CombatArena` initializes a fresh `useCombatSimulation` keyed to `campaignState.currentEncounter.id`.
