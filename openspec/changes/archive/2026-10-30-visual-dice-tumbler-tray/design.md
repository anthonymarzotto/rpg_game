# Design: Visual Dice Tumbler Tray

## Context

Currently, `attackRoll.ts` evaluates combat attacks by rolling a d20 through a `DiceRoller` interface, computing hit outcomes, and rolling damage dice. The result is returned synchronously inside `AttackResolution`. In `useCombatSimulation.ts`, clicking an enemy immediately executes `executeAbility(...)`, immediately pushes floating combat text, and clears the action mode.

To support the Visual Dice Tumbler Tray without breaking the Architectural North Star, the core combat engine must remain 100% headless and deterministic, outputting a rich `DiceRollBreakdown` that the React presentation layer declaratively animates.

## Goals / Non-Goals

**Goals:**
- Enrich `AttackResolution` with an optional `diceBreakdown` object containing raw d20 rolls, advantage mode, kept d20 value, and damage dice rolls with modifiers.
- Implement `DiceTumblerTray.tsx` as a sleek, top-center floating clash banner with responsive SVG polyhedral dice facets and CSS keyframe animations.
- Implement a two-stage roll sequence: Stage 1 (d20 Attack Check with Advantage/Disadvantage) and Stage 2 (Damage Dice roll on hits).
- Support instant click-to-skip (mouse click or Spacebar) and a persistent UI toggle (`[🎲 Tray: ON/OFF]`) stored in `localStorage`.
- Retain seamless coordination with existing floating combat text and combat log panels.

**Non-Goals:**
- Heavy 3D libraries (Three.js / WebGL) — polyhedrals will be rendered with procedural SVG facets and GPU-accelerated CSS 3D transforms.
- Modifying hostile AI turn pacing or `asyncTurnSequencer.ts`.
- Replacing or modifying existing combat log text or floating combat text formats.

## Decisions

### 1. Headless Dice Breakdown Contract
* **Decision**: Add a `DiceRollBreakdown` interface to `src/core/combat/types.ts` and populate it within `attackRoll.ts`.
```typescript
export interface DamageDieRoll {
  readonly sides: number;
  readonly roll: number;
}

export interface DiceRollBreakdown {
  readonly d20Rolls: readonly number[];
  readonly keptD20: number;
  readonly advantage: RollAdvantage;
  readonly netModifier: number;
  readonly totalScore: number;
  readonly targetDefense: number;
  readonly defenseType: 'Evasion' | 'Resolve';
  readonly hitOutcome: HitOutcome;
  readonly damageDice: readonly DamageDieRoll[];
  readonly damageModifier: number;
  readonly totalDamage: number;
}
```
* **Rationale**: Decouples the visual tray from dice mechanics. The core engine remains fully unit-testable in headless TypeScript, and the presentation layer never generates its own RNG.
* **Alternatives Considered**: Generating cosmetic random numbers in the UI tray during tumble and snapping to the final value. *Rejected*: Desyncs dual-die advantage representation and prevents deterministic replay.

### 2. SVG Polyhedrals with CSS 3D Transforms
* **Decision**: Render d20 and damage dice (d4, d6, d8, d10, d12) as geometric SVG vector meshes styled with radiant gradients, drop shadows, and CSS 3D keyframe tumbling (`transform: rotateX(...) rotateY(...) rotateZ(...)`).
* **Rationale**: Zero external bundle bloat, sharp rendering at any DPI, lightweight 60fps performance, and cohesive fit with the game's existing dark fantasy / astral aesthetic.
* **Alternatives Considered**: Three.js / Canvas 3D. *Rejected*: Adds hundreds of kilobytes of dependencies and canvas context overhead for a simple dice tray.

### 3. Pacing & Click-to-Skip Sequencer
* **Decision**: 
  - Normal roll timing: Stage 1 tumble (~250ms), score clash stamp (~150ms), Stage 2 damage tumble (~200ms), auto-fadeout (~100ms) = ~700ms total.
  - Active Tray Overlay captures window click or spacebar keydown to immediately invoke an `onSkip` callback, snapping state to completed and dispatching floating combat text instantly.
* **Rationale**: Provides satisfying suspense on big strikes while never frustrating players who want snappy, rapid-fire gameplay.

### 4. Player-Only Execution in `useCombatSimulation.ts`
* **Decision**: Manage the tray state exclusively within `useCombatSimulation.ts` for player-initiated ability clicks.
  - When the tray is enabled, executing an ability sets `activeDiceRoll: { resolution, ability, targetCoord, ... }`.
  - While `activeDiceRoll` is set, user interaction is locked to the tray (click skips).
  - When the tray finishes or is skipped, floating combat text is dispatched, and `activeDiceRoll` is cleared.
* **Rationale**: Completely isolates player sensory presentation from enemy AI sequencing in `asyncTurnSequencer.ts`, avoiding regression risks in enemy turns or benchmark tests.

## Risks / Trade-offs

* **[Risk: Stale state during rapid clicks]** → *Mitigation*: The dice tray renders an invisible pointer overlay that catches all clicks, redirecting them to the skip handler rather than dispatching new grid actions.
* **[Risk: Vitest test execution hangs if awaiting timers]** → *Mitigation*: Provide an `instant` or `skipAnimation` prop to `DiceTumblerTray`, and ensure headless unit tests test `attackRoll.ts` directly without mounting the UI tray.
* **[Risk: Occluding target units]** → *Mitigation*: Anchoring the banner at top-center under the initiative ribbon keeps the lower and central combat arena visible.
