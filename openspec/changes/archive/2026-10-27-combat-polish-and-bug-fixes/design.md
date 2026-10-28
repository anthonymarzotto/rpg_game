# Design: Combat Polish and Bug Fixes

## Context

See [proposal.md](proposal.md) for motivation.
During combat, several distinct subsystems (presentation SVG layering, floating combat text, AI decision heuristics, attack resolution, and combat log parsing) handle user and AI actions. Each of the six targeted issues has a localized cause in its respective module.

## Goals / Non-Goals

**Goals:**
- Eliminate chevron occlusion during facing selection by raising the compass ring to an overlay layer in SVG document order.
- Fix Skirmish displacement floating text to display `RETREAT!` instead of `KNOCKBACK!`.
- Prevent AI units from considering or attempting `targetType: 'SELF'` abilities (like Smoke Veil) on teammates.
- Clean up ground-targeted AoE attack resolution so empty hexes do not log attack rolls against the ground or report dummy `0 (Ground)` damage.
- Provide first-class styled combat log cards for stealth breaks (`CONDITION_BROKEN`) and turn-start condition damage ticks (`DOT_DAMAGE`).
- Align visual presentation of core class abilities in the Combat Manifest with wildcard ability cards by adding colored archetype discipline tags.

**Non-Goals:**
- Reworking the broader stealth detection rules (e.g. vision cones or fog-of-war).
- Changing AoE splash damage balance formulas or resistance math.
- Redesigning the Harvest Trial Spoils dialog (deferred to next focus).

## Decisions

### 1. Facing Compass Ring as a Top-Level SVG Overlay Layer
- **Decision**: In `HexGridSvg.tsx`, extract the facing compass ring rendering out of the individual unit standee loop and place it in a dedicated `<g className="facing-compass-overlay">` immediately after `<g className="units-layer">`.
- **Rationale**: SVG elements do not support CSS `z-index`. Stacking order is strictly determined by DOM order. Rendering the compass ring in a layer after all unit tokens guarantees that no unit sprite or pedestal can occlude the active unit's directional chevrons.
- **Alternatives Considered**:
  - Sorting units so the active unit is always rendered last: rejected because it would break Y-depth sorting where units in front of the active unit must draw in front of the active unit's standee.

### 2. Float Text Kind Dispatch for Retreat Displacements
- **Decision**: In `useFloatingCombatText.ts`, check `event.kind === 'RETREAT'` and return `'RETREAT!'`.
- **Rationale**: Displacements already carry a `kind` discriminator (`'TELEPORT'`, `'RETREAT'`, `'KNOCKBACK'`). Explicitly checking `'RETREAT'` prevents fallback to `'KNOCKBACK!'` without touching the underlying core event pipeline.

### 3. Strict Self-Scope in AI Candidate Generation
- **Decision**: In `decisionEngine.ts`, decouple `ability.targetType === 'SELF'` from `ability.targetType === 'ALLY'`. For self abilities, evaluate only against `actorCu` at its current position or destination hex.
- **Rationale**: An ability with `targetType === 'SELF'` can never legally target another unit under `validator.ts`. Checking teammates in `decisionEngine.ts` wasted CPU cycles and generated illegal actions that triggered fallback faults.

### 4. AoE Ground Targeting Log & Card Cleanup
- **Decision**: In `resolver.ts`, when resolving a damaging hex ability without a center target unit (`targetCu === undefined`), suppress dummy center attack roll logs and `[Damage: 0 (Ground)]`. In `CombatLogPanel.tsx`, format the card as an area detonation focusing on splash targets.
- **Rationale**: The ground is an arena coordinate, not an entity with Resolve or HP. Showing an attack roll vs DC 0 and 0 damage to the ground confused players and cluttered the log. Secondary targets in splash radius continue to contest the spellcast roll as specified in `composable-abilities`.

### 5. Dedicated Parsed Combat Log Card Types
- **Decision**: In `CombatLogPanel.tsx`, add `CONDITION_BROKEN` and `DOT_DAMAGE` to `ParsedLogEntry`.
- **Rationale**: Replaces raw gray unstyled strings with themed cards matching the game's dark fantasy aesthetic:
  - `CONDITION_BROKEN`: Displays `👤 STEALTH BROKEN`, target name, actor faction border, and broken concealment note.
  - `DOT_DAMAGE`: Displays `🔥 BURN TICK` or `🧪 POISON TICK`, damage value pill, and updated remaining HP.

### 6. Combat Manifest Archetype Badges
- **Decision**: In `HeroProgressionDrawer.tsx`, utilize `formatDisciplineBadge(effectiveAbility.archetypeTag)` inside `drawer-ability-mini-card` header.
- **Rationale**: Reuses the exact same styling classes (`slot-tag`, `fighter`, `rogue`, `mage`) already proven in wildcard cards, bringing visual consistency across the entire manifest.

## Risks / Trade-offs

- **[Risk] Compass Hit Targets Overlaying Adjacent Clicks** → Mitigation: Compass overlay only mounts when `facingCompassCoord` is active and only occupies its 39px radius around the active actor. Clicking outside the compass continues to dismiss it cleanly via event bubbling to the arena board.
- **[Risk] Combat Log Parsing Regressions** → Mitigation: New log parsers specifically target `actionId: 'condition_removed'` and `actionId: 'burn' | 'poison'`. Existing regexes for `ATTACK`, `MOVE`, `BUFF`, `DETECTION`, and `FAULT` remain unaffected.
