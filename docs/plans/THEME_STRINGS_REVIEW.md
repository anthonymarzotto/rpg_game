# Astral Tactics — Theme Strings Review & Alignment

This document outlines the proposed sweep across all user-visible strings in **Astral Tactics** to align terminology with the game's celestial, astral rift, and constellation themes.

> **Instructions for Review:**
> In the **Approved** column of each table, enter your approved wording (or `-` for no change / keep current string). Once approved, changes will be implemented across the code and test suites.
>
> *Note: Class names (Novice, Warrior, Thief, Wizard, etc.) and skills (Strike, Cleave, Spark, etc.) remain unchanged.*

---

## 1. Title Screen & App Shell

| File & Location | Current String | Proposed Astral Theme String | Approved | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| `src/ui/start/StartScreen.tsx:21` | `Tactical RPG Campaign & Class Constellation` | `Tactical Astral Campaign & Stellar Constellations` | Remove, no longer needed | Reinforces the astral premise on the main title screen. |
| `src/ui/start/StartScreen.tsx:31` | `⚔️ New Expedition` | `✦ New Astral Expedition` | `✦ New Astral Expedition` | Elevates the primary CTA with celestial star iconography. |
| `src/ui/start/StartScreen.tsx:43` | `✦ Continue Run` | `✦ Resume Expedition` | `✦ Resume Expedition` | More immersive and less game-jargon than "Run". |
| `src/App.tsx:121` (Dev Menu) | `🏠 Start Screen` | `🏠 Title Portal` | `🏠 Portal` | Harmonizes selector with astral travel terminology. |
| `src/App.tsx:134` (Dev Menu) | `⛺ Camp Hub` | `⛺ Astral Camp Hub` | `⛺ Astral Hub` | Distinguishes base camp as an astral hub. |
| `src/App.tsx:144` (Dev Menu) | `⚔️ Novice Sandbox Arena` | `⚔️ Novice Astral Trial` | `⚔️ Astral Trial` | Replaces generic sandbox with astral trial. |
| `src/App.tsx:154` (Dev Menu) | `✦ Raw Constellation Chart` | `✦ Stellar Constellation Chart` | `✦ Stellar Constellation Chart` | Cleaner phrasing for raw progression lattice. |
| `src/App.tsx:165` (Dev Banner) | `🛠️ Developer Mode: Standalone Novice Combat Sandbox` | `🛠️ Developer Mode: Standalone Astral Trial` | `🛠️ Developer Mode: Standalone Astral Trial` | Banner consistency. |

---

## 2. Expedition Camp Hub

| File & Location | Current String | Proposed Astral Theme String | Approved | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| `src/ui/camp/CampHub.tsx:95` | `✦ EXPEDITION CAMP` | `✦ ASTRAL EXPEDITION CAMP` | `✦ THE NEXUS` | Brands the central base with the astral setting. |
| `src/ui/camp/CampHub.tsx:96` | `Stage {stage}` | `Astral Sector {stage}` | `Sector {stage}` | "Sector" evokes mapping deep cosmic space while keeping numeric clarity. |
| `src/ui/camp/CampHub.tsx:99` | `Victories: {N}` | `Triumphs: {N}` | `Triumphs: {N}` | Replaces mundane tally words with celestial victory terms. |
| `src/ui/camp/CampHub.tsx:100` | `Defeats: {N}` | `Severances: {N}` | `Eclipses: {N}` | Thematic term for squad loss / retreat. |
| `src/ui/camp/CampHub.tsx:111` | `Exit to Title` | `Return to Title Portal` | `Return to Portal` | Consistent portal/title transition. |

---

## 3. Active Vanguard (Squad Dock)

