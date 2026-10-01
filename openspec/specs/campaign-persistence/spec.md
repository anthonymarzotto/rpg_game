# Campaign Persistence Specification

## Purpose
Provides persistent client-side multi-slot campaign storage backed by IndexedDB, structured save envelopes, invalidation on version mismatch, slot metadata extraction, and portable JSON export/import contracts.

## Requirements

### Requirement: Multi-Slot Campaign Persistence
The system SHALL persist campaign states into IndexedDB across 3 fixed save slots (`slot-1`, `slot-2`, `slot-3`), saving and loading the complete campaign state including roster, active squad, history, stage, and pending encounter.

#### Scenario: Saving a campaign to a slot
- **WHEN** the system saves a campaign state to a designated slot
- **THEN** the campaign state is wrapped in a versioned save envelope and stored in IndexedDB under that slot identifier

#### Scenario: Loading a campaign from a slot
- **WHEN** the system loads a campaign from an occupied slot
- **THEN** the stored campaign state is returned with its full roster, progression, history, and active encounter intact

#### Scenario: Deleting a campaign slot
- **WHEN** the player requests deletion of a designated save slot
- **THEN** the slot is cleared from IndexedDB and subsequent queries report the slot as empty

### Requirement: Save Invalidation on Incompatible Version
The system SHALL enforce a strict save version check, marking any save envelope with a mismatched or incompatible version as invalid and offering slot deletion rather than attempting data migration.

#### Scenario: Detecting an incompatible save version
- **WHEN** a save slot contains an envelope whose version does not match the current supported save version
- **THEN** the system rejects loading the campaign and flags the slot as invalid and clearable

### Requirement: Slot Summary Metadata Extraction
The system SHALL provide lightweight summary metadata for all slots without requiring full roster deserialization or encounter reconstruction.

#### Scenario: Inspecting slot summaries
- **WHEN** the system queries the status of the 3 save slots
- **THEN** each slot returns metadata indicating whether it is occupied, the campaign name, stage number, roster count, triumph count, eclipse count, and last saved timestamp

### Requirement: Portable Save JSON Export and Import
The system SHALL support exporting a save slot to a downloadable JSON file and importing a valid JSON file into a designated slot.

#### Scenario: Exporting a save slot
- **WHEN** the player exports an occupied save slot
- **THEN** a formatted JSON string containing the versioned save envelope is produced for download

#### Scenario: Importing a valid save file
- **WHEN** the player imports a JSON string matching the current save envelope schema into an empty slot
- **THEN** the envelope is validated, written to IndexedDB for that slot, and immediately made available to resume

#### Scenario: Importing an invalid save file
- **WHEN** the player attempts to import a JSON string with missing fields or an unsupported version
- **THEN** the import is rejected with an error message and the target slot remains unchanged
