# Design

## Context

See [proposal.md](proposal.md) for motivation. Today, `EffectExecutionResult` returns `logDetail?: string`, `CombatLogMetadata` stores `secondaryDetail?: string` and `effectDetail?: string`, and `CombatLogPanel.tsx` renders those strings either verbatim or via regex (`formatPassiveDetail`). Meanwhile, `AttackRollTooltip` and `DamageRollTooltip` already establish the codebase pattern of storing semantic breakdown objects in `CombatLogMetadata` and rendering scroll-safe `createPortal` hover tooltips in `src/ui/combat/`.

## Goals / Non-Goals

**Goals:**
- Define a single semantic `EffectOutcome` discriminated union shared by `EffectExecutionResult`, `resolver.ts`, `combatLogger.ts`, and `CombatLogPanel.tsx`.
- Remove `logDetail`, `secondaryDetail`, `effectDetail`, and `formatPassiveDetail` cleanly across core combat and UI code (no backwards-compatibility shims).
- Derive plain-text `CombatLogEntry.message` summaries from `EffectOutcome[]` in one shared formatter so `reportGenerator.ts` exports remain human-readable.
- Render compact, tone-styled pills in the Combat Log with an `EffectBadgeTooltip` portal component for multi-detail hover breakdowns.

**Non-Goals:**
- Static ability description generation in the Unit Info Combat Manifest (Playtest Scratchpad #1.2 / #1.3) — `EffectOutcome` models resolved combat execution outcomes, not pre-cast ability card descriptions.
- Changing combat math, damage formulas, or battlefield floating combat text (`CombatEvent.label` shouts).

## Decisions

### 1. Semantic `EffectOutcome` Discriminated Union (`src/core/combat/types.ts`)
Rather than emitting pre-formatted UI chip objects (`{ icon, label, tone }`) from `EffectHandler`s, handlers emit domain-level `EffectOutcome` records:

```ts
export type EffectOutcome =
  | {
      readonly kind: 'CONDITION';
      readonly condition: ConditionType;
      readonly durationTurns: number;
      readonly damagePerTurn?: number;
      readonly sourceName?: string;
      readonly targetName?: string;
    }
  | {
      readonly kind: 'FORCED_FACING';
      readonly direction: 'TOWARDS' | 'AWAY';
      readonly originName: string;
    }
  | {
      readonly kind: 'DISPLACEMENT';
      readonly displacement: 'KNOCKBACK' | 'RETREAT' | 'CHARGE' | 'SWAP' | 'TELEPORT';
      readonly toCoord?: { readonly q: number; readonly r: number };
      readonly targetName?: string;
      readonly resisted?: boolean;
      readonly label?: string;
    }
  | {
      readonly kind: 'COLLISION';
      readonly collisionType: 'WALL' | 'CLIFF' | 'BOUNDARY' | 'UNIT';
      readonly damage: number;
      readonly negated?: boolean;
      readonly bystanderName?: string;
      readonly collateralDamage?: number;
      readonly bystanderHp?: number;
      readonly bystanderMaxHp?: number;
    }
  | {
      readonly kind: 'FALL';
      readonly damage: number;
      readonly negated?: boolean;
    }
  | {
      readonly kind: 'MODIFIER';
      readonly label: string;
      readonly entries: readonly { readonly stat: string; readonly value: number | string }[];
      readonly durationTurns?: number;
      readonly note?: string;
    }
  | {
      readonly kind: 'INITIATIVE';
      readonly direction: 'BOOST' | 'DELAY';
      readonly amount: number;
    }
  | {
      readonly kind: 'COLLATERAL_HIT';
      readonly sourceLabel: string;
      readonly targetName: string;
      readonly damage: number;
      readonly damageType?: 'PHYSICAL' | 'MAGICAL';
      readonly hitOutcome?: HitOutcome;
      readonly defenseTarget?: number;
      readonly targetHp?: number;
      readonly targetMaxHp?: number;
      readonly conditions?: readonly {
        readonly condition: ConditionType;
        readonly durationTurns: number;
        readonly damagePerTurn?: number;
      }[];
    }
  | {
      readonly kind: 'CONTEXT';
      readonly context: 'ELEVATION' | 'AURA_PENALTY' | 'GRAZE_NEGATED';
      readonly label: string;
      readonly detail?: string;
    };
```

*Rationale:* Mirrors `AttackModifierComponent` and `DamageBreakdownComponent` in `src/core/combat/types.ts`, keeping presentation (icons, pill labels, colors, tooltip layout) out of `src/core/combat/effects/` while letting `CombatLogPanel` merge splash damage + splash conditions onto a single pill.
*Alternative considered:* Generic presentation chip objects returned directly from handlers. Rejected because it mixes UI formatting into core combat handlers and prevents structured hover breakdown formatting.

### 2. Effect Execution & Handler Contract (`src/core/combat/effects/`)
- Update `EffectExecutionResult` to `{ events, effects?: readonly EffectOutcome[], knockbackResult?, wallSlamDamage?, fallDamage? }`, removing `logDetail`.
- Update `executeAbilityEffects` in `registry.ts` to aggregate `res.effects` into `effects: EffectOutcome[]`, deduplicate `GRAZE_NEGATED` context outcomes per ability execution (emitting one `CONTEXT` badge if one or more secondary effects are negated by Graze), and return `effects` when non-empty.
- Update all 14 handlers to populate `effects`:
  - `conditionHandler`: emits `CONDITION` and/or `FORCED_FACING`.
  - `knockbackHandler`: emits `DISPLACEMENT` (with `resisted: true` if immune), plus `COLLISION` and/or `FALL` when applicable.
  - `retreatHandler`: emits `DISPLACEMENT` (`RETREAT`), plus `FALL` when plunging (`dh <= -2`).
  - `penetrateHandler` (`Ride-Through`), `positionSwapHandler` (`SWAP`), `teleportHandler` (`TELEPORT` or immune).
  - `modifierHandler`, `spellSculptHandler`, `bloodFrenzyHandler`: emit `MODIFIER` with structured stat/effect entries and duration.
  - `ctbDelayHandler`, `initiativeBoostHandler`: emit `INITIATIVE` (`DELAY` / `BOOST`).
  - `cleaveHandler`, `linePierceHandler`: emit per-target `COLLATERAL_HIT` outcomes.
  - `damageHandler`: returns `{ events }` (damage breakdowns are already modeled separately by `damageBreakdownComponents`).
- `wildSurgeHandler`: update its direct `BUFF` / `ATTACK` log entries to attach `effects` (`MODIFIER` for `+1 AP`, `INITIATIVE` for `+25 CTB`) and clean `ATTACK` metadata rather than relying on `effectDetail`.

### 3. Unified `resolver.ts` & `combatLogger.ts` Pipeline
- `CombatLogMetadata` replaces `secondaryDetail` / `effectDetail` on `ATTACK`, `UTILITY`, `BUFF`, and `PASSIVE` with `effects?: readonly EffectOutcome[]`. `ENVIRONMENT` replaces `effectDetail` with `detail?: string`.
- `combatLogger.ts` includes a pure `formatEffectOutcomes(effects)` helper that renders concise text clauses for auto-generated `CombatLogEntry.message` strings (preserving readable logs for `reportGenerator.ts` Markdown exports and debug inspection).
- `resolver.ts`:
  - Collects `CONTEXT` outcomes for non-empty `elevMod.description` and `auraEval.attackRollPenalty > 0`.
  - Collects one `COLLATERAL_HIT` outcome per target struck or missed in AoE/cone splash loops (embedding any cone-applied `BURN`/`POISON` conditions on that target).
  - Merges `[...contextOutcomes, ...(effectResult.effects ?? []), ...splashOutcomes]` into `combatLogger.logAttack` / `logUtility` / `logBuff`.
  - `triggerPassiveHook` and Feline Grace fall-immunity pass `effects` (`FALL` with `negated: true` or handler `effects`) into `combatLogger.logPassive`.

### 4. Compact Pills & Portal Hover Tooltips (`src/ui/combat/`)
- Add `src/ui/combat/EffectBadgeTooltip.tsx` following the exact `createPortal` + `parentElement` bounding-rect positioning pattern (`placement="left"` default, viewport clamping, scroll/resize dismissal) established in `AttackRollTooltip.tsx` and `DamageRollTooltip.tsx`.
- Map each `EffectOutcome` in `CombatLogPanel.tsx` via a pure `presentEffectOutcome(outcome)` view-model helper producing `{ icon, pillText, tone, tooltipTitle, tooltipRows }`:
  - Examples of compact pill text: `🔥 Burn 2t`, `🧪 Poison 3t`, `⚔️ Challenged 2t`, `👤 Stealth 2t`, `🎯 Exposed 1t`, `💨 Knockback (2, 0)`, `🛡️ Resisted Knockback`, `💥 Wall Slam -2`, `💥 Fall -8`, `🐾 Fall Negated`, `🛡️ +2 Armor 2t`, `⏳ -20 CTB`, `⏩ +15 CTB`, `🪓 Cleave: Goblin -4`, `💥 Blast: Bandit -4`, `⛰️ High Ground +2`, `🛡️ Graze: 2nd Negated`.
  - Only pills with richer breakdown data (DoT rate/duration, bystander HP, splash DC/outcome/conditions, multi-stat breakdown, etc.) mount `EffectBadgeTooltip`; self-explanatory pills show just the crisp pill (or simple title if single-line).
- Remove `formatPassiveDetail` and render `.log-effect-pills` consistently across `ATTACK`, `UTILITY`, `BUFF`, and `PASSIVE` cards.

## Risks / Trade-offs

- **Existing unit test assertions on legacy string fields** -> Several tests in `src/core/combat/` and `src/ui/combat/CombatLogPanel.test.ts` assert directly on `logDetail`, `secondaryDetail`, `effectDetail`, or `formatPassiveDetail`. Because we are making a clean break without legacy shims, all affected tests will be updated during implementation to assert on `effects` outcomes, `message` summaries, and rendered pill/tooltip HTML.
- **Pill wrapping on multi-effect AoE attacks** -> Attacks hitting multiple splash targets plus elevation/conditions could emit 4–6 pills. Using a flex-wrap `.log-effect-pills` container with compact pill padding keeps cards scannable without horizontal overflow.
