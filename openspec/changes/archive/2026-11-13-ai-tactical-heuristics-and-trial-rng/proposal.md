# Proposal: AI Tactical Heuristics and Trial RNG Consistency (`ai-tactical-heuristics-and-trial-rng`)

## Why

A full diagnostic review of a 62-turn live combat trial export (`trial_export_turn62_1794581786566.json`) revealed two engine-level bugs and four AI scoring gaps that severely handicapped the enemy squad:

1. **Enemy Turn PRNG Reset Bug**: `executeHostileTurnAsync` defaults its `diceRoller` parameter to `new SeededDiceRoller()`, which evaluates freshly on every hostile turn invocation in the UI. Every enemy turn restarted the deterministic PRNG stream from seed `1337`, causing enemies to roll a natural `4` on the d20 on nearly every turn opener, while opening initiative and player rolls used disconnected rollers and `CombatState` did not preserve the trial's PRNG seed.
2. **AI Turn-Skipping Bug ("Move + Weak Buff Hijack" & Long-Range LoS Gate)**: In `src/core/ai/decisionEngine.ts`, candidate move hexes that enable casting an unengaged ally/self buff assign a low non-null `bestAttackFromCand` (`0.5`), completely bypassing the `else` approach-movement branch and causing units like Ash Knight, Cinder Novice, and Obsidian Shield-bearer to skip early turns (`CONSERVE_AP`). Ranged `SNIPER` and `SUPPORT` units also required single-step Line of Sight even when approaching from spawn behind central elevation ridges.
3. **Support Rally & Rescue Blind Spots**: `scoreBuffAbility` scored AoE squad rallies like `Lead the Charge` at `2.5` when unengaged (ignoring allied units in the 3-hex aura), and lacked positional rescue checks on `POSITION_SWAP` (`Intercept Step`), risking swapping a frontline tank backward into safety while throwing an injured ally forward.
4. **Melee `SUPPORT` Standoff Trap & Challenged Combo**: Classes such as Knight declare `aiProfile: 'SUPPORT'` (`preferredStandoffRange: 2`) while carrying only Range 1 damaging attacks, preventing them from closing from range 2 to melee range 1 after casting `Challenging Shout` (and missing `TARGET_CHALLENGED` combo scoring on `Pommel Strike`).
5. **Solo-Dives & Central Bottleneck Clumping**: Fast skirmishers (`Cat-burglar`) spent `Rooftop Vault` (`TELEPORT`) on flat unengaged terrain and solo-dove 6 hexes ahead of teammates to throw `Flash Powder` when neither the actor nor any ally could capitalize within 1 turn, while advancing units lacked a crowding penalty to fan out into flank lanes.
6. **Void Dragoon `Coiled Apex` Unawareness**: `decisionEngine.ts` applied the generic `5.0` AP conservation threshold even when units with `unspentApVirtualHeight` (`Coiled Apex`) had 1 AP left near combat, causing Void Dragoon to burn every final AP and never activate `+1 Virtual Height` (`Coiled Readiness`).

## What Changes

- **Trial-Scoped Seeded Dice Roller & Seed Recording**:
  - Expose `readonly seed: number` on `SeededDiceRoller` and record `seed?: number` on `CombatState` and `SerializedCombatState` (preserved through `serializeCombatState` / `deserializeCombatState` and surfaced in diagnostic Markdown exports).
  - Share a single trial-scoped `SeededDiceRoller` instance across opening initiative, normal-mode player rolls (`DevDiceRoller`), and all hostile AI turns in `useCombatSimulation.ts`, replacing the per-call `new SeededDiceRoller()` default parameter in `asyncTurnSequencer.ts` with a module-level fallback roller.
- **Decoupled Approach Scoring & Long-Range Movement**:
  - Always evaluate `bestRepositionScore` alongside `bestAttackFromCand` for each reachable hex and keep whichever scores higher, preventing weak move-to-buff options from suppressing advancement.
  - Allow ranged `SNIPER` and `SUPPORT` units outside `preferredStandoffRange + 1` to score long-range approach moves when mid-map terrain blocks single-step `hasLoS`.
