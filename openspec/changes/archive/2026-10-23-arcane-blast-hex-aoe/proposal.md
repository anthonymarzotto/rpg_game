# Proposal

## Why

Currently, damaging area-of-effect abilities such as `Arcane Blast` require clicking a specific enemy unit (`targetType: 'SINGLE_TARGET'`), making it impossible to aim at ground positions between enemies or flush out stealthed foes. Furthermore, secondary splash damage currently duplicates the primary damage profile without an independent or contested defense check, meaning secondary targets take automatic, unmissable damage whenever the primary target is hit. 

Transitioning damaging blast abilities to support ground/hex targeting (`targetType: 'HEX'`), establishing an explicit `splashDamageProfile` (Approach A), and resolving a unified spellcast attack roll against all caught units' defenses (including friendly fire) eliminates degenerate unmissable ground-targeting exploits, preserves defensive stat integrity (Resolve/Evasion), and enables rich tactical spatial targeting for both players and autonomous AI.

## What Changes

- **Ground/Hex Damaging Targeting**: Support `targetType: 'HEX'` on damaging abilities (e.g. `Arcane Blast`), permitting targeting of any walkable arena tile within range, whether occupied or unoccupied.
- **Unified Spellcast Contested Rolls**: A single spellcast attack roll (`d20 + modifier`) is rolled by the attacker and contested against the respective defense (`defenseTarget`) of every unit caught in the blast area:
  - Center unit (if occupied): contests defense for full direct damage (`damageProfile`, eligible for Critical Hit).
  - Splash units (surrounding radius): contest defense for splash damage (`splashDamageProfile`, resolving as solid hit or graze on hit, 0 on miss).
  - Empty center hex: no direct damage dealt; all surrounding units contest defense for splash damage.
- **Declarative Splash Damage**: Add optional `splashDamageProfile` to `Ability` (e.g. `1d4` flat for `Arcane Blast` without attribute scaling), with clean engine fallbacks for spells augmented with AoE via `Spell Sculpt`.
- **Friendly Fire & Tactical Positioning**: Friendly fire remains active for all units within the blast area (excluding the caster).
- **Target Preview & UI Feedback**: Update `targetPreview`, combat log, and floating combat text to preview and display multi-target hit/miss outcomes and damage breakdowns from ground-targeted blasts.
- **AI AoE Hex Evaluation**: Equip `decisionEngine.ts` to evaluate candidate ground hexes (both occupied and empty tiles), scoring expected direct and splash damage across all affected enemies while heavily penalizing friendly fire against allies.

## Capabilities

### Modified Capabilities
- `composable-abilities`: Expand ability targeting and secondary damage pipeline to support damaging `targetType: 'HEX'` abilities, declarative `splashDamageProfile`, and unified multi-target defense contests across blast radii.
- `hybrid-ai-heuristics`: Define candidate hex evaluation and multi-target damage/penalty scoring for autonomous AI units utilizing ground-targeted AoE blast abilities.

## Impact

- **Core Combat Resolution**: [`src/core/combat/resolver.ts`](file:///c:/Repos/rpg_game/src/core/combat/resolver.ts), [`src/core/combat/damageEngine.ts`](file:///c:/Repos/rpg_game/src/core/combat/damageEngine.ts), [`src/core/combat/targetPreview.ts`](file:///c:/Repos/rpg_game/src/core/combat/targetPreview.ts).
- **Ability Types & Packages**: [`src/core/types/ability.ts`](file:///c:/Repos/rpg_game/src/core/types/ability.ts), [`src/data/packages/wizard.ts`](file:///c:/Repos/rpg_game/src/data/packages/wizard.ts).
- **AI Decision Engine**: [`src/core/ai/decisionEngine.ts`](file:///c:/Repos/rpg_game/src/core/ai/decisionEngine.ts), [`src/core/ai/heuristics.ts`](file:///c:/Repos/rpg_game/src/core/ai/heuristics.ts).
- **Metamagic Synergies**: Interaction with `Spell Sculpt` (`src/core/combat/effects/spellSculptHandler.ts`).
