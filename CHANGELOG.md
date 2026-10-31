# Changelog

All notable changes to Astral Tactics are documented in this file.

## [0.9.1] - 2026-10-30

### Critical Damage Breakdown & Combat Log Presentation Polish (UX.8, UX.10)
- **Explicit Critical Hit Breakdown**: Formatted critical hit breakdowns in `damageEngine.ts` with explicit labels (`[Crit: X max + Y roll] + mod - armor -> damage`) to clearly distinguish maximized base values from rolled dice.
- **Spaced Attack Roll Modifiers (UX.10)**: Normalized d20 attack check operators with spaces (`16 + 1`, `20 - 2`) across combat logs and UI roll chips, eliminating confusing double signs like `20+-2`.
- **Causal Combat Log Narrative**: Reordered log event appending so attack actions are recorded in the combat log prior to reactive condition outcomes.
- **Dedicated Challenge Defied Card (UX.8)**: Styled challenge defiance events as distinct `CONDITION_BROKEN` cards with a `⚔️ CHALLENGE DEFIED` badge and warning context notes.

## [0.9.0] - 2026-10-29

### Visual Dice Tumbler Tray & Polyhedral Attack Breakdown
- **Procedural 2.5D SVG Polyhedral Dice**: Pure SVG geometry and isometric gradient lighting for d20 and damage dice (d4, d6, d8, d10, d12) with 0 external 3D engine dependencies.
- **Top-Center Celestial Clash Banner**: Glassmorphic obsidian clash tray overlaying the upper arena canvas with gold celestial borders and backdrop blur.
- **Two-Stage Roll Sequencing**: Stage 1 animates the d20 attack check against the target's defense score; Stage 2 animates the kinetic damage dice roll on successful hits.
- **Advantage & Disadvantage Dual Rolls**: Renders dual d20s for Advantage and Disadvantage checks with real-time dimming and strikethrough slash discard styling.
- **Kinetic Impact & Settle Flares**: Dynamic CSS keyframe tumbling, landing zoom snaps, golden critical hit flares, and outcome stamps (`CRITICAL HIT!`, `SOLID HIT`, `GRAZE`, `MISS!`).
- **Interactive Click-to-Skip**: Dismiss or fast-forward active tumbling animations instantly via mouse click anywhere, Spacebar, or Enter key, without delaying combat pacing.
- **Persistent Combat Header Toggle**: Added `[🎲 Tray: ON/OFF]` button in the combat header with `localStorage` persistence, providing instant resolution when disabled.
- **Headless Core Breakdown Architecture**: Pure TypeScript data contract (`DiceRollBreakdown`, `DamageDieRoll`) attached to `AttackResolution` across core resolvers and damage engines with 100% test coverage.

## [0.8.0] - 2026-10-28

### Movement Path Stepping Stones, 3D Elevation Lift & Step Badges (UX.1)
- **Lifted Hex Stepping Stones**: Hovering any reachable tile in `MOVE` action mode physically lifts each sequential path hex by 5px (`projectElevationY - 5px`), casting a 3D dark under-lip shadow (`stepping-stone-lip`) onto the base terrain to create floating stepping-stone visibility.
- **Amber & Gold Palette Contrast**: Tiles along the active path illuminate in warm amber/gold (`#fbbf24`, `rgba(245, 158, 11, 0.48)`) with soft glow filters, contrasting cleanly against the cyan field of all reachable hexes (`#06b6d4`).
- **Sequential Step Number Badges**: Each path step displays a tactical circular step number badge (`1`, `2`, `3`...) centered on the lifted surface, matching the AP cost progression to that destination.
- **Cliff-Drop Hazard Badges**: Steps plunging down cliffs ($\Delta h \le -2$) switch to crimson danger styling with hazard badges (`⚠️` + step number), coordinating with the destination fall hazard damage banner (`⚠️ Fall Hazard: -X HP`).
- **Destination Pulse Ring**: The destination hex features an anchored pulsating dashed ring (`path-dest-ring`) marking the final landing position.
- **Clean Tactical Typography**: Underlying coordinate labels (`q,r`) are automatically suppressed on active path steps to eliminate visual clutter.

## [0.7.2] - 2026-10-28

### Harvest Trial Spoils UX Polish & XP Threshold Previews
- **Master-Detail Squad Dock & Inspector**: Replaced cramped multi-column cards with a scalable master-detail layout featuring a left squad member dock and an expansive right-hand unit inspector, eliminating box overflow and future-proofing the dialog for larger party sizes.
- **Aligned 3-Column Stepper Grid**: Structured stepper rows into a spacious 3-column CSS Grid (`100px 1fr 90px`) with full discipline labels (`FORCE`, `FINESSE`, `FOCUS`) and generous button padding.
- **Clean Number Formatting**: Removed redundant `+` prefixes from stepper allocation values, displaying clean non-negative integers (`0`, `1`, `2`).
- **Button Spacing & Ergonomics**: Added dedicated horizontal margins to `[-]` and `[+]` stepper buttons and expanded button targets to 30px squares.
- **Level Requirement Card Meta**: Displayed hero progression thresholds once in the unit inspector meta header (e.g. `Level 0 (Req: 5 XP)` or `(MAX)`), removing redundant divisor clutter from individual rows.
- **Milestone Readiness Badges**: Replaced raw `Total: #` strings with styled right-aligned pills that illuminate in emerald/amber with a `★` indicator in both the squad dock and inspector when projected archetype XP meets or exceeds the promotion threshold.
- **Action Validation Tooltip**: Relocated bottom-left warning text to a hover tooltip (`"Allocate all remaining XP to continue"`) on the disabled "Proceed to Camp" button container, keeping the dialog footer clean.

## [0.7.1] - 2026-10-27

### Combat Polish, UI Feedback & Bug Fixes
- **Facing Compass Overlay Layer**: Hoisted facing compass chevrons to a top-level SVG overlay layer rendered above all unit standees, eliminating chevron occlusion during tactical facing selection.
- **Skirmish Floating Text**: Skirmish tactical repositioning now displays a dedicated `'RETREAT!'` floating text instead of `'KNOCKBACK!'`.
- **Infiltrator AI Self-Buff Scope**: Isolated self-targeted abilities (such as Smoke Veil) to only evaluate the acting unit, preventing AI from erroneously targeting teammates.
- **Ground-Targeted AoE Resolution**: Ground targeting on unoccupied hexes (such as Arcane Blast) now displays the spellcast roll and score (e.g. `🎲 14+2 (Score 16)`) alongside total splash damage tagged with `(Total)`, giving players immediate transparency into why splash victims hit or resisted against their DCs.
- **Rich Condition Combat Log Cards**: Added first-class styled combat log cards for stealth breaks (`👤 STEALTH BROKEN`) and turn-start Damage-over-Time ticks (`🔥 BURN TICK`, `🧪 POISON TICK`) with vitals tracking.
- **Combat Manifest Archetype Badges**: Added colored archetype discipline badges (`FORCE`, `FINESSE`, `FOCUS`) to core class abilities in the Hero Progression Drawer.

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
