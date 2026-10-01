# Gameplay Systems & Combat Specification

This document defines the core gameplay systems, character stat mechanics, turn sequencing, and combat resolution rules for the game.

> [!NOTE]
> Values, formulas, modifier numbers, and skill quantities noted throughout this document are **illustrative examples** designed to explain mechanics and are subject to playtesting and tuning.

---

## 1. The Triad Vector Stat Architecture

Rather than traditional split combat stats (Physical Atk vs. Magic Atk) or complex D&D 6-attribute blocks (STR, DEX, CON, INT, WIS, CHA), the game uses the **Triad Vector** model.

The Triad Vector maps directly to the three vertices of the 100-class pyramid (**Fighter, Rogue, Mage**). Every point in an archetype directly empowers its corresponding vector, ensuring **no stat points are ever wasted for hybrid classes**.

```
                       [ FORCE ] (Fighter)
                  Power • Armor • Health Pool
                             ▲
                            / \
                           /   \
                          /     \
                         /       \
                        /         \
      [ FINESSE ] ◄─────────────────► [ FOCUS ]
      (Rogue)                          (Mage)
  Turn Rate • Move • Precision     Range • Blast AoE • Arcana
```

### 1.1. Core Triad Attributes

| Attribute | Archetype | Tactical Meaning | Primary Combat Influence |
| :--- | :---: | :--- | :--- |
| **Force** | Fighter | Raw kinetic impact & physical resilience | Base HP scaling, melee/kinetic damage bonus, innate Armor mitigation, physical knockback resistance |
| **Finesse** | Rogue | Tactical tempo, agility, and precision | CTB tick speed (turn frequency), Movement distance per AP, Attack hit roll ($d20$) bonus, Evasion target DC, Critical threshold |
| **Focus** | Mage | Mental clarity, range, and magical mastery | Ability range, Area of Effect (AoE) blast radius, Resolve target DC, innate Ward mitigation, spell damage dice |

### 1.2. Derived Combat Vitals

These vitals are computed from a unit's base attributes and archetype points. *(Formulas below are illustrative examples)*:

#### Survivability, Resources & Mobility
* **Max Health (`maxHp`)**: Total damage a unit can absorb before falling. Scaled primarily by base unit HP, Force, and level progression.
* **Action Points (`maxAp`)**: The tactical currency granted at the start of every turn. Uniform across units (standard **3 AP** per turn).
* **Speed (`speed`)**: The rate at which a unit's action gauge fills per clock tick in the CTB system. Derived from **Finesse**.
* **Movement (`move`)**: The distance in hexes a unit can traverse for each **1 AP** spent on movement. Base value (e.g. 3 hexes) plus potential Finesse tier bonuses.
* **Current Initiative (`initiativeGauge`)**: Real-time accumulator counter ($0–100$) tracking progress toward the unit's next turn. Presented in the player interface as **Initiative** and the dynamic **Turn Queue**.

#### Target Defenses (The "To Hit" Targets)
* **Evasion (`evasion`)**: Target DC for kinetic/physical strikes and projectile attacks. Derived from **Finesse** (e.g., base $10 + \text{Finesse}$). Governs how difficult the unit is to hit cleanly.
* **Resolve (`resolve`)**: Target DC for arcane spells, psychic strikes, and magical debuffs. Derived from **Focus** (e.g., base $10 + \text{Focus}$). Governs mental and magical resistance against being affected.

#### Damage Mitigation (The Damage Soak)
* **Armor (`armor`)**: Flat physical damage reduction absorbing kinetic blows that connect. Derived innately from **Force** *(with equipped physical gear/shields contributing when itemization is introduced)*.
* **Ward (`ward`)**: Flat magical/elemental damage reduction absorbing arcane damage that connects. Derived innately from **Focus** *(with equipped magical attire/talismans contributing when itemization is introduced)*.

> [!TIP]
> **Items & Equipment Note**: Items (weapons, armor, shields, accessories) will plug directly into these stats (e.g., heavy breastplates adding to Armor, robes adding to Ward, bucklers boosting Evasion). Detailed itemization rules and equipment requirements are deferred until core stats and abilities are finalized.

---

## 2. Turn Economy: CTB Tick Engine & Action Points (AP)

The game avoids rigid round-based "Player Phase vs. Enemy Phase" turns in favor of a dynamic, speed-driven continuous accumulator engine (presented to players as **Initiative** and the **Turn Queue**) with a flexible **Action Point (AP)** economy.