| File & Location | Current String | Proposed Astral Theme String | Approved | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| `src/ui/camp/ActiveSquadDock.tsx:33` | `⚔️ Active Vanguard` | `✦ Astral Vanguard` | `✦ The Vanguard` | Establishes the deployed team as the foremost astral combat echelon. |
| `src/ui/camp/ActiveSquadDock.tsx:63` | `Empty Vanguard Slot` | `Vacant Vanguard Conduit` | `Vacant Conduit` | Conveys that heroes are channeled into deployment conduits. |
| `src/ui/camp/ActiveSquadDock.tsx:65` | `Deploy a reserve hero from the barracks below` | `Attune a reserve hero from the barracks below` | `Attune a reserve wayfarer to this conduit` | "Attune" is an astral-tactical term for preparing units. |

---

## 4. Reserve Barracks & Roster Management

| File & Location | Current String | Proposed Astral Theme String | Approved | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| `src/ui/camp/ReserveBarracksTray.tsx:57` | `Reserve Barracks` | `Astral Reserves` | `The Enclave` | Thematic naming for unassigned squad members. |
| `src/ui/camp/ReserveBarracksTray.tsx:60` | `{N} Hero` / `{N} Heroes` | `{N} Astral Hero` / `{N} Astral Heroes` | `{N} Wayfarer` / `{N} Wayfarers` | Reinforces hero identity. |
| `src/ui/camp/ReserveBarracksTray.tsx:81` | `✦ Level Ready ({N})` | `✦ Starlight Ready ({N})` | `✦ Ascension Ready ({N})` | Clearly flags heroes ready for constellation spend. |
| `src/ui/camp/ReserveBarracksTray.tsx:104` | `+ Recruit Novice` | `+ Attune Novice` | `+ Awaken Novice` | Novices are awakened/attuned into the roster. |
| `src/ui/camp/ReserveBarracksTray.tsx:112` | `🔄 Select a reserve hero below to replace {name} in the active vanguard:` | `🔄 Select a reserve hero below to substitute for {name} in the active vanguard:` | `🔄 Select a wayfarer from The Enclave to attune in place of {name}:`| Polished instructional phrasing. |
| `src/ui/camp/ReserveBarracksTray.tsx:132` | `No heroes in reserve. Recruit a Novice to expand your roster!` | `No heroes in reserve. Attune an Astral Novice to expand your roster!` | `No wayfarers in The Enclave. Awaken a Novice to expand your roster!`| Thematic guidance for empty reserve state. |

---

## 5. Hero Cards (Vanguard & Reserve Mini-Cards)

| File & Location | Current String | Proposed Astral Theme String | Approved | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| `src/ui/camp/HeroCard.tsx:65` | `Force (Physical / Kinetic)` | `Force (Astral Might / Kinetic)` | `Force` | Integrates cosmic lore into Force tooltip. |
| `src/ui/camp/HeroCard.tsx:68` | `Finesse (Agility / Criticals)` | `Finesse (Stellar Precision / Agility)` | `Finesse` | Integrates cosmic lore into Finesse tooltip. |
| `src/ui/camp/HeroCard.tsx:71` | `Focus (Arcane / Resolve)` | `Focus (Cosmic Will / Arcane)` | `Focus` | Integrates cosmic lore into Focus tooltip. |
| `src/ui/camp/HeroCard.tsx:79` | `✦ LEVEL READY!` | `✦ ASCENSION READY!` | `✦ ASCENSION READY!` | Leveling up ignites a new star in their constellation. |
| `src/ui/camp/HeroCard.tsx:127` | `✦ Level Up` / `Inspect` | `✦ Ascend` / `Inspect` | `✦ Ascend` / `Inspect` | Ties the modal trigger directly to ascension. |
| `src/ui/camp/HeroCard.tsx:147` | `Move hero to Reserve Barracks` | `Return hero to Astral Reserves` | `Return to The Enclave` | Consistent reserve naming. |
| `src/ui/camp/HeroMiniCard.tsx:48` | `✦ LEVEL READY` | `✦ ASCENSION READY` | `✦ ASCENSION READY` | Mini-card badge matching full card. |
| `src/ui/camp/HeroCard.tsx:147` | `Cannot bench the only active squad hero` | `Cannot bench the only active squad hero` | `Cannot withdraw the only wayfarer in The Vanguard` | Consistent reserve naming. |
| `src/ui/camp/HeroCard.tsx:150` | `Bench` | `Bench` | `Withdraw` | Consistent reserve naming. |

