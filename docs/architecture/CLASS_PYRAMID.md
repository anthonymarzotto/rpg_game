# Class Pyramid & Constellation Progression Specification

## 1. Overview & Core Concept
The **Class Pyramid** is the core progression system for units in the game.
* Units progress through **9 total levels**.
* Each level grants 1 point into one of three primary archetypes: **Fighter**, **Rogue**, or **Mage**.
* Units traverse the pyramid, unlocking and collecting classes based on their accumulated archetype points.
* Completed progression traces a **"Constellation"** across a celestial star chart representing the unit's permanent legacy path.

---

## 2. Core Progression Rules

### 2.1. Recruitment & Starting State
* **Level 0 (Novice)**: Units are recruited as a blank slate with `(0 Fighter, 0 Rogue, 0 Mage)`.
* **First Step (Level 1)**: Actions in their very first battle organically steer them into one of the three foundational corner classes at Level 1:
  * `Warrior (1, 0, 0)`
  * `Thief (0, 1, 0)`
  * `Wizard (0, 0, 1)`

### 2.2. Experience & Level-Up Mechanics
* **Action Tagging**: Every combat action, weapon strike, and spell carries archetype tags (`Fighter`, `Rogue`, or `Mage`) and accumulates XP toward that archetype when executed.
* **Post-Battle Tally**: Progression calculations and level-ups occur post-battle during the camp/results sequence.
* **Sequential Multi-Leveling**: If a unit earns enough XP to gain multiple levels in a long battle, level-ups are resolved sequentially.
* **Threshold Tie-Breaking**: If multiple archetypes qualify in the same battle, resolution follows the **chronological order of actions** in combat. If exactly tied, the player chooses which archetype advances first.

### 2.3. Pyramid Traversal & Lockout Rules
* **Total Level Cap**: Exactly 9 levels per unit (`Fighter + Rogue + Mage <= 9`).
* **Archetype Cap**: Maximum 5 points in any single archetype (`0 <= F, R, M <= 5`).
* **Strict Lockouts**:
  * **Tier Lockout**: At level `L = F + R + M`, only classes requiring exactly `Total Points == L + 1` can be unlocked next. All classes requiring fewer points (`Total Points < L`) or unselected classes of the current tier (`Total Points == L`) are permanently locked out.
  * **Archetype Incompatibility Lockout**: Because archetype points are strictly additive and cannot be refunded or decreased, any class requiring fewer points in *any* archetype than what the unit currently possesses ($F_{\text{class}} < F_{\text{unit}} \lor R_{\text{class}} < R_{\text{unit}} \lor M_{\text{class}} < M_{\text{unit}}$) is permanently locked out.
* **Next-Level Eligibility**: A class is eligible for unlock at the immediate next level ($L + 1$) if and only if its total required points equal $L + 1$ and all its archetype requirements are greater than or equal to the unit's current points ($F_{\text{class}} \ge F_{\text{unit}} \land R_{\text{class}} \ge R_{\text{unit}} \land M_{\text{class}} \ge M_{\text{unit}}$).
* **Coordinate Mapping**: Every class in the 100-class pyramid occupies a unique `(F, R, M)` coordinate.
* **Off-Node Levels**: Certain intermediate coordinates (e.g. `(1, 1, 0)` at Level 2) do not possess a class node. For these levels, class acquisition is bypassed; compensatory benefits (stat surges / perks) are deferred to align with broader stat system design.
* **Conflict Resolution**: If future mechanics or expansions cause multiple classes to be eligible simultaneously, the player is presented with a choice modal.

### 2.4. Class Benefits & Constellation Traversal
* **Cumulative Mastery**: Every collected class node along the traversal permanently grants its unique passive perks and active abilities to the unit.
* **Primary Identity**: The unit's latest or highest-tier class serves as their active title and primary archetype identity.
* **Permanent Capstone**: Level 9 marks the sealed completion of the unit's Constellation. There is no respec or prestige; builds are permanent.

### 2.5. UI & Presentation
The progression chart offers two cohesive visualizations of the 100-class equilateral pyramid:
* **Triangle Mosaic**:
  * Visualizes the pyramid as 100 interlocking triangular stained-glass tiles forming a grand equilateral triangle.
  * Alternates between upright ($\Delta$) and inverted ($\nabla$) facet tiles.
  * **Warrior** (`#00`, 1F 0R 0M) occupies the top apex vertex.
  * **Thief** (`#81`, 0F 1R 0M) occupies the bottom-left apex vertex.
  * **Wizard** (`#99`, 0F 0R 1M) occupies the bottom-right apex vertex.
  * **Bard** (`#42`, 3F 3R 3M) sits at the exact geometric centroid $(0, 0)$.
  * Dynamic tile states: unlocked tiles glow in radiant gold, eligible next-level classes pulse with amber borders, locked-out classes dim into dark translucent obsidian, and future pathways retain subtle archetype tinting.
