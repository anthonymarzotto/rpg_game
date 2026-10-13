# Features:
  - Aging
    - Units age each skirmish.
    - Different tiers of age confer different stat mods.
    - Die of old age.

  - Tutoring
    - Existing units can "train" Novices or any lower level unit by passing on some amount of earned XP.
    - Units not available for Trials for X number of turns until training complete.

  - Nemeses
    - Enemies try to escape at some HP threshold, 1% or 5%.
      - If successful they "level up" and persist to come around in a later level.
      - Keep some sort of history on them.

# Improvements:
  - Feels a little easy.
    - Player units always go first, so immediately get tempo advantage.
    - Maybe boost threat a bit or reduce enemy threat calculation to get more/better units on the field.
    - Through 5 rounds, only lost units maybe once or twice.
    - Stage 5 felt better with myself having a level 3, 2, and 1 character against a level 3, 1, and 2 Novices.
    - The round enemies are determined prior to Ascensions.
      - e.g. Round 1 ends, back to Camp. New enemy/trial is generated but all 3 Novices have enough XP to level up.
  - Enemy Generation
    - Go through real levelling and choose appropriate resonant abilities. 
    - Allow level up through wayfarer levels.
  - Gaining XP by skill use is...a bit awkward
    - I liked the idea, but it makes things less fun. On gaining my level 2 class, I know have to actively use my 1 Novice skill that of the other Fighter/Rogue/Mage in order to progress to another class.
    - This is intentional. But its a bit sad to not just go all in on my best skills right away.
    - Is there a way to make the type of skill used still important for progression but not feel so forced?
  - Related to gaining XP, it can be difficult to remember for each unit what skills you want to use to try to get to your next desired class.
    - Maybe we can add an option to star an ability. This could be used to help a player remember which skill they want to use (or whatever else they want to use it for).

# Class Improvements
  - Thiefs get a LOT of actions it feels like, maybe double. In one encounter at Stage 3 my Infiltrator got 11 XP and my other units got maybe 4-6 XP.
    - Not necessarily bad, but worth exploring the action economy here.
  - Infiltrator, when under Smoke Veil, how do we treat them?
    - Are they still a blocking spot for movement? Does the AI consider them?
    - Needs some refinement. I think it forced an enemy unit to get stuck processing their turn when I was Smoke Veiled 3 hexes from them beside a Ruin and a 1 height hex.

# UI Refinements:
  - Trial Arena
    - Initiative bubbles should highlight the unit on the field and vice versa.
    - Initiative track needs work. Some ideas:
      - Space units out a bit by their current task; Show initiative # more prominently.
    - Enemy units need better names. Either numbered (Novice 1, Novice 2) or real names.
    - Allow selecting of facing after moving.
    - Current character card XP line should show current XP and earned in battle like: F: 7 XP (+2)
    - Need to be able to select a unit to pin its info window to be able to:
      - Hover over their current effects.
      - See their current skill loadout.
  - Unit Info dialog
    - Combat Manifest in Unit Info dialog doesn't show updated values based on equipped shards (e.g. Bloodbound Shard)
      - This might just be a text description? The skill details in combat look like they might be updated, though the description shows the default dice.
    - The Constellation
      - "Wayfarer" point feels a bit random. First Wayfarer point from R: 1, F: 1 is near the middle.
      - Change the three point labels to Force/Finesse/Focus.
    - Current XP earned should show somewhere.
    - I don't really like the title "Assumed Class".
    - Resonance Ability drop down lists required AP which is good. It also needs to include the Fighter/Mage/Rogue tag.
  - General
    - Dev mode things should only be available on localhost.

# Debug Tools:
  - Some way to export the current combat for assessment on AI decision making.

# Bugs:
  - Arcane Blast splash damage shouts out "Collision" and is not logged in Combat Log.
  - Does "Hit Chance" consider Disadvantage from Challenged state?
  - Challenged shouldn't stack. Just one active per unit. Knight should try to do other things.
    - Same for the Witch and Witch's Talisman. I think the Witch is trying to Talisman the same unit multiple times.
  - Critical hits seem to trigger on any roll calculated to 20, including modifiers. I would think that this should have to be a natural 20 (or naturally rolled in the crit range)?
  - Power Strike doesn't have a fancy formatted Combat Log card.
    - Also Baleful Hex, Point Blank Buckshot, Soul Carapace, Wild Surge, Throw Dart, Frostbite, Elusive Stride, Strike
    - Brace doesn't get a nice Combat Log card on Miss, but it does on Graze.
  - Expose Weakness and Witch's Talisman don't say their target in the Combat Log.
    - General problem for Buff/Debuff skills.
  - Gust didn't call out anything for knockback damage on the target or the unit being knocked into.
  - **BLOCKER** When the AI is trying to buff and all allies are buffed, it gets locked.
  - When standing on a Height 2 hex, it didn't seem like Mage attacks had increased range. Is this true?
  - Knight Challenging Shout still used twice on one unit in one turn. Better option was to just pass and save +20 CTB. 1 left and not close enough to hit melee.
