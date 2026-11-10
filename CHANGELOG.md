# Changelog

All notable changes to Astral Tactics are documented in this file.

## [0.14.1] - 2026-11-09

### Trial Threat Balance & In-Camp Reconnaissance
- **Stage-Anchored Trial Threat**: Enemy incursion strength is now calibrated directly to the stage deployment budget plus approximately one additional adversary of the highest available tier for that stage, preventing runaway enemy swarm sizes in mid-to-late campaign trials regardless of your roster size or pending ascensions.
- **In-Camp Trial Re-Scry**: You can now re-roll the pending stage trial directly from the Expedition War Room in Camp using the new Re-roll Trial button, refreshing hostile enemy compositions and arena terrain with a fresh astral seed before embarking.

## [0.14.0] - 2026-11-08

### Tier 4 Shield-bearer & Phalanx Defense
- **New Advanced Class — Shield-bearer**: Harness the power of the celestial constellation node with the new Tier 4 Shield-bearer. Built as a heavy frontline bulwark, this guardian anchors your battle line with impenetrable defensive stances and ally bodyguarding.
- **Bastion Plant Stance**: Plant your reinforced kite shield into the hex ground to gain substantial physical armor, hold your ground against advancing enemies with a frontal Zone of Control, and shield rearward allies from incoming ranged fire.
- **Tactical Intercept Step**: Swiftly switch positions with an ally under pressure within 3 hexes, pulling vulnerable comrades to safety while fortifying their armor.
- **Concussive Melee Slam**: Stun and slow adjacent foes with a punishing shield strike that pins targets in place without displacing them.
- **Unyielding Stance & Phalanx Aura**: Stand immovable against knockbacks, pulls, and forced displacements while projecting a protective aura that imposes attack penalties on enemies striking adjacent allies.
- **Pixel Sprite & Emblem Palette**: The Shield-bearer arrives complete with multi-directional animated pixel battle tokens and a bespoke Slate Iron and Emerald class badge emblem.
- **Four New Astral Augment Shards**: Forge and socket new tactical augment modules discovered from the Shield-bearer constellation:
  - **Bastion Shard**: Plants an immovable phalanx perimeter upon executing an ability, granting bonus armor and projecting a Zone of Control that halts advancing foes.
  - **Interchange Shard**: Warps tactical positioning by swapping coordinates with your target upon landing a hit or casting a support ability on an ally.
  - **Concussion Shard**: Delivers a jarring bludgeon daze that penalizes enemy movement and speed for two turns on strike.
  - **Anchorite Shard**: Grounds your center of gravity, granting complete immunity to knockbacks and forced displacement alongside defensive armor and resolve boosts.

## [0.13.0] - 2026-11-07

### Combat Chronicle Theming & Battlefield Filtering
- **Faction-Themed Chronicle Cards**: Action entries in the Astral Chronicle now proudly display allegiance colors—radiant celestial cyan for party wayfarers, void crimson for enemy combatants, and warm amber for neutral or environmental forces. Hero units generated across your campaign now correctly showcase party borders and name highlights.
- **Structured Hazard & Fall Cards**: Plunging off cliff edges and falling from high terrain now generates dedicated chronicle hazard cards detailing impact damage and remaining vitals, replacing generic plain text. Acrobatic trait reactions—such as the Cat Burglar's Feline Grace negating fall damage—now render as structured passive reaction cards.
- **Chronicle Unit Filter**: An interactive filter in the Astral Chronicle header allows you to focus the combat log on any specific combatant to easily review their individual attacks, maneuvers, and received effects, complete with helpful status guidance when no events have been recorded.

## [0.12.1] - 2026-11-06

