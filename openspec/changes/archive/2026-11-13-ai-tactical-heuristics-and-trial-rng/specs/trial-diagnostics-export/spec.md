## MODIFIED Requirements

### Requirement: Deterministic Trial State Serialization
The combat system SHALL serialize the active `CombatState` (including optional PRNG `seed`, `Arena` hex tiles, unit positions, unit vitals, modifiers, combat log, and AI decision traces) into a pure, JSON-compatible payload that unpacks internal `Map` structures.

#### Scenario: Serialization produces plain JSON data
- **WHEN** `serializeCombatState` is invoked with an active combat encounter
- **THEN** the returned object contains serializable representations of tiles, unit coordinates, units map, combat log, decision traces, and the recorded `seed` (when present) without native `Map` instances

#### Scenario: Deserialization preserves recorded PRNG seed
- **WHEN** a serialized trial snapshot containing a `seed` is passed to `deserializeCombatState`
- **THEN** the resulting `CombatState` retains the identical `seed` value