* **Star Pyramid**:
  * Renders a celestial star chart with star nodes located at the centroids of the 100 pyramid cells over a subtle triangular wireframe mesh.
* **Constellations**: Unlocked classes are interconnected by glowing celestial laser lines charting the unit's historical path from Novice through their Capstone.

---

## 3. Lattice Partition Distribution

The pyramid encompasses 100 classes across 9 tiers:

| Tier (Total Points) | Class Nodes | Total Possible Partitions | Coverage |
| :---: | :---: | :---: | :---: |
| **Tier 1** | 3 | 3 | 100% (Warrior, Thief, Wizard) |
| **Tier 2** | 3 | 6 | 50% (Knight, Infiltrator, Sorcerer) |
| **Tier 3** | 6 | 10 | 60% |
| **Tier 4** | 6 | 15 | 40% |
| **Tier 5** | 9 | 21 | 43% |
| **Tier 6** | 9 | 25 | 36% |
| **Tier 7** | 12 | 27 | 44% |
| **Tier 8** | 27 | 27 | 100% (Full coverage) |
| **Tier 9** | 25 | 25 | 100% (Full coverage) |
| **Total** | **100** | **139** | — |

### 3.1. Geometric Tessellation Model (10-Row Equilateral Triangle)

The 100 classes in the Master Catalog are mapped row-by-row into a 10-row equilateral triangle tessellation ($10^2 = 100$ small triangles):

$$\sum_{r=0}^{9} (2r + 1) = 1 + 3 + 5 + 7 + 9 + 11 + 13 + 15 + 17 + 19 = 100$$

* **Closed-Form Tile Mapping**:
  * For catalog index $i \in [0..99]$:
    * **Row**: $r = \lfloor\sqrt{i}\rfloor \in [0..9]$
    * **Column**: $c = i - r^2 \in [0..2r]$
    * **Orientation**: Upright ($\Delta$) when $c$ is even ($55$ total); Inverted ($\nabla$) when $c$ is odd ($45$ total).
* **Key Landmarks**:
  * **Top Vertex**: Row 0, Col 0 $\rightarrow$ `#00` **Warrior** `(1, 0, 0)`
  * **Bottom-Left Vertex**: Row 9, Col 0 $\rightarrow$ `#81` **Thief** `(0, 1, 0)`
  * **Bottom-Right Vertex**: Row 9, Col 18 $\rightarrow$ `#99` **Wizard** `(0, 0, 1)`
  * **Pyramid Centroid**: Row 6, Col 6 $\rightarrow$ `#42` **Bard** `(3, 3, 3)` (exact geometric center $(0, 0)$).

---

## 4. The 100 Classes Master Catalog