### Vanguard Deployment Flexibility & War Room Polish
- **Flexible Wayfarer Deployment & Withdrawal**: You can now freely deploy, withdraw, or swap wayfarers between The Enclave and The Vanguard even when your squad is or will be over Threat budget (for example, reorganizing after promotions in Camp), allowing you to adjust your strike team step-by-step.
- **Wayfarer Threat Value Badges**: Character cards in both The Vanguard and The Enclave now display each wayfarer's exact threat rating (e.g., 10 Pts, 25 Pts) directly alongside their name, making squad planning intuitive without having to guess point costs.
- **Streamlined War Room Readiness**: Cleaned up the Expedition War Room display by moving verbose threat overage notices into a helpful hover tooltip on the Enter Trial button, keeping the interface uncluttered while the trial gate safely stays locked until your Vanguard is within budget.

## [0.12.0] - 2026-11-05

### Arena Camera Panning & Tactical Navigation
- **Freeform Battlefield Panning**: Hold and drag the right mouse button across the arena to smoothly pan the camera anywhere on the map, keeping every flank and perimeter hex within clear view even at high zoom.
- **Keyboard Arrow Navigation**: Nudge the battlefield camera in any direction using the keyboard arrow keys for effortless tactile map control.
- **Turn Queue Focus**: Clicking any wayfarer or enemy chip along the Initiative Ribbon pins their combat card and smoothly glides the camera directly to their position on the battlefield.
- **Clean Active Indicator**: Streamlined the active unit indicator to a crisp, static golden pedestal halo without distracting animated ripples.
- **Instant View Reset**: A unified reset button in the header bar quickly recenters the battlefield and restores magnification to default.
- **Deep Celestial Parallax**: The starfield background shifts subtly as you pan across the arena, enhancing the feeling of commanding your squad across the astral void.

## [0.11.0] - 2026-11-04

### Combat Turn Pacing & Timeline Clarity
- **Animated Timeline Gauge Rings**: Initiative chips along the turn queue ribbon now feature circular progress rings (cyan for party allies, rose for enemy combatants) that fill clockwise as initiative builds toward each combatant's next action.
- **Paced Turn Transitions**: When the battle clock advances across ticks to determine who acts next, transitions now animate smoothly over approximately one second so you can visually watch gauges fill and track turn order progression in real time.
- **Active Unit Beacon Waves**: When a combatant takes the stage, an expanding celestial ripple pulses outward from their pedestal base, making it immediately clear who is active across large battlefields.
- **Turn Start & End Call-Outs**: Clear floating notifications announce the start of each turn ("My Turn!" for allies, unit name for foes) and cleanly distinguish between concluding a turn with zero unspent AP versus banking unused Action Points for bonus initiative.
- **Combat Chronicle Turn Banners**: Prominent horizontal turn divider headers now clearly separate distinct turns in the combat log while preserving every detail, tooltip, and roll breakdown within each turn's action cards.

## [0.10.0] - 2026-11-03

### Army-Building Deployment & Dynamic Battlefields
- **Point-Based Vanguard Deployment**: Replaced the rigid 3-wayfarer limit with a flexible deployment points budget that scales as you advance through sectors. Spend your budget on an elite strike team of promoted champions or command a wider detachment of agile auxiliaries.
- **Dynamic Arena Sizing**: Battle maps now dynamically expand to match the scale of engagement, beginning with focused close-quarters arenas in early trials and broadening to vast 91-hex battlegrounds when large forces clash.
- **Tougher, Coordinated Enemy Squads**: Enemy incursions now deploy diverse combat teams with multiple advanced classes working in tandem rather than solitary champions.
- **Resonant Enemy Class Kits**: Advanced enemy combatants now arrive wielding tactical domain techniques and passive masteries drawn from their class lineage rather than basic starter spells.
- **Stable Astral Reconnaissance**: Swapping or tuning wayfarers in the Nexus retains your scouted enemy intelligence in the War Room, ensuring transparent expedition planning before entering trials.

## [0.9.3] - 2026-11-03

