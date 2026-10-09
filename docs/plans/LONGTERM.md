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

# UI Refinements:
  - Trial Arena
    - Initiative bubbles should highlight the unit on the field and vice versa.
    - Initiative track needs work. Some ideas:
      - Space units out a bit by their current task; Show initiative # more prominently.
    - Enemy units need better names. Either numbed (Novice 1, Novice 2) or real names.
    - Allow selecting of facing after moving.
    - Current character card XP line should show current XP and earned in battle like: F: 7 XP (+2)
    - Need to be able to select a unit to pin its info window to be able to hover over their current effects.
  - Unit Info dialog
    - Combat Manifest in Unit Info dialog doesn't show updated values based on equipped shards (e.g. Bloodbound Shard)
      - This might just be a text description? The skill details in combat look like they might be updated, though the description shows the default dice.
    - The Constellation
      - "Wayfarer" point feels a bit random. First Wayfarer point from R: 1, F: 1 is near the middle.
      - Change the three point labels to Force/Finesse/Focus.
    - Current XP earned should show somewhere.

# Bugs:
  - Arcane Blast splash damage shouts out "Collision" and not logged in Combat Log.
  - Does "Hit Chance" consider Disadvantage from Challenged state?
  - Challenged shouldn't stack. Just one active per unit. Knight should try to do other things.
    - Same for the Witch and Witch's Talisman. I think the Witch is trying to Talisman the same unit multiple times.
  - In GitHub deployment, no assets visible.
  - Critical hits seem to trigger on any roll calculated at 20, including modifiers. I would think that this should have to be a natural 20 (or naturally rolled in the crit range)?
  - Power Strike doesn't have a fancy formatted Combat Log card.
    - Also Baleful Hex, Point Blank Buckshot, Soul Carapace, Wild Surge, Throw Dart, Frostbite, Elusive Stride, Strike
    - Brace doesn't get a nice Combat Log card on Miss, but it does on Graze.
  - Expose Weakness and Witch's Talisman don't say their target in the Combat Log.
