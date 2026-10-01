# Tasks: Client Persistence & Save Management

## 1. Storage Core Domain & Serialization (`src/core/storage/`)

- [x] 1.1 Define storage contracts, envelope types (`SaveEnvelope`, `SlotSummary`), constants (`SAVE_VERSION = 1`, slot IDs `slot-1`, `slot-2`, `slot-3`), and `idb-keyval` custom store configuration in `src/core/storage/types.ts`.
- [x] 1.2 Implement core save manager functions (`saveCampaignSlot`, `loadCampaignSlot`, `deleteCampaignSlot`, `getSlotSummaries`) with strict version checking and invalidation in `src/core/storage/saveManager.ts`.
- [x] 1.3 Implement portable JSON export (`exportCampaignJson`) and schema-validated import (`importCampaignJson`) utilities in `src/core/storage/exportImport.ts`.
- [x] 1.4 Author headless Vitest suite (`saveManager.test.ts` and `exportImport.test.ts`) validating 3-slot saves, loads, slot deletions, invalid version rejection, and JSON round-trips.

## 2. Camp Hub Manual Save UI (`src/ui/camp/`)

- [x] 2.1 Add `[ ✦ Save ]` button to `CampHub.tsx` header with transient `✦ Saved!` visual feedback and style in `CampHub.css`.
- [x] 2.2 Update `CampHub.test.tsx` verifying the save callback is triggered and visual feedback displays properly.

## 3. Start Screen Multi-Slot & Archives Management (`src/ui/start/`)

- [x] 3.1 Create `SaveSlotDrawer.tsx` component rendering the 3 slots, slot summaries (sector, squad count, win/loss stats, timestamp), `[ Resume ]`, `[ Export ]`, `[ Delete ]`, and `[ Import JSON ]` actions with dedicated styling.
- [x] 3.2 Update `StartScreen.tsx` to query slot summaries on mount, enable `✦ Resume Expedition` when saves exist, and disable `✦ New Astral Expedition` when all 3 slots are full.
- [x] 3.3 Author tests for slot drawer and start screen interactions verifying slot listing, resume, deletion, and full-slot blocking.

## 4. Top-Level Integration & Lifecycle (`src/App.tsx`)

- [x] 4.1 Bind active slot tracking (`activeSlotId`) in `App.tsx`, allocating the first open slot on new game, loading selected slots on resume, and connecting `CampHub` save actions to `saveCampaignSlot`.
- [x] 4.2 Verify end-to-end campaign persistence flow across the application and update `docs/plans/DEVELOPMENT_PLAN.md`.
