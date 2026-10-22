# Design

## Context

Currently, in-battle archetype XP is tracked per combat unit (`actorCu.inBattleXp`) in `src/core/combat/resolver.ts` and awarded at a static rate of 1 XP per action regardless of AP cost. When combat resolves (`resolveCampaignVictory` or `resolveCampaignDefeat`), victory directly dumps these per-unit gains into each unit's `accumulatedXp`, while defeat completely discards all earned XP.

See `proposal.md` for user motivation and problem statement.

## Goals / Non-Goals

**Goals:**
- Aggregate combat XP into a single shared party pool on `CombatState` (`state.partyXpPool: InBattleXp`).
- Scale XP generation directly to ability AP cost: `Math.max(1, apCost ?? 1)`. Move actions award 0 XP.
- Retain 50% (`Math.floor(pool * 0.5)`) of earned party XP on defeat.
- Present a dedicated "Harvest & Feed" modal on battle completion allowing players to distribute pool points to deployed squad heroes via `+` / `-` steppers or a 1-click "⚡ Distribute Evenly / Auto-Fill" button.
- Enforce that the pool is fully distributed before proceeding back to Camp.
- Clean up arena unit status cards by removing individual combat XP progress bars, replacing them with a compact team pool badge in the arena ribbon.
- Retain the existing Camp constellation leveling mechanics (`allocateCampArchetypePoint`) unchanged.

**Non-Goals:**
- Creating a persistent global XP bank in Camp (XP is distributed to unit records immediately post-battle).
- Allowing reserve/benched recruits to receive combat XP directly (only deployed squad heroes participate in the harvest).
- Redesigning class constellation unlock thresholds or waypoint attunement rules.

## Architecture & Data Flow

```
+-------------------------------------------------------------------+
|                           COMBAT ARENA                            |
|                                                                   |
|  Player Unit Action (AP Cost N)                                  |
|         |                                                         |
|         v                                                         |
|  resolver.ts: state.partyXpPool[archetype] += Math.max(1, N)      |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                         TRIAL OUTCOME                             |
|                                                                   |
|   Victory: Retain 100% of partyXpPool                             |
|   Defeat:  Retain 50% (Math.floor(partyXpPool * 0.5))             |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                   HARVEST DISTRIBUTION MODAL                      |
|                                                                   |
|  Pool Available: [ 3 FRC | 4 FIN | 2 FOC ]                       |
|  [⚡ Auto-Fill / Distribute Evenly]                               |
|                                                                   |
|  Hero 1: [+] [-]  |  Hero 2: [+] [-]  |  Hero 3: [+] [-]          |
|                                                                   |
|  Validation: Pool remaining must be 0                             |
|  Action: [ Proceed to Camp ] / [ Retreat to Camp ]               |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                        CAMP ADVANCEMENT                           |
|                                                                   |
|  transitions.ts: resolveCampaignVictory / Defeat                  |
|  unit.progression.accumulatedXp += allocatedShare                 |
|                                                                   |
|  Hero Progression Drawer: Level up heroes via accumulatedXp       |
+-------------------------------------------------------------------+
```

## Decisions

### 1. Harvest & Feed Model vs Global Camp XP Bank
- **Choice**: Distribute combat XP to deployed squad members immediately post-battle via a dedicated Harvest Distribution dialog. Distributed XP lands in `unit.progression.accumulatedXp`.
- **Rationale**:
  - Preserves thematic integrity: deployed heroes who fought earn the growth, rather than recruits sitting in reserve gaining passive power.
  - Zero disruption to Camp architecture: `HeroProgressionDrawer`, `allocateCampArchetypePoint`, and constellation progression logic remain untouched.
  - Avoids leaving awkward fractional or leftover XP in a global bank between trials.
- **Alternatives Considered**:
  - *Global Camp Bank*: Keep all XP in a shared campaign pool where nodes are purchased directly in Camp. Rejected because it disconnects combat participation from unit growth and complicates waypoint purchasing when multiple heroes want the same pool.

### 2. Mandatory Pool Depletion with Auto-Fill Ergonomics
- **Choice**: The post-trial modal requires the pool to reach 0 before enabling progression, with an "⚡ Distribute Evenly / Auto-Fill" button alongside manual `+` / `-` controls.
- **Rationale**: Guarantees players never forget to distribute earned XP, while Auto-Fill provides zero-friction progression when the player simply wants quick, balanced distribution.
- **Alternatives Considered**:
  - *Optional distribution*: Allowing unallocated XP to vanish or float. Rejected because losing hard-earned XP by accidental early click feels terrible.

### 3. AP-Scaled Combat XP Formula
- **Choice**: Ability XP = `Math.max(1, ability.apCost ?? 1)`. Moving grants 0 XP.
- **Rationale**: Directly resolves the action economy disparity between fast 1 AP classes and heavy 2 AP / 3 AP classes. Slower heroes with high AP commitments earn equal progression value for their turn investment.
- **Alternatives Considered**:
  - *Flat 1 XP per turn*: Favors low-AP skill cycling.
  - *Bonus multiplier for specific classes*: Arbitrary and difficult to balance across hybrid constellations.

### 4. 50% XP Retention on Defeat
- **Choice**: `Math.floor(pool[archetype] * 0.5)` retained on trial defeat.
- **Rationale**: Prevents failed attempts from feeling like total wasted time while preserving meaningful stakes.
- **Alternatives Considered**:
  - *100% retention on defeat*: Diminishes challenge and urgency.
  - *0% retention*: Overly punishing, exacerbating level stalling.

### 5. Combat HUD Simplification
- **Choice**: Remove individual `hud-xp-tracker` progress bars from `UnitStatusCard.tsx`; display a compact collective pool indicator in the arena top ribbon (`InitiativeRibbon`).
- **Rationale**: Eliminates visual clutter from the tactical unit cards where players primarily need combat vitals (HP, AP, CTB, conditions).

## Risks / Trade-offs

- **[Risk] Post-battle click fatigue if party pool is large**
  - *Mitigation*: The "⚡ Distribute Evenly / Auto-Fill" button immediately allocates the pool evenly across squad members in one click. Steppers allow quick fine-tuning.
- **[Risk] Defeat with small pool yields 0 XP due to integer rounding**
  - *Mitigation*: `Math.floor(x * 0.5)` is intentional; if total pool is 1 XP, losing yields 0, which correctly reflects minimal effort in early round wipes.
- **[Risk] Slower units taking fewer turns in very short fights**
  - *Mitigation*: Because the pool is shared, even if an encounter ends before a slow unit takes a second turn, the fast units' actions contribute to the squad pool, which can then be fed directly to the slower unit.