---

## 6. Expedition War Room (Pre-Battle Recon)

| File & Location | Current String | Proposed Astral Theme String | Approved | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| `src/ui/camp/ExpeditionWarRoom.tsx:35` | `Stage Reconnaissance` | `Astral Scrying & Recon` | `Astral Scrying & Recon` | Blends tactical scouting with celestial divination. |
| `src/ui/camp/ExpeditionWarRoom.tsx:37` | `Approaching Threats` (fallback) | `Approaching Void Incursion` | `Approaching Trial` | Replaces generic threats with celestial trial lore. |
| `src/ui/camp/ExpeditionWarRoom.tsx:44` | `Detected Threats ({N})` | `Detected Hostiles ({N})` | `Detected Hostiles ({N})` | Clear tactical terminology. |
| `src/ui/camp/ExpeditionWarRoom.tsx:46` | `Threat: {N} pts` | `Cosmic Hazard: {N} pts` | `Threat: {N} pts` | Distinguishes the encounter threat gauge. |
| `src/ui/camp/ExpeditionWarRoom.tsx:52` | `Reconnaissance in progress...` | `Scrying astral sector...` | `Scrying astral sector...` | Atmospheric placeholder when scan is computing. |
| `src/ui/camp/ExpeditionWarRoom.tsx:81` | `Squad Readiness:` | `Vanguard Readiness:` | `Vanguard Readiness:` | Matches the "Astral Vanguard" nomenclature. |
| `src/ui/camp/ExpeditionWarRoom.tsx:88` | `Deploy at least 1 hero into the active vanguard before departing.` | `Attune at least 1 hero into the active vanguard before entering the rift.` | `Attune at least 1 wayfarer into the active vanguard before entering the trial.` | Connects battle entry to entering a celestial trial. |
| `src/ui/camp/ExpeditionWarRoom.tsx:101` | `⚔️ DEPLOY SQUAD` | `✦ ENTER ASTRAL RIFT` | `✦ ENTER TRIAL` | High-impact CTA for launching the encounter. |

---

## 7. Hero Progression Drawer & Constellation Chart

