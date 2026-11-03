# Spec Delta: Tier 3 Cat-burglar

## MODIFIED Requirements

### Requirement: Feline Grace Passive Trait
The system SHALL provide an innate passive trait `Feline Grace` granting complete immunity to Fall Impact Damage (`immuneToFallDamage: true`), cat-like rebound during kinetic displacement (`canVaultOnKnockback: true`), acrobatic retreat step agility (`canVaultOnRetreat: true`), and +2 flat Evasion.

When a unit possessing `Feline Grace` executes a retreat step displacement (such as `Skirmish`) where the immediate retreat hex is an unwalkable obstacle, the unit SHALL vault over the obstacle to the far-side hex in the retreat trajectory provided that hex is walkable and unoccupied. When the immediate retreat destination tile is situated atop a steep cliff exceeding standard climb limits ($\Delta h > \text{maxClimbElevation}$), the unit SHALL vault directly up onto the cliff top destination hex rather than having displacement aborted.

#### Scenario: Negating Fall Impact Damage from plunging ledge drops
- **WHEN** a unit equipped with `Feline Grace` drops down a ledge with $\Delta h \le -2$ during movement, involuntary knockback, or retreat step displacement
- **THEN** the unit suffers 0 Fall Impact Damage and the combat log records safe landing via fall damage immunity

#### Scenario: Vaulting up onto cliffs on knockback
- **WHEN** a unit equipped with `Feline Grace` is displaced by knockback into an adjacent hex with elevation difference $\Delta h \ge 2$ that is walkable and unoccupied
- **THEN** the unit is displaced onto the cliff top instead of colliding with the cliff face, suffering 0 collision damage

#### Scenario: Vaulting over obstacles on knockback
- **WHEN** a unit equipped with `Feline Grace` is displaced by knockback toward an unwalkable 1-hex obstacle whose far-side hex in the knockback trajectory is walkable and unoccupied
- **THEN** the unit vaults over the obstacle to the far-side hex, suffering 0 collision damage

#### Scenario: Negating collision damage at arena boundary walls
- **WHEN** a unit equipped with `Feline Grace` is knocked back into an impassable arena perimeter wall or blocked tile with no open vault destination
- **THEN** the unit halts at the wall and suffers 0 wall-slam collision damage

#### Scenario: Vaulting up onto high cliff on retreat step
- **WHEN** a unit equipped with `Feline Grace` executes `Skirmish` or an ability with `RETREAT_STEP` where the retreat destination tile is at $\Delta h \ge 3$ and is walkable and unoccupied
- **THEN** the unit vaults up onto the cliff top destination hex rather than being blocked by the climb height limit

#### Scenario: Vaulting over obstacle on retreat step
- **WHEN** a unit equipped with `Feline Grace` executes `Skirmish` where the adjacent tile in the retreat direction is an unwalkable obstacle and the far-side tile is walkable and unoccupied
- **THEN** the unit vaults over the 1-hex obstacle and lands safely on the far-side tile
