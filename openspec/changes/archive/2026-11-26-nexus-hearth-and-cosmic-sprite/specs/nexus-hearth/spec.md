# Spec Delta

## Purpose
Provides an animated Nexus Hearth campfire diorama in The Nexus showing the traveling company gathered and subtly milling around the fire, paired with a reusable luminous Cosmic Sprite companion featured in The Nexus and on the Start Screen.

## ADDED Requirements

### Requirement: Nexus Hearth Campfire Diorama and Company Presence
The system SHALL display a dedicated Nexus Hearth campfire diorama in The Nexus featuring the animated pixel campfire centerpiece on a twilight stone plaza with warm radial firelight and Y-depth layering, populated by the company's Wayfarers using their 8-way directional pixel sprites facing inward toward the fire.

#### Scenario: Gathering staged and resting Wayfarers around the hearth
- **WHEN** the player enters The Nexus with active staged Wayfarers and resting Wayfarers in their company
- **THEN** the Nexus Hearth renders the animated campfire centerpiece with staged Wayfarers arranged on the inner ring accented by a subtle golden ground halo and resting Wayfarers arranged along the outer plaza perimeter, capped cleanly for visual clarity while prioritizing staged and Ascension-ready companions

#### Scenario: Rendering with only staged Wayfarers on a new journey
- **WHEN** the player enters The Nexus on Trial 1 with 3 staged Wayfarers and 0 resting Wayfarers
- **THEN** the Nexus Hearth still renders a lively campfire scene with all 3 staged Wayfarers gathered around the fire facing inward

### Requirement: Cozy Staggered Milling and Plaza Edge Cycling
The system SHALL animate Wayfarers in the Nexus Hearth with unhurried, staggered motion where individual Wayfarers occasionally stroll between open plaza spots while rotating their 8-way sprite toward their movement direction, and resting Wayfarers occasionally stroll off to the twilight plaza edge and fade out while another resting Wayfarer wanders in from the edge.

#### Scenario: Wayfarer strolling to an open hearth spot
- **WHEN** a milling interval triggers for a settled Wayfarer in the Nexus Hearth
- **THEN** that Wayfarer smoothly glides to an unoccupied plaza spot using the 8-way rotation sprite matching its travel direction, and turns back toward the campfire upon arriving

#### Scenario: Resting Wayfarer wandering out and returning
- **WHEN** a resting Wayfarer is chosen to cycle out of the Nexus Hearth
- **THEN** it walks smoothly toward a twilight plaza edge waypoint and fades out, allowing another resting Wayfarer from the company roster (or the returning Wayfarer) to wander in from a plaza edge into an open outer spot

#### Scenario: Respecting reduced motion preferences
- **WHEN** the player's environment requests reduced motion (`prefers-reduced-motion: reduce`)
- **THEN** the Nexus Hearth keeps Wayfarers stationary at their initial spots facing the fire and disables wandering and ambient drift transitions

### Requirement: Interactive Hearth Inspection and Ascension Indicators
The system SHALL allow players to hover and click Wayfarer sprites in the Nexus Hearth to inspect them and spot companions ready for Ascension.

#### Scenario: Inspecting a Wayfarer from the Hearth
- **WHEN** the player clicks a Wayfarer sprite in the Nexus Hearth
- **THEN** the Hero Progression Drawer opens for that Wayfarer

#### Scenario: Highlighting Ascension-ready Wayfarers
- **WHEN** a Wayfarer present in the Nexus Hearth has accumulated enough discipline XP to ascend
- **THEN** that Wayfarer displays a subtle golden starlight indicator above their sprite in the diorama

### Requirement: Luminous Cosmic Sprite Presence in The Nexus and Start Screen
The system SHALL render a reusable luminous Cosmic Sprite companion with a glowing starlight core, twilight aura, and orbiting motes both inside the Nexus Hearth and as the animated emblem on the Start Screen.

#### Scenario: Cosmic Sprite drifting and reacting in The Nexus Hearth
- **WHEN** the player views The Nexus and hovers over a Wayfarer in the Hearth or on The Staging Dais
- **THEN** the Cosmic Sprite gently drifts toward that Wayfarer's position in the Hearth

#### Scenario: Cosmic Sprite flavor pulse on click
- **WHEN** the player clicks the Cosmic Sprite in the Nexus Hearth
- **THEN** the Sprite emits a soft starlight pulse and displays a brief, automatically fading one-line flavor whisper without obstructing camp controls

#### Scenario: Cosmic Sprite emblem on the Start Screen
- **WHEN** the player opens the Start Screen
- **THEN** the softly glowing Cosmic Sprite renders as the header emblem above the game title
