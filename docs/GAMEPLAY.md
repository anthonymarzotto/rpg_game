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
| **Force** | Fighter | Raw kinetic impact & physical resilience | Base HP scaling, melee/kinetic damage bonus, innate Armour mitigation, physical knockback resistance |
| **Finesse** | Rogue | Tactical tempo, agility, and precision | CTB tick speed (turn frequency), Movement range, Attack hit roll ($d20$) bonus, Evasion target DC, Critical threshold |
| **Focus** | Mage | Mental clarity, range, and magical mastery | Ability range, Area of Effect (AoE) blast radius, Resolve target DC, innate Ward mitigation, spell damage dice |

### 1.2. Derived Combat Vitals

These vitals are computed from a unit's base attributes and archetype points. *(Formulas below are illustrative examples)*:

#### Survivability & Mobility
* **Max Health (`maxHp`)**: Total damage a unit can absorb before falling. Scaled primarily by base unit HP, Force, and level progression.
* **Speed (`speed`)**: The rate at which a unit's action gauge fills per clock tick in the CTB system. Derived from **Finesse**.
* **Movement (`move`)**: The radius in hexes a unit can traverse during a move action. Base value (e.g. 3 hexes) plus potential Finesse tier bonuses.
* **Current Initiative (`initiativeGauge`)**: Real-time counter ($0–100$) tracking progress toward the unit's next turn.

#### Target Defenses (The "To Hit" Targets)
* **Evasion (`evasion`)**: Target DC for kinetic/physical strikes and projectile attacks. Derived from **Finesse** (e.g., base $10 + \text{Finesse}$). Governs how difficult the unit is to hit cleanly.
* **Resolve (`resolve`)**: Target DC for arcane spells, psychic strikes, and magical debuffs. Derived from **Focus** (e.g., base $10 + \text{Focus}$). Governs mental and magical resistance against being affected.

#### Damage Mitigation (The Damage Soak)
* **Armour (`armor`)**: Flat physical damage reduction absorbing kinetic blows that connect. Derived innately from **Force** *(with equipped physical gear/shields contributing when itemization is introduced)*.
* **Ward (`ward`)**: Flat magical/elemental damage reduction absorbing arcane damage that connects. Derived innately from **Focus** *(with equipped magical attire/talismans contributing when itemization is introduced)*.

> [!TIP]
> **Items & Equipment Note**: Items (weapons, armor, shields, accessories) will plug directly into these stats (e.g., heavy breastplates adding to Armour, robes adding to Ward, bucklers boosting Evasion). Detailed itemization rules and equipment requirements are deferred until core stats and abilities are finalized.

---

## 2. Turn Economy: CTB (Charge Time Battle) Tick Engine

The game avoids rigid round-based "Player Phase vs. Enemy Phase" turns in favor of a dynamic, speed-driven **Charge Time Battle (CTB)** tick engine (similar to *Final Fantasy Tactics* and *Grandia*).

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
[Unit Takes Action Turn]           [Advance Next Tick]
 - Move (up to Move stat)
 - Execute Action / Spell
 - Reset gauge (gauge -= 100)
```

### 2.1. CTB Rules
1. **Asynchronous Turn Ordering**: Units with high **Finesse** accumulate gauge faster and act more frequently than lumbering, low-Finesse units.
2. **Turn Handoff**: When a unit reaches $\ge 100$ gauge, the combat clock pauses and grants control to that unit.
3. **Gauge Reset & Overflow**: After completing their action, 100 points are subtracted from their gauge. Any overflow above 100 is preserved, ensuring speed advantages are never clipped.
4. **Action Cost Variations *(Example)* **: Units that take only a partial turn (e.g. Move only, or Wait without acting) can receive a partial gauge refund (e.g., reset to 20 instead of 0), rewarding decisive tactical conservation.

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

```
┌─────────────────────────────────────────────────────────────┐
│ 1. THE ATTACK ROLL (To Hit)                                 │
│    Roll: 1d20 (or 2d20 with Advantage/Disadvantage)        │
│          + Attacker Finesse (Physical) or Focus (Magical)   │
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
│    Add: Force (Physical) or Focus (Magical) Modifier        │
│                                                             │
│    Mitigation:                                              │
│      - Physical Damage ──► Subtract Target ARMOUR           │
│      - Magical Damage  ──► Subtract Target WARD             │
│                                                             │
│    Net Damage = Max(1, Total Roll - Target Mitigation)      │
└─────────────────────────────────────────────────────────────┘
```

### 3.3. Positional Modifiers *(Illustrative Examples — Values Subject to Playtesting)*
* **Flanking**: Striking a target with an adjacent ally grants Advantage or a flat bonus on the attack roll.
* **Rear Strike**: Striking directly from behind grants Advantage and increases Critical threshold.
* **High Ground / Elevation**: Ranged attacks from higher elevation gain range or attack roll bonuses.

---

## 4. Dual-Layer Presentation: Logs & Visual Dice

To deliver maximum satisfaction and transparency:

1. **Simulation Layer (Seeded PRNG & Transparent Combat Log)**:
   * Combat simulation uses a seeded deterministic pseudo-random number generator, ensuring headless Vitest tests and battle replays are fully reproducible.
   * Every calculation is output to a rich, inspectable combat log:  
     `[Roll: 14 + 3 (Finesse) + 2 (Flank) = 19 vs Evasion 16 -> HIT! Damage: (1d8: 6) + 3 (Force) - 2 (Armour) = 7]`
2. **Render & Animation Layer (Visual Dice Pop)**:
   * Dynamic tumbling 2D/3D dice roll on screen or in an action flyout during attacks, settling on numbers with crisp audio clatter.
   * Natural 20s flash gold with screen impact; Grazes and Misses have distinct visual and audio cues.

---

## 5. Ability Delivery & Action Models

The three ability mechanics explored are not mutually exclusive and can coexist across classes and progression:

1. **Open Tactical Kit (Universal Baseline)**:
   * Standard tactical loadout of abilities (Move, Attack, Defend, Class Skills) available each turn. Serves as the primary baseline for the Level-0 recruit and foundational classes.
2. **Action Dice / Dice-Face Crafting**:
   * Can serve as a specialized mechanic for luck/gambler/martial classes (e.g. *Gambler*, *Trickster*, or customized equipment), where faces of a combat die trigger unique maneuvers.
3. **Tactical Cards / Battle Gambits**:
   * Can serve as a party-wide commander deck or tactical trick cards (e.g. *Bard*, *Strategist*, *Warlord*) drawn across battle rounds to augment standard turns.