### Combat Text Readability
- **High-Contrast Text**: Floating combat numbers and popups now feature clear dark outlines, ensuring they are easy to read over terrain and spell effects.
- **Cleaner Placement**: Floating combat text now spawns higher above character tokens, keeping unit health and status icons visible.
- **Visual Impact Hierarchy**: Critical hits and heavy spells now stand out with larger, bold impact text, while routine hits and buffs stay compact and unobtrusive.
- **Anti-Overlap Stacking**: Multiple damage numbers or combat events occurring on the same tile now neatly stack vertically instead of overlapping.
- **Smooth Scaling Animations**: Combat popups now smoothly scale and settle into place during action resolutions.

## [0.9.2] - 2026-11-02

### Combat Fixes & Roll Breakdown Tooltips
- **Retreat Movement & Elevation**: Retreating now respects vertical terrain—units take fall damage when tumbling off steep cliffs and cannot climb impossible heights during a retreat.
- **Cat Burglar Vaulting**: Cat Burglars can now vault over low obstacles and scale cliff ledges when retreating.
- **Friendly Fire Targeting Fix**: Offensive single-target abilities (such as **Challenging Shout**) can no longer accidentally target friendly allies.
- **Attack Roll Breakdown Tooltips**: Hovering over attack roll chips in the combat log or dice tray now shows an instant breakdown of the calculation, including stats, elevation bonuses, auras, and active status effects.

## [0.9.1] - 2026-10-30

### Critical Damage & Combat Log Polish
- **Explicit Critical Hit Breakdown**: Critical hit rolls now clearly display maximized base damage alongside bonus rolled dice and modifiers.
- **Cleaner Roll Math**: Attack roll bonuses and penalties are now formatted cleanly in combat logs and roll chips.
- **Narrative Log Ordering**: The combat log now records the attack action before listing reactive status changes and outcomes.
- **Challenge Defied Alert**: When an enemy ignores a challenge, a distinct **Challenge Defied** card highlights the defiance in the combat log.

## [0.9.0] - 2026-10-29

### Animated Dice Tray & Roll Presentation
- **Visual Polyhedral Dice Tray**: Added an animated celestial dice tray at the top of the combat screen showing 3D dice rolls for attacks and damage.
- **Two-Stage Roll Sequences**: Attacks roll the d20 check against the target's defense, followed by damage dice rolling for successful hits.
- **Advantage & Disadvantage Visuals**: Rolling with Advantage or Disadvantage now rolls two d20s simultaneously, highlighting the winning die and striking out the discarded one.
- **Dynamic Outcome Stamps**: Rolls land with kinetic animations and distinct visual stamps for Critical Hit, Solid Hit, Graze, and Miss.
- **Fast-Forward & Skip**: Press Space, Enter, or click anywhere to immediately skip or speed up dice animations.
- **Dice Tray Toggle**: Enable or disable the animated dice tray anytime using the toggle button in the combat header.

## [0.8.0] - 2026-10-28

### Movement Path & Elevation Indicators
- **Stepping Stone Path Preview**: Hovering over reachable tiles lifts the proposed movement path into elevated stepping stones with soft lighting and shadows.
- **Step Number Badges**: Each tile along the planned path shows a numbered badge reflecting total Action Point cost.
- **Cliff Hazard Warnings**: Steps that lead over steep cliffs display danger badges and estimated fall hazard damage.
- **Destination Indicator**: The final arrival hex pulses with an animated destination ring.
- **Reduced Visual Clutter**: Coordinate text along the active path is hidden while planning movement for a cleaner view.

## [0.7.2] - 2026-10-28

### Post-Battle Spoils & Hero Progression
- **Redesigned Spoils Screen**: Replaced the cramped layout with an organized squad roster dock and detailed hero inspector.
- **Spacious Discipline Steppers**: Force, Finesse, and Focus skill allocations now feature larger, more accessible stepper controls.
- **Clean Number Displays**: Experience point allocation counters now display clean, easy-to-read numbers.
- **Promotion Readiness Badges**: Heroes eligible for rank promotion now illuminate with gold readiness badges and star indicators.
- **Proceed Button Guidance**: Hovering over the disabled continue button now explains remaining experience point allocations needed before advancing to camp.

