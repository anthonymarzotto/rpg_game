# Design: Clash Dice Tray Expansion, Damage Breakdown Tooltip & Enemy Turn Tray Mode

## Context

See `proposal.md` for motivation and scope. Under the current architecture:
1. `resolveDamage` in `src/core/combat/damageEngine.ts` computes dice rolls, critical maximization, attribute bonuses, flat/shard bonuses, passive flat bonuses (`Deathbound Fury`, `Highway Toll`, `Coiled Apex`), Armor/Ward soak, Graze/Cover multipliers, and the `min 1` floor, formatting them only into a flat string (`damageBreakdown`).
2. `DiceTumblerTray.tsx` renders the Stage 1 score equation even during `STAGE1_TUMBLE` and the Stage 2 damage equation during `STAGE2_TUMBLE`, spoiling final roll numbers before the dice stop tumbling (`UX.11`). It also omits Armor/Ward soak (`B.14`).
3. `executeAbility` in `src/core/combat/resolver.ts` mutates `CombatState` (`cu.currentHp` and `cu.isDefeated`) in-place before returning `AbilityResolution`. When `setActiveDiceRoll` triggers a React re-render of `CombatArena`, `HexGridSvg` reads the already-mutated `CombatState`, causing defeated units to disappear from the battlefield before the dice tray finishes rolling (`UX.20`).
4. `executeHostileTurnAsync` in `src/ui/combat/asyncTurnSequencer.ts` invokes `observer?.onActionResolved` synchronously without awaiting UI clash animations (`UX.19`).

## Goals / Non-Goals

**Goals:**
- Keep the core combat engine (`damageEngine.ts`, `resolver.ts`, `combatLogger.ts`) 100% headless and deterministic while emitting structured `DamageBreakdownComponent[]` metadata.
- Share a single portal-based `<DamageRollTooltip />` component between `DiceTumblerTray` and `CombatLogPanel`, mirroring `<AttackRollTooltip />`.
- Transform the `DiceTumblerTray` header into a Clash Duel stage with directional attacker/target pixel tokens, pre/post-attack HP display, and CSS keyframe animations for attack lunge, miss sidestep, hit shake/flash, and defeat.
- Support a persistent tri-state `DiceTrayMode` (`'ALL' | 'PLAYER_ONLY' | 'OFF'`) that awaits the Clash Dice Tray during hostile AI attack actions when `'ALL'` is active.
- Preserve pre-attack unit visibility on the hex battlefield while `activeDiceRoll` is open so defeated units do not pop out prematurely.

**Non-Goals:**
- Changing underlying combat math, damage formulas, or AI heuristic scoring.
- Replacing auto-close with mandatory click-to-close (`UX.7` remains deferred for playtest evaluation after these pacing and clash stage updates).

## Decisions

### 1. Structured `DamageBreakdownComponent` in `damageEngine.ts`
- **Decision**: Define `DamageBreakdownComponent` in `src/core/combat/types.ts`:
  ```ts
  export type DamageComponentSource =
    | 'DICE'
    | 'CRIT_MAX'
    | 'BONUS_DICE'
    | 'ATTRIBUTE'
    | 'ABILITY_FLAT'
    | 'PASSIVE'
    | 'MITIGATION'
    | 'MULTIPLIER'
    | 'MIN_FLOOR';

  export interface DamageBreakdownComponent {
    readonly label: string;
    readonly value: number;
    readonly displayValue?: string; // e.g. "x0.5" or "Min 1" for non-additive stages
    readonly source: DamageComponentSource;
  }
  ```
- **Why**: Mirrors `AttackModifierComponent`, allowing `resolveDamage` to record every contributing factor (e.g. `Base Dice (1d8): +6`, `Critical Max (1d8): +8`, `Force Bonus: +3`, `Deathbound Fury: +2`, `Target Armor: -2`, `Graze (x0.5)`). Attach `mitigation`, `mitigationType: 'Armor' | 'Ward'`, `critMaxBonus?: number`, and `damageBreakdownComponents: readonly DamageBreakdownComponent[]` onto `DamageResult`, `DiceRollBreakdown`, and `CombatLogMetadata` (`ATTACK` variant).

### 2. Shared `<DamageRollTooltip />` Component & Equation Soak Display
- **Decision**: Create `src/ui/combat/DamageRollTooltip.tsx` using the same portal + hover positioning pattern as `AttackRollTooltip.tsx` (`placement="top"` in `DiceTumblerTray`, `placement="left"` in `CombatLogPanel`).
- **Equation Rendering in `DiceTumblerTray`**:
  - During `STAGE1_TUMBLE`: Render `<span className="pending-text">Rolling Attack Check...</span>` instead of the resolved d20 equation.
  - During `STAGE2_TUMBLE`: Render `<span className="pending-text">Rolling Damage Dice...</span>` instead of the resolved damage equation.
  - During `STAGE2_SETTLE`: Render:
    - Rolled dice sum (plus `+ {critMaxBonus} crit` if `critMaxBonus > 0`)
    - `+ {damageModifier}` (underlined with `.has-tooltip` hosting `<DamageRollTooltip />`)
    - If `mitigation > 0`: `- {mitigation} {mitigationType}`
    - If `isGraze` or cover multiplier applies: indicator pill or suffix
    - `= {totalDamage} DMG`

