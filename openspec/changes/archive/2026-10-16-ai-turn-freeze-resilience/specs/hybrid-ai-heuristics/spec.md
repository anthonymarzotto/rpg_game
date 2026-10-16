# Spec Delta

## ADDED Requirements

### Requirement: Turn Execution Resilience and Action Validation Fallback
The AI decision and execution system SHALL validate candidate actions using authoritative engine rules (`canMove` for movement and `canExecuteAbility` for abilities) before execution, and SHALL evaluate ability affordability against effective AP costs (`getEffectiveAbility().apCost`). If an action fails validation or encounters an execution error during an AI turn, the system SHALL NOT throw an unhandled exception or abort the turn sequencer. Instead, the system SHALL record a diagnostic log entry, halt further action attempts for that turn, conserve remaining unspent AP for CTB recovery, and guarantee via a `try / finally` contract that `endActiveTurn` is executed so the CTB initiative clock advances to the next unit.

#### Scenario: AI action validation failure falls back to AP conservation cleanly
- **WHEN** an AI unit attempts an action that fails validation (such as insufficient AP, blocked path, or obstructed charge ray)
- **THEN** the action is aborted without throwing an unhandled exception
- **THEN** remaining AP is banked with standard CTB recovery (+20 gauge per AP) and the turn concludes cleanly

#### Scenario: AI turn sequencer guarantees endActiveTurn on unexpected error
- **WHEN** an unexpected runtime exception occurs during the execution of an AI turn
- **THEN** the turn sequencer catches the exception, logs diagnostic details, and executes `endActiveTurn` in its finally block to ensure the CTB clock advances

### Requirement: Consecutive Turn Reactivity
The combat simulation and turn sequencing interface SHALL support consecutive turns taken by the same AI unit. When an active unit conserves AP and wins the CTB clock again (remaining the active unit for the subsequent turn), the reactive interface SHALL trigger and sequence the new turn without stalling, tracking turn advancement through the encounter's turn number. State updates emitted during intermediate steps within a turn SHALL NOT cancel or re-trigger the ongoing turn execution.

#### Scenario: Support unit banks AP and immediately executes subsequent turn upon winning CTB clock
- **WHEN** an AI support unit banks AP and subsequently wins the CTB clock again for the next turn
- **THEN** the simulation interface detects the turn increment and executes the unit's subsequent turn with full 3 AP without freezing or requiring user intervention

#### Scenario: Action state updates mid-turn do not abort ongoing turn sequencer
- **WHEN** an AI unit resolves an action (such as Move or Strike) and dispatches combat log and floating text updates
- **THEN** the reactive turn effect remains stable and continues executing subsequent actions without aborting the turn

### Requirement: In-Game AI Action Fault Diagnostics
When an AI action fails validation or cannot be resolved, the combat logging and feedback system SHALL record a structured diagnostic entry in the combat log and surface visual feedback in the combat interface. The combat log entry SHALL document the actor, attempted action, validation failure reason, and fallback AP conservation. The combat interface SHALL render a styled amber diagnostic card (`⚠️ AI FAULT`) in the Combat Log panel and dispatch an amber floating combat text alert (`⚠️ Action Fault`) directly over the actor's arena hex.

#### Scenario: Failed action generates amber diagnostic card in combat log
- **WHEN** an AI action fails validation during an automated turn
- **THEN** a diagnostic entry is appended to the combat log detailing the actor name, attempted action, and failure reason
- **THEN** the Combat Log panel renders an amber-accented card highlighting the action fault

#### Scenario: Floating text alert appears over actor on action fault
- **WHEN** an AI action fails validation during an automated turn
- **THEN** an amber floating combat text reading `⚠️ Action Fault` appears over the actor's position on the arena grid