| File & Location | Current String | Proposed Astral Theme String | Approved | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| `src/ui/camp/HeroProgressionDrawer.tsx:246` | `✦ Hero Progression: {hero.name}` | `✦ Astral Ascension: {hero.name}` | No text needed, remove | Celestial framing for the deep progression modal. |
| `src/ui/camp/HeroProgressionDrawer.tsx:283` | `✦ Level Ready: Allocate 1 Archetype Point ({threshold} XP)` | `✦ Ascension Ready: Channel 1 Astral Discipline Point ({threshold} XP)` | `✦ Ascension Ready: Channel 1 Astral Discipline Point ({threshold} XP)` | Connects the XP threshold to channeling astral energy. |
| `src/ui/camp/HeroProgressionDrawer.tsx:293` | `Advance Fighter (+1 Force)` | `⚔️ Channel Fighter Discipline (+1 Force)` | `Ascend: Fighter (+1 Force)` | Clarifies that Fighter is a core astral discipline. |
| `src/ui/camp/HeroProgressionDrawer.tsx:304` | `Advance Rogue (+1 Finesse)` | `🗡️ Channel Rogue Discipline (+1 Finesse)` | `Ascend: Rogue (+1 Finesse)` | Clarifies that Rogue is a core astral discipline. |
| `src/ui/camp/HeroProgressionDrawer.tsx:314` | `Advance Mage (+1 Focus)` | `🔮 Channel Mage Discipline (+1 Focus)` | `Ascend: Mage (+1 Focus)` | Clarifies that Mage is a core astral discipline. |
| `src/ui/camp/HeroProgressionDrawer.tsx:326` | `Class Constellation` | `Astral Class Constellation` | `The Constellation` | Star chart header. |
| `src/ui/camp/HeroProgressionDrawer.tsx:328` | `Hover star to scan • Click node to pin details & equip` | `Hover star to scan • Click star to inspect & attune` | `Hover node to scan • Click to inspect & equip` | Highlights interaction with constellation stars. |
| `src/ui/camp/HeroProgressionDrawer.tsx:365` | `★ Unlocked in Constellation` | `★ Star Ignited in Constellation` | `★ Class Unlocked` | Star chart status label. |
| `src/ui/camp/HeroProgressionDrawer.tsx:367` | `✦ Eligible Next Level` | `✦ Alignable Next Ascension` | `✦ Next Ascension` | Star chart status label. |
| `src/ui/camp/HeroProgressionDrawer.tsx:369` | `✕ Locked Out` | `✕ Astral Alignment Diverged` | `✕ Locked Out` | Star chart status label. |
| `src/ui/camp/HeroProgressionDrawer.tsx:371` | `○ Future Pathway` | `○ Distant Star Pathway` | `○ Future Pathway` | Star chart status label. |
| `src/ui/camp/HeroProgressionDrawer.tsx:381` | `✦ Star Scanner` | `✦ Star Scanner` (Keep) | `✦ Node Scanner` | Good existing term. |
| `src/ui/camp/HeroProgressionDrawer.tsx:385` | `Hover over any star node to preview requirements & status.` | `Hover over any star node to analyze celestial requirements & status.` | `Hover over any node to analyze requirements & status` | Enhances Star Scanner HUD lore. |
| `src/ui/camp/HeroProgressionDrawer.tsx:469` | `Disciplined baseline abilities suited for early combat maneuvers before specializing.` | `Disciplined initiate abilities channeling raw starlight before specializing.` | No change | Lore description for Novice starter package. |
| `src/ui/camp/HeroProgressionDrawer.tsx:483` | `Combat abilities for {name} unlock in an upcoming expansion. Unlocking this node advances your constellation path toward higher tier capstones.` | `Cosmic combat abilities for {name} awaken in an upcoming expansion. Igniting this star weaves your constellation path toward higher tier capstones.` | `Combat abilities for {name} unlock in an upcoming expansion. Unlocking this node advances your constellation path toward higher tier capstones.` | Poetic unauthored placeholder text. |
| `src/ui/camp/HeroProgressionDrawer.tsx:495` | `✓ Active Class Equipped` | `✓ Attuned as Active Class` | `✓ Assumed Class` | Changes "Equipped" to celestial "Attuned". |
| `src/ui/camp/HeroProgressionDrawer.tsx:504` | `✦ Equip As Active Class` | `✦ Attune as Active Class` | `✦ Assume Class` | Changes "Equip" to celestial "Attune". |
| `src/ui/camp/HeroProgressionDrawer.tsx:509` | `✦ Spend an archetype point at level-up to unlock this class.` | `✦ Channel an archetype point at ascension to ignite this star.` | `✦ Ascend to unlock this class.` | Thematic instruction for eligible node. |
| `src/ui/camp/HeroProgressionDrawer.tsx:513` | `✕ Locked Out: Hero archetype point distribution cannot reach this class.` | `✕ Path Diverged: Hero's astral alignment cannot reach this star.` | `✕ Locked Out: This wayfarer's ascension path cannot reach this class.`| Thematic instruction for locked node. |
| `src/ui/camp/HeroProgressionDrawer.tsx:517` | `○ Future Pathway: Higher tier requirements needed.` | `○ Distant Star: Deeper astral resonance required.` | `○ Future Pathway: Further ascensions required.` | Thematic instruction for unreached node. |
| `src/ui/camp/HeroProgressionDrawer.tsx:527` | `Equipped Loadout & Wildcards` | `Astral Loadout & Wildcard Matrix` | `Combat Manifest` | Loadout deck header. |
| `src/ui/camp/HeroProgressionDrawer.tsx:531` | `Active Class:` | `Active Astral Class:` | `Assumed Class:`| Field label. |
| `src/ui/camp/HeroProgressionDrawer.tsx:577` | `Wildcard Ability 1:` | `Astral Wildcard Ability I:` | `Resonant Ability I:`| Field label. |
| `src/ui/camp/HeroProgressionDrawer.tsx:618` | `Wildcard Ability 2:` | `Astral Wildcard Ability II:` | `Resonant Ability II:`| Field label. |
| `src/ui/camp/HeroProgressionDrawer.tsx:659` | `Wildcard Passive Trait:` | `Resonant Passive Trait:` | `Resonant Passive:` | Field label. |
| `src/ui/camp/HeroProgressionDrawer.tsx:611` | `(No wildcard ability equipped)` | `(Empty astral ability slot)` | `(No resonant ability slotted)`| Empty slot placeholder. |
| `src/ui/camp/HeroProgressionDrawer.tsx:687` | `(No wildcard passive equipped)` | `(No passive starlight attuned)` | `(No resonant passive slotted)`| Empty slot placeholder. |

