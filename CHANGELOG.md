# Changelog

All notable changes to Astral Tactics are documented in this file.

## [0.6.0] - 2026-10-25

### Ruins Obstacles & Standees
- Added 8-directional ruins obstacle tokens with pixel-art standees rendered directly on elevated hex surfaces.
- Implemented deterministic rotation selection and realistic hex surface drop shadows.

### Knight Commander Kit Rework & Synergy Taunt
- Re-architected the Knight class into a tactical Commander archetype.
- Added the **Exposed** status condition: foes that attack anyone other than their challenger suffer incoming Advantage on the next attack against them.
- Enhanced **Lead the Charge** (2 AP) to grant a +2 Attack roll buff alongside +2 Speed and +2 Movement for nearby allies in a 3-hex radius.
- Added +1d4 bonus physical damage to **Pommel Strike** against Challenged targets.
- Added visual indicator badges and status card integration for the Exposed condition.

### Tactical AI & Elevation Control
- AI decision-making now evaluates threat weighting to target high-value backline casters despite low-ground hit penalties.
- Added **Slow** movement denial heuristics to disrupt enemy approach routes.
- Integrated fall damage and ledge drop calculations when applying knockback against targets near cliffs.

### Class Mobility & Signature Exclusivity
- Enforced signature ability exclusivity across hero loadouts (wildcard slots are strictly reserved for Domain Pool and off-node skills).
- Thief's **Shadow Step** now requires same-elevation hexes for rapid repositioning without cliff bypass.
- Cat-Burglar's **Rooftop Vault** expanded to 3-hex range with full 3D vertical leaping and +2 Evasion.

### World Lore Codex
- Introduced the in-game Lore Codex with canonical background lore and starter articles on world factions.

### Ground Area-of-Effect & Defense Contests
- Added ground-targeted **Arcane Blast** spells with unified defense contests.

---

## [0.5.0] - 2026-10-23

### Highwayman & Witch Balance
- Decoupled automatic attack roll Advantage from **Sneak Attack**, retaining +1d6 precision damage for true positional flank attacks.
- Rebalanced the Witch kit: **Poppet Needle** (2 AP, 2d4 damage), **Baleful Hex** (poison & CTB turn delay vs Resolve), and **Witch's Talisman** (+2 Speed, +2 Ward).

### Stealth Mechanics & Detection Cones
- Implemented persistent stealth lifecycle with directional front-arc detection on movement steps and turn starts.
- Added combat log notification cards for passive trigger events (Elusive Stride) and detection alerts (Spotted!).

### Squad Simulation Benchmarks
- Added 3v3 mixed-tier squad benchmark harness and automated cross-class simulation testing.
