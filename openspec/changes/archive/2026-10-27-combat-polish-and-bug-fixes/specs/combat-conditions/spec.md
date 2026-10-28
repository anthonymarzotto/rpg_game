# Spec Delta: combat-conditions

## ADDED Requirements

### Requirement: Condition Combat Log Presentation and Feedback
The combat logging system SHALL render dedicated styled visual cards in the Combat Log panel for condition removal on damage (`CONDITION_BROKEN`) and turn-start condition Damage-over-Time resolution (`DOT_DAMAGE`). The cards SHALL display appropriate condition glyphs (`👤`, `🔥`, `🧪`), target affiliation styling, damage quantities, and remaining health vitals rather than unstyled generic fallback text.

#### Scenario: Stealth broken by damage log card
- **WHEN** a unit with an active `STEALTH` condition suffers direct attack damage or AoE splash damage that breaks stealth
- **THEN** the Combat Log renders a styled `CONDITION_BROKEN` card with a broken stealth badge (`👤 STEALTH BROKEN`), target affiliation styling, and context noting the loss of concealment

#### Scenario: Turn-start Burn or Poison DoT damage log card
- **WHEN** an active unit suffers turn-start damage from an active `BURN` or `POISON` condition
- **THEN** the Combat Log renders a distinct `DOT_DAMAGE` card showing the condition icon (`🔥` for Burn, `🧪` for Poison), damage amount, and current/maximum target vitals