---

## 8. Standalone Dev Constellation Screen

| File & Location | Current String | Proposed Astral Theme String | Approved | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| `src/ui/pyramid/ClassInspector.tsx:95` | `Class Constellation` | `Astral Class Constellation` | `The Constellation` | Matches drawer header. |
| `src/ui/pyramid/ClassInspector.tsx:96` | `100-Class Pyramid Progression` | `100-Star Astral Pyramid Progression` | `100-Class Pyramid Progression` | Clean subtitle. |
| `src/ui/pyramid/ClassInspector.tsx:123` | `Capstone Sealed` / `Novice Adventurer` | `Stellar Apex Attuned` / `Astral Initiate` | `Capstone Reached` / `Novice Wayfarer` | Consistent with Wayfarer lore. |
| `src/ui/pyramid/LevelUpSimulator.tsx:23` | `Advance Archetype Level` | `Channel Astral Archetypes` | `Ascend Archetype Level` | Uses approved Ascension terminology. |
| `src/ui/pyramid/LevelUpSimulator.tsx:60` | `Demo Constellation Paths` | `Stellar Alignment Presets` | `Constellation Presets` | Clean dev preset label. |
| `src/ui/pyramid/LevelUpSimulator.tsx:125` | `↺ Reset to Novice (Level 0)` | `↺ Reset to Astral Initiate (Level 0)` | `↺ Reset to Novice (Level 0)` | Direct dev action. |
| `src/ui/pyramid/ConstellationHistory.tsx:11` | `Constellation Path ({N} Stars Unlocked)` | `Constellation Path ({N} Stars Ignited)` | `Constellation Path ({N} Classes Unlocked)` | Keeps class mechanic grounded. |
| `src/ui/pyramid/ConstellationHistory.tsx:16` | `No stars unlocked yet. Advance an archetype to ignite your first star.` | `No stars ignited yet. Channel an archetype to ignite your first constellation star.` | `No classes unlocked yet. Ascend an archetype to unlock your first class.` | Consistent with Ascension & Class. |

---

## 9. Combat Arena HUD, Action Bar & Floaters

