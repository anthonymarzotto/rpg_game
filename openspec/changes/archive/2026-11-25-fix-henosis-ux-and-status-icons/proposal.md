# Proposal

## Why

Playtesting of the Tier 4 Theurge (B.22) exposed two related UX clarity defects that made `Henosis` appear broken when its core single-vessel rule was actually working as intended:

1. **Misleading arena token status icons**: On the hex battlefield (`HexGridSvg`), `MORTAL_EBB`, `CHARMED`, and `BLINDED` are omitted from the token status icon switch and fall through to the generic gold `✨` buff bubble—making a unit recovering in `MORTAL_EBB` look identical to an active `HENOSIS` vessel on the board.
2. **Silent Action Bar lockouts**: The tactical `ActionBar` only disables ability buttons when the active unit lacks AP. When an ability is locked out by a caster-level constraint—such as `Henosis` while the caster already has an active vessel (`maxActivePerSource: 1`) or any `oncePerTurn` ability already used this turn (`Blood Frenzy`, `Spell Sculpt`, `Siege Barrage`)—the button still appears clickable, highlights zero hexes on click, and provides no explanation until the player clicks a tile.

## What Changes

- **Canonical battlefield token condition badges**: Derive token status bubble glyphs and debuff border styling in `HexGridSvg` from the shared `formatConditionBadge` catalog (`conditionBadges.ts`) so `MORTAL_EBB` (`🕯️`), `CHARMED` (`💘`), and `BLINDED` (`🕶️`) render with their distinct icons and red debuff borders rather than falling through to gold `✨`.
- **Action Bar lockout disabling & tooltip reason**:
  - Export a caster-level ability availability/lockout helper from `validator.ts` (`getAbilityCastLockoutReason`) covering `oncePerTurn` and `maxActivePerSource` (identifying the active vessel's name for `Henosis`).
  - Disable Action Bar ability buttons whenever the caster lacks AP or has an active cast lockout.
  - Keep the hover tooltip readable on disabled buttons and render a clear unavailable/disabled reason banner inside `AbilityHoverTooltipBody` alongside the full ability description.
- **Charmed-vessel lockout verification**: Preserve per-Theurge `maxActivePerSource: 1` semantics (each Theurge may maintain one active vessel) and add explicit regression coverage confirming that a Theurge's `Henosis` remains locked out while their vessel is temporarily `CHARMED` by an opposing faction.

## Capabilities

### New Capabilities
- *(none)*

### Modified Capabilities
- `arena-timeline-ux`: Sync hex battlefield standee status bubbles with canonical condition icons and debuff colors (`MORTAL_EBB`, `CHARMED`, `BLINDED`), and require `ActionBar` ability buttons to disable on caster-level lockouts (`maxActivePerSource`, `oncePerTurn`) and insufficient AP while showing the disabled reason inside the hover tooltip alongside the full skill description.
- `tier-4-theurge`: Explicitly specify that a Theurge's active `HENOSIS` vessel lockout persists even while the vessel is temporarily `CHARMED` to an opposing faction.

## Version Assessment

- **Target Version**: `0.25.1` (Patch bump from `0.25.0`).
- **Rationale**: Fixes misleading battlefield status token rendering and improves Action Bar lockout feedback without altering combat balance, adding new classes/mechanics, or introducing breaking data/API changes.

## Impact

- **Core Combat Validation**: `src/core/combat/validator.ts`, `src/core/combat/validator.test.ts`
- **Combat UI**: `src/ui/combat/HexGridSvg.tsx`, `src/ui/combat/ActionBar.tsx`, `src/ui/combat/CombatArena.tsx`, `src/ui/common/AbilityDescriptionBlock.tsx`, `src/ui/common/AbilityDescriptionBlock.css`, `src/ui/combat/CombatArena.css`
- **UI Tests**: `src/ui/combat/ActionBar.test.tsx`, `src/ui/combat/HexGridSvg.test.tsx`
- **Release Metadata**: `package.json`, `CHANGELOG.md`