```
               [ GLOBAL COMBAT CLOCK ]
                         │
                         ▼
        Advance all units by their Speed:
      gauge += Speed (Units tick asynchronously)
                         │
                         ▼
          Does any unit reach gauge >= 100?
             /                       \
           YES                        NO
           /                            \
[Unit Turn: Receives 3 AP]         [Advance Next Tick]
 - Spend AP on Move (1 AP = up to Move hexes)
 - Spend AP on Basic Actions (1 AP, spammable)
 - Spend AP on Special Skills (2–3 AP, once/turn)
 - Conclude Turn
                         │
                         ▼
[Gauge Reset with Dynamic AP Refund]
 gauge = overflow + (unspentAP * refundPerAP)
```

### 2.1. CTB Rules
1. **Asynchronous Turn Ordering**: Units with high **Finesse** accumulate gauge faster and act more frequently than lumbering, low-Finesse units.
2. **Turn Handoff**: When a unit reaches $\ge 100$ gauge, the combat clock pauses and grants control to that unit.
3. **Overflow Retention**: Any gauge accumulated beyond 100 before the turn starts is retained, ensuring speed advantages are never lost.

### 2.2. The Action Point (AP) Economy
* **Standard Pool**: Every unit receives **3 AP** upon taking their turn.
* **Movement (1 AP)**: Spending 1 AP allows the unit to traverse up to their `move` stat in hexes. Units can spend multiple AP on movement in a single turn to sprint across the battlefield.
* **Basic Actions (1 AP)**: Baseline strikes, cantrips, and simple maneuvers cost 1 AP and are **spammable** (can be executed multiple times in one turn if AP permits).
* **Special / Heavy Skills (2–3 AP)**: Powerful maneuvers cost 2 or 3 AP and carry a **"Once per Turn"** limit or short cooldown to prevent repetitive spamming.

### 2.3. Dynamic CTB Turn Recovery (Unspent AP)
To reward tactical conservation, a unit recovers **20 initiative gauge points per unspent AP** upon concluding their turn (gauge reset baseline = `overflow + (unspentAP * 20)`), accelerating the arrival of their next turn.

### 2.4. Autonomous Tactical Enemy AI
Hostile combatants operate on an autonomous tactical decision model evaluated against the dynamic battlefield state:
* **Behavioral Archetypes**: Enemies embody tactical profiles—**Brawlers** advance to close melee distance; **Skirmishers** prioritize high-mobility flanking routes into rear arcs; **Snipers & Casters** maintain standoff engagement ranges while preserving line-of-sight; **Buffers** reinforce injured or frontline allies.
* **Threat & Target Prioritization**: Evaluates target lethality (finishing blows on low-health heroes), defensive weaknesses (targeting low Evasion with kinetic attacks and low Resolve with magic), and focus firing.
* **Action Economy & CTB Conservation**: Evaluates composite move-and-act options against their 3 AP turn budget, choosing to bank unspent AP for the +20 CTB gauge refund when further actions yield low utility.

---

## 3. Combat Resolution: Dice Rolling & Tactical RNG

Combat embraces non-deterministic D&D-style dice rolls combined with tactical grid positioning. Three complementary mechanics combine to make rolls exciting while preventing unfair misses:

### 3.1. The Three Harmonious Dice Mechanics
1. **Tactical Advantage & Disadvantage**:
   * Rolling $2d20$ and taking the higher (Advantage) or lower (Disadvantage) result based on positioning (high ground, flanking, rear strikes) or status effects.
2. **Glancing Blows / Grazes**:
   * Attacks that narrowly miss target defense still land as a **Graze** (dealing reduced damage, e.g. 50%), preventing frustrating "all-or-nothing" turns when tactical play was sound.
3. **Weapon & Spell Dice Variance**:
   * Different weapons and spells roll distinct dice profiles (e.g. daggers roll $1d4/1d6$ with wider crit ranges; greatswords roll $2d6$; maces roll $1d8$; spells roll pools like $3d6$).

### 3.2. Resolution Flow

Combat actions explicitly define their attack and damage modifier attributes directly on the ability contract.

* **Baseline Standard**: Physical/kinetic attacks use **Finesse** for the attack roll and **Force** for kinetic damage against Armor, while magical/arcane spells use **Focus** for both the attack roll and spell damage against Ward.
* **Extensibility**: Each ability independently encodes `attackModifierAttribute` and `damageProfile.modifierAttribute`. While baseline novice abilities follow the standard contract, future specialized abilities (e.g. brute-force crushing blows using Force to hit, psychic strikes, or agile precision spells) can break this standard and bind to alternative attributes.

