# Spec Delta: hero-progression-drawer

## ADDED Requirements

### Requirement: Combat Manifest Ability Archetype Presentation
The Hero Progression Drawer SHALL render standard archetype discipline badges (`FORCE`, `FINESSE`, `FOCUS`) on class core abilities in the Combat Manifest, matching the visual hierarchy and badge styling of equipped resonant wildcard abilities.

#### Scenario: Core abilities display archetype tags in Combat Manifest
- **WHEN** a player inspects any hero in the progression drawer
- **THEN** each core class ability card in the Combat Manifest displays an archetype badge (`FORCE`, `FINESSE`, or `FOCUS`) matching its declared discipline tag

#### Scenario: Visual consistency across core and wildcard ability mini cards
- **WHEN** viewing the Combat Manifest section of the progression drawer
- **THEN** core class abilities and resonant wildcard abilities utilize matching font, styling, and color coding for discipline badges