- **Support AoE Rally Scaling & `POSITION_SWAP` Rescue Gating**:
  - Scale positive AoE stat buffs (`aoeRadius > 0`, e.g., `Lead the Charge`) by unbuffed allies in radius so support Knights rally their squad at battle start.
  - Gate `POSITION_SWAP` (`Intercept Step`) so it only scores positively when pulling a threatened ally (`allyMinHostileDist <= 2`) back from a position closer to enemies than the actor (`actorMinHostileDist > allyMinHostileDist`).
- **Melee `SUPPORT` Approach & `TARGET_CHALLENGED` Synergy**:
  - Keep multi-target `Challenging Shout` unrestricted so tanks challenge all visible foes to protect allies.
  - Allow melee-only `SUPPORT` units (no damaging ability with `range >= 2`) to close to distance 1 rather than kiting at standoff range 2, and add combo utility for `TARGET_CHALLENGED` attacks (`Pommel Strike`).
- **Team Follow-Up Verification for Short-Duration Setup Debuffs, Anti-Solo-Dive & Flank Spacing**:
  - Require self follow-up AP or at least one allied teammate within effective reach (`allyMove + allyMaxAttackRange`) before awarding setup utility for 1-turn non-damaging debuffs or `FORCE_FACING_AWAY` (`Flash Powder`, while preserving defensive ally-protection checks).
  - Suppress unengaged flat-ground `TELEPORT` approach moves when the hex is reachable by walking, apply an isolation penalty when moving/diving into `>= 3` hostiles with `0` allies within 3 hexes (unless securing a finishing blow), and apply an adjacent-ally crowding penalty on approach moves (`candDist >= 2`) to encourage flanking wide.
- **`Coiled Apex` Final-AP Conservation Threshold**:
  - Raise the effective AP conservation threshold to `15.0` on the final 1 AP for units with `unspentApVirtualHeight` (`virtualElevation === 0`) when an enemy is within 4 hexes, encouraging them to bank 1 AP for `+1 Virtual Height` and `+20 CTB` gauge unless a high-value attack clears the threshold.

## Capabilities

### New Capabilities

### Modified Capabilities
- `hybrid-ai-heuristics`: Decouple move-and-buff vs. approach scoring, support long-range LoS-blocked repositioning, add AoE rally buff scaling and `POSITION_SWAP` rescue geometry gating, enable melee-only `SUPPORT` engagement and `TARGET_CHALLENGED` combo bonus, require team follow-up reach for 1-turn setup debuffs/isolation control and flank spacing, and apply `Coiled Apex` final-AP conservation threshold.
- `combat-initiative-rolling`: Unify interactive combat sessions onto a single trial-scoped `SeededDiceRoller` across initiative, normal player actions, and hostile AI turns so enemy turns never reset the PRNG stream.
- `trial-diagnostics-export`: Record optional `seed` on `CombatState` and `SerializedCombatState`, preserving PRNG seed reproducibility across export serialization, deserialization, and Markdown reports.

## Impact & Version Assessment

- **Target Version**: **`0.17.1` (Patch)** — Per Semantic Versioning, this change fixes critical gameplay bugs (UI enemy turn PRNG reset and AI turn-skipping paralysis), refines AI tactical heuristics without altering combat rules or introducing new unit/UI feature modules, and adds a backward-compatible optional `seed` field on serialized trial snapshots.
- **Affected Code**: `src/core/combat/dice.ts`, `src/core/combat/types.ts`, `src/core/combat/resolver.ts`, `src/core/combat/stateSerializer.ts`, `src/core/combat/reportGenerator.ts`, `src/core/ai/decisionEngine.ts`, `src/core/ai/heuristics.ts`, `src/ui/combat/devDice.ts`, `src/ui/combat/asyncTurnSequencer.ts`, `src/ui/combat/useCombatSimulation.ts`, plus corresponding unit tests, `package.json`, and `CHANGELOG.md`.

