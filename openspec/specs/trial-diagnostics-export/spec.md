# Trial Diagnostics Export Specification

## Purpose

Enables comprehensive in-browser export of active combat trials—capturing serialized combat state for headless re-simulation, AI candidate evaluation telemetry, human/LLM-readable diagnostic summaries, and crash fallback recovery.

## Requirements

### Requirement: AI Decision Candidate Telemetry
The AI decision system SHALL collect structured candidate evaluation telemetry for each decision step during combat, recording the chosen winning action alongside top evaluated candidate alternatives (including action type, target/destination, final utility score, and component score breakdown).

#### Scenario: Evaluated candidates captured
- **WHEN** an AI unit evaluates actions during its turn
- **THEN** the decision engine records the winning action and top alternative candidates with their scores and rationale into the trial's decision trace history.

#### Scenario: AP conservation threshold recording
- **WHEN** an AI unit conserves AP because no legal action exceeds the conservation threshold
- **THEN** the recorded trace includes the conservation threshold and the scores of rejected candidate actions.

### Requirement: Deterministic Trial State Serialization
The combat system SHALL serialize the active `CombatState` (including `Arena` hex tiles, unit positions, unit vitals, modifiers, combat log, and AI decision traces) into a pure, JSON-compatible payload that unpacks internal `Map` structures.

#### Scenario: Serialization produces plain JSON data
- **WHEN** `serializeCombatState` is invoked with an active combat encounter
- **THEN** the returned object contains serializable representations of tiles, unit coordinates, units map, combat log, and decision traces without native `Map` instances.

### Requirement: Headless Combat State Re-simulation Hydration
The combat system SHALL deserialize a serialized trial snapshot payload back into an operational `CombatState` with a functional `Arena` instance and unit maps, allowing headless execution of `decideNextAction` and combat actions.

#### Scenario: Deserialized state supports AI re-evaluation
- **WHEN** a serialized trial snapshot is passed to `deserializeCombatState`
- **THEN** the resulting `CombatState` has a functional `Arena` with unit positions intact, and `decideNextAction` can be executed headlessly on the active unit without errors.

### Requirement: Diagnostic Markdown Report Generation
The system SHALL generate a concise, human-and-LLM-readable Markdown summary report from a combat state snapshot, displaying active unit status, unit vitals/positions overview, detected faults/errors, recent AI decision candidate comparisons, and recent combat log entries.

#### Scenario: Markdown report includes AI decision candidate diff
- **WHEN** `generateTrialMarkdownReport` is called on a trial with AI decision traces
- **THEN** the generated markdown contains a table of combatants with current vitals and coordinates, an alert section for any `ai_fault` entries, and the top candidate scores for recent turns.

### Requirement: In-Arena Export Modal and Clipboard Actions
The combat arena interface SHALL provide an accessible export trigger in the top bar that opens an export modal with one-click actions to copy the formatted Markdown summary to the clipboard or download/copy the full raw JSON state.

#### Scenario: User copies Markdown diagnostic report
- **WHEN** the user clicks the "Export Trial" button and chooses "Copy Markdown Summary"
- **THEN** the formatted Markdown report is copied to the system clipboard and a visual confirmation is displayed.

#### Scenario: User downloads raw JSON snapshot
- **WHEN** the user chooses "Download JSON" in the export modal
- **THEN** a JSON file containing the full serialized trial snapshot is downloaded.

### Requirement: Trial Error Boundary Fallback
The combat arena SHALL be protected by an error boundary that catches unhandled render exceptions, displays the error message, and provides an immediate button to copy the error stack and latest combat state snapshot to the clipboard.

#### Scenario: Unhandled runtime error displays fallback with export
- **WHEN** an unhandled exception occurs within the combat arena render tree
- **THEN** the error boundary renders a fallback diagnostic card showing the error and a button to copy the diagnostic report to the clipboard.