```
┌─────────────────────────────────────────────────────────────┐
│ 1. THE ATTACK ROLL (To Hit)                                 │
│    Roll: 1d20 (or 2d20 with Advantage/Disadvantage)        │
│          + Ability Attack Modifier Attribute                │
│            (Standard: Finesse for Physical, Focus for Magic)│
│          + Positional Bonuses                               │
│                                                             │
│    Target Defense:                                          │
│      - Physical / Kinetic Attacks  ──► Target EVASION       │
│      - Magical / Arcane Spells     ──► Target RESOLVE       │
│                                                             │
│    Outcomes:                                                │
│      - Beat Target by 10+ or Nat 20 ──► CRITICAL HIT        │
│      - Meet or Beat Target Defense  ──► SOLID HIT (100% dmg)│
│      - Narrow Miss (e.g. within 5)  ──► GRAZE (50% dmg)     │
│      - Wide Miss                    ──► CLEAN MISS          │
└──────────────────────────────┬──────────────────────────────┘
                               │ (On Hit, Crit, or Graze)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. THE DAMAGE ROLL                                          │
│    Roll: Attack Dice Profile (e.g. 1d8, 2d6)                │
│    Add: Ability Damage Modifier Attribute                   │
│         (Standard: Force for Physical, Focus for Magic)     │
│                                                             │
│    Mitigation:                                              │
│      - Physical Damage ──► Subtract Target ARMOR             │
│      - Magical Damage  ──► Subtract Target WARD             │
│                                                             │
│    Net Damage = Max(1, Total Roll - Target Mitigation)      │
└─────────────────────────────────────────────────────────────┘
```

### 3.3. Directional Facing, Combat Arcs & Reactive Facing
Tactical positioning centers on true unit orientation on the hex grid. Every unit faces one of the six adjacent hex directions, dynamically rotating upon moving or attacking. The surrounding space divides into three distinct combat arcs:
* **Front Arc (180°)**: Direct forward and front-diagonal hexes (offsets 0, 1, 5). Normal engagement arc.
* **Flank Arc**: Lateral side hexes at ±120° (offsets 2, 4). Striking from a flank exposes defensive vulnerabilities.
* **Rear Arc**: Direct 180° blind spot behind the unit (offset 3). Highly vulnerable to precision strikes.

**On-Hit Reactive Facing**:
* When a unit is struck by an attack (Solid Hit, Critical Hit, or Graze), **they immediately rotate to face the attacker's hex**. Secondary living units hit by splash/cleave damage likewise rotate to face the attack origin.
* This on-hit reaction creates an active tactical feedback loop: an attacker cannot stand in place and land repeated rear strikes against a solo target without spending AP to reposition or having an ally maintain a pincer.

