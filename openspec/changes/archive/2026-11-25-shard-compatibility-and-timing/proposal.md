# Proposal: Shard Compatibility & Effect Timing

## Why

Socketed Astral Augment Shards currently have no compatibility restrictions and no explicit execution timing phases, causing broken or contradictory gameplay interactions across the ability catalog. Most notably, socketing `Shadow Shard` onto an attack like `Sneak Attack` applies `STEALTH` after the attack roll and then immediately and silently strips it during `onAfterAction` cleanup in the same action; meanwhile, socketing damage, conversion, geometry, or hostile infusion shards onto mismatched abilities can break teleports (`Supernova Flare` on `Shadow Step`), convert buffs into self-attacks (`Aether Shard`), debuff allies (`Venom`/`Hex` on buffs), launch ranged units 3–6 hexes (`Recoil`/`Trample` unnormalized vectors), leak `SELF` conditions onto cone enemies (`Wyrmflame Breath` + `Shadow Shard`), or silently drop shard effects on AoE secondary hits and delayed bombardments (`Siege Barrage`).

## What Changes

- **Explicit Effect Timing Lifecycle**: Introduce `timing?: 'PRE_ACTION' | 'ON_RESOLVE' | 'POST_ACTION'` (defaulting to `'ON_RESOLVE'`) on `AbilityEffect` and execute `POST_ACTION` effects after `onAfterAction` condition cleanup (and on non-damaging/zone abilities). Assign `Shadow Shard` to `timing: 'POST_ACTION'` so attack-into-Stealth cleanly breaks any pre-existing Stealth before cloaking the actor afterward, and format `POST_ACTION` clauses clearly in ability tooltips (`After Action: ...`).
- **Declarative Shard Compatibility Matrix (All 33 Shards)**: Define structural compatibility rules on every `AstralAugmentShard` and a shared `evaluateShardCompatibility(shard, ability)` evaluator covering all 33 shards (Damage Scaling, Arcane Conversion, Range Geometry, Hostile AoE Geometry for `Supernova Flare`, Hostile Infusions, Melee Geometry for `Cleave`/`Trample`, Single-Target Recoil Geometry for `Recoil`/`Buckshot`, Unit Swap for `Interchange`, Hit-Triggered Self-Buffs for `Aegis`/`Warding`/`Flourish`/`Carapace`, and Universal Self-Buffs for `Shadow`/`Bastion`/`Anchorite`).
- **BREAKING — Strict Loadout Validation & Auto-Unsocketing**: Enforce `evaluateShardCompatibility` strictly in `validateUnitLoadout` (no legacy save migrations). When a player changes a unit's active class or swaps a wildcard ability in Camp, automatically unsocket any shard that is incompatible with the new ability in that slot back into the unit's shard inventory while preserving compatible shards.
- **Camp Socketing UX**: Display incompatible earned shards as disabled options with a concise incompatibility reason in the Hero Progression Drawer slot shard selector.
- **Multi-Target AoE, Cone & Delayed Bombardment Delivery**: Deliver target-scoped `ON_RESOLVE` shard infusions to every hit unit across AoE blasts, directional Cones, and `Siege Barrage` (`DELAYED_BOMBARDMENT`) detonations (respecting per-target Hit/Crit vs Graze/Miss and ensuring `SELF`-scoped effects run once per action and never leak onto enemies). Extend damage patches (`diceStep`, `diceCount`, `flatDamage`) to also patch `DELAYED_BOMBARDMENT`, snapshot shard overrides and hostile infusions onto `PendingBombardment`, and run `POST_ACTION`/`ALWAYS` self-shards when launching `Siege Barrage` or `Shrapnel Canister`.
- **Normalized Displacement Vectors**: Normalize step direction vectors to 1 hex in `RETREAT_STEP` and `PENETRATE_STEP` so ranged `Recoil`/`Buckshot` and multi-shard range combos (e.g. `Astral Reach` + `Trample`) displace by exactly 1 hex.

## Capabilities

### New Capabilities
*(None — this change extends and refines existing combat, progression, and Camp UI capabilities.)*

### Modified Capabilities
- `composable-abilities`: Add explicit effect timing phases (`PRE_ACTION`, `ON_RESOLVE`, `POST_ACTION`), `After Action` tooltip formatting, per-hit-target AoE/Cone/Bombardment infusion delivery with once-per-action self-effect scoping, `DELAYED_BOMBARDMENT` modifier patching & snapshotting, `POST_ACTION` execution on zone abilities, and normalized 1-hex displacement for `RETREAT_STEP` and `PENETRATE_STEP`.
- `off-node-progression`: Add declarative Astral Augment Shard compatibility rules across all 33 shards, enforce strict compatibility in loadout validation, and refine slot-swap rules so incompatible shards auto-unsocket back to inventory instead of remaining bound to incompatible abilities.
- `hero-progression-drawer`: Show incompatible earned shards as disabled options with a short reason in the slot shard selector dropdown, and auto-unsocket incompatible shards back to inventory when changing active class or swapping wildcard abilities.

## Version Assessment

- **Target Version**: `0.25.0` (Minor bump from `0.24.0`)
- **Rationale**: Adds player-visible progression/combat ruleset features (declarative shard compatibility across all 33 shards, disabled-with-reason socketing UX, auto-unsocketing on ability swaps, explicit `POST_ACTION` effect timing lifecycle, multi-target AoE/Cone/Bombardment shard infusion delivery, and ranged recoil support) alongside strict loadout validation during pre-1.0 (`0.x.y`) development.

## Impact

- **Core Types & Modifiers**: `src/core/types/ability.ts`, `src/core/types/modifier.ts`, `src/core/combat/modifiers.ts`, `src/core/combat/types.ts`
- **Progression & Loadouts**: `src/core/progression/harmonization.ts`, `src/core/units/loadout.ts`, `src/core/campaign/transitions.ts`
- **Combat Resolution & Zones**: `src/core/combat/resolver.ts`, `src/core/combat/battlefieldZones.ts`, `src/core/combat/effects/registry.ts`, `src/core/combat/effects/retreatHandler.ts`, `src/core/combat/effects/penetrateHandler.ts`, `src/core/combat/abilityFormatter.ts`
- **Camp UI**: `src/ui/camp/HeroProgressionDrawer.tsx`
- **Tests & Docs**: Unit and integration tests across combat resolution, harmonization, loadout validation, battlefield zones, formatter, and progression drawer; `CHANGELOG.md` and `package.json`.
