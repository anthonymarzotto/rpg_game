# Proposal: Tier 4 Ballistician Class Kit & Token Integration

## Why

The celestial progression currently lacks a physical artillery class and the Tier 4 Ballistician (`#65`, `1 Fighter, 3 Rogue, 0 Mage`). Every existing `SNIPER` AI-profile class (`Wizard`, `Sorcerer`, `Warlock`) is a Mage capped at Range 3, leaving the battlefield without a long-range siege engineer that controls space through minimum-range blind spots, delayed area bombardment, shrapnel terrain hazards, and squad-wide target telemetry. Authoring the Ballistician kit completes item 3.3 on the active roadmap, brings token `65_human_male` into active rotation, and introduces entrenched calibration (`Zeroed In`), delayed zone bombardment (`Siege Barrage`), rough terrain rubble (`Shrapnel Canister`), and spotter telemetry (`Sighting Bolt`).

## What Changes

- **Ballistician Class Package**: Author `BALLISTICIAN_PACKAGE` in `src/data/packages/ballistician.ts` and register it in `CLASS_PACKAGES`, `ABILITIES_BY_ID`, and `PASSIVES_BY_ID`.
- **Minimum-Range Deadzone Support**: Add `minRange?: number` support to `Ability` (`minRange: 2` across all three Ballistician abilities) across targeting validation, previews, ability descriptions, and AI heuristics.
- **Innate Passive (`Zeroed In`)**: Ending a turn without moving, teleporting, or being displaced grants `+1` stack of `Zeroed In` (max 3 stacks). Each stack grants `+1 Range` on ranged abilities (`range >= 2`), `+1 Attack Roll`, and `-1 Evasion` (floored at 0). At max stacks (3 stacks), `Zeroed In` additionally grants `+1 AoE Radius` to area-of-effect abilities (`aoeRadius >= 1`). Any voluntary move, teleport, or forced displacement immediately clears all stacks.
- **Signature Ability (`Siege Barrage`)**: 2 AP, `FIGHTER` tag, `oncePerTurn: true`, range `2–4` (`minRange: 2`, `ignoresElevationPenalty: true`), `HEX` target (`aoeRadius: 1`). Launches an airborne siege volley that marks the target hex cluster on the arena. At the start of the Ballistician's next turn (persisting even if the Ballistician is displaced or defeated while airborne), the volley detonates across the marked hexes, contesting Evasion (using `finesse` for accuracy) and dealing `2d8 + Force` physical damage to all units in the blast zone.
- **Domain Ability 1 (`Shrapnel Canister`)**: 1 AP, `ROGUE` tag, range `2–4` (`minRange: 2`, `ignoresElevationPenalty: true`), `HEX` target (`aoeRadius: 1`), `defenseTarget: 'NONE'`, `damageType: 'NONE'`. Immediately strips `STEALTH` from any hidden units in the blast zone and blankets the hexes in **Shrapnel Rubble** for 2 turns (`+2 MP` additional movement cost to enter each rubble hex, making flat entry cost `3 MP`).
- **Domain Ability 2 (`Sighting Bolt`)**: 1 AP, `ROGUE` tag, range `2–4` (`minRange: 2`), `SINGLE_TARGET` enemy, physical vs Evasion (`attackModifierAttribute: 'finesse'`). Deals `1d4 + Finesse` physical damage and, on Solid Hit or Critical Hit (`HIT_OR_CRIT`), inflicts `EXPOSED` and marks the target with **Quadrant Telemetry** for 2 turns: all allied ranged and spell attacks (`range >= 2`) targeting that enemy gain `+2 Range` and ignore low-ground elevation and ranged cover penalties.
- **Visual Identity & Token Assets**: Whitelist `65_human_male` in `AVAILABLE_PIXEL_TOKENS`, configure class badge palette for `ballistician` with Engineer Emerald (`#065f46`) and Safety Crimson (`#e11d48`) border, and render arena hex overlays/tooltips for incoming `Siege Barrage` impact zones and `Shrapnel Rubble` rough terrain.
- **AI Archetype Integration**: Register Ballistician with the `SNIPER` profile and update AI decision heuristics to respect `minRange`, preserve `Zeroed In` stacks when targets are already in range, avoid ending movement inside incoming `Siege Barrage` zones, and sequence `Shrapnel Canister` / `Sighting Bolt` with `Siege Barrage`.
- **Semantic Versioning**: Target version is **`0.20.0`** (minor version bump from `0.19.0`), introducing a new playable Tier 4 class kit, abilities, and battlefield zone mechanics.

## Capabilities

### New Capabilities
- `tier-4-ballistician`: Defines the complete class package, combat abilities, delayed bombardment and rough terrain zone mechanics, spotter telemetry, and passive trait for the Tier 4 Ballistician (`1 Fighter, 3 Rogue, 0 Mage`) in the celestial constellation progression.

### Modified Capabilities
*(None; extends the combat engine and ability pipeline cleanly without breaking existing capability requirements).*

## Impact

- `src/data/packages/ballistician.ts` & `src/data/packages/index.ts`: New class package definition and global catalog registration.
- `src/core/types/ability.ts`, `src/core/types/passive.ts`, `src/core/combat/types.ts`: Support for `minRange`, `Zeroed In` passive calibration stacks, delayed bombardment zones, shrapnel rubble hex hazards, and `TELEMETRY` target condition/status.
- `src/core/grid/arena.ts`: Support for `roughTerrainHexKeys` (`+2 MP` step cost) in `MovementOptions` and `getReachableHexInfo`.
- `src/core/combat/turnClock.ts`, `src/core/combat/resolver.ts`, `src/core/combat/validator.ts`, `src/core/combat/targetPreview.ts`, `src/core/combat/modifiers.ts`: Turn-start delayed bombardment detonation, turn-end `Zeroed In` stack accumulation, movement/displacement stack clearing, `minRange` & `TELEMETRY` target-specific range/elevation/cover overrides.
- `src/ui/combat/`: Hex grid visual indicators/tooltips for `Siege Barrage` marked hexes and `Shrapnel Rubble` rough terrain, plus `65_human_male` token whitelisting in `src/ui/combat/tokenAssets.ts`.
- `docs/plans/ACTIVE.md`: Item 3.3 moved to In Progress.
