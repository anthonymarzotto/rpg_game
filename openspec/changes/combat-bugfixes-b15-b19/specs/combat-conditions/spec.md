# combat-conditions Specification Delta

## ADDED Requirements

### Requirement: Source-Defeated Condition Cleanup
The system SHALL support a declarative `clearWhenSourceDefeated` flag on condition definitions (`CHALLENGED`, `CHARMED`, and `HENOSIS`). Whenever any combatant is defeated (via direct or splash damage, self-sacrifice HP cost, turn-start DoT damage, or delayed battlefield hazard detonation), the system SHALL immediately purge all active conditions on living combatants whose `sourceUnitId` matches the defeated unit and whose condition definition sets `clearWhenSourceDefeated: true`.

When a condition is purged due to source defeat:
- The system SHALL invoke the condition's `onRemoved` lifecycle hook (such as restoring a `CHARMED` unit's original base faction).
- The system SHALL NOT invoke natural-expiration follow-up transitions (`onExpireApplyCondition`), so severing `HENOSIS` upon caster defeat SHALL NOT inflict `MORTAL_EBB`.
- The system SHALL record a `CONDITION_BROKEN` combat log entry with `reason: 'source_defeated'` identifying the cleared condition and defeated source.

#### Scenario: Challenged clears when challenger is defeated
- **WHEN** Unit B holds an active `CHALLENGED` condition sourced from Unit A, and Unit A is defeated in combat
- **THEN** the `CHALLENGED` condition is immediately removed from Unit B
- **THEN** subsequent attacks by Unit B against any target no longer suffer `CHALLENGED` Disadvantage or trigger `EXPOSED`
- **THEN** a `CONDITION_BROKEN` combat log entry with `reason: 'source_defeated'` is recorded for Unit B

#### Scenario: Charmed clears and restores allegiance when charmer is defeated
- **WHEN** Unit B holds an active `CHARMED` condition sourced from Unit A (temporarily aligned to Unit A's faction), and Unit A is defeated
- **THEN** the `CHARMED` condition is immediately removed from Unit B
- **THEN** Unit B's active combat faction reverts to its original base faction via `onRemoved`
- **THEN** a `CONDITION_BROKEN` combat log entry with `reason: 'source_defeated'` is recorded for Unit B

#### Scenario: Henosis clears without Mortal Ebb when Theurge is defeated
- **WHEN** an ally holds an active `HENOSIS` condition sourced from a Theurge, and that Theurge is defeated
- **THEN** the `HENOSIS` condition is immediately removed from the ally
- **THEN** the ally does NOT receive the `MORTAL_EBB` follow-up condition
- **THEN** a `CONDITION_BROKEN` combat log entry with `reason: 'source_defeated'` is recorded for the ally

#### Scenario: Defeat via turn-start DoT or delayed hazard also clears source-bound conditions
- **WHEN** a challenger, charmer, or Theurge is defeated by turn-start `BURN`/`POISON` damage, self-sacrifice `hpCost`, or a delayed bombardment detonation
- **THEN** all `clearWhenSourceDefeated` conditions sourced from that unit are purged from living combatants

## MODIFIED Requirements

### Requirement: Condition Combat Log Presentation and Feedback
The combat logging system SHALL render dedicated styled visual cards in the Combat Log panel for condition removal (`CONDITION_BROKEN`) and turn-start condition Damage-over-Time resolution (`DOT_DAMAGE`). The cards SHALL display appropriate condition glyphs (`👤`, `🔥`, `🧪`, `⚔️`, `💘`, `✨`), target affiliation styling, damage quantities, and remaining health vitals rather than unstyled generic fallback text. For `CONDITION_BROKEN` cards with `reason: 'source_defeated'`, the card SHALL render a cleared badge (`⚔️ CHALLENGED CLEARED`, `💘 CHARMED CLEARED`, or `✨ HENOSIS CLEARED`) and contextual note naming the defeated source rather than a challenge-defiance message.

#### Scenario: Stealth broken by damage log card
- **WHEN** a unit with an active `STEALTH` condition suffers direct attack damage or AoE splash damage that breaks stealth
- **THEN** the Combat Log renders a styled `CONDITION_BROKEN` card with a broken stealth badge (`👤 STEALTH BROKEN`), target affiliation styling, and context noting the loss of concealment

#### Scenario: Source-defeated condition cleared log card
- **WHEN** `CHALLENGED`, `CHARMED`, or `HENOSIS` is cleared because its `sourceUnitId` was defeated
- **THEN** the Combat Log renders a styled `CONDITION_BROKEN` card displaying the corresponding cleared badge (`⚔️ CHALLENGED CLEARED`, `💘 CHARMED CLEARED`, or `✨ HENOSIS CLEARED`) and a context note explaining that the source unit was defeated

#### Scenario: Turn-start Burn or Poison DoT damage log card
- **WHEN** an active unit suffers turn-start damage from an active `BURN` or `POISON` condition
- **THEN** the Combat Log renders a distinct `DOT_DAMAGE` card showing the condition icon (`🔥` for Burn, `🧪` for Poison), damage amount, and current/maximum target vitals
