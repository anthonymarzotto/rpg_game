# Proposal: Harvest Spoils UX Polish & XP Threshold Preview

## Why

Following combat encounters, the "Harvest Trial Spoils" dialog presents a cramped and visually cluttered stepper interface for distributing salvaged combat XP among squad members. Steppers currently display redundant "+" signs for non-negative values, buttons lack horizontal breathing room, variable text widths cause the "Total:" labels to jitter across rows, and an allocation warning clutters the bottom-left footer. Additionally, players have no visibility into whether their allocations will satisfy the next level advancement threshold until they return to Camp.

Refining this dialog resolves UX.3 and UX.2 from the active plan, making post-trial XP distribution satisfying, legible, and strategically informative.

## What Changes

- **Clean Number Formatting**: Remove redundant `+` sign from allocation values, displaying clean integers (`0`, `1`, `2`) and omitting the leading sign.
- **Structured Stepper Ergonomics**: Provide adequate horizontal spacing/margins for `[-]` and `[+]` buttons, and enforce a fixed 3-column CSS grid (`tag`, `controls`, `total pill`) per row so values and badges align vertically across cards.
- **Next Level Requirement in Unit Header**: Display the unit's level and promotion requirement (e.g. `Level 0 (Req: 5 XP)`) once in the unit card meta header, eliminating repetitive divisor text across attribute rows.
- **Projected Total & Milestone Badges**: Replace unstyled `Total: #` text with a styled right-aligned badge. When an archetype's projected total reaches or exceeds the level requirement, highlight the badge with radiant milestone styling and a `★` indicator.
- **Action Tooltip Validation**: Remove the bottom-left status warning string from the dialog footer and relocate it to a descriptive hover tooltip (`"Allocate all remaining XP to continue"`) on the disabled "Proceed to Camp" button.

## Version Bump Rationale

- **Target Version**: `0.7.2`
- **Bump Type**: Patch
- **Rationale**: This change delivers backward-compatible user interface refinements, ergonomic adjustments, and visual status indicators to the post-trial XP allocation modal without breaking domain models, saved campaign states, or public APIs.

## Capabilities

### New Capabilities
*(None)*

### Modified Capabilities
- `campaign-progression`: Update post-battle harvest distribution requirements to specify level threshold display, archetype promotion milestone readiness indicators, and button validation tooltips.

## Impact

- `src/ui/combat/HarvestDistributionModal.tsx`: Component structure, level requirement evaluation, stat pill rendering, and tooltip wrapper.
- `src/ui/combat/HarvestDistributionModal.css`: Grid track definitions, stepper button margins, stat pill styling, and milestone glow effects.
- `src/ui/combat/HarvestDistributionModal.test.tsx`: Test assertions for rendered markup, milestone indicators, and tooltip behavior.
