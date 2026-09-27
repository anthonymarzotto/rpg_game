# Design

## Context

The core combat engine ([resolver.ts](file:///c:/Repos/rpg_game/src/core/combat/resolver.ts)) is completely decoupled from UI and progression, taking an `EncounterDefinition` and producing a deterministic `CombatState` with per-unit `inBattleXp`. However, the game currently lacks a meta-game layer: units do not store persistent accumulated XP between battles ([class.ts](file:///c:/Repos/rpg_game/src/core/types/class.ts)), and the only available battle is the hardcoded sandbox ([noviceSandbox.ts](file:///c:/Repos/rpg_game/src/data/encounters/noviceSandbox.ts)).

See `proposal.md` for background and user requirements.

## Goals / Non-Goals

**Goals:**
- Provide pure, headless `CampaignState` and transition reducers in `src/core/campaign/`.
- Extend `UnitProgression` to track `accumulatedXp: ArchetypePoints` across battles.
- Implement an extensible Threat / Challenge Rating encounter generator capable of building balanced procedural battles and hex arenas from party strength and stage index.
- Model Camp lifecycle: full HP restoration, victory XP banking, defeat XP reversion, multi-level advancement, and wildcard loadout customization.
- Maintain 100% headless Vitest test coverage without React or browser dependencies.

**Non-Goals:**
- UI components (Camp Hub screen, barracks cards, stage selector) — deferred to Phase 3.2.
- IndexedDB / localStorage persistence drivers — deferred to Phase 3.3.
- Permadeath or persistent wounds — deferred to future updates.
- New class tiers or status conditions — deferred to Phase 4.

## Decisions

### Decision 1: Persistent `accumulatedXp` on `UnitProgression`
* **Choice**: Add `accumulatedXp: ArchetypePoints` directly to `UnitProgression`.
* **Rationale**: Makes character progress self-contained. When a unit uses *Strike* (+1 Fighter) and *Spark* (+1 Mage) in combat, those points directly update the unit's personal bank on victory.
* **Alternatives Considered**: 
  - *Shared Squad XP pool*: Discarded because unit progression in our 100-class lattice is strictly individualized based on personal combat actions.
  - *External tracking Map*: Discarded to keep `Unit` completely serializable and atomic.

### Decision 2: Threat / Challenge Rating Budgeting for Encounters
* **Choice**: Calculate squad threat $T_{\text{squad}} = \sum T_{\text{unit}}$ and scale encounter budget by $T_{\text{budget}} = T_{\text{squad}} \times (1.0 + 0.1 \times (\text{stage} - 1))$.
* **Rationale**: Eliminates hardcoded tutorial stages. A squad of 3 Level-0 Novices ($3 \times 10 = 30$ pts) faces a 30 pt budget, which can spawn 3 recruit enemies or 1 Level-1 veteran bandit. As units level up, encounter difficulty organically scales.
* **Alternatives Considered**:
  - *Hardcoded encounter sequence*: Discarded because it does not allow procedural "Generate New Battle" rerolls or dynamic squad configurations.

### Decision 3: Revert In-Battle XP on Defeat
* **Choice**: On defeat, discard `inBattleXp` from that attempt and restore squad HP to full in Camp.
* **Rationale**: Prevents degenerate death-farming (repeatedly entering battles and dying just to accumulate XP). Players can retry the exact encounter or generate a fresh skirmish at that stage without penalty.
* **Alternatives Considered**:
  - *Keep partial XP on defeat*: Discarded to preserve tactical stakes.

### Decision 4: Preserved Multi-Archetype XP on Level Advancement
* **Choice**: When spending threshold XP on an archetype (e.g. 5 XP for Level 1), deduct the cost only from that archetype. Retain all excess XP in that archetype and all XP in other archetypes.
* **Rationale**: Strongly rewards hybrid experimentation and supports multi-level advancements in a single Camp session if a unit has accumulated sufficient points across archetypes.
* **Alternatives Considered**:
  - *Wipe all XP on level up*: Discarded as overly punitive to hybrid playstyles.

### Decision 5: Pure JSON-Serializable CampaignState
* **Choice**: `CampaignState` contains only plain TypeScript primitives, arrays, and plain objects (no `Map`, `Set`, methods, or circular references).
* **Rationale**: Guarantees zero friction when saving to IndexedDB in Phase 3.3.

## Risks / Trade-offs

- **[Risk: Unwinnable procedural terrain]** → *Mitigation*: The arena generator verifies that a walkable path exists between player deployment tiles and enemy deployment tiles using the existing axial A* pathfinder ([pathfinding.ts](file:///c:/Repos/rpg_game/src/core/grid/pathfinding.ts)). If blocked, obstacle placement is regenerated.
- **[Risk: Enemy action economy advantage]** → *Mitigation*: Threat budget enforces maximum unit count constraints (e.g. max 4 enemies in early stages) so recruits are not overwhelmed by sheer action economy.
- **[Risk: Breaking changes to existing tests]** → *Mitigation*: `accumulatedXp` is initialized with default `{ fighter: 0, rogue: 0, mage: 0 }` in unit factories, preserving backward compatibility across all Phase 1 and Phase 2 unit tests.
