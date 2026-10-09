# Tasks

## 1. Balance Configuration & Grid Types

- [x] 1.1 Add `minCliffSlamElevationDelta: 2` to `DISPLACEMENT_CONFIG` in `src/core/config/balance.ts` and verify TypeScript compilation.
- [x] 1.2 Extend `KnockbackResult` in `src/core/grid/arena.ts` with optional `fallDamage` and `plungedElevationDelta` properties.

## 2. Kinetic Plunging Knockback & Cliff Collisions

- [x] 2.1 Update `Arena.calculateKnockback` in `src/core/grid/arena.ts` to enforce cliff collision on upward delta $\ge \text{minCliffSlamElevationDelta}$, permit step-up displacement onto terraces when $\Delta h = 1$, and calculate unmitigated fall damage ($|\Delta h| \times 4$) on ledge plunges ($\Delta h \le -2$). Verify with grid knockback tests in `src/core/grid/grid.test.ts`.
- [x] 2.2 Implement centralized `resolveFallDamage(cu, rawDamage)` helper that checks for fall damage immunity traits, routing both voluntary movement and `knockbackHandler` plunges through it to emit unmitigated `DAMAGE` events with reason `FALL`. Verify with tests in `src/core/combat/displacement.test.ts`.

## 3. Ability Targeting & Elevation Reach Validation

- [x] 3.1 Update `canExecuteAbility` in `src/core/combat/validator.ts` to reject melee attacks (`range <= 1`) across $|\Delta h| \ge 2$ as vertically out of reach (checking `ability.reachElevationDelta` or trait overrides), while allowing $|\Delta h| \le 1$.
- [x] 3.2 Update `canExecuteAbility` in `src/core/combat/validator.ts` to extend effective range for ranged attacks (`range >= 2`) fired from higher ground: $\text{effectiveRange} = \text{baseRange} + \max(0, h_{\text{actor}} - h_{\text{target}})$. Verify targeting reach with unit tests.

## 4. Vertical Attack Roll Modifiers & Resolution

- [x] 4.1 Implement `calculateElevationAttackModifier(actorCu, targetCu, dh, ability)` in `src/core/combat/attackRoll.ts` supporting traits/skills that suppress low-ground penalties, and update `resolveAttackRoll` to evaluate elevation roll bonus (+2) / penalty (-2) and Advantage ($\Delta h \ge 2$) / Disadvantage ($\Delta h \le -2$) with standard cancellation. Verify with attack roll unit tests.
- [x] 4.2 Update `executeAbility` in `src/core/combat/resolver.ts` to determine elevation difference between attacker and target, feed vertical modifiers into `resolveAttackRoll`, and output combat log notes for high ground advantage/bonuses and low ground disadvantage/penalties.

## 5. Verification & Regression Testing

- [x] 5.1 Author comprehensive vertical combat integration tests in `src/core/combat/elevationCombat.test.ts` covering ranged vantage, attack roll modifiers, melee reach limits, and plunging knockback fall damage. Verify full test suite passes with `npm test`.