| File & Location | Current String | Proposed Astral Theme String | Approved | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| `src/ui/combat/CombatArena.tsx:109` | `⚔️ Tactical Arena Testbed` | `✦ Astral Skirmish Arena` | `✦ Astral Trial` | Replaces dev testbed labeling in the top bar. |
| `src/ui/combat/CombatArena.tsx:110` | `Phase 2 • Squad Tactics (3v4)` | `Tactical Clash • 3v4 Incursion` | `Sector {stage} • Celestial Trial` | Sub-badge in top bar. |
| `src/ui/combat/CombatArena.tsx:198` | `↺ Reset Arena` | `↺ Rewind Skirmish` | `↺ Reset Trial` | More diegetic than "Reset Arena". |
| `src/ui/combat/ActionBar.tsx:161` | `Move up to your Move distance (costs 1 AP)` | `Traverse the astral grid (costs 1 AP)` | `Traverse the astral grid (costs 1 AP)` | Flavorful tooltip on universal Move button. |
| `src/ui/combat/ActionBar.tsx:186` | `+{N} CTB` | `+{N} Initiative` | `+{N} Initiative` | End turn unspent AP initiative refund. |
| :--- | :--- | :--- | :--- | :--- |
| `src/ui/combat/CombatArena.tsx:109` | `⚔️ Tactical Arena Testbed` | `✦ Astral Skirmish Arena` | `✦ Astral Trial` | Replaces dev testbed labeling in the top bar. |
| `src/ui/combat/CombatArena.tsx:110` | `Phase 2 • Squad Tactics (3v4)` | `Tactical Clash • 3v4 Incursion` | `Sector {stage} • Celestial Trial` | Sub-badge in top bar. |
| `src/ui/combat/CombatArena.tsx:198` | `↺ Reset Arena` | `↺ Rewind Skirmish` | `↺ Reset Trial` | More diegetic than "Reset Arena". |
| `src/ui/combat/ActionBar.tsx:161` | `Move up to your Move distance (costs 1 AP)` | `Traverse the astral grid (costs 1 AP)` | `Traverse the astral grid (costs 1 AP)` | Flavorful tooltip on universal Move button. |
| `src/ui/combat/ActionBar.tsx:186` | `+{N} CTB` | `+{N} Initiative` | `+{N} Initiative` | End turn unspent AP initiative refund. |
| `src/ui/combat/ActionBar.tsx:54` | `Wildcard` (ribbon) | `Resonant` | `Resonant` | Matches approved Resonant slot terminology. |
| `src/ui/combat/InitiativeRibbon.tsx:24` | `CTB QUEUE` | `TURN QUEUE` | `TURN QUEUE` | Header for timeline queue ribbon. |
| `src/ui/combat/useCombatSimulation.ts:335` | `+{N} CTB Gauge` | `+{N} Initiative` | `+{N} Initiative` | Floater text when ending turn early. |
| `src/ui/combat/EnemyTurnBanner.tsx:36` | `Hostile Turn` | `Void Hostile Turn` | `Enemy Turn` | Clarifies hostile turn phase. |
| `src/ui/combat/EnemyTurnBanner.tsx:45` | `Evaluating tactical positions...` | `Scrutinizing the astral field...` | `Scrutinizing the astral field...` | Active AI thinking status. |
| `src/ui/combat/UnitStatusCard.tsx:167` | `Target Preview` | `Astral Target Lock` | `Target Preview` | Header for hovered combat target card. |
| `src/ui/combat/UnitStatusCard.tsx:169` | `✖ Screened` | `✖ Vector Obstructed` | `✖ Obstructed` | LoS tactical feedback. |
| `src/ui/combat/UnitStatusCard.tsx:180` | `✔ Clear LoS` | `✔ Clear Astral Vector` | `✔ Clear LoS` | LoS tactical feedback. |
| `src/ui/combat/UnitStatusCard.tsx:225` | `Inspected Unit` | `Inspected Entity` | `Inspected Unit` | Non-targeting inspector header. |
| `src/ui/combat/useFloatingCombatText.ts:68` | `SLAM!` | `ASTRAL SLAM!` | `SLAM!` | High-impact floater on obstacle collision. |
| `src/ui/combat/useFloatingCombatText.ts:70` | `COLLISION!` | `COLLISION!` (Keep) | `COLLISION!` | Unit collision floater. |
| `src/ui/combat/useFloatingCombatText.ts:82` | `KNOCKBACK!` | `ASTRAL SHOCKWAVE!` | `KNOCKBACK!` | Displacement floater. |

