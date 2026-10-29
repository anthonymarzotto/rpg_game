# Spec Delta

## ADDED Requirements

### Requirement: Interactive Movement Path Preview and Hazard Segmentation
When an active player unit is in `MOVE` action mode, the combat arena SHALL render a visible movement path connecting the active unit's coordinate to the hovered destination hex along the calculated traversal path.

#### Scenario: Hovering reachable tile renders lifted movement path stepping stones
- **WHEN** the player enters `MOVE` mode and hovers over any reachable hex tile
- **THEN** the arena SHALL physically lift each sequential path hex by 5px above its elevation base with a 3D dark under-lip shadow
- **AND** each path hex step SHALL display a sequential step number badge (`1`, `2`, `3`...) centered on its lifted face
- **AND** the destination hex SHALL render an outer pulsating dashed ring

#### Scenario: Path clears when not hovering a reachable tile
- **WHEN** the cursor leaves the reachable tile area or hovers an unreachable/obstacle tile
- **THEN** the lifted stepping stones and step badges SHALL NOT be displayed

#### Scenario: Normal terrain steps display warm amber styling
- **WHEN** a movement path step traverses flat terrain ($\Delta h = 0$), climbs terraces ($\Delta h > 0$), or steps down a single tier ($\Delta h = -1$)
- **THEN** the path hex SHALL display warm amber/gold highlighting with soft glow to contrast against reachable cyan tiles

#### Scenario: Hazardous cliff drops highlight with warning styling
- **WHEN** a movement path step drops off a cliff ledge ($\Delta h \le -2$) inflicting fall impact damage
- **THEN** the specific step plunging off the ledge SHALL display warning crimson styling
- **AND** a hazard warning badge (`⚠️` + step number) SHALL be displayed on that step

