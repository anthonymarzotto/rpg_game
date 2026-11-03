# Design: Combat Blocker Bug Fixes (B.11, B.12, B.13)

## Context

See [proposal.md](proposal.md) for background and motivation.

The three blocker bugs touch distinct segments of the combat pipeline:
1. `src/core/combat/effects/retreatHandler.ts`: Executes backward displacement for `RETREAT_STEP` (Skirmish) but currently lacks tile elevation delta checks, resulting in missing fall damage when stepping off ledges.
2. `src/core/combat/validator.ts`: Validates `SINGLE_TARGET` abilities with an exemption (`&& effectiveAbility.damageType !== 'NONE'`) that inadvertently allows non-damaging hostile abilities (such as Challenging Shout) to target friendly units of the same faction.
3. `src/core/combat/attackRoll.ts` & `resolver.ts`: Accurately incorporates elevation modifiers (e.g. Low Ground $-2$) into the `netModifier`, but collapses all components into a single scalar number. Because the combat card chip and visual dice tray render only `d20 + netModifier = totalScore` without itemized component attribution, it appears as though elevation modifiers are ignored.

Additionally, enforcing cliff height barriers on retreat steps necessitates extending the Cat Burglar's innate agility so that units with `Feline Grace` can acrobatically vault up cliffs and over obstacles during retreat steps, matching their knockback rebound behavior.

## Goals / Non-Goals

**Goals:**
- Enforce fall damage rules for `RETREAT_STEP` when plunging down ledges ($\Delta h \le -2$), matching knockback and normal movement mechanics.
- Support acrobatic vaulting during retreat steps for units with `canVaultOnRetreat: true` (e.g. Cat Burglar with `Feline Grace`), permitting vaulting onto cliffs exceeding climb limits and leaping over 1-hex obstacles.
- Reject friendly same-faction targets for all `SINGLE_TARGET` abilities in `canExecuteAbility`.
- Model an itemized `AttackModifierComponent[]` breakdown in `AttackRollContext`, `DiceRollBreakdown`, and `CombatLogMetadata`.
- Implement a rich, in-engine glassmorphic hover tooltip on the attack roll chip in `CombatLogPanel` and the modifier in `DiceTumblerTray` to provide transparent calculation feedback.

**Non-Goals:**
- Overhauling the entire damage formula or armor mitigation display (addressed separately in B.14).
- Altering the concise baseline display format in the card header and dice tray (the net equation remains clean and uncluttered).

## Decisions

### 1. Fall Damage in `retreatHandler` Matches `knockbackHandler`
- **Choice**: In `retreatHandler.ts`, inspect `destTile.elevation - actorTile.elevation`. If $\Delta h > \text{maxClimbElevation}$, abort the retreat step (unless the actor has `canVaultOnRetreat`). If $\Delta h \le -2$, compute raw fall damage via `calculateRawFallDamage(dh)`, resolve actual damage via `resolveFallDamage(actorCu, rawFallDamage)`, dispatch an atomic `DAMAGE` event (`reason: 'FALL'`), and populate `fallDamage` on `EffectExecutionResult`.
- **Rationale**: Keeps displacement effect handlers atomic and consistent with `knockbackHandler.ts` and `executeMove`.
- **Alternatives Considered**: Refactoring all displacement into a monolithic physics runner. Rejected as overengineering for targeted bug fixes.

### 2. Retreat Step Vaulting via `canVaultOnRetreat`
- **Choice**: Add `readonly canVaultOnRetreat?: boolean` to `PassiveTrait` in `src/core/types/passive.ts` and enable it on `FELINE_GRACE` in `src/data/packages/catBurglar.ts`. In `retreatHandler.ts`:
  - When the immediate retreat tile is an unwalkable obstacle: if `canVaultOnRetreat` is present, evaluate the far-side hex `hexAdd(retreatDest, retreatDir)`. If that hex is walkable and unoccupied, set `retreatDest` to the far-side hex and proceed with displacement.
  - When the retreat tile is a cliff exceeding climb limits ($\Delta h > \text{maxClimbElevation}$): if `canVaultOnRetreat` is present and the destination tile is walkable and unoccupied, allow displacement up onto the cliff top without aborting.
- **Rationale**: Mirrors the existing `canVaultOnKnockback` implementation in `Arena.calculateKnockback`, preserving the Cat Burglar's distinct identity as a vertical terrain specialist.
- **Alternatives Considered**: Re-using `canVaultOnKnockback` for retreat. Kept separate to allow fine-grained passive traits while enabling both on `Feline Grace`.

### 3. Strict Opposing Faction Requirement for `SINGLE_TARGET`
- **Choice**: In `validator.ts`, remove `&& effectiveAbility.damageType !== 'NONE'`. Any ability with `targetType: 'SINGLE_TARGET'` must satisfy `cu.faction !== targetCu.faction`.
- **Rationale**: In Astral Tactics, single-target actions directed at friendly units are explicitly categorized as `targetType: 'ALLY'` (e.g. `Mend`, `Healing Brew`). Hostile utilities and taunts should never target allies.
- **Alternatives Considered**: Introducing a new `targetAlignment: 'HOSTILE' | 'FRIENDLY'` property. Unnecessary duplication since `targetType: 'ALLY'` vs `'SINGLE_TARGET'` already establishes this boundary.

### 4. Structured Component Breakdown for Attack Rolls
- **Choice**: Define `AttackModifierComponent` on `AttackRollContext`:
  ```typescript
  export interface AttackModifierComponent {
    readonly label: string;
    readonly value: number;
    readonly source: 'ATTRIBUTE' | 'ELEVATION' | 'AURA' | 'CONDITION' | 'MODIFIER';
  }
  ```
  Pass this breakdown array into `DiceRollBreakdown` and `metadata.attackRollBreakdown` in `resolver.ts`.
- **Rationale**: Allows UI presentation components to construct itemized tooltips deterministically without fragile regex parsing of log strings.
- **Alternatives Considered**: Parsing strings in the UI. Rejected as error-prone and brittle.

### 5. In-Engine Glassmorphic Hover Tooltip on Roll Chips
- **Choice**: Implement a custom hover tooltip element (`.attack-roll-tooltip`) rendered inside `.log-roll-chip` and the dice tumbler tray, styled with existing dark glassmorphism tokens from `CombatArena.css` (`rgba(15, 23, 42, 0.96)`, blur, subtle border).
- **Rationale**: Satisfies the user requirement for a formatted in-engine tooltip without native browser tooltip delay or OS styling conflicts.
- **Alternatives Considered**: Native HTML `title` attributes. Explicitly rejected per user request and existing UI guidelines avoiding native tooltips.

## Risks / Trade-offs

- **[Risk: Existing retreat tests break]** → Update test suites in `displacement.test.ts` to assert that retreating off flat ground has no fall damage while retreating off height 2 drops produces fall damage events.
- **[Risk: Tooltip z-index and clipping inside combat log list]** → Use `position: absolute` with `.log-roll-chip` as relative anchor, ensuring `z-index: 100` and `pointer-events: none` so scrolling is unimpeded.
