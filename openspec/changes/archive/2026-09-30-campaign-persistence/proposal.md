# Proposal: Client Persistence & Save Management

## Why

Currently, campaign and roster progress exists solely in client memory (`useState` in `App.tsx`), resetting whenever the player refreshes the page or navigates away. To complete Phase 3.3 of the development roadmap, the game requires persistent client-side storage so players can save their expedition, resume across sessions, manage multiple save slots, and safely export or import save files.

## What Changes

- **Multi-Slot Persistence Core (`src/core/storage/`)**:
  - Implement a headless save manager utilizing `idb-keyval` for IndexedDB persistence across 3 discrete slots (`slot-1`, `slot-2`, `slot-3`).
  - Introduce a structured `SaveEnvelope` with version stamping (`version: 1`), timestamp, and campaign payload.
  - Implement strict version validation with an invalidation policy (incompatible or corrupted saves are flagged for deletion/reset rather than maintaining complex migrations during active development).
  - Provide slot summary extraction for lightweight UI previews (stage, roster size, win/loss stats, timestamp).
  - Provide portable JSON save export and import utilities.
- **Camp Hub Manual Save Action**:
  - Add a dedicated `[ ✦ Save ]` button in the Camp Hub header.
  - On click, commit the active campaign to its bound slot in IndexedDB and display brief visual confirmation (`✦ Saved!`).
- **Start Screen Slot Management & Archives**:
  - Update `[ New Astral Expedition ]` to auto-allocate the first open slot; disable/block new expeditions when all 3 slots are occupied with a notice to delete or manage existing slots.
  - Update `[ Resume Expedition ]` to open the slot selection modal displaying available runs, with options to resume a run or delete a slot.
  - Add `[ ✦ Manage Archives ]` (or slot-level controls) enabling JSON file export for any slot and JSON import into an empty slot.

## Capabilities

### New Capabilities
- `campaign-persistence`: Headless multi-slot IndexedDB storage manager with save envelopes, invalidation policy, slot metadata summaries, and portable JSON export/import contracts.

### Modified Capabilities
- `campaign-game-loop`: Update Start Screen navigation from a disabled placeholder to dynamic multi-slot resume, auto-allocating first open slot on new game, blocking when full, and archive import/export.
- `camp-hub`: Add a manual save action in the header that commits the current campaign state to its bound slot with visual feedback.

## Impact

- **Storage & Dependencies**: Utilizes existing `idb-keyval` dependency; creates `src/core/storage/` module with zero DOM/window dependencies for headless testing.
- **App State**: Binds active campaign to an assigned slot ID (`activeSlotId`) in `App.tsx`.
- **UI Components**: Updates `StartScreen.tsx`, adds `SaveSlotModal.tsx` (or archives drawer), and adds a Save button in `CampHub.tsx`.
