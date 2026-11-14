# Design

## Context

See `proposal.md` for motivation and scope. Investigation of the current codebase showed:
- In `src/ui/combat/CombatLogPanel.tsx`, `.log-impact-line` renders `impact-damage` before `log-roll-chip`, and prints inline `formatD20Roll(entry.d20)` and `formatDamageBreakdown(entry.damageBreakdown)` even when `AttackRollTooltip` and `DamageRollTooltip` are attached.
- In `src/core/combat/resolver.ts`, `targetType: 'HEX'` abilities (`Wyrmflame Breath`, `Arcane Blast`) enter an `else` branch when `targetCu` is undefined (empty hex). That branch rolls manually without constructing `modifierBreakdown`, causing `CombatLogPanel.tsx` to skip `AttackRollTooltip` and fall back to `title="Spellcast Roll & Score"` and `(Score N)`. Additionally, the cone condition loop applies `BURN` to hit targets without appending Burn info to `splashLogDetails`.
- Across `src/`, only two runtime log emitters still emit `metadata.type = 'GENERIC'` (aside from `ai_fault`, which `parseCombatLogMessage` maps to `FAULT`): status-damage defeat in `src/core/combat/turnClock.ts` (kept `GENERIC` in the `v0.13.0` pass) and `zone_of_control_halted` in `src/core/combat/resolver.ts` (added in `v0.14.0` bypassing `combatLogger`). Meanwhile, `log-generic-card` in `CombatLogPanel.tsx` omits `factionCardClass`.

## Goals / Non-Goals

**Goals:**
- Keep Combat Log attack cards scannable by showing only final resolved roll/damage chips (`🎲 21 vs DC 11` / `🎲 15`, `💥 9 dmg`) with roll on the left and damage on the right, while preserving full hover tooltip breakdowns.
- Reuse `attackRoll.ts` breakdown construction for ground-targeted `HEX` rolls so no breakdown logic is duplicated.
- Eliminate the last two unstyled `GENERIC` runtime cards (`DEFEATED` and `ZONE_OF_CONTROL`) via `combatLogger` and ensure `GENERIC` fallback cards have faction styling.

**Non-Goals:**
- Persisting combat logs across trials (`I.1`) or refactoring `EffectHandler` to return structured badge metadata (`I.2`).
- Changing core combat resolution math, hit thresholds, or condition mechanics.

## Decisions

### Decision 1: Extract Ground-Targeted Roll Breakdown Helper in `attackRoll.ts`
- **Decision:** Extract/share a small helper in `src/core/combat/attackRoll.ts` (e.g., `buildAttackModifierBreakdown` or `resolveGroundAttackRoll`) that builds `AttackModifierComponent[]` for base attribute, ability roll bonuses/penalties, active `attackRoll` modifiers, elevation modifiers, and aura penalties, and call it from `resolver.ts` when `targetCu` is undefined.
- **Rationale:** Avoids duplicating attribute/modifier/elevation breakdown assembly inside `resolver.ts` and guarantees `AttackRollTooltip` stays consistent between unit-targeted and hex-targeted abilities.
- **Alternatives Considered:** Assembling `modifierBreakdown` inline in `resolver.ts` — rejected because it duplicates logic already maintained in `attackRoll.ts`.

### Decision 2: Concise Attack Chips with Safe Fallback
- **Decision:** In `CombatLogPanel.tsx`, display `🎲 <totalScore> vs DC <defenseTarget>` (when `defenseTarget !== undefined`) or `🎲 <totalScore>` (when `totalScore !== undefined`) for the roll chip, falling back to `formatD20Roll(entry.d20)` only if `totalScore === undefined`; similarly, render `💥 <damageTotal> dmg` (plus `(Total)` if `isAreaTarget`) and only show inline `(formatDamageBreakdown(...))` when `damageBreakdownComponents` is absent/empty.
- **Rationale:** Keeps normal combat cards clean (`UX.21`) without hiding information on edge-case entries like `Wild Surge: Arcane Discharge` or test fixtures that lack component arrays.

### Decision 3: Track Last Lethal Condition in `turnClock.ts` for `DEFEATED` Card
- **Decision:** During the turn-start DoT loop in `src/core/combat/turnClock.ts`, track the condition name(s) that dealt damage (recording the condition that reduced HP to `<= 0`, or joining multiple lethal conditions if more than one ticked). Emit `combatLogger.logDefeat(state, { cu, cause, condition })` with `metadata.type = 'DEFEATED'`.
- **Rationale:** Keeps the Burn/Poison tick card focused on the damage/HP tick while giving unit death its own clear, faction-themed `💀 DEFEATED` card naming the exact condition (e.g., `Defeated by Burn`).

### Decision 4: Dedicated `ZONE_OF_CONTROL` Card with Dual `affectedUnitIds`
- **Decision:** Add `combatLogger.logZoneOfControl(state, { haltedCu, guardianCu, abilityName })` emitting `metadata.type = 'ZONE_OF_CONTROL'`, `faction: haltedCu.unit.faction ?? 'PLAYER'`, and `affectedUnitIds: [haltedCu.unit.id, guardianCu.unit.id]`. Render a dedicated `🛡️ ZONE OF CONTROL` card in `CombatLogPanel.tsx`.
- **Rationale:** Filtering the Combat Log by either the advancing unit or the Shield-bearer (`Phalanx Front`) surfaces the interception card, and the UI renders a consistent faction-themed header and context note.

### Decision 5: Cone Condition Summary in `splashLogDetails`
- **Decision:** In `resolver.ts`, when `isCone` applies `CONDITION` effects (such as `BURN` on `Wyrmflame Breath`) to a hit `splashCu`, append a concise condition note (e.g. `+ Burn (1/turn, 2t)`) to that target's `splashLogDetails` entry.
- **Rationale:** Ensures `Wyrmflame Breath` secondary log lines reflect both the damage dealt and the Burn applied to each affected enemy.

## Risks / Trade-offs

- **Existing unit test assertions on inline chip text** → Tests in `src/ui/combat/CombatLogPanel.test.ts` that assert `🎲 14 + 2 (Score 16)` or inline `(1d6(4) -> 4)` when `damageBreakdownComponents` is present will need to be updated to match the concise `UX.21`/`UX.22`/`UX.23` presentation.
- **Older persisted snapshots or mocks with `GENERIC` entries** → Styling `.log-generic-card` with `factionCardClass` and keeping `parseCombatLogMessage` fallbacks intact preserves backwards compatibility.
