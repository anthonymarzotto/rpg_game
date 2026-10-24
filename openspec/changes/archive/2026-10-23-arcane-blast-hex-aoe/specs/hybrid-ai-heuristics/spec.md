# Spec Delta

## ADDED Requirements

### Requirement: AI Ground-Targeted AoE Evaluation
The AI decision engine SHALL evaluate candidate ground hexes across reachable arena tiles for damaging abilities with `targetType: 'HEX'` and `aoeRadius > 0`. For each valid candidate hex, the AI SHALL compute the expected damage against every hostile unit within the blast radius (combining direct damage if the center is occupied with secondary splash damage across adjacent foes), and SHALL apply a severe negative penalty for each friendly unit caught in the blast radius. The AI SHALL select the target hex that maximizes net hostile damage while avoiding or heavily minimizing allied friendly fire.

#### Scenario: AI targets ground hex between multiple enemies to maximize blast splash
- **WHEN** an AI Wizard has sufficient AP for `Arcane Blast` and detects two adjacent enemies where targeting the ground hex between them catches both in the 1-hex blast radius
- **THEN** the AI generates and scores the ground hex candidate, awarding positive utility for both expected hits
- **THEN** the AI prioritizes the multi-target ground blast over a single-target cantrip

#### Scenario: AI suppresses AoE blast when allies are caught in blast radius
- **WHEN** an AI actor evaluates a candidate blast hex that would catch an allied unit in the splash radius
- **THEN** the AI applies a friendly-fire penalty that reduces the candidate action score below the AP conservation threshold or below safe single-target alternatives
- **THEN** the AI selects an alternative safe target or ability to protect the ally