## [0.7.1] - 2026-10-27

### Combat Polish & Interface Feedback
- **Facing Compass Visibility**: Facing direction arrows now always render on top of unit models so they are never blocked by tall figures.
- **Skirmish Movement Notice**: Tactical repositioning moves now display a dedicated **RETREAT!** floating text banner.
- **Infiltrator AI Targeting**: Enemy Infiltrators now correctly prioritize self-buffing spells like **Smoke Veil** on themselves instead of teammates.
- **Area-of-Effect Feedback**: Ground-targeted area spells now show the spellcasting roll and difficulty score alongside total splash damage.
- **Status Event Log Cards**: The combat log now features dedicated cards for stealth breaks and damage-over-time effects like burning and poison.
- **Discipline Badges**: Ability cards in the Hero Progression drawer now display color-coded discipline badges for Force, Finesse, and Focus.

## [0.7.0] - 2026-10-26

### Combatant Inspection & Tooltips
- **Pin Any Combatant**: Click any ally, enemy, or timeline portrait to pin their full status card in the secondary display.
- **Inspect Equipped Skills & Turn Progress**: Check a pinned unit's equipped skills, Action Points, and upcoming turn order timing.
- **Informative Status Badges**: Condition icons on unit cards and battlefield figures show remaining duration, who applied the effect, and active modifiers at a glance.
- **Zero-Delay Tooltips**: Hover over status badges or passive traits anywhere on the screen to view clear descriptions and rule effects.
- **Battlefield Status Bubbles**: Hovering over status bubbles directly above units on the grid displays full details without losing your current target.
- **Right-Click to Cancel**: Right-clicking anywhere on the battlefield cancels current ability targeting. Close pinned inspection cards with Escape or by clicking open ground.

## [0.6.0] - 2026-10-25

### Ruins Obstacles & Battlefield Cover
- Added ancient ruins obstacles with pixel-art standees and shadows across elevated battlefield tiles.

### Knight Commander Kit Rework
- Reworked the Knight into a tactical Commander archetype focused on battlefield control.
- Added the **Exposed** condition: Enemies that attack someone other than their challenger suffer increased vulnerability on the next attack against them.
- Enhanced **Lead the Charge** to grant bonus Attack, Speed, and Movement to nearby allies.
- Added bonus damage to **Pommel Strike** when striking challenged foes.
- Added visual status badges and card integration for the Exposed condition.

### Smarter Enemy AI
- Enemy AI now prioritizes high-value backline casters despite low-ground penalties.
- Enemies intelligently use movement-slowing abilities to disrupt your party's advance.
- Enemies take advantage of cliff edges to push heroes off ledges for fall damage.

### Class Mobility & Abilities
- Hero loadouts now maintain signature class abilities in their primary slots.
- Thief's **Shadow Step** now requires level ground for teleportation.
- Cat-Burglar's **Rooftop Vault** leap range increased to 3 tiles with vertical cliff scaling and bonus Evasion.

### World Lore Codex
- Added the in-game Lore Codex featuring background stories and faction histories.

### Area-of-Effect Spells
- Added ground-targeted **Arcane Blast** spells that can target open hexes to catch multiple foes.

## [0.5.0] - 2026-10-23

### Class Balance
- **Sneak Attack**: Adjusted to reward true flanking positioning with +1d6 precision damage.
- **Witch Kit**: Rebalanced **Poppet Needle** damage, enhanced **Baleful Hex** with turn delay and poison, and updated **Witch's Talisman** with bonus Speed and Ward.

### Stealth Mechanics & Detection
- Enemies now actively monitor their frontal vision arc, spotting stealthy units that cross their sightline.
- Added combat log alerts when stealth is broken or when enemies spot your heroes.
