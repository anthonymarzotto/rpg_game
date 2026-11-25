# Spec Delta: Off-Node Progression

## ADDED Requirements

### Requirement: Intent-Driven Shard Compatibility and Domain-Boundary Enforcement
Astral Augment Shard compatibility evaluation SHALL determine whether an ability is hostile from an explicit declarative intent contract (`'HOSTILE' | 'FRIENDLY' | 'SELF'`, declared explicitly on non-damaging ground-targeted `HEX` abilities and defaulting safely to non-hostile for unannotated non-damaging `HEX` abilities) and SHALL determine whether an ability supports hostile target infusions from centralized effect metadata capabilities rather than hard-coded effect-type exclusions.

Automatic pruning of incompatible or empty-slot socketed shards SHALL be enforced at the campaign domain boundary (`updateCampUnitLoadout`) on every loadout update before strict loadout validation, returning any removed shards to the unit's unassigned shard inventory.

Combat loadout resolution (`resolveUnitLoadout`) SHALL defensively skip any socketed shard that fails compatibility evaluation against the slot's base ability so legacy or externally modified saves containing incompatible shards never apply illegal modifiers during combat.

#### Scenario: Unannotated friendly ground-targeted AoE rejects hostile infusion shards
- **WHEN** shard compatibility evaluates `Venom Shard` or `Supernova Flare` against a non-damaging ground-targeted `HEX` AoE ability with `intent: 'FRIENDLY'` (or omitted `intent`)
- **THEN** both shards evaluate as incompatible rather than treating every non-teleport `HEX` AoE as hostile

#### Scenario: Campaign loadout transition auto-prunes incompatible shards regardless of caller
- **WHEN** `updateCampUnitLoadout` is called directly to switch a hero's active class, change a wildcard ability, or update a wildcard passive on a unit whose loadout contains an incompatible shard
- **THEN** incompatible shards are automatically pruned back into the unit's unassigned shard inventory before validation
- **THEN** compatible shards remain socketed and the transition succeeds without throwing

#### Scenario: Combat loadout resolution skips incompatible shards from legacy saves
- **WHEN** `resolveUnitLoadout` hydrates combat abilities for a hero loaded from a legacy save that has `Aether Shard` socketed on `Minor Ward` (`ALLY`, `damageType: 'NONE'`) alongside `Shadow Shard` (`ANY`)
- **THEN** `Aether Shard` is skipped and `Minor Ward` retains `damageType: 'NONE'` and `defenseTarget: 'NONE'`
- **THEN** `Shadow Shard` still applies cleanly to `Minor Ward`
