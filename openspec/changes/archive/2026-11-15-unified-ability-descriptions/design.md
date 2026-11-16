# Design

## Context

See `proposal.md` for motivation and problem background. Currently:
1. `Ability.description` strings in `src/data/packages/*.ts` embed hardcoded base numbers (`1d4`, `-2 Armor for 2 turns`, `3 hexes`) alongside thematic prose, causing descriptions to contradict effective stats when augmented by Astral Augment Shards or in-combat primers.
2. `getEffectiveAbility` (`src/core/combat/modifiers.ts`) initializes `attributions = []` and `appliedModifierIds = []` on every call, discarding pre-resolved shard attributions when called in a Trial (`B.10`).
3. `ActionBar.tsx`, `UnitStatusCard.tsx`, `HeroProgressionDrawer.tsx`, and `OffNodeChoiceModal.tsx` each render ad-hoc subsets of `Ability` properties, with `ActionBar.tsx` dumping raw internal enum tokens (`SINGLE_TARGET`, `Effect: STAT_MODIFIER (Mag: 2)`).

## Goals / Non-Goals

**Goals:**
- Separate static thematic flavor (`Ability.description`) from dynamically generated mechanical rules across all abilities.
- Preserve modifier attributions across chained `getEffectiveAbility` calls (`resolveUnitLoadout` in Camp -> `getEffectiveAbility` in Trial) and track a 3-tier provenance model (`'NORMAL' | 'SHARD' | 'TRIAL'`) with precedence `Normal -> Shard -> In-Trial`.
- Provide a single pure formatting engine (`src/core/combat/abilityFormatter.ts`) that outputs structured **Stat Strip Pills**, human-readable **Effect Clauses**, and a **Compact Mechanical 1-Liner**.
- Render a consistent **Hybrid Ability Description** component across Camp and Trial surfaces, using the Compact Mechanical 1-Liner + hover Hybrid Tooltip on the Pinned Unit card.

**Non-Goals:**
- Changing combat resolution math, ability balance numbers, or shard mechanics.
- Modifying the Combat Log's post-execution `EffectOutcome` pills (`CombatLogPanel.tsx`), which already use structured post-roll outcomes.

## Decisions

### 1. Chained `getEffectiveAbility` & 3-Tier Provenance Model (`Normal -> Shard -> In-Trial`)

- **Decision**:
  - Add `export type ModifierProvenanceTier = 'NORMAL' | 'SHARD' | 'TRIAL'` to `src/core/types/modifier.ts`.
  - Add optional `tier?: 'SHARD' | 'TRIAL'` to `AbilityModifier` (defaulting to `'SHARD'` when `isPermanent: true` and `'TRIAL'` otherwise) and include `tier: 'SHARD' | 'TRIAL'` on `PropertyAttribution`.
  - Add optional provenance metadata on `AbilityEffect` (`sourceTier?: 'SHARD' | 'TRIAL'`, `sourceName?: string`) so effects appended via `mod.appendEffects` or patched via `mod.effectPatches` carry their provenance tier directly on the resolved `EffectiveAbility.effects` array.
  - In `getEffectiveAbility(baseAbility, modifiers)`:
    - Seed `attributions`, `appliedModifierIds`, and `attackRollBonus` from `baseAbility` if `baseAbility` is already an `EffectiveAbility` (duck-typed via `'attributions' in baseAbility`).
    - When `applicable.length === 0`, return existing `attributions`, `appliedModifierIds`, and `attackRollBonus` intact instead of wiping them to `[]`.
    - Provide a helper `resolvePropertyTier(attributions, ...properties): ModifierProvenanceTier` that returns `'TRIAL'` if any matching attribution has `tier === 'TRIAL'`, else `'SHARD'` if any has `tier === 'SHARD'`, else `'NORMAL'`.
- **Rationale**:
  - `resolveUnitLoadout` resolves socketed shards once when creating `combatAbilities`. In a Trial, `ActionBar`, `UnitStatusCard`, and `resolver.ts` call `getEffectiveAbility(ability, cu.abilityModifiers)` to layer ephemeral combat primers (*Blood Frenzy*, *Spell Sculpt*) on top. Preserving existing attributions on `baseAbility` fixes `B.10` immediately and naturally supports the `Normal -> Shard -> In-Trial` precedence when both a shard and an in-trial primer modify the same stat (e.g. *Starlight Lens* + *Blood Frenzy* both patching `damageProfile`).
- **Alternatives Considered**:
  - Re-resolving shard IDs from `unit.loadout.slotAugments` inside `ActionBar.tsx`: Rejected because `cu.abilities` is already hydrated by `resolveUnitLoadout` and loses slot index mapping when filtered into core/wildcard subsets.