| No. | Class | Fighter | Rogue | Mage | Total Points |
| :---: | :--- | :---: | :---: | :---: | :---: |
| 00 | Warrior (Corner) | 1 | 0 | 0 | 1 |
| 01 | Cavalier | 2 | 1 | 0 | 3 |
| 02 | Knight | 2 | 0 | 0 | 2 |
| 03 | Berserker | 2 | 0 | 1 | 3 |
| 04 | Pugilist | 3 | 2 | 0 | 5 |
| 05 | Shield-bearer | 3 | 1 | 0 | 4 |
| 06 | Weapon Master | 3 | 1 | 1 | 5 |
| 07 | Dragoon | 3 | 0 | 1 | 4 |
| 08 | Sentinel | 3 | 0 | 2 | 5 |
| 09 | Fencer | 4 | 3 | 0 | 7 |
| 10 | Soldier | 4 | 2 | 0 | 6 |
| 11 | Samurai | 4 | 2 | 1 | 7 |
| 12 | Martial Artist | 4 | 1 | 1 | 6 |
| 13 | Monk | 4 | 1 | 2 | 7 |
| 14 | Dragon Knight | 4 | 0 | 2 | 6 |
| 15 | Dark Knight | 4 | 0 | 3 | 7 |
| 16 | Archer | 5 | 4 | 0 | 9 |
| 17 | Corsair | 5 | 3 | 0 | 8 |
| 18 | Beast Rider | 5 | 3 | 1 | 9 |
| 19 | Ronin | 5 | 2 | 1 | 8 |
| 20 | Warlord | 5 | 2 | 2 | 9 |
| 21 | Herald | 5 | 1 | 2 | 8 |
| 22 | Inquisitor | 5 | 1 | 3 | 9 |
| 23 | Blade-singer | 5 | 0 | 3 | 8 |
| 24 | Paladin | 5 | 0 | 4 | 9 |
| 25 | Marksman | 4 | 5 | 0 | 9 |
| 26 | Duellist | 4 | 4 | 0 | 8 |
| 27 | Marauder | 4 | 4 | 1 | 9 |
| 28 | Raider | 4 | 3 | 1 | 8 |
| 29 | Adventurer | 4 | 3 | 2 | 9 |
| 30 | Strategist | 4 | 2 | 2 | 8 |
| 31 | Diplomat | 4 | 2 | 3 | 9 |
| 32 | Templar | 4 | 1 | 3 | 8 |
| 33 | Spellsword | 4 | 1 | 4 | 9 |
| 34 | Death Knight | 4 | 0 | 4 | 8 |
| 35 | Battlemage | 4 | 0 | 5 | 9 |
| 36 | Bandit | 3 | 4 | 0 | 7 |
| 37 | Gunslinger | 3 | 5 | 0 | 8 |
| 38 | Assassin | 3 | 5 | 1 | 9 |
| 39 | Ranger | 3 | 4 | 1 | 8 |
| 40 | Ninja | 3 | 4 | 2 | 9 |
| 41 | Merchant | 3 | 3 | 2 | 8 |
| 42 | Bard | 3 | 3 | 3 | 9 |
| 43 | Dancer | 3 | 2 | 3 | 8 |
| 44 | Arcane Archer | 3 | 2 | 4 | 9 |
| 45 | Red Mage | 3 | 1 | 4 | 8 |
| 46 | Blue Mage | 3 | 1 | 5 | 9 |
| 47 | Cleric | 3 | 0 | 5 | 8 |
| 48 | Battle-priest | 3 | 0 | 4 | 7 |
| 49 | Cutpurse | 2 | 3 | 0 | 5 |
| 50 | Scout | 2 | 4 | 0 | 6 |
| 51 | Hunter | 2 | 4 | 1 | 7 |
| 52 | Explorer | 2 | 5 | 1 | 8 |
| 53 | Beastmaster | 2 | 5 | 2 | 9 |
| 54 | Horizon Walker | 2 | 4 | 2 | 8 |
| 55 | Strider | 2 | 4 | 3 | 9 |
| 56 | Loremaster | 2 | 3 | 3 | 8 |
| 57 | Enchanter | 2 | 3 | 4 | 9 |
| 58 | Summoner | 2 | 2 | 4 | 8 |
| 59 | Psion | 2 | 2 | 5 | 9 |
| 60 | Elementalist | 2 | 1 | 5 | 8 |
| 61 | Necromancer | 2 | 1 | 4 | 7 |
| 62 | Druid | 2 | 0 | 4 | 6 |
| 63 | Acolyte | 2 | 0 | 3 | 5 |
| 64 | Highwayman | 1 | 2 | 0 | 3 |
| 65 | Ballistician | 1 | 3 | 0 | 4 |
| 66 | Spy | 1 | 3 | 1 | 5 |
| 67 | Poisoner | 1 | 4 | 1 | 6 |
| 68 | Trap-master | 1 | 4 | 2 | 7 |
| 69 | Dark Delver | 1 | 5 | 2 | 8 |
| 70 | Gambler | 1 | 5 | 3 | 9 |
| 71 | Mentalist | 1 | 4 | 3 | 8 |
| 72 | Tinker | 1 | 4 | 4 | 9 |
| 73 | Technomancer | 1 | 3 | 4 | 8 |
| 74 | Animist | 1 | 3 | 5 | 9 |
| 75 | Geomancer | 1 | 2 | 5 | 8 |
| 76 | Dream-walker | 1 | 2 | 4 | 7 |
| 77 | Channeler | 1 | 1 | 4 | 6 |
| 78 | Sage | 1 | 1 | 3 | 5 |
| 79 | Theurge | 1 | 0 | 3 | 4 |
| 80 | Warlock | 1 | 0 | 2 | 3 |
| 81 | Thief (Corner) | 0 | 1 | 0 | 1 |
| 82 | Infiltrator | 0 | 2 | 0 | 2 |
| 83 | Cat-burglar | 0 | 2 | 1 | 3 |
| 84 | Philanderer | 0 | 3 | 1 | 4 |
| 85 | Stalker | 0 | 3 | 2 | 5 |
| 86 | Chameleon | 0 | 4 | 2 | 6 |
| 87 | Trickster | 0 | 4 | 3 | 7 |
| 88 | Magician | 0 | 5 | 3 | 8 |
| 89 | Shadow-mancer | 0 | 5 | 4 | 9 |
| 90 | Alchemist | 0 | 4 | 4 | 8 |
| 91 | Binder | 0 | 4 | 5 | 9 |
| 92 | Conjurer | 0 | 3 | 5 | 8 |
| 93 | Illusionist | 0 | 3 | 4 | 7 |
| 94 | Shaman | 0 | 2 | 4 | 6 |
| 95 | Seer | 0 | 2 | 3 | 5 |
| 96 | Arcanist | 0 | 1 | 3 | 4 |
| 97 | Witch | 0 | 1 | 2 | 3 |
| 98 | Sorcerer | 0 | 0 | 2 | 2 |
| 99 | Wizard (Corner) | 0 | 0 | 1 | 1 |