**Tactical Advantage & Positional Conditions**:
* Striking an opponent from their **Flank** or **Rear** arc triggers positional bonuses for abilities with a `FLANK_OR_REAR` condition (such as the Thief's `Sneak Attack`, which gains **Advantage** on the attack roll and bonus precision damage). Generic basic attacks (e.g. `Strike`) do not inherently gain Advantage from facing unless enhanced by specific traits (such as `Momentum`) or ability contracts.
* **Allied Pincers**: If an ally of the attacker is engaged adjacent to the target, the target is considered flanked from all arcs regardless of their individual facing, enabling coordinated team flanking.
* **Elevation & High Ground**: Ranged attacks from higher elevation gain range or attack roll bonuses.

### 3.4. Tactical Grid Mechanics & Displacement
* **Orientation**: Pointy-topped hexagonal tiles mapped in axial `(q, r)` and cube `(x, y, z)` spaces.
* **Elevation**: Discrete integer heights (`0, 1, 2...`). Moving up an elevation difference $> 1$ is blocked without climbing abilities.
* **Occupancy & Passability**: Strict single-unit occupancy. All occupied hexes (friendly or hostile) block movement pathing.
* **Line-of-Sight (LoS)**: Both terrain obstacles (higher elevation) and intermediate units physically block Line-of-Sight for ranged abilities, allowing frontline units to screen allies.
* **Knockback & Wall-Slam Collision**:
  * When pushed (e.g. `Shield Bash`), the target displaces along the attacker $\rightarrow$ target vector.
  * If the destination hex is off-map, a cliff/wall (elevation rise $\ge 2$), or occupied by another unit, displacement halts immediately.
  * The target suffers **Wall-Slam Damage**: $\max(1, (1 + \text{Attacker Force}) - \text{Target Armor})$. If colliding with another unit, both take 1 point of collision impact.

---

## 4. Dual-Layer Presentation: Logs & Visual Dice

To deliver maximum satisfaction and transparency:

1. **Simulation Layer (Seeded PRNG & Transparent Combat Log)**:
   * Combat simulation uses a seeded deterministic pseudo-random number generator, ensuring headless Vitest tests and battle replays are fully reproducible.
   * Every calculation is output to a rich, inspectable combat log:  
     `[Roll: 14 + 3 (Finesse) + 2 (Flank) = 19 vs Evasion 16 -> HIT! Damage: (1d8: 6) + 3 (Force) - 2 (Armor) = 7]`
2. **Render & Animation Layer (Visual Dice Pop)**:
   * Dynamic tumbling 2D/3D dice roll on screen or in an action flyout during attacks, settling on numbers with crisp audio clatter.
   * Natural 20s flash gold with screen impact; Grazes and Misses have distinct visual and audio cues.

---

## 5. Ability Delivery & Loadout Architecture

A unit's combat loadout balances core class identity with cross-class customization:

1. **Active Class Core Kit**:
   * Each unit designates one active class unlocked from their constellation.
   * The active class defines the unit's baseline combat deck: **1 Unique Signature Ability** + **2 Domain Pool Abilities** + **1 Innate Passive Trait**.
2. **Cross-Class Wildcard Slots**:
   * Units equip additional wildcard abilities and passives unlocked from any past class along their constellation path:
     * **Active Wildcards** (2 slots): Expand active tactical options with abilities from past classes or recruit starters.
     * **Passive Wildcard** (1 slot): Equips a secondary passive trait to create synergistic hybrid builds.
3. **Alternative Delivery Mechanics (Specialized / Future)**:
   * **Action Dice / Dice-Face Crafting**: Specialized mechanic for luck/gambler classes where custom combat die faces trigger maneuvers.
   * **Tactical Cards / Battle Gambits**: Commander trick cards (e.g. *Bard*, *Strategist*, *Warlord*) drawn across battle rounds to augment standard turns.

---

## 6. Campaign & Expedition Meta-Loop

Between tactical skirmishes, players manage their persistent roster, awaken recruits, attune conduits, and ascend through the celestial class constellation from **The Nexus** (Expedition Camp Hub).

### 6.1. The Nexus & Squad Management
* **The Vanguard (Active Squad)**: 
  * A fixed deployment of **3 Wayfarer conduits** attuned for expedition combat.
  * Only units assigned to The Vanguard deploy to the hex grid when entering a combat trial.
* **The Enclave (Reserve Barracks)**: 
  * Unassigned Wayfarers rest in The Enclave, where they can be inspected, leveled up, or rotated into the active vanguard.
* **Awakening Novices**: 
  * Players can awaken fresh **Novice** Wayfarers to expand their roster across different archetypes.
* **Smart Attunement & Wayfarer Swapping**: 
  * Two-way substitutions allow fluid swapping between The Vanguard and The Enclave without destructive roster modifications.

### 6.2. Procedural Encounters & Dynamic Threat Budgeting
Rather than static encounter tables, expeditions present procedural trials scaled dynamically to the attuned squad:
* **Dynamic Threat Budgeting**: Evaluates the cumulative power, level, and archetype distribution of The Vanguard to establish a balanced combat threat cap.
* **Encounter Generation**: Spends the threat budget across tactical enemy archetypes (**Brawlers**, **Skirmishers**, **Snipers**, **Buffers**) and environmental obstacle density.
* **Sector Stages**: Completing a combat trial advances the expedition sector stage, scaling the baseline threat budget for subsequent trials.

### 6.3. Post-Battle Reconciliation & Stakes
At the conclusion of each combat trial, battle results are bridged back into the persistent campaign state:
* **Triumphs & Eclipses**:
  * **Triumph**: Achieved upon routing all hostiles or fulfilling encounter objectives. Advances the expedition sector stage and increments the Triumph counter.
  * **Eclipse**: Suffered upon a full squad wipeout. Records an Eclipse in the expedition log while preserving camp meta-progress.
* **Vitals Persistence & Recovery**: Surviving Wayfarers carry over their remaining HP between trials; fallen units are revived upon returning to The Nexus.
* **Archetype XP Conversion**: In-battle archetype experience points accumulated from tactical actions (Fighter, Rogue, Mage) carry over to power character ascension.

### 6.4. Constellation Ascension & The 100-Class Lattice
Wayfarers progress by channeling accumulated archetype experience into **Ascension Points**:
* **Constellation Spend**: Players allocate earned Ascension points into the three archetype vertices (Force / Fighter, Finesse / Rogue, Focus / Mage).
* **Tier Thresholds & Unlocks**: Reaching required archetype thresholds unlocks advanced classes along the 100-class celestial pyramid (advancing from Novice into Tier 1 foundations like *Warrior*, *Thief*, *Wizard*, and subsequently into deep hybrid specializations like *Battlemage*, *Spellblade*, *Shadow Dancer*, etc.).
* **Loadout Customization**: Once unlocked, Wayfarers can freely adopt that class as their Active Class or equip its abilities into their **Active Wildcard** and **Passive Wildcard** slots at The Nexus.