### 3. Clash Duel Header, Token Micro-Animations & Deferred Board Defeat
- **Decision**: Extend `DiceTumblerTrayProps` with optional combatant visual props (`attackerUnit?: Unit`, `targetUnit?: Unit`, `targetHpBefore?: number`, `targetHpAfter?: number`, `targetMaxHp?: number`).
  - Resolve directional tokens using `resolveTokenAssetPath(attackerUnit, HEX_DIRECTIONS.SOUTHEAST)` (facing right) and `resolveTokenAssetPath(targetUnit, HEX_DIRECTIONS.SOUTHWEST)` (facing left).
  - Apply stage-driven CSS classes to the token wrappers:
    - Attacker token: `.clash-lunge` on `STAGE1_SETTLE`.
    - Target token: `.clash-evade` on `STAGE1_SETTLE` when `isMiss`; `.clash-hit` (or `.clash-crit-hit`) on `STAGE2_SETTLE` when damage lands; `.clash-defeated` on `STAGE2_SETTLE` when `targetHpAfter === 0`.
  - Display the target's HP bar/pill in the tray header: shows `targetHpBefore / targetMaxHp` until `STAGE2_SETTLE`, then transitions to `targetHpAfter / targetMaxHp` (and displays a `💀 DEFEATED` badge when `targetHpAfter === 0`).
  - **Deferring Battlefield Removal**: In `useCombatSimulation.ts`, capture a pre-resolution snapshot of `targetUnitId`'s HP and arena position before `executeAbility` runs (or pass an `activeRollSnapshot` to `HexGridSvg` / state view) so that while `activeDiceRoll` is active, the target unit remains rendered on its hex with `targetHpBefore` until `activeDiceRoll.onComplete()` fires.

### 4. Slightly Slower Stage Timings
- **Decision**: Adjust `DICE_TRAY_TIMINGS` in `DiceTumblerTray.tsx`:
  - `STAGE1_TUMBLE_MS`: `1000` (up from `800`)
  - `STAGE1_SETTLE_MS`: `1800` (up from `1600`)
  - `STAGE1_MISS_MS`: `2200` (up from `2000`)
  - `STAGE2_TUMBLE_MS`: `1000` (up from `800`)
  - `STAGE2_SETTLE_MS`: `2200` (up from `1800`)
- **Why**: Gives the player ~0.2s–0.4s more per beat to watch the dice tumble, see the token lunge/impact, and read the settled equation or defeated state without feeling sluggish, while click/Spacebar still skips immediately.

### 5. Tri-State `DiceTrayMode` & Hostile Turn Sequencer Integration
- **Decision**: Introduce `export type DiceTrayMode = 'ALL' | 'PLAYER_ONLY' | 'OFF';` in `useCombatSimulation.ts` (persisted under `astral_tactics_dice_tray_mode`, migrating legacy boolean `astral_tactics_dice_tray_enabled` if present, defaulting to `'ALL'`). Keep `isDiceTrayEnabled: boolean` (`diceTrayMode !== 'OFF'`) and `setIsDiceTrayEnabled` for backward compatibility alongside `diceTrayMode`, `setDiceTrayMode`, and `cycleDiceTrayMode`.
- In `src/ui/combat/asyncTurnSequencer.ts`, update `CombatExecutionObserver.onActionResolved` signature to return `void | Promise<void>`, and `await observer?.onActionResolved?.(actor, action, result)` inside `executeHostileTurnAsync`.
- In `useCombatSimulation.ts`, when `diceTrayModeRef.current === 'ALL'` and `aiSpeed !== 'INSTANT'` and a hostile action resolves as an `ATTACK` with `diceBreakdown`, `onActionResolved` mounts `activeDiceRoll` and returns a `Promise<void>` that resolves when `onComplete` is called (or when the turn `AbortController` signal aborts).

## Risks / Trade-offs

- **[Risk: Hostile turn aborted mid-roll (e.g. encounter reset or rematch)]** → *Mitigation*: Listen to `controller.signal` (`abort` event) when awaiting the hostile dice tray promise so aborting immediately clears `activeDiceRoll` and resolves the pending promise cleanly.
- **[Risk: Existing unit tests relying on `isDiceTrayEnabled` boolean]** → *Mitigation*: Keep `isDiceTrayEnabled` (`diceTrayMode !== 'OFF'`) and `setIsDiceTrayEnabled` working seamlessly alongside `diceTrayMode` and `cycleDiceTrayMode`.