---

## 10. Combat Log Panel

| File & Location | Current String | Proposed Astral Theme String | Approved | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| `src/ui/combat/CombatLogPanel.tsx:202` | `📜 Combat Log` | `📜 Astral Chronicle` | `📜 Astral Chronicle` | "Chronicle" fits the historical ledger aesthetic. |
| `src/ui/combat/CombatLogPanel.tsx:220` | `⚔️ Combat` | `⚔️ Engagements` | `⚔️ Combat` | Tab title. |
| `src/ui/combat/CombatLogPanel.tsx:225` | `🏃 Moves` | `🏃 Maneuvers` | `🏃 Moves` | Tab title. |
| `src/ui/combat/CombatLogPanel.tsx:237` | `⚔️ Encounter started. Select Move or an Ability to engage.` | `✦ Astral clash initiated. Select a maneuver or move to engage.` | `⚔️ Trial started. Nothing logged yet.` | Empty log state (All). |
| `src/ui/combat/CombatLogPanel.tsx:239` | `No attacks or abilities logged yet.` | `No astral abilities logged yet.` | `No combat logged yet.` | Empty log state (Combat). |
| `src/ui/combat/CombatLogPanel.tsx:240` | `No movement steps logged yet.` | `No grid maneuvers logged yet.` | `No moves logged yet.` | Empty log state (Moves). |

---

## 11. Post-Battle Victory & Defeat Modals

| File & Location | Current String | Proposed Astral Theme String | Approved | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| `src/ui/combat/BattleVictoryModal.tsx:62` | `🏆 Objective Complete` | `✦ Celestial Milestone Secured` | `✦ Trial Complete` | Direct reference to the Trial. |
| `src/ui/combat/BattleVictoryModal.tsx:63` | `Trial Victory!` | `Astral Triumph!` | `Trial Triumph!` | Directly echoes approved Triumphs stat. |
| `src/ui/combat/BattleVictoryModal.tsx:64` | `You have satisfied the combat trial milestone.` | `The hostile incursion has dissipated. Your squad harvests the astral starlight.` | `The trial has been overcome. Your vanguard returns victorious.` | Clean, dignified, uses Vanguard. |
| `src/ui/combat/BattleVictoryModal.tsx:93` | `Archetype XP Earned ({name})` | `Astral Resonance Earned ({name})` | `Archetype XP Earned ({name})` | Familiar and clear. |
| `src/ui/combat/BattleVictoryModal.tsx:98` | `Carryover: {N} XP` | `Attunement Reserve: {N} XP` | `Carryover: {N} XP` | Mathematically crystal clear. |
| `src/ui/combat/BattleVictoryModal.tsx:117` | `✦ Multiple Paths Available!` | `✦ Converging Constellation Paths!` | `✦ Multiple Disciplines Ready!` | Connects to archetype disciplines. |
| `src/ui/combat/BattleVictoryModal.tsx:119` | `Your actions qualified for multiple archetypes. Choose which path to advance first:` | `Your combat actions resonate with multiple astral paths. Choose which star to ignite first:` | `Your actions qualified for multiple disciplines. Choose which path to ascend first:` | Uses approved "ascend" verb. |
| `src/ui/combat/BattleVictoryModal.tsx:144` | `🌟 Unlocked: {unlockedClass.name}` | `🌟 Constellation Star Ignited: {unlockedClass.name}` | `🌟 Class Unlocked: {unlockedClass.name}` | Matches Section 7, no "star" confusion. |
| `src/ui/combat/BattleVictoryModal.tsx:175` | `⛺ Return to Camp` | `✦ Return to Astral Haven` | `✦ Return to The Nexus` | Replaces "Camp" with The Nexus. |
| `src/ui/combat/BattleVictoryModal.tsx:179` | `⚔️ Continue / Rematch` | `⚔️ Re-enter Astral Rift` | `⚔️ Retry Trial` | Uses Trial. |
| `src/ui/combat/BattleDefeatModal.tsx:25` | `⚔️ Squad Defeated` | `✦ Astral Severance` | `⚔️ Vanguard Defeated` | Uses approved The Vanguard. |
| `src/ui/combat/BattleDefeatModal.tsx:26` | `The Skirmish Was Lost` | `The Incursion Was Lost` | `The Trial Was Lost` | Uses approved Trial. |
| `src/ui/combat/BattleDefeatModal.tsx:28` | `All party members have fallen on the tactical field.` | `All vanguard wayfarers have fallen. Their astral tether dissolves back to camp.` | `All wayfarers in The Vanguard have fallen. Returning to The Nexus to regroup.` | Weaves in Wayfarers, Vanguard, and The Nexus. |
| `src/ui/combat/BattleDefeatModal.tsx:52` | `Fallen` | `Severed` | `Fallen` | Clean, dignified. |
| `src/ui/combat/BattleDefeatModal.tsx:66` | `⛺ Retreat to Camp` | `⛺ Retreat to Astral Haven` | `⛺ Retreat to The Nexus` | Replaces "Camp" with The Nexus. |
| `src/ui/combat/BattleDefeatModal.tsx:70` | `↺ Retry Skirmish` | `↺ Re-attune to Astral Rift` | `↺ Retry Trial` | Uses approved Trial. |

