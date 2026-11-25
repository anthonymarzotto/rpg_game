# Spec Delta: Hero Progression Drawer

## ADDED Requirements

### Requirement: Shard Compatibility Feedback & Automatic Unsocketing
When rendering the Astral Augment Shard selector dropdown for an ability slot in the Hero Progression Drawer Combat Manifest, the drawer SHALL evaluate every unassigned earned shard against the base ability currently occupying that slot:
- Compatible shards SHALL be selectable normally.
- Incompatible shards SHALL still be displayed in the dropdown as disabled options accompanied by a concise incompatibility reason (e.g., `Requires damaging attack`, `Requires hostile AoE`, `Requires melee attack`) so players understand why they cannot be socketed into that slot.

When the player changes a hero's active class or swaps/clears a wildcard ability in the Hero Progression Drawer, the drawer SHALL automatically unsocket any shard that is incompatible with the newly occupying ability in that slot (or left on an empty wildcard slot) before committing the updated loadout, returning those shards to the hero's unassigned shard inventory while keeping compatible shards socketed.

#### Scenario: Incompatible earned shards appear disabled with reason in slot dropdown
- **WHEN** a hero who owns `Starlight Lens` (requires damaging attack) and `Shadow Shard` (universal) inspects the shard selector for `Smoke Veil` (`SELF`, `damageType: 'NONE'`)
- **THEN** `Shadow Shard` appears as an enabled selectable option
- **THEN** `Starlight Lens` appears in the dropdown as a disabled option displaying its incompatibility reason

#### Scenario: Switching active class auto-unsockets incompatible shards and keeps compatible ones
- **WHEN** a hero with `Shadow Shard` and `Bloodbound Shard` socketed in core slot 0 (`Sneak Attack`) switches active class to `Knight` (putting `Lead the Charge`, a `SELF` non-damaging aura, in slot 0)
- **THEN** `Bloodbound Shard` is automatically removed from slot 0 and becomes available in the unassigned shard inventory
- **THEN** `Shadow Shard` remains socketed in slot 0 and augments `Lead the Charge`
- **THEN** the loadout update succeeds without validation error
