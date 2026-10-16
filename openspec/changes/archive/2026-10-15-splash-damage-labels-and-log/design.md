# Design

## Context

In the current combat engine:
- Secondary damage from AoE blasts ([resolver.ts](file:///c:/Repos/rpg_game/src/core/combat/resolver.ts)), frontal sweeps ([cleaveHandler.ts](file:///c:/Repos/rpg_game/src/core/combat/effects/cleaveHandler.ts)), and magical surges ([wildSurgeHandler.ts](file:///c:/Repos/rpg_game/src/core/combat/effects/wildSurgeHandler.ts)) all emit `reason: 'COLLATERAL'`.
- [useFloatingCombatText.ts](file:///c:/Repos/rpg_game/src/ui/combat/useFloatingCombatText.ts) maps `COLLATERAL` directly to `'COLLISION! '` because unit-to-unit knockback collision originally used that reason.
- `resolver.ts` executes the AoE splash loop against adjacent units but does not append secondary target outcomes to `secondaryDetail` in `combatLog`, making splash damage invisible in the combat log panel.

See [proposal.md](file:///c:/Repos/rpg_game/openspec/changes/splash-damage-labels-and-log/proposal.md) for background and motivation.

## Goals / Non-Goals

**Goals:**
- Decouple floating text presentation labels from the engine damage reason by adding an optional `label?: string` to `DAMAGE` events in `CombatEvent`.
- Provide a declarative `splashLabel?: string` property on `Ability` contracts (configured as `'BLAST'` for `ARCANE_BLAST`, defaulting to `'SPLASH'` for abilities with `aoeRadius > 0`).
- Add `'SPLASH'` to `CombatDamageReason` to semantically separate area-of-effect blast damage from physical collision collateral.
- Ensure all non-collision secondary abilities emit appropriate presentation labels (`CLEAVE!` for Cleave, `SURGE!` for Wild Surge, `COLLISION!` for bystander knockback collisions).
- Record all secondary AoE splash targets, damage dealt, and simulated remaining HP in `secondaryDetail` on the attack's combat log entry.

**Non-Goals:**
- Changing damage calculations, saving throws, or friendly-fire targeting rules.
- Redesigning the combat log panel UI components or CSS layout.
- Modifying non-damaging AoE utility abilities (such as `Flash Powder` or `Challenging Shout`).

## Decisions

### Decision 1: Explicit `label?: string` on `CombatEvent` vs UI String Inference
- **Choice**: Add an optional `label?: string` property directly to `DAMAGE` events in `CombatEvent`.
- **Rationale**: Keeps presentation formatting decoupled from core engine taxonomy. The UI floating text hook simply formats `${event.label}! -X` when present, without having to maintain an ever-growing switch statement of ability IDs or reasons.
- **Alternatives Considered**:
  - Inferring the label in `useFloatingCombatText.ts` from `selectedAbility.id`. Rejected because `dispatchResolutionFeedback` handles events from multiple sources (passives, collisions, secondary effects) where `selectedAbility` does not describe the specific collateral trigger.
  - Adding new enum values to `CombatDamageReason` for every spell effect (e.g. `'CLEAVE'`, `'SURGE'`, `'BLAST'`). Rejected because `reason` should represent the mechanical origin (attack, splash, collision, status tick), not the presentation wording.

### Decision 2: Declarative `splashLabel` on `Ability` with Automatic Fallback
- **Choice**: Declare `splashLabel?: string` on `Ability`. When resolving secondary AoE splash damage in `resolver.ts`, set `label = effectiveAbility.splashLabel ?? 'SPLASH'`.
- **Rationale**: Gives designers full declarative control on abilities like `ARCANE_BLAST` (`splashLabel: 'BLAST'`) while ensuring dynamically modified abilities (e.g., spells gaining AoE via `Spell Sculpt`) gracefully default to `'SPLASH'`.
- **Alternatives Considered**:
  - Hardcoding `'BLAST'` for Wizard spells in `resolver.ts`. Rejected to maintain declarative, data-driven ability packages.

### Decision 3: Appending Splash Hits to `secondaryDetail` in `CombatLogEntry`
- **Choice**: During AoE splash resolution in `resolver.ts`, collect secondary hits into a `splashLogDetails` array and format as `💥 [${splashLabel} hit ${unitName} for ${damage} ${type} damage (HP: ${hp}/${maxHp})]`, merging into `metadata.secondaryDetail`.
- **Rationale**: Reuses the established pattern already supported by [CombatLogPanel.tsx](file:///c:/Repos/rpg_game/src/ui/combat/CombatLogPanel.tsx#L273-L278) (which renders `secondaryDetail` with the ⚡ icon) without needing database, interface, or UI component changes.
- **Alternatives Considered**:
  - Emitting separate full log entries for each secondary splash victim. Rejected because it fragments single-action resolution into multiple disconnected combat log cards, cluttering the turn history.

## Risks / Trade-offs

- **[Risk] Existing unit tests expecting `reason === 'COLLATERAL'` on Arcane Blast**:
  - *Mitigation*: Update `resolution.test.ts` to assert `reason: 'SPLASH'` and `label: 'BLAST'`, verifying that secondary AoE events conform to the updated taxonomy while ensuring bystander knockback collisions still assert `'COLLATERAL'`.
- **[Risk] Multiple secondary victims creating overly verbose log strings**:
  - *Mitigation*: Join multiple splash victims cleanly with commas inside a single `💥 [${splashLabel} hit ${summaryList.join(', ')}]` block.
