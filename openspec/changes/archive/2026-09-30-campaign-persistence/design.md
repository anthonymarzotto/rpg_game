# Design: Client Persistence & Save Management

## Context

See `proposal.md` for motivation. Currently, `CampaignState` exists only in React state (`App.tsx`), wiping out progress on page reload. The campaign domain model (`CampaignState`, `Unit`, `EncounterDefinition`) is composed entirely of plain serializable JSON structures without class methods or circular references. The `idb-keyval` package is already installed.

## Goals / Non-Goals

**Goals:**
- Provide a headless, robust storage manager (`src/core/storage/`) providing 3 fixed save slots (`slot-1`, `slot-2`, `slot-3`) backed by IndexedDB.
- Maintain lightweight slot metadata summaries for quick Start Screen rendering without full roster deserialization.
- Support strict version checking (`SAVE_VERSION = 1`) with an invalidation policy for incompatible development saves.
- Provide manual save capabilities in `CampHub` tied to the active run's bound slot.
- Provide Start Screen expedition resumption, slot deletion, and JSON export/import.

**Non-Goals:**
- Mid-battle combat suspend checkpointing (deferred to a future release).
- User settings / preferences in `localStorage` (skipped).
- Schema migration pipelines across early alpha versions (corrupted or incompatible saves are deleted/reset).
- Cloud storage or multi-device synchronization.

## Decisions

### Decision 1: Dedicated Custom Store in IndexedDB
* **Approach**: Use `idb-keyval`'s `createStore('astral_tactics_db', 'campaign_saves')` rather than the default global keyval store.
* **Rationale**: Isolates Astral Tactics game saves from any other domain data or third-party libraries, preventing key collisions.
* **Alternative Considered**: Raw IndexedDB API (`indexedDB.open`). Rejected because `idb-keyval` provides a rock-solid, Promise-based, minimal wrapper (~600 bytes) already installed in `package.json`.

### Decision 2: Fixed 3-Slot Architecture (`slot-1`, `slot-2`, `slot-3`)
* **Approach**: Restrict active runs to 3 discrete slots.
* **Rationale**: Classic RPG slot pattern that avoids unbounded storage growth, provides clean UI layout, and makes slot selection predictable.
* **Key Format**: Each slot stores a `SaveEnvelope`:
  ```typescript
  export interface SaveEnvelope {
    readonly version: number;
    readonly slotId: string;
    readonly savedAt: number;
    readonly campaign: CampaignState;
  }
  ```

### Decision 3: Slot Summary Extraction Contract
* **Approach**: Expose `getSlotSummaries(): Promise<SlotSummary[]>` that extracts high-level metadata:
  ```typescript
  export interface SlotSummary {
    readonly slotId: string;
    readonly label: string;
    readonly isEmpty: boolean;
    readonly isCorrupted?: boolean;
    readonly campaignName?: string;
    readonly stage?: number;
    readonly rosterCount?: number;
    readonly victories?: number;
    readonly defeats?: number;
    readonly savedAt?: number;
  }
  ```
* **Rationale**: Allows the Start Screen to render slot cards instantly with sector badges, hero counts, and timestamps without loading all unit loadouts or encounter graphs.

### Decision 4: New Game Slot Allocation & Capacity Guard
* **Approach**:
  - When the player clicks `[ New Astral Expedition ]`, the app finds the first slot where `isEmpty === true` (e.g. `slot-1`, then `slot-2`, then `slot-3`).
  - If all 3 slots are occupied, the New Game button is disabled with an explanatory tooltip or message instructing the player to delete or manage a slot.
  - The created campaign is bound to this slot in `App.tsx` (`activeSlotId`).

### Decision 5: Explicit Manual Save in CampHub
* **Approach**:
  - Add a `[ ✦ Save ]` button in the `CampHub` header.
  - Invokes `saveCampaignToSlot(activeSlotId, campaignState)`.
  - Visual feedback toggles to `✦ Saved!` with a subtle celestial pulse for 2 seconds.
* **Rationale**: Fulfills the user's explicit preference for manual saves only (no surprise background writes or unwanted overwrites).

### Decision 6: Export / Import on Start Screen
* **Approach**:
  - **Export**: Generates a formatted JSON Blob from the `SaveEnvelope` and initiates a browser file download (`astral_tactics_${slotId}_stage${stage}.json`).
  - **Import**: Allows file selection via hidden `<input type="file" accept=".json">` or modal paste, runs strict envelope schema validation (`version === 1`, valid `CampaignState`), and commits to a chosen empty slot.
* **Rationale**: Keeps file management neatly contained on the title screen where the player manages expedition archives.

## Risks / Trade-offs

- **[Risk: Browser Private Browsing Restrictions]**
  - *Risk*: Some private browsing modes restrict IndexedDB access or throw `SecurityError`.
  - *Mitigation*: Wrap storage calls in try/catch and expose user-facing error notices if storage access fails.
- **[Risk: Accidental Save Overwrite on Import]**
  - *Risk*: Importing a file could inadvertently overwrite an active save.
  - *Mitigation*: Import is restricted to empty slots or requires explicit confirmation to replace an existing slot.
- **[Risk: Schema Breakage During Active Development]**
  - *Risk*: Altering unit or campaign structures could cause deserialization crashes.
  - *Mitigation*: Envelope `version: 1` check. If version mismatches or essential fields are missing, mark `isCorrupted: true` and offer a `[ Delete Slot ]` action to cleanly reset the slot.