### 2. Deterministic Hybrid Formatter (`src/core/combat/abilityFormatter.ts`)

- **Decision**:
  Create a pure, UI-framework-agnostic formatter `formatAbilityDescription(ability: Ability | EffectiveAbility)` returning a structured `FormattedAbilityDescription`:
  ```ts
  export interface FormattedAbilityPill {
    readonly id: 'reach' | 'area' | 'contest' | 'damage' | 'splashDamage' | 'cost';
    readonly label: string;
    readonly tier: ModifierProvenanceTier;
  }

  export interface FormattedEffectClause {
    readonly triggerLabel?: string; // e.g. 'On Hit', 'On Crit', 'Flank/Rear', 'Vs Challenged', 'Passive'
    readonly text: string;          // e.g. 'Pushes target 1 hex', 'Inflicts Burn (2 dmg/turn, 2t)'
    readonly tier: ModifierProvenanceTier;
    readonly sourceName?: string;
  }

  export interface FormattedAbilityDescription {
    readonly flavorText: string;
    readonly statPills: readonly FormattedAbilityPill[];
    readonly effectClauses: readonly FormattedEffectClause[];
    readonly compactSummary: string;
    readonly compactSegments: readonly { readonly text: string; readonly tier: ModifierProvenanceTier }[];
    readonly highestTier: ModifierProvenanceTier;
  }
  ```
  - **Stat Strip Pills**:
    - **Reach / Area**:
      - `targetType === 'SELF'` and `(aoeRadius ?? 0) === 0` -> `Self`
      - `targetType === 'SELF'` and `aoeRadius > 0` -> `Self • Aura ${aoeRadius}`
      - `coneTemplate` -> `Cone ${range}`
      - `range === 1` -> `Melee 1` (or `Melee ${range}` if range was boosted by a shard/primer, with tier highlight!)
      - `range > 1` -> `Range ${range}` (plus `• Blast ${aoeRadius}` if `aoeRadius > 0`, or separate `Blast ${aoeRadius}` pill when `aoeRadius` is modified)
      - `targetType === 'ALLY'` -> `Ally (Range ${range})`
    - **Contest** (when `defenseTarget !== 'NONE'`):
      - Formats as `+${ATTR} vs ${DEF}` (e.g., `+FIN vs EVA`, `+FOC vs RES`), incorporating `attackRollBonus` from `EffectiveAbility` or unconditional effect `attackRollBonus` (e.g., `+FIN + 2 vs EVA`), colored by the highest tier of `attackModifierAttribute`, `defenseTarget`, or `attackRoll`.
    - **Primary Damage** (primary `DAMAGE` effect without tactical `condition`):
      - Formats as `${count}d${sides} + ${ATTR}${flat} ${DamageType}` (e.g. `1d6 + FRC Physical`, `2d4 + FOC + 2 Magical`), colored by the highest tier of `damageProfile` or `damageType`.
    - **Splash Damage** (when `aoeRadius > 0` and damaging, or `splashDamageProfile` present):
      - Formats as `${splashCount}d${splashSides} ${splashLabel ?? 'Splash'}`.
  - **Effect Clauses**:
    - Exhaustive switch over all 24 `AbilityEffectType` values:
      - Secondary/conditional `DAMAGE` (`FLANK_OR_REAR`, `TARGET_CHALLENGED`): e.g. `Flank/Rear: +1d6 + FRC bonus damage` or `Vs Challenged: +2 Attack Roll and +1d4 bonus damage`.
      - `KNOCKBACK`: `On Hit: Pushes target ${mag} hex${mag > 1 ? 'es' : ''}`.
      - `RETREAT_STEP`: `Steps back ${mag} hex freely`.
      - `PENETRATE_STEP`: `On Hit: Advances through target to rear hex if open`.
      - `RUSH_CHARGE`: `Rushes in a straight line (2–${range} hexes) into melee contact`.
      - `AERIAL_VAULT`: `Leaps over obstacles and units (2–${range} hexes) to land adjacent`.
      - `TELEPORT`: `Teleports to an unoccupied hex within ${range} hexes${sameElevationOnly ? ' at same elevation' : ''}`.
      - `POSITION_SWAP`: `Swaps positions with target${targetType === 'ALLY' ? ' ally' : ''}`.
      - `CLEAVE`: `On Hit: Sweeps ${mag} adjacent frontal ${mag === 1 ? 'foe' : 'foes'} for primary damage`.
      - `LINE_PIERCE`: `On Hit: Impales aligned unit directly behind target for 1d4 + FRC physical damage`.
      - `CONDITION`: Formats `POISON` (`${mag} dmg/turn, ${dur}t`), `BURN` (`${mag} dmg/turn, ${dur}t`), `CHALLENGED` (`${dur}t`), `STEALTH` (`${dur}t`), `EXPOSED` (`${dur}t`) with target scope (`self` vs `target`).
      - `ARMOR_BUFF` / `WARD_BUFF` / `SLOW` / `STAT_MODIFIER`: Formats exact stat deltas (`+2 Armor`, `-2 Evasion, -2 Armor`, `Displacement Immunity`) with target scope (`to self`, `to allies`, `on target`) and duration (`for ${dur} turn(s)`). Avoids redundant "Locks Move to 0" if `BASTION_STANCE` already covers it.
      - `BASTION_STANCE`: `Plants Phalanx Front (locks Move to 0, halts frontal enemy movement, 50% rear ranged cover for ${dur}t)`.
      - `CRIT_BOOST`: `Critical hits on natural 19–20`.
      - `CTB_DELAY` / `INITIATIVE_BOOST`: `Delays target CTB by ${mag}` / `Boosts ${scope} CTB by +${mag}`.
      - `FORCE_FACING` / `FORCE_FACING_AWAY`: `Forces target to face actor` / `Forces target to face 180° away`.
      - `SPELL_SCULPT`: `Primes next Focus spell this turn: +${mag} Range and +1 Blast radius`.
      - `BLOOD_FRENZY`: `Primes next physical attack this turn: +1 Die Step and +2 Attack Roll`.
      - `WILD_SURGE`: `Triggers spontaneous Wild Surge (1d3: +1 AP, +25 CTB, or 2 magic dmg)`.
  - **Compact Mechanical 1-Liner**:
    - Joins the primary pills and concise effect tags with ` • ` (e.g., `Melee 1 • 1d4+FRC Physical vs EVA • Push 1 hex`), preserving per-segment `tier` metadata so modified segments in the 1-liner render in Shard or In-Trial color.