---

## 12. Procedural Encounters, Objectives & Obstacles

| File & Location | Current String | Proposed Astral Theme String | Approved | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| `src/core/campaign/campaignFactory.ts:43` | `Campaign #1` | `Astral Expedition #1` | `Astral Expedition #1` | Matches Start Screen button. |
| `src/core/campaign/encounterGenerator.ts:262` | `Stage {stage} Skirmish` | `Sector {stage}: Astral Incursion` | `Sector {stage} Trial` | Matches Sector + Trial terminology. |
| `src/core/campaign/encounterGenerator.ts:269` | `Defeat all hostile combatants` | `Banish all hostile incursion entities` | `Defeat all hostile combatants` | Matches Detected Hostiles in Section 6. |
| `src/core/campaign/encounterGenerator.ts:207` | `label: 'Ruins'` | `label: 'ASTRAL CRAG'` | `RUINS` | Clean uppercase hex obstacle label. |
| `src/data/encounters/noviceSandbox.ts:139` | `Bandit Fighter A` | `Void Fighter A` | `Void Fighter A` | Gives sandbox enemy void flavor. |
| `src/data/encounters/noviceSandbox.ts:149` | `Bandit Skirmisher B` | `Rift Skirmisher B` | `Rift Skirmisher B` | Gives sandbox enemy void flavor. |
| `src/data/encounters/noviceSandbox.ts:159` | `Screened Cultist C` | `Shadow Cultist C` | `Shadow Cultist C` | Gives sandbox enemy void flavor. |
| `src/data/encounters/noviceSandbox.ts:169` | `Distant Scout D` | `Astral Scout D` | `Astral Scout D` | Gives sandbox enemy void flavor. |
| `src/data/encounters/noviceSandbox.ts:178` | `Tactical Squad Arena` | `Novice Astral Arena` | `Novice Astral Trial` | Matches Section 1 dev menu switcher. |
| `src/data/encounters/noviceSandbox.ts:180` | `label: 'PILLAR'` | `label: 'ASTRAL PILLAR'` | `PILLAR` | Clean uppercase hex obstacle label. |
| `src/data/encounters/noviceSandbox.ts:193` | `Defeat all hostile combatants` | `Defeat all hostile combatants` | `Defeat all hostile combatants` | Sandbox objective matching campaign trial. |

