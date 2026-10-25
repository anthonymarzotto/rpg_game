# Active Class Packages Catalog

This document catalogues all currently implemented class packages in **Astral Tactics**, defining their archetype coordinates, signature abilities, domain skill pools, innate passives, and AI behavioral profiles.

For core gameplay rules and ability execution architecture, see [`docs/architecture/GAMEPLAY.md`](file:///c:/Repos/rpg_game/docs/architecture/GAMEPLAY.md). For the 100-class lattice coordinates, see [`docs/architecture/CLASS_PYRAMID.md`](file:///c:/Repos/rpg_game/docs/architecture/CLASS_PYRAMID.md).

> [!IMPORTANT]
> **Signature Ability Exclusivity**: Signature abilities are strictly exclusive to their active class package. Only domain abilities and unlocked off-node abilities can be equipped into wildcard/resonant slots in a hero's loadout. Signature abilities can never be equipped by cross-class wildcards.

---

## 1. Foundation Classes (Tier 1)

### Warrior `(1, 0, 0)`
* **Archetype**: Pure Fighter — Resilient frontline combatant & kinetic striker.
* **Signature**: `Power Strike` (1 AP, range 1, 1d8 + Force physical damage vs Evasion).
* **Domain 1**: `Pommel Bash` (1 AP, range 1, 1d4 + Force physical damage vs Evasion, delays target CTB initiative by 20 on solid/crit hit).
* **Domain 2**: `Defensive Stance` (1 AP, self, grants +2 Armor for 1 turn).
* **Passive**: `Tempered Resolve` (Reduces incoming physical damage by 1 when HP <= 50%).
* **AI Profile**: `BRAWLER`

### Thief `(0, 1, 0)`
* **Archetype**: Pure Rogue — Agile skirmisher & flanking specialist.
* **Signature**: `Sneak Attack` (1 AP, range 1, 1d4 damage + 1d6 precision bonus when striking from Flank or Rear).
* **Domain 1**: `Shadow Step` (1 AP, range 2 teleport to an unoccupied same-elevation hex, bypassing intervening units and obstacles; strictly Δh = 0).
* **Domain 2**: `Skirmish` (1 AP, range 1, 1d4 + Finesse physical damage with 1-hex retreat step).
* **Passive**: `Quickstep` (+2 Speed to CTB turn frequency).
* **AI Profile**: `SKIRMISHER`

### Wizard `(0, 0, 1)`
* **Archetype**: Pure Mage — Arcane artillery & ranged evoker.
* **Signature**: `Magic Missile` (1 AP, range 3, 1d4 + Focus magical damage vs Resolve; guaranteed hit with no graze).
* **Domain 1**: `Arcane Spark` (1 AP, range 2, 1d6 + Focus magical damage vs Resolve).
* **Domain 2**: `Mana Ward` (1 AP, self, grants +2 Ward for 1 turn).
* **Passive**: `Starlight Attunement` (+1 Effective Range on all magical abilities).
* **AI Profile**: `SNIPER`

---

## 2. Specialized Classes (Tier 2)

### Knight `(2, 0, 0)`
* **Archetype**: Pure Fighter — Frontline leader & controller.
* **Signature**: `Lead the Charge` (2 AP, 3-hex aura granting +2 Move and +2 Speed to the Knight and all allies within range for 2 turns).
* **Domain 1**: `Challenging Shout` (1 AP, range 3, forces target to rotate to face the Knight and inflicts `CHALLENGED` for 2 turns).
* **Domain 2**: `Pommel Strike` (1 AP, range 1, 1d4 + Force physical damage vs Evasion and delays target CTB initiative by 20 on hit/crit).
* **Passive**: `Tactical Vanguard` (Seeds +25 starting initiative gauge at battle start).
* **AI Profile**: `BRAWLER`

### Infiltrator `(0, 2, 0)`
* **Archetype**: Pure Rogue — Shadow stalker & saboteur.
* **Signature**: `Expose Weakness` (1 AP, range 2, target suffers -2 Armor and -2 Evasion for 2 turns).
* **Domain 1**: `Smoke Veil` (1 AP, self, grants `STEALTH` for 1 turn; attacking from stealth rolls with Advantage and breaks stealth).
* **Domain 2**: `Toxic Shiv` (1 AP, range 1, 1d4 + Finesse physical damage vs Evasion and inflicts `POISON` for 2 turns).
* **Passive**: `Elusive Stride` (Moving during combat grants +2 Evasion until the start of the next turn).
* **AI Profile**: `SKIRMISHER`

### Sorcerer `(0, 0, 2)`
* **Archetype**: Pure Mage — Metamagic sculptor & wild magic conduit.
* **Signature**: `Spell Sculpt` (1 AP, once/turn, primes an in-combat ability modifier granting +1 Range and +1 AoE splash radius to the next cast Mage spell).
* **Domain 1**: `Ignite` (1 AP, range 2, 1d4 + Focus magical damage vs Resolve and inflicts `BURN` for 2 turns).
* **Domain 2**: `Gust` (1 AP, range 2, pushes target 1 hex away, triggering wall-slam collision rules if obstructed).
* **Passive**: `Wild Surge` (Critical hits with magical spells trigger a spontaneous 1d3 surge: +1 AP refund, +25 CTB boost, or 2 magic damage to a random enemy in range 3).
* **AI Profile**: `SNIPER`

---

## 3. Hybrid Classes (Tier 3)

### Cavalier `(2, 1, 0)`
* **Archetype**: Fighter / Rogue (Dominant Fighter) — Mounted shock vanguard & line breaker.
* **Signature**: `Lance Charge` (2 AP, straight-line 2–3 hex charge dealing 1d8 + Force physical damage and knocking target back 1 hex with wall-slam collision risk).
* **Domain 1**: `Ride-Through` (1 AP, 1d4 + Finesse saber strike advancing through target into rear hex when clear).
* **Domain 2**: `Flamboyant Flourish` (1 AP, aristocratic melee taunt inflicting `CHALLENGED` for 2 turns and granting self +2 Evasion for 1 turn).
* **Passive**: `Impact Velocity` (+2 flat collision and wall-slam damage bonus caused by this unit).
* **AI Profile**: `BRAWLER`

### Berserker `(2, 0, 1)`
* **Archetype**: Fighter / Mage (Dominant Fighter) — Blood-rage juggernaut & arcane reckoning.
* **Signature**: `Blood Frenzy` (1 AP + 3 HP self-sacrifice, primes next physical attack with +1 Die Step and +2 Attack Roll bonus).
* **Domain 1**: `Reckless Cleave` (2 AP, 2d4 + Force physical damage vs Evasion sweeping up to 2 adjacent frontal hexes; inflicts -2 Evasion on self for 1 turn).
* **Domain 2**: `Ignite Rage` (1 AP, 1d6 + Focus magic damage vs Resolve and inflicts `BURN` for 2 turns [2 dmg/turn]).
* **Passive**: `Deathbound Fury` (+2 flat damage to physical attacks and expands Crit threshold to 19–20 when current HP <= 50% max HP).
* **AI Profile**: `BRAWLER`

### Highwayman `(1, 2, 0)`
* **Archetype**: Rogue / Fighter (Dominant Rogue) — Gentleman ambusher & skirmish controller.
* **Signature**: `Point-Blank Buckshot` (2 AP, range 1–2, 1d8 + Finesse physical damage vs Evasion and knocks target back 1 hex with wall-slam collision risk).
* **Domain 1**: `Stand and Deliver!` (1 AP, range 1–2, utility hold-up inflicting 30 CTB initiative delay and -2 Armor for 2 turns).
* **Domain 2**: `Gallant Flourish` (1 AP, range 1, 1d4 + Finesse physical damage vs Evasion and grants self +2 Evasion for 1 turn).
* **Passive**: `Highway Toll` (+2 flat physical damage against targets with positive Armor > 0).
* **AI Profile**: `SKIRMISHER`

### Warlock `(1, 0, 2)`
* **Archetype**: Mage / Fighter (Dominant Mage) — Eldritch battlemage & soul brander.
* **Signature**: `Eldritch Blast` (2 AP, range 3, 1d8 + Focus magic damage vs Resolve and knocks target back 1 hex with wall-slam collision risk).
* **Domain 1**: `Pact Blade` (1 AP, range 1, 1d6 + Focus magic damage vs Resolve, bypassing physical Armor).
* **Domain 2**: `Hellfire Brand` (1 AP, range 2, 1d4 + Focus magic damage vs Resolve and inflicts `BURN` for 2 turns [2 dmg/turn]).
* **Passive**: `Soul Carapace` (Landing a magical attack grants self +1 Armor and +1 Ward for 1 turn).
* **AI Profile**: `SNIPER`

### Witch `(0, 1, 2)`
* **Archetype**: Mage / Rogue (Dominant Mage) — Occult hexer, sympathetic saboteur & tempo controller.
* **Signature**: `Baleful Hex` (1 AP, range 3, 1d4 + Focus magic damage vs Resolve; inflicts `POISON` for 2 turns and 20 CTB gauge delay).
* **Domain 1**: `Poppet Needle` (1 AP, range 3, 1d6 + Focus magic damage vs Resolve; pierces effigy, forcing target facing 180° away and inflicting -2 Resolve for 2 turns).
* **Domain 2**: `Witch's Talisman` (1 AP, range 2 on ally; grants target ally +25 CTB ticks and +2 Speed for 1 turn).
* **Passive**: `Misfortune Ward` (Protective proximity aura: attacks targeting allies or self within 2 hexes suffer -2 to their Attack Roll).
* **AI Profile**: `SUPPORT`

### Cat-Burglar `(0, 2, 1)`
* **Archetype**: Rogue / Mage (Dominant Rogue) — Second-story acrobat, rooftop infiltrator & tempo thief.
* **Signature**: `Rooftop Vault` (1 AP, range 3 hex leap to an unoccupied walkable hex, ignoring intervening obstacles, units, and vertical elevation climb barriers; grants self +2 Evasion for 1 turn upon landing).
* **Domain 1**: `Pilfer` (1 AP, range 1, 1d4 + Finesse physical damage vs Evasion; siphons 20 CTB initiative ticks from target into the Burglar on hit/crit).
* **Domain 2**: `Flash Powder` (1 AP, range 2 AoE radius 1; forces affected enemies to face 180° away and inflicts -2 Attack Roll for 1 turn).
* **Passive**: `Feline Grace` (Immune to Fall Impact Damage, rebounds safely over 1-hex obstacles and onto cliff tops during knockback without suffering wall-slam collision damage, and grants flat +2 Evasion).
* **AI Profile**: `SKIRMISHER`
