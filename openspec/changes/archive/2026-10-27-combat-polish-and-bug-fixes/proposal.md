# Proposal: Combat Polish and Bug Fixes

## Why

During playtesting of v0.7.0, several visual bugs, AI targeting irregularities, and UI inconsistencies were identified in the combat loop and camp manifest:
1. When adjusting unit facing, directional chevrons are partially obscured by adjacent unit standees rendered later in document order.
2. When Skirmish retreats 1 hex, floating combat text incorrectly shouts "KNOCKBACK!".
3. Infiltrator AI attempts to cast Smoke Veil (a self-only stealth ability) on allied teammates.
4. Casting Arcane Blast on an empty hex performs an attack roll against the ground and displays confusing `0 (Ground)` damage.
5. Critical combat events like stealth broken by damage and turn-start Burn/Poison DoT ticks display as raw unstyled fallback log lines.
6. Class core abilities in the Combat Manifest lack colored archetype badges (`FORCE`, `FINESSE`, `FOCUS`), looking inconsistent with wildcard ability cards.

Fixing these issues together eliminates moment-to-moment tactical friction and polishes combat readability.

## What Changes

- **Top-Layer Facing Compass**: Hoist the 6-direction facing compass ring in `HexGridSvg.tsx` into a dedicated overlay `<g>` rendered after all unit tokens so adjacent unit sprites never overlap facing chevrons.
- **Skirmish Floating Text**: In `useFloatingCombatText.ts`, recognize `event.kind === 'RETREAT'` on displacement events and render `'RETREAT!'` instead of defaulting to `'KNOCKBACK!'`.
- **Infiltrator AI Self-Cast**: In `decisionEngine.ts`, strictly isolate abilities with `targetType === 'SELF'` so the AI evaluates them solely on the acting unit, completely excluding teammates.
- **AoE Ground Targeting Cleanup**: In `resolver.ts` and `CombatLogPanel.tsx`, when an AoE ability like Arcane Blast targets an unoccupied hex, eliminate the ground attack roll and `0 (Ground)` damage entry, cleanly reporting the area detonation and splash damage against caught targets.
- **Rich Combat Log Cards**: In `CombatLogPanel.tsx` and CSS, add dedicated styled log cards for:
  - `👤 STEALTH BROKEN`: Highlight when a unit's stealth is broken by incoming damage.
  - `🔥 BURN TICK` & `🧪 POISON TICK`: Highlight turn-start condition damage with distinct icons, damage pills, and target vitals.
- **Combat Manifest Archetype Badges**: In `HeroProgressionDrawer.tsx`, display standard archetype badges (`FORCE`, `FINESSE`, `FOCUS`) on class core abilities, matching the layout of resonant wildcard abilities.

## Version Assessment

- **Current Version**: `0.7.0`
- **Target Version**: `0.7.1` (Patch)
- **Rationale**: In accordance with Semantic Versioning, these changes consist purely of backwards-compatible bug fixes, UI layer corrections, and visual card polish with no breaking changes to public APIs or save formats.

## Capabilities

### Modified Capabilities
- `tactical-facing-control`: Ensure directional facing compass is rendered on a dedicated top-level layer above all unit standees.
- `hybrid-ai-heuristics`: Restrict AI evaluation of `targetType: 'SELF'` abilities exclusively to the actor.
- `composable-abilities`: Add `'RETREAT!'` floating combat text on retreat displacement, and clean up ground-targeted hex AoE execution to prevent ground attack rolls and dummy damage logs.
- `combat-conditions`: Add structured combat log rendering for condition removal on damage and turn-start condition damage ticks.
- `hero-progression-drawer`: Render archetype discipline badges on class core abilities in the Combat Manifest.

## Impact

- `src/ui/combat/HexGridSvg.tsx`: Moves compass ring to overlay layer.
- `src/ui/combat/useFloatingCombatText.ts`: Dispatches `'RETREAT!'` for retreat displacements.
- `src/core/ai/decisionEngine.ts`: Restricts `targetType === 'SELF'` candidates to self.
- `src/core/combat/resolver.ts`: Omits ground attack rolls and dummy damage on empty hex targeting.
- `src/ui/combat/CombatLogPanel.tsx`, `CombatLogPanel.css`: Introduces `CONDITION_BROKEN` and `DOT_DAMAGE` card templates.
- `src/ui/camp/HeroProgressionDrawer.tsx`: Adds archetype tags to class abilities in manifest.
- Tests across combat UI, resolver, and AI will be updated to verify the new behaviors.
