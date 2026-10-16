# Design

## Context

See `proposal.md` for motivation. Currently, `src/ui/combat/useFloatingCombatText.ts` branches on `resolution.type === 'ATTACK'` to process `DAMAGE` and `DISPLACEMENT` events, ignoring all damage and movement events for non-attack resolutions. Furthermore, `src/core/combat/resolver.ts` tags all non-damaging abilities (`damageType === 'NONE'`) as `metadata: { type: 'BUFF', ... }`, causing `src/ui/combat/CombatLogPanel.tsx` to render hostile displacement, crowd-control, and debuffs as defensive buff cards with shield icons (`🛡️`) and sparkles (`✨`), omitting damage totals and HP tracking when collision damage occurs.

## Goals / Non-Goals

**Goals:**
- Unify floating combat text event processing across `ATTACK`, `BUFF`, and `SUPPORT` resolutions so that kinetic displacement (`KNOCKBACK!`, `TELEPORT!`) and collision/fall damage (`SLAM! -X`, `COLLISION! -X`, `FALL! -X`) float reliably.
- Add an explicit `UTILITY` entry to `CombatLogMetadata` in `src/core/combat/types.ts`.
- In `resolver.ts`, route non-damaging abilities that target hostile units or inflict kinetic/hostile effects to `UTILITY` log entries, computing collision damage totals and target vitals.
- Render `UTILITY` entries in `CombatLogPanel.tsx` with dedicated utility glyphs (`💨` for wind/Gust, `🌀` for general utility), damage impact lines when collisions occur, and secondary collision details.

**Non-Goals:**
- Reworking how attack rolls or hit outcomes work for standard attacks.
- Changing `Gust` damage profile into a damaging spell (it remains `damageType: 'NONE'` with kinetic effects).
- Adding full customizable animation trajectories for displacement (existing hex movement mechanics are preserved).

## Decisions

### 1. Unify Event Processing in `useFloatingCombatText.ts`
* **Decision**: Instead of branching on `resolution.type`, extract all events:
  ```ts
  const events: readonly CombatEvent[] =
    resolution.type === 'ATTACK'
      ? resolution.details.events
      : (resolution.events ?? []);
  ```
  Iterate through `events` uniformly:
  - `DAMAGE`: Call `resolveDamageFloatingText(event, hitOutcome)`. Reason `'COLLISION'` formats `SLAM! -X`, reason `'COLLATERAL'` formats `COLLISION! -X`, reason `'FALL'` formats `FALL! -X`.
  - `DISPLACEMENT`: If `kind === 'KNOCKBACK'`, dispatch `KNOCKBACK!` at `event.toCoord`. If `kind === 'TELEPORT'`, dispatch `TELEPORT!` at `event.toCoord`.
  - `STATUS_APPLIED` / `CONDITION_APPLIED`: Render stat delta or condition name.
* **Alternative Considered**: Duplicating event loops inside `else if (resolution.type === 'BUFF')` and adding a new `else if (resolution.type === 'SUPPORT')`. Rejected as redundant and error-prone.

### 2. Introduce `UTILITY` Tag in `CombatLogMetadata`
* **Decision**: Extend `CombatLogMetadata` union in `src/core/combat/types.ts`:
  ```ts
  | {
      readonly type: 'UTILITY';
      readonly actor: string;
      readonly ability: string;
      readonly target?: string;
      readonly effectDetail?: string;
      readonly damageTotal?: string;
      readonly targetHp?: number;
      readonly targetMaxHp?: number;
      readonly secondaryDetail?: string;
    }
  ```
* **Rationale**: Maintains semantic purity. Friendly buffs (`Minor Ward`, `Brace`) remain `BUFF`, while hostile crowd-control, debuffs, and pushes (`Gust`, `Challenging Shout`, `Flash Powder`) are categorized as `UTILITY`.
* **Alternative Considered**: Reusing `BUFF` with extra optional fields. Rejected because rendering hostile taunts and knockback collisions with `🛡️` and sparkles is confusing for players.

### 3. Compute Collision Damage in Resolver for Utility Actions
* **Decision**: In `src/core/combat/resolver.ts`, when `damageType === 'NONE'`:
  - Determine if targeting is hostile (`!isFriendlyTargeting`).
  - If hostile, create `metadata` with `type: 'UTILITY'`.
  - If `effectResult.events` contains `DAMAGE` events (e.g. from knockback collisions or fall damage):
    - Sum the damage amounts into `damageTotal`.
    - Record primary target's remaining HP and max HP.
    - Extract collision summary into `secondaryDetail`.
* **Alternative Considered**: Changing `Gust` to resolve as `ATTACK`. Rejected because Gust does not make an attack roll against Evasion or Resolve; it is a pure kinetic displacement effect.

### 4. Utility Card Rendering in `CombatLogPanel.tsx`
* **Decision**:
  - In `parseCombatLogMessage`, parse `meta.type === 'UTILITY'`.
  - In `CombatLogPanel`, render `log-card log-utility-card`:
    - Header: Pill `T{turn}`, actor name, and icon + ability (e.g. `💨 Gust` or `🌀 {ability}`).
    - Target: `→ {target}`.
    - If `damageTotal`: Impact row `💥 {damageTotal} dmg` and target HP chip `❤️ {targetHp}/{targetMaxHp}`.
    - If `secondaryDetail`: Pill `⚡ {secondaryDetail}`.
    - If `effectDetail` without damage: `✨ {effectDetail}`.
* **Styling**: Add `.log-utility-card` in `CombatArena.css` with a teal/slate border and theme accents.

## Risks / Trade-offs

- **[Risk] Existing tests expecting `metadata.type === 'BUFF'` on hostile abilities**:
  - *Mitigation*: Existing tests for `GUST` or `CHALLENGING_SHOUT` that assert on combat log metadata will be updated to check `type: 'UTILITY'`.
- **[Risk] Multiple targets in AoE utility actions**:
  - *Mitigation*: If AoE utility affects multiple units (e.g. `Flash Powder`), list joined target names in `target`, and aggregate secondary details appropriately.
