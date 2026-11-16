# Spec Delta

## MODIFIED Requirements

### Requirement: Combat Manifest Ability Archetype Presentation
The Hero Progression Drawer SHALL render standard archetype discipline badges (`FORCE`, `FINESSE`, `FOCUS`) on class core abilities and resonant wildcard abilities in the Combat Manifest, and SHALL present every ability across the Combat Manifest, Class Inspector, Waypoint Inspector, and Off-Node Domain Skill Draft modal using the unified Hybrid Ability Description layout (thematic flavor sentence, scannable Stat Strip pills, and generated human-readable Effect Clauses).

When Astral Augment Shards are socketed into an ability slot in the Combat Manifest, the slot card SHALL immediately reflect the modified stats and any appended shard effects in the Stat Strip pills and Effect Clauses, highlighted in Shard provenance styling.

#### Scenario: Core abilities display archetype tags in Combat Manifest
- **WHEN** a player inspects any hero in the progression drawer
- **THEN** each core class ability card in the Combat Manifest displays an archetype badge (`FORCE`, `FINESSE`, or `FOCUS`) matching its declared discipline tag

#### Scenario: Visual consistency across core and wildcard ability mini cards
- **WHEN** viewing the Combat Manifest section of the progression drawer
- **THEN** core class abilities and resonant wildcard abilities utilize matching font, styling, and color coding for discipline badges, flavor text, Stat Strip pills, and Effect Clauses

#### Scenario: Socketing an Astral Augment Shard dynamically updates and highlights Combat Manifest ability stats
- **WHEN** a player sockets an Astral Augment Shard (such as *Bloodbound Shard*, *Starlight Lens*, or *Venom Shard*) into a core or wildcard ability slot in the Combat Manifest
- **THEN** the ability card's Stat Strip pills, cost badges, and Effect Clauses immediately update to display the augmented values (e.g., upgraded die tier, flat damage bonus, HP cost, or appended Poison effect) highlighted in Shard provenance color
