# Proposal

## Why

The Astral Chronicle combat log currently clutters attack cards with inline roll math (`d20 + mod` and damage formulas) alongside the hover tooltips that already provide that breakdown, places damage before the roll that caused it, and omits `AttackRollTooltip` breakdowns (plus Burn details on cone splash hits) on ground-targeted `HEX` abilities like `Wyrmflame Breath`. Additionally, status-damage defeats and Phalanx Front Zone of Control halts still emit unstyled `GENERIC` cards, leaving noticeable visual gaps in the chronicle.

## What Changes

- **Simplified, Reordered Attack Chips (`UX.21`, `UX.22`)**: Flip `.log-impact-line` so the attack roll chip appears on the left and damage / `Missed` appears on the right. Simplify the chips to show only resolved outcomes (`🎲 21 vs DC 11` or `🎲 15` for area/hex rolls without a single DC; `💥 9 dmg` with `(Total)` for area attacks), deferring itemized dice and modifier math to `AttackRollTooltip` and `DamageRollTooltip` on hover (retaining fallback inline text only when structured breakdown components are absent).
- **Ground-Targeted HEX Roll Breakdown & Cone Condition Details (`UX.23`)**: Populate `attackRollBreakdown` on ground-targeted `HEX` attack rolls (`Wyrmflame Breath`, empty-hex `Arcane Blast`) by reusing the breakdown evaluation from `attackRoll.ts`, replace the `"Spellcast Roll & Score"` fallback title and `(Score N)` wording with the standard `AttackRollTooltip` and `🎲 N` chip, and append applied `BURN` (or other cone `CONDITION`) details to cone splash target log entries.
- **Structured Status Defeat & Zone of Control Cards (`UX.24`, `UX.25`)**:
  - Add a dedicated `DEFEATED` log metadata type and card in `turnClock.ts`, `combatLogger.ts`, and `CombatLogPanel.tsx` for status-condition defeats, explicitly naming the lethal condition (e.g., `Burn`, `Poison`).
  - Add a dedicated `ZONE_OF_CONTROL` log metadata type and card via `combatLogger` in `resolver.ts` and `CombatLogPanel.tsx` when Phalanx Front halts movement, including `faction` and `affectedUnitIds` for both the halted unit and the Shield-bearer so unit filtering includes both.
  - Apply faction theming (`factionCardClass`) and structured card framing to the `GENERIC` fallback renderer so no fallback log entry appears unformatted.

## Capabilities

### New Capabilities

### Modified Capabilities
- `arena-timeline-ux`: Update Combat Log attack/damage chip ordering and concise formatting, provide `AttackRollTooltip` breakdowns and cone condition details for ground-targeted `HEX` rolls, and add structured `DEFEATED`, `ZONE_OF_CONTROL`, and faction-styled `GENERIC` fallback cards.

## Impact

- **Version Assessment (SemVer)**: Patch bump from `0.17.2` to `0.17.3`. All changes refine existing Combat Log presentation, hover tooltip parity, and log event formatting without altering core combat rules, balance, or introducing breaking data/API changes.
- **Affected Code**:
  - `src/core/combat/types.ts` (new `CombatLogMetadata` variants `DEFEATED` and `ZONE_OF_CONTROL`, optional lethal condition / source metadata)
  - `src/core/combat/attackRoll.ts` (shared helper for building `AttackModifierComponent[]` for ground-targeted `HEX` rolls)
  - `src/core/combat/combatLogger.ts` (`logDefeat`, `logZoneOfControl`)
  - `src/core/combat/resolver.ts` (ground-targeted `HEX` `modifierBreakdown`, cone `BURN` splash log detail, `combatLogger.logZoneOfControl`)
  - `src/core/combat/turnClock.ts` (`combatLogger.logDefeat` with lethal condition name)
  - `src/ui/combat/CombatLogPanel.tsx`, `src/ui/combat/CombatArena.css`, and `src/ui/combat/CombatLogPanel.test.ts` (chip order/simplification, new cards, styled `GENERIC` fallback)
  - `docs/plans/ACTIVE.md` (`UX.21`–`UX.25` tracked under In Progress)
