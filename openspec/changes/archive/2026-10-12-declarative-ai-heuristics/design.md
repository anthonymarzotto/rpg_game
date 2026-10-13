# Design

## Context

See `proposal.md` for motivation.

In the current architecture, `CombatUnit` carries hydrated `abilities: readonly Ability[]`. In combat, units can have signature abilities, domain abilities, wildcard abilities borrowed across classes, and passive traits.

During an AI turn, `decideNextAction` iterates over all candidate abilities and scores them using heuristic evaluators in `heuristics.ts` (`scoreBuffAbility`, `scoreDebuffAndUtility`, etc.). Because `decideNextAction` uses greedy single-action evaluation, abilities that act as setup primers (`Flash Powder`, `Spell Sculpt`, `Blood Frenzy`, `Stand and Deliver!`) were given hardcoded checks inside `heuristics.ts` to grant bonus utility if follow-up actions were viable.

This design introduces declarative AI hints on the `Ability` model and generalizes primer and debuff evaluation in `heuristics.ts`, removing all hardcoded ability IDs and class dependencies from the core AI engine.

## Goals / Non-Goals

**Goals:**
- Add an optional, declarative `AbilityAIHint` interface to `Ability` in `src/core/types/ability.ts`.
- Implement a generic primer evaluator `scorePrimerAbility` in `heuristics.ts` that dynamically checks follow-up AP affordability and in-range target viability.
- Replace ad-hoc debuff and buff anti-spam checks with universal redundancy guards based on target `activeModifiers`.
- Remove all hardcoded string checks (`ability.id === 'flash_powder'`, `ability.id === 'pact_blade'`) and specific effect primer checks (`BLOOD_FRENZY`, `SPELL_SCULPT`) from `heuristics.ts`.
- Annotate primer abilities in existing class packages (`catBurglar.ts`, `berserker.ts`, `wizard.ts`, `highwayman.ts`) with `aiHint`.
- Maintain 100% test pass rate across existing test suites, including `decisionEngine.test.ts`.

**Non-Goals:**
- Full multi-turn lookahead or tree search (MCTS/Minimax); evaluation remains single-action greedy with declarative primer lookahead.
- Moving ability data to an external database or CMS.
- Refactoring core grid pathfinding or spatial movement evaluation.

## Decisions

### 1. Colocating AI Hints on `Ability` vs. Class Packages vs. Global Registry

- **Decision**: Define `aiHint?: AbilityAIHint` directly on the `Ability` interface.
- **Rationale**: Abilities are the atomic unit of combat execution. Units can borrow domain abilities across classes via wildcard slots (e.g. a Cavalier or Infiltrator equipping `flash_powder`). Furthermore, NPCs and monsters do not necessarily possess player class packages. Placing AI metadata on the ability ensures tactical intelligence travels with the ability into any loadout.
- **Alternatives Considered**:
  - *Class package heuristics*: Rejected because wildcard-borrowed abilities and monster units would have no heuristic support.
  - *Ability heuristic registry (`Map<string, fn>`)*: Rejected because it separates ability configuration across multiple files, increasing maintenance overhead when adding new abilities.

### 2. Contract for `AbilityAIHint`

```typescript
export type AIRole = 'PRIMER' | 'FINISHER' | 'DEFENSIVE' | 'DISRUPTION' | 'UTILITY';

export type FollowUpCategory = 'PHYSICAL_ATTACK' | 'SPELL' | 'FLANK_ATTACK' | 'ANY_ATTACK';

export interface AIPrimerHint {
  /** Follow-up action required to justify casting this primer */
  readonly requiresFollowUp: FollowUpCategory;
  /** Minimum combined AP required (cost of primer + minimum cost of follow-up) */
  readonly minTotalAp: number;
  /** Tactical bonus score added when primer prerequisites are satisfied */
  readonly bonusScore: number;
  /** Tactical reason string emitted in decision explanation */
  readonly reason?: string;
  /** Profiles that specifically prioritize this primer */
  readonly preferredProfiles?: readonly AIProfile[];
}

export interface AbilityAIHint {
  readonly role?: AIRole;
  readonly primer?: AIPrimerHint;
}
```

### 3. Generic Primer Evaluator in `heuristics.ts`

Introduce `scorePrimerAbility`:
1. Check if `ability.aiHint?.primer` is present. If not, return `{ score: 0 }`.
2. Verify `actorCu.currentAp >= primer.minTotalAp`. If false, return `{ score: 0 }`.
3. If `primer.preferredProfiles` is defined, check if actor's resolved `profile` is included. If not, reduce or skip bonus.
4. Filter actor's other abilities for candidates matching `primer.requiresFollowUp` (e.g. physical attacks with `damageType === 'PHYSICAL'`, spells with `damageType === 'MAGICAL'`, or attacks with flank conditions).
5. Verify whether at least one matching follow-up has an enemy within reach (either at current position or considering spatial range).
6. When verified, return `{ score: primer.bonusScore, reason: primer.reason }`.

This single generic function replaces:
- `BLOOD_FRENZY` block in `scoreBuffAbility`
- `SPELL_SCULPT` block in `scoreBuffAbility`
- `flash_powder` primer score in `scoreDebuffAndUtility`
- `Stand and Deliver!` primer score in `scoreDebuffAndUtility`

### 4. Universal Redundancy Guards

- In `scoreDebuffAndUtility`: For any hostile ability applying a negative `statModifiers[stat]`, inspect `targetCu.activeModifiers`. If the target already has an active modifier with `stat === stat && value < 0`, award 0 score for that debuff effect.
- In `scoreBuffAbility`: For any friendly ability applying a positive `statModifiers[stat]`, if target already has `stat === stat && value > 0`, award 0 score for that buff effect.
- This replaces the hardcoded `if (ability.id === 'flash_powder') return { score: 0 };` check with a clean, universal rule that benefits all present and future debuffs.

### 5. Natural Armor Bypass Valuation

- Purge `if (ability.id === 'pact_blade')` from `scoreDebuffAndUtility`.
- `computeAbilityMetrics` computes expected damage against `targetCu`'s armor (if physical) or ward (if magical vs resolve). High armor and low ward enemies naturally yield higher `metrics.expectedDamage` for `Pact Blade`, rewarding the ability without hardcoded ID checks.

## Risks / Trade-offs

- **[Risk] Existing Turn Sequence Regression**: Changes to scoring weights might alter the exact action choices in tests (e.g., Cat-Burglar Solo Heist: Flash Powder -> Rooftop Vault -> Pilfer).
  - *Mitigation*: Ensure declarative weights match existing values (Flash Powder: 45 bonus for Skirmisher with >= 2 AP; Spell Sculpt: 35 bonus; Blood Frenzy: expected damage bonus + 15). Run full Vitest suite to verify zero regressions.
- **[Risk] Multi-Effect Debuff Abilities Penalized Too Severely**: Zeroing an entire ability because one secondary debuff is redundant could prevent damage dealing.
  - *Mitigation*: The redundancy guard zeros the *utility score contribution* for that specific debuff component, rather than returning `{ score: 0 }` for the whole ability, unless the ability has no other damaging or tactical effects.
