# Proposal: Combat Initiative Rolling

## Why

At the start of combat encounters, all units currently initialize with `initiativeGauge = 0`. Because all non-Finesse classes (Novice, Warrior, Wizard, Knight, Sorcerer, Berserker) share baseline Speed 10, all combatants cross the CTB threshold (100) simultaneously on Tick 10. In ties, `turnClock.ts` breaks equal gauge and speed using `a.id.localeCompare(b.id)`. Because player IDs begin with `'campaign-'` and enemies with `'enemy-'`, player units win 100% of opening ties, granting the player a guaranteed 3-unit opening alpha-strike on almost every map.

Seeding each unit's starting gauge with a 1d20 roll creates dynamic, unpredictable opening rounds where player and enemy turns interleave naturally while preserving tactical speed advantages.

## What Changes

- **Starting Gauge Randomization**: Seed each combat unit's initial `initiativeGauge` with a `1d20` roll ($1\text{--}20$) when creating combat encounters in `createCombatState`.
- **Speed & Roll Balance**: Over the 100-point CTB race, faster units (e.g. +2 Speed per Finesse point) naturally accumulate more gauge, while a high 1d20 roll allows slower units to occasionally get the jump on agile opponents.
- **Player-Friendly Tiebreaker**: Maintain the existing `a.id.localeCompare(b.id)` tiebreaker so that in the rare event two equal-speed units roll the exact same starting gauge, the tie gracefully favors the player.
- **Turn 0 Floating Combat Text**: Trigger floating text (`🎲 [roll]`) over each combatant on the hex battlefield upon spawning at battle start.
- **Combat Log Announcement**: Log an opening battle event listing combatants and their rolled initiatives.
- **Standard CTB Preservation**: Preserve normal CTB gauge resetting (reset to 0, or $+20$ per unspent AP) upon ending turns, ensuring all subsequent rounds are governed strictly by Speed and AP conservation.

## Capabilities

### New Capabilities
- `combat-initiative-rolling`: Specifies initial 1d20 gauge seeding on encounter initialization, tie-breaking behavior, Turn 0 battlefield floating combat text, and opening combat log announcement.

### Modified Capabilities
*(None. Existing specs are not changing requirement definitions.)*

## Impact

- `src/core/combat/resolver.ts`: Updates `createCombatState` to seed `initiativeGauge` with a 1d20 roll and emit an initial combat log entry.
- `src/ui/combat/useFloatingCombatText.ts` & `src/ui/combat/CombatArena.tsx`: Emits opening floating text for spawned units displaying their initiative rolls.
- Tests across `turnClock.test.ts`, `resolver.test.ts`, and combat UI tests to verify deterministic seeded rolling and non-zero opening gauges.
