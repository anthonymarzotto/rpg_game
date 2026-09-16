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
* **Current Initiative (`initiativeGauge`)**: Real-time counter ($0–100$) tracking progress toward the unit's next turn.

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

The game avoids rigid round-based "Player Phase vs. Enemy Phase" turns in favor of a dynamic, speed-driven **Charge Time Battle (CTB)** tick engine with a flexible **Action Point (AP)** economy.

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

### 3.3. Positional Modifiers *(Illustrative Examples — Values Subject to Playtesting)*
* **Flanking**: Striking a target with an adjacent ally grants Advantage or a flat bonus on the attack roll.
* **Rear Strike**: Striking directly from behind grants Advantage and increases Critical threshold.
* **High Ground / Elevation**: Ranged attacks from higher elevation gain range or attack roll bonuses.

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

## 5. Ability Delivery & Action Models

The three ability mechanics explored are not mutually exclusive and can coexist across classes and progression:

1. **Open Tactical Kit (Universal Baseline)**:
   * Standard tactical loadout of abilities (Move, Attack, Defend, Class Skills) available each turn, fueled by Action Points. Serves as the primary baseline for the Level-0 recruit and foundational classes.
2. **Action Dice / Dice-Face Crafting**:
   * Can serve as a specialized mechanic for luck/gambler/martial classes (e.g. *Gambler*, *Trickster*, or customized equipment), where faces of a combat die trigger unique maneuvers.
3. **Tactical Cards / Battle Gambits**:
   * Can serve as a party-wide commander deck or tactical trick cards (e.g. *Bard*, *Strategist*, *Warlord*) drawn across battle rounds to augment standard turns.