### 3. Pure Flavor Authoring & Catalog Guardrail

- **Decision**:
  - Update all authored abilities in `src/data/packages/*.ts` so `description` is a clean 1-sentence thematic flavor description without hardcoded dice formulas (`1d4`, `2d6`), numeric stat deltas (`+2 Armor`, `-2 Resolve`), or turn durations (`2 turns`).
  - Add a catalog invariant test verifying that every registered ability in `ABILITIES_BY_ID` produces non-empty `statPills`, valid `effectClauses` with no `undefined` or raw enum fallback, and that `Ability.description` does not contain hardcoded dice notation (`/\\b\\d+d\\d+\\b/i`).
- **Rationale**:
  - Prevents future ability authors from regressing to hardcoded dice formulas in flavor prose and guarantees every new `AbilityEffectType` has a human-readable formatter.

### 4. Shared UI Components & Visual Styling

- **Decision**:
  - Create `src/ui/common/AbilityDescriptionBlock.tsx` (and `.css`) providing:
    - `<AbilityHybridBody ability={effectiveAbility} showFlavor={true} />`: Renders the flavor line, the `.ability-stat-strip` row of pills, and the `.ability-effect-clauses` list.
    - `<AbilityCompactSummary ability={effectiveAbility} />`: Renders the colored 1-liner segments for compact rows.
    - `<AbilityHoverTooltip ability={effectiveAbility} isWildcard={...} currentHp={...} />`: Full tooltip card (Title + Discipline tag + `<AbilityHybridBody />` + Active Augments footer split or badged by Shard vs In-Trial).
  - **Provenance Tier Styling**:
    - `NORMAL`: Standard ivory/slate pill and text colors.
    - `SHARD`: Astral cyan/violet highlight (`#38bdf8` text / border glow) indicating permanent Camp shard augmentation.
    - `TRIAL`: Empowered emerald/amber highlight (`#4ade80` text / border glow) indicating active in-trial primer/buff modification (taking precedence over `SHARD`).

## Risks / Trade-offs

- **[Risk] Existing unit/UI tests assert on old hardcoded `Ability.description` substrings (e.g., `"1d4"`, `"pushes the target back 1 hex"`)** -> **Mitigation**: Update tests in `src/data/packages/*.test.ts` and `src/ui/**` to assert against the rendered Hybrid component or `formatAbilityDescription(ability)` output, which still contains those exact mechanical phrases in the generated pills/clauses!
- **[Risk] Pinned Unit card hover tooltip clipping inside `.combat-status-overlay`** -> **Mitigation**: Position the Pinned Unit ability hover tooltip to pop out cleanly (e.g., to the left of the right-hand status card or via portal/floating positioning) so it never clips off the right edge of the viewport.
