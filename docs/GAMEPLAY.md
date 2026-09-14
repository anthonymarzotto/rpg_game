# Gameplay Systems & Combat Specification

This document defines the core gameplay systems, character stat mechanics, turn sequencing, and combat resolution rules for the game.

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
| **Force** | Fighter | Raw kinetic & magical impact; physical resilience | Base HP scaling, melee/kinetic damage bonus, Armor mitigation, physical knockback resistance |
| **Finesse** | Rogue | Tactical tempo, agility, and precision | CTB tick speed (turn frequency), Movement range (hexes), Attack hit roll ($d20$) bonus, Critical hit threshold |
| **Focus** | Mage | Mental clarity, range, and magical mastery | Ability range, Area of Effect (AoE) blast radius, Ward (arcane defense) mitigation, spell damage dice |

### 1.2. Derived Combat Vitals

These vitals are computed from a unit's base attributes, archetype points, and equipped items:

* **Max Health (`maxHp`)**: Total damage a unit can absorb before falling. Scaled primarily by base unit HP $+$ $(\text{Force} \times \text{Multiplier})$ $+$ Level.
* **Speed (`speed`)**: The rate at which a unit's action gauge fills per clock tick in the CTB system. Derived from **Finesse**.
* **Movement (`move`)**: The radius in hexes a unit can traverse during a move action. Base value (e.g., 3 hexes) $+$ Finesse threshold bonuses.
* **Armor (`armor`)**: Flat physical damage reduction derived from **Force** and physical equipment.
* **Ward (`ward`)**: Flat magical/elemental damage reduction derived from **Focus** and magical attire.
* **Current Initiative (`initiativeGauge`)**: Real-time counter ($0–100$) tracking progress toward the unit's next turn.

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
4. **Action Cost Variations**: Units that take only a partial turn (e.g. Move only, or Wait without acting) can receive a partial gauge refund (e.g., reset to 20 instead of 0), rewarding decisive tactical conservation.

---

## 3. Combat Resolution: Dice Rolling & Tactical RNG

Combat embraces non-deterministic, thrilling D&D-style dice rolls combined with tactical grid positioning.

### 3.1. The Resolution Loop

When an attack or ability targets an opponent, resolution proceeds through two discrete rolls:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. THE ATTACK ROLL (To Hit)                                 │
│    Roll: 1d20 + Finesse Modifier + Positional Advantage     │
│    Target Defense: Target Evasion / Armor Class (AC)        │
│                                                             │
│    - Roll >= Target Defense  ──► HIT (Proceed to Damage)    │
│    - Natural 20 (or >= Crit) ──► CRITICAL HIT (Max/Bonus)   │
│    - Roll < Target Defense   ──► MISS / DEFLECTED           │
└──────────────────────────────┬──────────────────────────────┘
                               │ (If Hit)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. THE DAMAGE ROLL                                          │
│    Roll: Weapon/Spell Dice (e.g. 1d8, 2d6)                  │
│    Add: Force (Physical) or Focus (Magical) Modifier         │
│    Subtract: Target Armor (Physical) or Ward (Magical)      │
│                                                             │
│    Net Damage = Max(1, Total Roll - Target Mitigation)      │
└─────────────────────────────────────────────────────────────┘
```

### 3.2. Positional Modifiers on Dice Rolls
* **Flanking**: Attacking an enemy with an ally adjacent to the target grants $+2$ to the attack roll.
* **Rear Strike**: Attacking directly from behind grants $+4$ to the attack roll and lowers the Critical threshold by 2.
* **High Ground / Elevation**: Ranged attacks from higher elevation add $+1$ die face to damage or $+2$ to range.

---

## 4. Ability Delivery Models (Under Exploration)

Three options for how abilities are selected and cast during a unit's turn:

1. **Open Tactical Kit (Baseline for Initial Implementation)**:
   * Each unit has an equipped list of active abilities (3–5 skills).
   * Abilities have resource costs (Mana / Cooldowns) and range constraints.
   * *Status*: Primary baseline for Milestone 1 & 2.

2. **Action Dice / Dice-Face Crafting**:
   * Units roll combat action dice at the start of their turn.
   * Specific class nodes unlock or upgrade faces on a unit's custom action die.
   * *Status*: Under design consideration for future specialization.

3. **Tactical Card Deck**:
   * Class nodes add signature technique cards to a personal deck drawn per turn.
   * *Status*: Under consideration.
