# Proposal: Visual Dice Tumbler Tray

## Why

Combat currently calculates d20 attack rolls and damage dice behind the scenes, outputting text lines in the combat log panel while units receive immediate floating damage numbers. While functional, this misses the suspense and tactile tabletop drama of watching a physical d20 tumble, seeing an Advantage roll discard the lower die, and watching damage dice clatter to determine the final strike.

Adding a sleek, floating 2.5D visual dice tumbler tray brings visceral tabletop excitement to player attack actions without slowing down combat pacing.

## What Changes

- **Visual Dice Tumbler Tray**: A celestial glassmorphic clash banner docked at the top-center of the combat arena during player attack executions.
- **Two-Stage Roll Animation**:
  - **Stage 1 (Attack Check)**: Tumbles a d20 (or dual d20s under Advantage/Disadvantage). Discards the inactive die, calculates `Natural Roll + Net Modifier vs Target Defense`, and displays an outcome stamp (`CRITICAL HIT!`, `SOLID HIT`, `GRAZE`, or `MISS`).
  - **Stage 2 (Damage Roll)**: For successful hits, rolls the ability's damage dice (e.g. `1d8`, `2d6`) and adds the attribute modifier to show the total damage dealt.
- **Pacing & Frictionless Controls**:
  - **Click-to-Skip**: Any mouse click or spacebar press during the tumble instantly snaps the roll to its final outcome and dismisses the tray.
  - **Persistent Toggle Button**: A compact `[🎲 Tray: ON/OFF]` pill in the combat arena header that saves to `localStorage`. When disabled, player abilities resolve instantly with standard floating combat text.
- **Player Actions Only**: Scoped strictly to player abilities in `useCombatSimulation.ts`, preserving fast autonomous hostile turns and keeping `asyncTurnSequencer.ts` untouched.
- **Headless Dice Breakdown Data Contract**: Extends `AttackResolution` in `src/core/combat/types.ts` and `attackRoll.ts` to expose structured dice roll records (`rawD20Rolls`, `advantage`, `keptD20`, `damageRolls`) so presentation remains purely declarative and deterministic without presentation-side RNG.
- **Version Bump**: Minor bump from `0.8.0` to `0.9.0` per Semantic Versioning, introducing a major user-facing sensory combat feature, interactive controls, and extended core resolution contracts.

## Capabilities

### New Capabilities
- `visual-dice-tumbler-tray`: Interactive 2.5D visual dice clash tray for player attack and damage resolution with dual-die advantage evaluation, click-to-skip, persistent UI toggle, and headless roll breakdown data contracts.

### Modified Capabilities
<!-- No existing spec requirements modified. The feature consumes existing attack-roll-context and combat-conditions without altering their normative rules. -->

## Impact

- **Core Combat Types & Resolver**: `src/core/combat/types.ts` (`AttackResolution` extended with optional `diceBreakdown`), `src/core/combat/attackRoll.ts` (capturing individual d20 rolls and damage dice components).
- **Combat Simulation Hook**: `src/ui/combat/useCombatSimulation.ts` (holding active roll sequence state during player action resolution, triggering floating text on completion).
- **Presentation Tier**: New React components `src/ui/combat/DiceTumblerTray.tsx` and styling `src/ui/combat/DiceTumblerTray.css`.
- **Arena Controls**: `src/ui/combat/CombatArena.tsx` (top clash banner placement and `[🎲 Tray: ON/OFF]` header toggle button).
