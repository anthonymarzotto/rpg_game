# Proposal: Clash Dice Tray Expansion, Damage Breakdown Tooltip & Enemy Turn Tray Mode

## Why

The Visual Dice Tumbler Tray currently resolves player attacks quickly, spoils the final d20 and damage roll numbers in the equation row before the dice stop tumbling (`UX.11`), omits target Armor/Ward soak from the damage equation (`B.14`), and only triggers on player turns—leaving consecutive enemy attacks and unit defeats (`UX.19`, `UX.20`) feeling abrupt and hard to parse without reading back through the Combat Log. Expanding the tray into a theatrical Clash Duel stage with directional attacker/defender tokens, synchronized impact/defeat animations, full damage soak math + shared hover breakdown tooltips (`UX.14`), and a tri-state mode (`ALL` / `PLAYER_ONLY` / `OFF`) makes both player and enemy attacks legible, impactful, and exciting.

## Version Assessment

- **Current Version**: `0.16.0`
- **Target Version**: `0.17.0` (Minor bump)
- **Rationale**: Introduces new user-facing combat presentation features including the Clash Duel token stage with attack/hit/miss/defeat micro-animations, a tri-state Dice Tray mode supporting enemy turn clash rolls, and an itemized Damage Roll Breakdown hover tooltip shared across the Dice Tray and Combat Log.

## What Changes

- **Clash Duel Stage & Directional Combatant Tokens (`UX.20`)**:
  - Upgrade the `DiceTumblerTray` header ribbon into a Clash Duel stage displaying directional pixel tokens for the Attacker (facing Southeast/right) and Defender (facing Southwest/left), along with Defender HP before/after the attack.
  - Add stage-synchronized token micro-animations: attacker wind-up/lunge on attack settle, defender sidestep on miss, defender red flash + hit shake on damage settle (amplified on Critical Hit), and a `💀 DEFEATED` badge + greyscale/sink animation when an attack reduces the defender to `0 HP`.
  - Defer battlefield unit defeat removal and HP bar updates until the active Dice Tray completes so units do not vanish from the hex map while the dice are still rolling.
- **Spoiler-Free Roll Pacing & Stamp Polish (`UX.6`, `UX.11`)**:
  - Hide the Stage 1 attack score equation while the d20 is tumbling (`STAGE1_TUMBLE`), showing a rolling prompt until `STAGE1_SETTLE`.
  - Hide the Stage 2 damage equation while the damage dice are tumbling (`STAGE2_TUMBLE`), revealing the damage math and Defender HP drop only upon `STAGE2_SETTLE`.
  - Slightly slow down Stage 1 and Stage 2 tumble and settle timings so each beat registers cleanly while preserving click/Spacebar-to-skip and auto-close.
  - Simplify the miss outcome stamp from `EVADED / MISS` to `MISS`.
- **Full Damage Equation with Soak & Shared `DamageRollTooltip` (`B.14`, `UX.14`)**:
  - Extend `resolveDamage`, `DiceRollBreakdown`, and `CombatLogMetadata` with structured `DamageBreakdownComponent[]` attribution (rolled base dice, maximized crit dice, bonus dice, base attribute bonus, flat/shard bonus, named passive bonuses, Armor/Ward mitigation soak, Graze/Cover multipliers, and minimum damage floor) plus `mitigation` and `mitigationType`.
  - Update the Dice Tray damage equation to explicitly display Armor/Ward soak (e.g. `3 + 2 - 2 Armor = 3 DMG`) and Crit max dice when applicable.
  - Create a shared `DamageRollTooltip` glassmorphic hover popover rendered on both the Dice Tray damage modifier/equation and the Combat Log attack card damage chip (`💥 N dmg`).
- **Tri-State Dice Tray Mode for Enemy Turns (`UX.19`, `UX.20`)**:
  - Upgrade the combat header Dice Tray toggle from binary (`ON` / `OFF`) to a persistent tri-state mode (`ALL` -> `PLAYER_ONLY` -> `OFF`, defaulting to `ALL`).
  - When set to `ALL` (and AI speed is not `INSTANT`), pause `executeHostileTurnAsync` on enemy attack abilities to present the Clash Dice Tray before applying battlefield floating text and advancing to the next enemy action.

## Capabilities

### New Capabilities
<!-- None; extends existing capabilities below. -->

### Modified Capabilities
- `visual-dice-tumbler-tray`: Expand `DiceRollBreakdown` with structured damage components and mitigation soak, add the Clash Duel token stage with hit/miss/defeat animations, hide equations during active dice tumbles, simplify the `MISS` stamp, slow stage timings slightly, and replace the binary toggle + hostile non-interference rule with the tri-state (`ALL` / `PLAYER_ONLY` / `OFF`) mode that sequences hostile attack rolls when `ALL` is active.
- `arena-timeline-ux`: Extend `Combat Log Attack and Damage Presentation` so both the Combat Log damage chip and the Visual Dice Tumbler Tray damage equation render the shared interactive `DamageRollTooltip` popover with itemized damage bonus and mitigation attribution.

## Impact

- **Core Combat Engine & Types**: `src/core/combat/types.ts`, `src/core/combat/damageEngine.ts`, `src/core/combat/resolver.ts`, `src/core/combat/combatLogger.ts`.
- **Combat UI & Turn Sequencing**: `src/ui/combat/DiceTumblerTray.tsx`, `src/ui/combat/DiceTumblerTray.css`, `src/ui/combat/DamageRollTooltip.tsx` (new), `src/ui/combat/CombatLogPanel.tsx`, `src/ui/combat/CombatArena.tsx`, `src/ui/combat/useCombatSimulation.ts`, `src/ui/combat/asyncTurnSequencer.ts`.
- **Tests**: `src/ui/combat/DiceTumblerTray.test.tsx`, `src/ui/combat/CombatLogPanel.test.ts`, `src/ui/combat/useCombatSimulation.test.tsx`, `src/ui/combat/asyncTurnSequencer.test.ts`, `src/core/combat/resolution.test.ts`.

