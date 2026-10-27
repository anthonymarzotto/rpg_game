# Changelog

All notable changes to Astral Tactics are documented in this file.

## [0.7.0] - 2026-10-26

### In-Combat Unit Inspection & Tactical Zero-Hover Badges
- **Unit Pinning**: Click any combatant (ally or enemy) or timeline ribbon chip during combat to pin their inspection card in the secondary HUD slot.
- **Equipped Ability Loadout & CTB Display**: Inspect pinned unit's equipped skills (name, AP cost, reach/range, description), remaining AP, and turn clock progress.
- **Smart Condition Badges**: Active condition pills display source attribution (e.g. `⚔️ CHALLENGED (2t • Garrick): Disadv`) and tactical effect mnemonics (`+Adv`, `Disadv`, `2 dmg/t`) directly on cards and standees.
- **Instant Condition & Passive Tooltips**: Hovering active condition badges or passive trait chips in unit cards and the action bar provides rich, zero-latency in-engine tooltips with names, source attribution, readiness states, and full mechanical rule text.
- **Board-Side Standee Status Bubble Hover**: Standee status bubbles directly on the battlefield hexes now support native hover tooltips without losing targeting focus.
- **Right-Click Targeting Cancellation**: Right-clicking anywhere on the combat canvas cancels ability targeting back to `IDLE` mode and suppresses the browser context menu. Dismiss pinned cards anytime with `Escape` or by clicking empty arena ground.

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
