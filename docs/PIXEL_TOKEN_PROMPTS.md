# Pixel Unit Token Prompts: Class Catalog

This document catalogs standardized LLM generation prompts for all unit classes that do not yet have pixel assets.

Every prompt strictly adheres to the established asset format and color weighting derived from each class's celestial requirements `(Fighter, Rogue, Mage)`:
* **Fighter (F)**: **Crimson** (`#ef4444`)
* **Rogue (R)**: **Vibrant Emerald** (`#10b981`)
* **Mage (M)**: **Vibrant Violet** (`#8b5cf6`)

---

## Prompt Template
```text
A chibi [class/archetype] in [distinctive stance], wearing [thematic clothing/armor] with [accessories]. Featuring large, expressive anime eyes. The outfit is accented with [color distribution matching F/R/M point weight]. Holding [signature weapon/implement], selective outline.
```

---

## Existing Assets (12 Classes)
The following classes already possess completed asset sets in `public/assets/tokens/pixel/` and are excluded from this generation batch:
* `00_human_male`: Warrior `(1F, 0R, 0M)`
* `01_human_male`: Cavalier `(2F, 1R, 0M)`
* `02_human_male`: Knight `(2F, 0R, 0M)`
* `03_human_male`: Berserker `(2F, 0R, 1M)`
* `64_human_male`: Highwayman `(1F, 2R, 0M)`
* `80_human_male`: Warlock `(1F, 0R, 2M)`
* `81_human_male`: Thief `(0F, 1R, 0M)`
* `82_human_male`: Infiltrator `(0F, 2R, 0M)`
* `83_human_male`: Cat-burglar `(0F, 2R, 1M)`
* `97_human_male`: Witch `(0F, 1R, 2M)`
* `98_human_male`: Sorcerer `(0F, 0R, 2M)`
* `99_human_male`: Wizard `(0F, 0R, 1M)`

---

## Prompts for Missing Classes (88 Classes)

### Tier 2 & Tier 3: Martial & Vanguard Hybrids (04 - 24)

#### #04 - Pugilist (`pugilist`)
* **Requirements**: Fighter: 3, Rogue: 2, Mage: 0 (Total: 5)
* **Palette**: Major Crimson, Minor Emerald
```text
A chibi pugilist in an aggressive, low bobbing-and-weaving boxing stance, wearing a rugged leather vest and fitted sparring shorts. Featuring large, expressive anime eyes. The outfit is accented with bold crimson on heavy fist wraps and torso laces, with subtle emerald details on the waist sash and ankle bindings. Holding clenched leather-wrapped knuckles forward, selective outline.
```

#### #05 - Shield-bearer (`shield-bearer`)
* **Requirements**: Fighter: 3, Rogue: 1, Mage: 0 (Total: 4)
* **Palette**: Major Crimson, Minor Emerald
```text
A chibi shield-bearer anchored in a wide, rock-solid defensive phalanx stance, wearing polished iron half-plate over a heavy padded gambeson. Featuring large, expressive anime eyes. The outfit is accented with vivid crimson on the surcoat crest and helmet plume, with minor emerald trim lining the shield strap and boot cuffs. Holding a massive reinforced kite shield planted in front, selective outline.
```

#### #06 - Weapon Master (`weapon-master`)
* **Requirements**: Fighter: 3, Rogue: 1, Mage: 1 (Total: 5)
* **Palette**: Dominant Crimson, Minor Emerald, Minor Violet
```text
A chibi weapon master poised in a poised, multi-weapon ready stance, wearing studded leather cuirass layered with reinforced shoulder pauldrons. Featuring large, expressive anime eyes. The outfit is accented with dominant crimson on the combat tunic, accompanied by emerald leather sheath straps and subtle violet cord ties on a back weapon harness. Holding a broad bladed halberd with side daggers visible, selective outline.
```

#### #07 - Dragoon (`dragoon`)
* **Requirements**: Fighter: 3, Rogue: 0, Mage: 1 (Total: 4)
* **Palette**: Major Crimson, Minor Violet
```text
A chibi dragoon in a coiled, skyward-leaning crouch ready to vault, wearing pointed dragon-wing steel plate armor with swept pauldrons. Featuring large, expressive anime eyes. The outfit is accented with deep crimson along the scale plates and capelet, with glowing violet engravings running along the greaves and visor slit. Holding a long barbed dragon lance with a pennant, selective outline.
```

#### #08 - Sentinel (`sentinel`)
* **Requirements**: Fighter: 3, Rogue: 0, Mage: 2 (Total: 5)
* **Palette**: Major Crimson, Secondary Violet
```text
A chibi sentinel standing firmly in an unyielding sentry posture, wearing layered bastion plate armor and an enclosed visor helm. Featuring large, expressive anime eyes. The outfit is accented with rich crimson on the tabard and shield mantle, paired with vibrant violet runic wards pulsing along the chestplate borders and polearm shaft. Holding a tall runic spear planted upright, selective outline.
```

#### #09 - Fencer (`fencer`)
* **Requirements**: Fighter: 4, Rogue: 3, Mage: 0 (Total: 7)
* **Palette**: Major Crimson, Secondary Emerald
```text
A chibi fencer poised in an elegant side-on en garde posture, wearing a fitted dueling doublet with a single quilted shoulder guard. Featuring large, expressive anime eyes. The outfit is accented with sharp crimson across the doublet paneling and feather plume, complemented by vibrant emerald silk trim along the cuffs and rapier sash. Holding a gleaming basket-hilted rapier extended forward, selective outline.
```

#### #10 - Soldier (`soldier`)
* **Requirements**: Fighter: 4, Rogue: 2, Mage: 0 (Total: 6)
* **Palette**: Major Crimson, Minor Emerald
```text
A chibi soldier standing in a disciplined, braced formation stance, wearing standard-issue iron scale mail over a sturdy wool tunic. Featuring large, expressive anime eyes. The outfit is accented with commanding crimson across the unit tabard and shoulder mantlet, with subtle emerald cord ties on the supply pouch and field canteen. Holding an iron broadsword and round infantry shield, selective outline.
```

#### #11 - Samurai (`samurai`)
* **Requirements**: Fighter: 4, Rogue: 2, Mage: 1 (Total: 7)
* **Palette**: Dominant Crimson, Secondary Emerald, Minor Violet
```text
A chibi samurai settled in a low, focused iaijutsu drawing crouch, wearing ornate lacquered lamellar armor with broad sode shoulder guards. Featuring large, expressive anime eyes. The outfit is accented with dominant crimson on the lacquered armor plates, secondary vibrant emerald silk cords tying the breastplate, and subtle violet tassel accents on the sword scabbard. Holding one hand gripping the tsuka of a sheathed katana, selective outline.
```

#### #12 - Martial Artist (`martial-artist`)
* **Requirements**: Fighter: 4, Rogue: 1, Mage: 1 (Total: 6)
* **Palette**: Dominant Crimson, Minor Emerald, Minor Violet
```text
A chibi martial artist frozen in a dynamic crane martial arts pose on one foot, wearing a sleeveless gi with reinforced wrist guards. Featuring large, expressive anime eyes. The outfit is accented with bright crimson on the sash and headband tails, with subtle emerald stitching along the collar and a faint violet spiritual focus bead on the necklace. Holding open palm and coiled strike fist, selective outline.
```

#### #13 - Monk (`monk`)
* **Requirements**: Fighter: 4, Rogue: 1, Mage: 2 (Total: 7)
* **Palette**: Major Crimson, Secondary Violet, Minor Emerald
```text
A chibi monk standing in a serene yet powerful palm-strike stance, wearing layered prayer robes over light sparring wraps. Featuring large, expressive anime eyes. The outfit is accented with warm crimson robes and shoulder drape, with vibrant violet prayer bead cords across the torso and minor emerald tassels hanging from the waist rope. Holding a carved prayer staff topped with brass rings, selective outline.
```

#### #14 - Dragon Knight (`dragon-knight`)
* **Requirements**: Fighter: 4, Rogue: 0, Mage: 2 (Total: 6)
* **Palette**: Major Crimson, Secondary Violet
```text
A chibi dragon knight posed in a broad, intimidating combat stance, wearing heavy flared dragon-scale plate with horned shoulder guards. Featuring large, expressive anime eyes. The outfit is accented with fiery crimson scale enamel across the cuirass, accented by vibrant violet draconic flame glyphs etched into the vambraces and greaves. Holding a heavy twin-pronged war lance, selective outline.
```

#### #15 - Dark Knight (`dark-knight`)
* **Requirements**: Fighter: 4, Rogue: 0, Mage: 3 (Total: 7)
* **Palette**: Major Crimson, Secondary Violet
```text
A chibi dark knight in a heavy, menacing executioner stance, wearing jagged blackened steel plate with an imposing spiked crest. Featuring large, expressive anime eyes. The outfit is accented with deep blood-crimson on the inner cape and plate trims, accompanied by glowing violet necrotic veins pulsing across the armor joints. Holding a massive dark greatsword rested against the shoulder, selective outline.
```

#### #16 - Archer (`archer`)
* **Requirements**: Fighter: 5, Rogue: 4, Mage: 0 (Total: 9)
* **Palette**: Balanced Crimson and Emerald
```text
A chibi archer caught mid-draw in a grounded, wide-spread archery stance, wearing a reinforced leather archer coat with hardened shoulder pauldron. Featuring large, expressive anime eyes. The outfit is accented with rich crimson on the archer bracer and tunic mantle, balanced by vibrant emerald on the hooded quiver wrap and scout boots. Holding a tall yew recurve longbow fully drawn, selective outline.
```

#### #17 - Corsair (`corsair`)
* **Requirements**: Fighter: 5, Rogue: 3, Mage: 0 (Total: 8)
* **Palette**: Major Crimson, Secondary Emerald
```text
A chibi corsair leaning forward in a cocky, swaggering deck-skirmish stance, wearing an open captain's coat over a weathered leather vest. Featuring large, expressive anime eyes. The outfit is accented with vivid crimson across the longcoat lapels and bandanna, with rich emerald sash wraps and boot buckles around the waist. Holding a notched boarding cutlass and belaying pin, selective outline.
```

#### #18 - Beast Rider (`beast-rider`)
* **Requirements**: Fighter: 5, Rogue: 3, Mage: 1 (Total: 9)
* **Palette**: Dominant Crimson, Secondary Emerald, Minor Violet
```text
A chibi beast rider leaning forward in a predatory hunting crouch, wearing tough hide armor wrapped in fur trims and bone buckles. Featuring large, expressive anime eyes. The outfit is accented with bold crimson war paint and tunic leather, vibrant emerald braided reins and utility belts, and a small violet beast-charm totem on the neck. Holding a notched hunting harpoon, selective outline.
```

#### #19 - Ronin (`ronin`)
* **Requirements**: Fighter: 5, Rogue: 2, Mage: 1 (Total: 8)
* **Palette**: Dominant Crimson, Minor Emerald, Minor Violet
```text
A chibi ronin in a loose, unpredictable wanderer stance with relaxed shoulders, wearing a tattered traveling haori over scarred chest wraps. Featuring large, expressive anime eyes. The outfit is accented with weathered crimson cloth on the haori lining, with emerald cord ties binding straw sandals and a subtle violet bead hanging from a weathered wicker hat brim. Holding an unsheathed chipped nodachi resting over one shoulder, selective outline.
```

#### #20 - Warlord (`warlord`)
* **Requirements**: Fighter: 5, Rogue: 2, Mage: 2 (Total: 9)
* **Palette**: Dominant Crimson, Balanced Emerald and Violet
```text
A chibi warlord in a commanding, chest-out tactical leader stance, wearing ornate gilded plate armor and a lion-faced gorget. Featuring large, expressive anime eyes. The outfit is accented with commanding crimson across the full-length battle cape, with rich emerald trim along the command belt and vibrant violet crest accents on the helmet ridge. Holding a heavy spiked war mace raised to direct forces, selective outline.
```

#### #21 - Herald (`herald`)
* **Requirements**: Fighter: 5, Rogue: 1, Mage: 2 (Total: 8)
* **Palette**: Dominant Crimson, Secondary Violet, Minor Emerald
```text
A chibi herald standing at full attention in an inspirited rallying posture, wearing ceremonial brigandine armor with polished bronze rivets. Featuring large, expressive anime eyes. The outfit is accented with radiant crimson across the quartered heraldic tabard, with vivid violet trim along the trumpet banner and a minor emerald sash badge. Holding a tall brass rallying horn in one hand and a war banner pole in the other, selective outline.
```

#### #22 - Inquisitor (`inquisitor`)
* **Requirements**: Fighter: 5, Rogue: 1, Mage: 3 (Total: 9)
* **Palette**: Dominant Crimson, Secondary Violet, Minor Emerald
```text
A chibi inquisitor stepping forward in a stern, condemning judgment stance, wearing a wide-brimmed leather hat and heavy duster coat over chainmail. Featuring large, expressive anime eyes. The outfit is accented with deep crimson along the coat lapels and leather collar, highlighted by vibrant violet glowing inquisitorial seals and a minor emerald gem brooch at the throat. Holding a brandishing holy iron brand and heavy rapier, selective outline.
```

#### #23 - Blade-singer (`blade-singer`)
* **Requirements**: Fighter: 5, Rogue: 0, Mage: 3 (Total: 8)
* **Palette**: Major Crimson, Secondary Violet
```text
A chibi blade-singer caught in a fluid, pirouetting combat dance stance, wearing elegant mithril-linked chain mesh and sweeping silk side-sashes. Featuring large, expressive anime eyes. The outfit is accented with vivid crimson across the flowing tunic, harmonized with shimmering violet arcane ribbons and glowing violet runes floating around the blade. Holding an ornate curved longsword trailing violet light, selective outline.
```

#### #24 - Paladin (`paladin`)
* **Requirements**: Fighter: 5, Rogue: 0, Mage: 4 (Total: 9)
* **Palette**: Balanced Crimson and Violet
```text
A chibi paladin standing tall in a sacred, bastion champion stance, wearing radiant polished white plate armor with golden trim. Featuring large, expressive anime eyes. The outfit is accented with bold crimson across the chivalric tabard, balanced by brilliant violet celestial radiance glowing from the pauldrons and shield face. Holding a gleaming holy warhammer raised high, selective outline.
```

---

### Tier 3 & Specialists: Skirmishers, Tricksters & Mystic Warriors (25 - 48)

#### #25 - Marksman (`marksman`)
* **Requirements**: Fighter: 4, Rogue: 5, Mage: 0 (Total: 9)
* **Palette**: Dominant Emerald, Secondary Crimson
```text
A chibi marksman in a precise, kneeling sniper posture with one knee down, wearing form-fitting camouflage scout leathers with reinforced elbow guards. Featuring large, expressive anime eyes. The outfit is accented with dominant emerald throughout the cloaking cape and leathers, accompanied by rich crimson archery gloves and target-quiver straps. Holding a heavy mechanical arbalest leveled with deadly focus, selective outline.
```

#### #26 - Duellist (`duellist`)
* **Requirements**: Fighter: 4, Rogue: 4, Mage: 0 (Total: 8)
* **Palette**: Balanced Crimson and Emerald
```text
A chibi duellist in a poised, taunting fencing stance with off-hand poised behind, wearing a split-color tailored velvet dueling jacket and high boots. Featuring large, expressive anime eyes. The outfit is accented with equal halves of bold crimson and vibrant emerald on the split jacket chest and capelet lining. Holding an exquisite silver swept-hilt rapier and a parrying dagger, selective outline.
```

#### #27 - Marauder (`marauder`)
* **Requirements**: Fighter: 4, Rogue: 4, Mage: 1 (Total: 9)
* **Palette**: Balanced Crimson and Emerald, Minor Violet
```text
A chibi marauder in a savage, leaping flank-strike crouch, wearing spiked leather armor wrapped in iron bands and beast pelts. Featuring large, expressive anime eyes. The outfit is accented with intense crimson war paint and kilt wraps, balanced by vibrant emerald hide vest straps, with minor violet ritual beads braided into messy hair. Holding twin notched boarding axes ready to chop, selective outline.
```

#### #28 - Raider (`raider`)
* **Requirements**: Fighter: 4, Rogue: 3, Mage: 1 (Total: 8)
* **Palette**: Major Crimson, Secondary Emerald, Minor Violet
```text
A chibi raider in a fast, forward-lunging skirmish stance, wearing light ringmail over tough road-stained leathers. Featuring large, expressive anime eyes. The outfit is accented with rugged crimson across the torn shoulder cape, vibrant emerald trim on the hip pouch harness, and a subtle violet charm strung onto a weapon sheath. Holding a spiked morningstar and small round buckler, selective outline.
```

#### #29 - Adventurer (`adventurer`)
* **Requirements**: Fighter: 4, Rogue: 3, Mage: 2 (Total: 9)
* **Palette**: Dominant Crimson, Secondary Emerald, Minor Violet
```text
A chibi adventurer standing in a confident, versatile explorer stance with hand on belt, wearing a multi-pocketed travel vest over a chainmail shirt. Featuring large, expressive anime eyes. The outfit is accented with warm crimson along the vest yoke, vibrant emerald on the bedroll pack and canteen straps, with minor violet sparks leaking from an enchanted compass pouch. Holding an iron shortsword and an unrolled map scroll, selective outline.
```

#### #30 - Strategist (`strategist`)
* **Requirements**: Fighter: 4, Rogue: 2, Mage: 2 (Total: 8)
* **Palette**: Dominant Crimson, Balanced Emerald and Violet
```text
A chibi strategist in a calculating, contemplative posture pointing a command baton forward, wearing a high-collared military mantle over officer armor. Featuring large, expressive anime eyes. The outfit is accented with deep crimson across the longcoat, supported by emerald epaulet fringes and violet tactical diagram ribbons trailing from a belt folder. Holding an iron tipped tactical command baton, selective outline.
```

#### #31 - Diplomat (`diplomat`)
* **Requirements**: Fighter: 4, Rogue: 2, Mage: 3 (Total: 9)
* **Palette**: Dominant Crimson, Secondary Violet, Minor Emerald
```text
A chibi diplomat in an imposing yet suave orator stance with one hand gesturing, wearing an aristocratic court coat layered with discreet gilded breastplate. Featuring large, expressive anime eyes. The outfit is accented with rich crimson on the tailored overcoat, royal violet along the inner silk lapels and sash, and subtle emerald cuff-links and signet rings. Holding a gilded rapier with treaty scroll tucked underarm, selective outline.
```

#### #32 - Templar (`templar`)
* **Requirements**: Fighter: 4, Rogue: 1, Mage: 3 (Total: 8)
* **Palette**: Dominant Crimson, Secondary Violet, Minor Emerald
```text
A chibi templar standing in an immovable, ground-anchoring judgment stance, wearing heavy steel plate embossed with sun sigils. Featuring large, expressive anime eyes. The outfit is accented with bold crimson across the front tabard cross, vibrant violet divine auras tracing the shield perimeter, and a minor emerald prayer clasp on the cloak. Holding a heavy flanged holy mace and tower shield, selective outline.
```

#### #33 - Spellsword (`spellsword`)
* **Requirements**: Fighter: 4, Rogue: 1, Mage: 4 (Total: 9)
* **Palette**: Balanced Crimson and Violet, Minor Emerald
```text
A chibi spellsword lunging forward in an energized, spell-infused strike stance, wearing enchanted battle-leather with etched silver pauldrons. Featuring large, expressive anime eyes. The outfit is accented with vibrant crimson on the combat tunic, paired with intense violet arcane runes crackling along the blade and belt, and a minor emerald gem on the pommel. Holding a broadsword glowing with violet elemental fire, selective outline.
```

#### #34 - Death Knight (`death-knight`)
* **Requirements**: Fighter: 4, Rogue: 0, Mage: 4 (Total: 8)
* **Palette**: Balanced Crimson and Violet
```text
A chibi death knight standing in an ominous, inexorable advance pose, wearing jagged obsidian armor coated in dark frost rime. Featuring large, expressive anime eyes. The outfit is accented with dark crimson on the shredded back cloak, balanced by icy violet necrotic flames flaring from the gauntlets and eye slits. Holding a massive rune-carved scythe resting low, selective outline.
```

#### #35 - Battlemage (`battlemage`)
* **Requirements**: Fighter: 4, Rogue: 0, Mage: 5 (Total: 9)
* **Palette**: Dominant Violet, Secondary Crimson
```text
A chibi battlemage standing in a wide, point-blank spellcasting stance with weapon ready, wearing heavy plate gauntlets and greaves over layered mage robes. Featuring large, expressive anime eyes. The outfit is accented with dominant deep violet on the sweeping runic mantle, framed by sharp crimson borders on the armored breastplate. Holding an ignited runic war blade in one hand and swirling arcane blast in the other, selective outline.
```

#### #36 - Bandit (`bandit`)
* **Requirements**: Fighter: 3, Rogue: 4, Mage: 0 (Total: 7)
* **Palette**: Major Emerald, Secondary Crimson
```text
A chibi bandit crouching in a sly, opportunistic ambush stance behind cover, wearing patchwork leathers, knee wraps, and a pulled-up face bandana. Featuring large, expressive anime eyes. The outfit is accented with earthy emerald on the hooded vest and pants, complemented by vivid crimson cloth ties on the bandana and boot knives. Holding a serrated hunting club and rusty dagger, selective outline.
```

#### #37 - Gunslinger (`gunslinger`)
* **Requirements**: Fighter: 3, Rogue: 5, Mage: 0 (Total: 8)
* **Palette**: Dominant Emerald, Secondary Crimson
```text
A chibi gunslinger standing in a lightning-fast quick-draw dueling stance, wearing a duster trench coat, wide hat, and low-slung dual holster rigs. Featuring large, expressive anime eyes. The outfit is accented with dominant emerald on the heavy duster coat and trousers, contrasted by vibrant crimson on the silk neckerchief and bullet bandoliers. Holding twin smoking revolver pistols pointed forward, selective outline.
```

#### #38 - Assassin (`assassin`)
* **Requirements**: Fighter: 3, Rogue: 5, Mage: 1 (Total: 9)
* **Palette**: Dominant Emerald, Secondary Crimson, Minor Violet
```text
A chibi assassin crouched in a silent, lethal pounce stance on a narrow perch, wearing form-fitting matte-black stealth shroud and ninja hood. Featuring large, expressive anime eyes. The outfit is accented with dominant emerald on the sash and inner cowl, sharp crimson venom-stained bands on the forearms, and a subtle violet sheen along the blade edge. Holding twin reverse-grip poison katars, selective outline.
```

#### #39 - Ranger (`ranger`)
* **Requirements**: Fighter: 3, Rogue: 4, Mage: 1 (Total: 8)
* **Palette**: Major Emerald, Secondary Crimson, Minor Violet
```text
A chibi ranger stepping lightly in a tracking pathfinder stance, wearing forest-dweller leathers with fur-trimmed shoulders and bracers. Featuring large, expressive anime eyes. The outfit is accented with lush emerald across the cloak and tunic, rich crimson quiver ties and hunting belt, and a tiny violet spirit stone dangling from the bow grip. Holding a carved composite hunting bow and tracking knife, selective outline.
```

#### #40 - Ninja (`ninja`)
* **Requirements**: Fighter: 3, Rogue: 4, Mage: 2 (Total: 9)
* **Palette**: Dominant Emerald, Secondary Crimson, Minor Violet
```text
A chibi ninja posed in a low, smoke-parting hand-seal stance, wearing a sleek shinobi shohzoku suit with wrapped shins and arm guards. Featuring large, expressive anime eyes. The outfit is accented with dominant emerald on the ninja sash and mask trim, vivid crimson on the throwing star pouches and headband, and violet smoke particles whirling around the boots. Holding a gleaming kunai dagger and smoke bomb, selective outline.
```

#### #41 - Merchant (`merchant`)
* **Requirements**: Fighter: 3, Rogue: 3, Mage: 2 (Total: 8)
* **Palette**: Balanced Crimson and Emerald, Minor Violet
```text
A chibi merchant in a lively, bargaining stance holding a ledger proudly, wearing an opulent fur-trimmed traveling coat over a protective chain vest. Featuring large, expressive anime eyes. The outfit is accented with rich crimson on the coat fabric, emerald on the oversized coin pouch and velvet pants, with violet gem clasps fastening the collar. Holding an open trade ledger and a bag of brass coins, selective outline.
```

#### #42 - Bard (`bard`)
* **Requirements**: Fighter: 3, Rogue: 3, Mage: 3 (Total: 9)
* **Palette**: Equal Tricolor Harmony (Crimson, Emerald, Violet)
```text
A chibi bard caught in an exuberant, theatrical step strumming a tune, wearing a feathered cavalier cap, brocade doublet, and striped breeches. Featuring large, expressive anime eyes. The outfit is accented with equal harmony: rich crimson feathered hat, vibrant emerald embroidered doublet, and vibrant violet instrument strap and musical note sparkles. Holding an intricately carved wooden lute, selective outline.
```

#### #43 - Dancer (`dancer`)
* **Requirements**: Fighter: 3, Rogue: 2, Mage: 3 (Total: 8)
* **Palette**: Balanced Crimson and Violet, Minor Emerald
```text
A chibi dancer caught mid-spin in an alluring, rhythmic whirl, wearing flowing silk veils, jeweled waist chains, and light dancing wraps. Featuring large, expressive anime eyes. The outfit is accented with bold crimson on the swirling silk skirt, vibrant violet on the veil ribbons and arcane wrist bangles, with minor emerald beads ringing the waist sash. Holding a pair of gleaming crescent dancing daggers, selective outline.
```

#### #44 - Arcane Archer (`arcane-archer`)
* **Requirements**: Fighter: 3, Rogue: 2, Mage: 4 (Total: 9)
* **Palette**: Dominant Violet, Secondary Crimson, Minor Emerald
```text
A chibi arcane archer leaning back in a graceful shot stance drawing an arrow of pure light, wearing tailored elven leathers and a sweeping cape. Featuring large, expressive anime eyes. The outfit is accented with luminous violet runes coursing down the bow and quiver, rich crimson on the leather chest guard, and subtle emerald feather fletchings. Holding an ornate bow with a glowing violet mana arrow nocked, selective outline.
```

#### #45 - Red Mage (`red-mage`)
* **Requirements**: Fighter: 3, Rogue: 1, Mage: 4 (Total: 8)
* **Palette**: Dominant Violet, Secondary Crimson, Minor Emerald
```text
A chibi red mage in a dashing, cross-legged sword-and-spell salute stance, wearing a stylish wide-brimmed feathered chapeau and tailored frock coat. Featuring large, expressive anime eyes. The outfit is accented with striking crimson throughout the coat fabric, vivid violet on the spellcasting mantle and magic sparks, with a subtle emerald gem in the hat buckle. Holding a slender fencing rapier in one hand and casting an elemental rune with the other, selective outline.
```

#### #46 - Blue Mage (`blue-mage`)
* **Requirements**: Fighter: 3, Rogue: 1, Mage: 5 (Total: 9)
* **Palette**: Dominant Violet, Secondary Crimson, Minor Emerald
```text
A chibi blue mage in an eccentric, observational stance mimicking a beast claw, wearing an academic researcher robe over traveling boots and leather braces. Featuring large, expressive anime eyes. The outfit is accented with deep violet across the primary academic robe, bright crimson monster claw talismans around the neck, and minor emerald trims on the field notebook. Holding a crooked monster-lore cane and open bestiary, selective outline.
```

#### #47 - Cleric (`cleric`)
* **Requirements**: Fighter: 3, Rogue: 0, Mage: 5 (Total: 8)
* **Palette**: Dominant Violet, Secondary Crimson
```text
A chibi cleric standing with grounded resolve in a blessing combat posture, wearing polished chain armor beneath sanctified cleric vestments. Featuring large, expressive anime eyes. The outfit is accented with radiant violet on the priestly chasuble and holy aura, with rich crimson crosses adorning the chest and shield. Holding a heavy flanged holy warhammer and a glowing sun reliquary, selective outline.
```

#### #48 - Battle-priest (`battle-priest`)
* **Requirements**: Fighter: 3, Rogue: 0, Mage: 4 (Total: 7)
* **Palette**: Major Crimson, Secondary Violet
```text
A chibi battle-priest charging forward in a zealous, roaring war chant stance, wearing spiked steel breastplate over monastic habit. Featuring large, expressive anime eyes. The outfit is accented with fiery crimson across the war surcoat and prayer stoles, coupled with vibrant violet divine sparks erupting from the knuckles. Holding an enormous iron-banded holy mace swung high, selective outline.
```

---

### Tier 2 & Tier 3: Pathfinders, Outriders & Primal Conduits (49 - 63)

#### #49 - Cutpurse (`cutpurse`)
* **Requirements**: Fighter: 2, Rogue: 3, Mage: 0 (Total: 5)
* **Palette**: Major Emerald, Secondary Crimson
```text
A chibi cutpurse caught mid-stride in a hurried alleyway getaway sprint, wearing a dark hooded vest, fingerless gloves, and nimble leather breeches. Featuring large, expressive anime eyes. The outfit is accented with vibrant emerald on the hood lining and leather vest, with crisp crimson accents on the coin-cutting shears strap and ankle wraps. Holding a curved pick-purse knife and a bulging stolen purse, selective outline.
```

#### #50 - Scout (`scout`)
* **Requirements**: Fighter: 2, Rogue: 4, Mage: 0 (Total: 6)
* **Palette**: Dominant Emerald, Minor Crimson
```text
A chibi scout crouching low on a hilltop vantage point shading their eyes, wearing lightweight woodland leather armor and hooded ranger cape. Featuring large, expressive anime eyes. The outfit is accented with dominant emerald on the cloak and boots, with minor crimson cords tying the compass case and shoulder knife sheath. Holding a brass collapsible spyglass and small hunting bow, selective outline.
```

#### #51 - Hunter (`hunter`)
* **Requirements**: Fighter: 2, Rogue: 4, Mage: 1 (Total: 7)
* **Palette**: Dominant Emerald, Minor Crimson, Minor Violet
```text
A chibi hunter kneeling patiently in an tracking trap-setting crouch, wearing weathered hide tunic with antler buttons and stealth moccasins. Featuring large, expressive anime eyes. The outfit is accented with dominant forest emerald on the hunting tunic, subtle crimson on the snare cords and quiver belt, and a minor violet animal scent pouch at the hip. Holding a notched hunting crossbow and steel coil snare, selective outline.
```

#### #52 - Explorer (`explorer`)
* **Requirements**: Fighter: 2, Rogue: 5, Mage: 1 (Total: 8)
* **Palette**: Dominant Emerald, Minor Crimson, Minor Violet
```text
A chibi explorer stepping across ruins in an intrepid, wide stance holding up a lantern, wearing an expedition coat with map tubes and tool harnesses. Featuring large, expressive anime eyes. The outfit is accented with rich emerald on the durable expedition canvas coat, minor crimson on the canteen straps, and faint violet crystal gleams inside the brass lantern. Holding a brass explorer lantern and a climbing pick, selective outline.
```

#### #53 - Beastmaster (`beastmaster`)
* **Requirements**: Fighter: 2, Rogue: 5, Mage: 2 (Total: 9)
* **Palette**: Dominant Emerald, Minor Crimson, Minor Violet
```text
A chibi beastmaster leaning forward in a pack-leading crouching stance signaling a strike, wearing wolf-pelt shoulder mantles over supple green leathers. Featuring large, expressive anime eyes. The outfit is accented with dominant emerald across the leather suit, minor crimson war paint on the cheeks, and violet primal bond runestones braided into the belt. Holding a spiked leather animal-handler whip, selective outline.
```

#### #54 - Horizon Walker (`horizon-walker`)
* **Requirements**: Fighter: 2, Rogue: 4, Mage: 2 (Total: 8)
* **Palette**: Dominant Emerald, Secondary Violet, Minor Crimson
```text
A chibi horizon walker stepping mid-phase through a shimmering spatial rift, wearing high-collar nomad leathers and planar mist cloaks. Featuring large, expressive anime eyes. The outfit is accented with dominant emerald on the travel attire, paired with vibrant violet planar distortion sparks trailing the boots and hem, and minor crimson sheath belts. Holding a sleek planar portal compass and twin daggers, selective outline.
```

#### #55 - Strider (`strider`)
* **Requirements**: Fighter: 2, Rogue: 4, Mage: 3 (Total: 9)
* **Palette**: Dominant Emerald, Secondary Violet, Minor Crimson
```text
A chibi strider walking silently through astral haze in a calm, seasoned vagabond stance, wearing weathered dust-cloaks and protective traveler armor. Featuring large, expressive anime eyes. The outfit is accented with rich emerald across the main cloak fabric, glowing violet mystic runes embroidered along the hemline, and small crimson weapon wraps. Holding a tall walking staff tipped with a crescent astral blade, selective outline.
```

#### #56 - Loremaster (`loremaster`)
* **Requirements**: Fighter: 2, Rogue: 3, Mage: 3 (Total: 8)
* **Palette**: Balanced Emerald and Violet, Minor Crimson
```text
A chibi loremaster standing in a studious, analytical posture adjusting spectacles, wearing a scholarly traveling coat adorned with scrolls and inkwells. Featuring large, expressive anime eyes. The outfit is accented with balanced emerald velvet on the scholar coat and vibrant violet on the inner lining and bookmark ribbons, with minor crimson sealing wax badges. Holding an ancient illuminated tome and an etched quill-wand, selective outline.
```

#### #57 - Enchanter (`enchanter`)
* **Requirements**: Fighter: 2, Rogue: 3, Mage: 4 (Total: 9)
* **Palette**: Dominant Violet, Secondary Emerald, Minor Crimson
```text
A chibi enchanter poised in an artisan glyph-carving stance surrounded by floating runes, wearing an apron over fine mage robes with tool satchels. Featuring large, expressive anime eyes. The outfit is accented with dominant violet on the enchanted robe, secondary emerald on the leather artisan apron and tool straps, with subtle crimson on the chisel handle. Holding an engraving chisel glowing with violet runic light, selective outline.
```

#### #58 - Summoner (`summoner`)
* **Requirements**: Fighter: 2, Rogue: 2, Mage: 4 (Total: 8)
* **Palette**: Dominant Violet, Balanced Crimson and Emerald
```text
A chibi summoner standing inside a glowing summon circle with arms raised skyward, wearing flowing ceremonial summoning robes with high collar. Featuring large, expressive anime eyes. The outfit is accented with dominant royal violet on the sweeping robes, with subtle emerald embroidered spirit glyphs and crimson tassel ties on the collar. Holding an ornate summoning horn that hums with magic, selective outline.
```

#### #59 - Psion (`psion`)
* **Requirements**: Fighter: 2, Rogue: 2, Mage: 5 (Total: 9)
* **Palette**: Dominant Violet, Minor Emerald, Minor Crimson
```text
A chibi psion hovering slightly off the ground in a focused telekinetic stance with fingers at the temple, wearing minimalist psionic robes with floating mantles. Featuring large, expressive anime eyes. The outfit is accented with dominant electric violet aura emanating from the eyes and robes, with minor emerald focus crystals on the chest and subtle crimson wrist wraps. Holding floating telekinetic force shards around both hands, selective outline.
```

#### #60 - Elementalist (`elementalist`)
* **Requirements**: Fighter: 2, Rogue: 1, Mage: 5 (Total: 8)
* **Palette**: Dominant Violet, Secondary Crimson, Minor Emerald
```text
A chibi elementalist standing in a wide, primal spell-weaving stance juggling fire and frost orbs, wearing layered tri-element robes with mantle trim. Featuring large, expressive anime eyes. The outfit is accented with dominant deep violet across the mystic robes, vibrant crimson flame trim on the hem, and a minor emerald earth talisman on the belt. Holding an elemental crystal staff crowned with swirling flames, selective outline.
```

#### #61 - Necromancer (`necromancer`)
* **Requirements**: Fighter: 2, Rogue: 1, Mage: 4 (Total: 7)
* **Palette**: Dominant Violet, Minor Crimson, Minor Emerald
```text
A chibi necromancer in an eerie, beckoning graveyard posture with hands curled, wearing tattered funeral robes and bone-bead necklaces. Featuring large, expressive anime eyes. The outfit is accented with dark shadowy violet across the ragged robes, subtle crimson sigils painted on skulls, and a minor emerald poison vial at the hip. Holding a gnarled bone wand topped with a miniature skull, selective outline.
```

#### #62 - Druid (`druid`)
* **Requirements**: Fighter: 2, Rogue: 0, Mage: 4 (Total: 6)
* **Palette**: Dominant Violet, Secondary Crimson
```text
A chibi druid standing in a grounded nature-communing pose surrounded by drifting leaves, wearing bark-woven vestments and antler headdress. Featuring large, expressive anime eyes. The outfit is accented with deep violet floral magic pulsing along the vine hems, accented with rich autumnal crimson leaves in the crown and fur trims. Holding a crooked living oak staff wrapped in blooming vines, selective outline.
```

#### #63 - Acolyte (`acolyte`)
* **Requirements**: Fighter: 2, Rogue: 0, Mage: 3 (Total: 5)
* **Palette**: Major Violet, Secondary Crimson
```text
A chibi acolyte standing in a reverent, hands-clasped prayer posture, wearing simple novice monastic robes and clean linen stole. Featuring large, expressive anime eyes. The outfit is accented with soft violet across the clerical stole and cuffs, with clean crimson trim tracing the hem of the white robe. Holding a small polished brass censer emitting sacred smoke, selective outline.
```

---

### Tier 2 & Tier 3: Engineers, Artificers & Sages (65 - 79)

#### #65 - Ballistician (`ballistician`)
* **Requirements**: Fighter: 1, Rogue: 3, Mage: 0 (Total: 4)
* **Palette**: Major Emerald, Minor Crimson
```text
A chibi ballistician leaning over a mechanical gear crank in a precise targeting posture, wearing an engineer's leather coat, heavy work apron, and eye loupe. Featuring large, expressive anime eyes. The outfit is accented with dominant emerald on the utility jacket and tool belts, with minor crimson safety accents on the wrench strap and gear housing. Holding a brass rangefinder quadrant and a heavy bolt wrench, selective outline.
```

#### #66 - Spy (`spy`)
* **Requirements**: Fighter: 1, Rogue: 3, Mage: 1 (Total: 5)
* **Palette**: Dominant Emerald, Minor Crimson, Minor Violet
```text
A chibi spy peering sideways from behind a turned-up collar in a covert eavesdropping stance, wearing an inconspicuous dark traveling cloak over stealth garments. Featuring large, expressive anime eyes. The outfit is accented with dominant emerald on the cloak lining and vest, with a subtle crimson garrote wire spool and tiny violet scrying mirror hidden in the lapel. Holding a rolled cipher scroll and a disguised stylus dagger, selective outline.
```

#### #67 - Poisoner (`poisoner`)
* **Requirements**: Fighter: 1, Rogue: 4, Mage: 1 (Total: 6)
* **Palette**: Dominant Emerald, Minor Violet, Minor Crimson
```text
A chibi poisoner crouching in a secretive apothecary crouch coating weapon tips, wearing chemical-resistant rubberized leathers and a filtered plague cowl. Featuring large, expressive anime eyes. The outfit is accented with venomous vibrant emerald across the tunic and vial bandoliers, with minor violet toxin liquid in the flasks and a crimson warning label on the satchel. Holding a dripping poisoned needle dart and glass distillation bulb, selective outline.
```

#### #68 - Trap-master (`trap-master`)
* **Requirements**: Fighter: 1, Rogue: 4, Mage: 2 (Total: 7)
* **Palette**: Dominant Emerald, Secondary Violet, Minor Crimson
```text
A chibi trap-master kneeling on the floor rapidly priming a mechanical spring snare, wearing reinforced mechanic overalls with numerous tool loops. Featuring large, expressive anime eyes. The outfit is accented with dominant emerald on the rugged overalls, glowing violet rune triggers on the trap coils, and a minor crimson warning tag on the explosive powder keg. Holding a primed caltrop jaw trap, selective outline.
```

#### #69 - Dark Delver (`dark-delver`)
* **Requirements**: Fighter: 1, Rogue: 5, Mage: 2 (Total: 8)
* **Palette**: Dominant Emerald, Secondary Violet, Minor Crimson
```text
A chibi dark delver clinging nimbly to a cavern wall in a spider-like climbing crouch, wearing subterranean spelunking gear and head-mounted crystal visor. Featuring large, expressive anime eyes. The outfit is accented with deep cavern emerald on the climbing harness and padded suit, vibrant violet crystal illumination on the goggles, and a minor crimson safety rope coil. Holding a pair of serrated climbing pitons, selective outline.
```

#### #70 - Gambler (`gambler`)
* **Requirements**: Fighter: 1, Rogue: 5, Mage: 3 (Total: 9)
* **Palette**: Dominant Emerald, Secondary Violet, Minor Crimson
```text
A chibi gambler standing in a flashy, dice-flicking showman posture with a sly wink, wearing an emerald velvet waistcoat, silk ascot, and tailored trousers. Featuring large, expressive anime eyes. The outfit is accented with dominant emerald on the velvet coat, vibrant violet on the card fan backing and silk lining, with a single crimson playing card suit emblem. Holding floating glowing fate dice in one hand and spread playing cards in the other, selective outline.
```

#### #71 - Mentalist (`mentalist`)
* **Requirements**: Fighter: 1, Rogue: 4, Mage: 3 (Total: 8)
* **Palette**: Dominant Emerald, Secondary Violet, Minor Crimson
```text
A chibi mentalist in an enigmatic, hypnotic stare posture with hands manipulating invisible thought threads, wearing a hooded psychic cloak and high collar. Featuring large, expressive anime eyes. The outfit is accented with dominant emerald on the mystic cloak, paired with vibrant violet psychic thought rings shimmering around the temples, and a minor crimson focus gem at the collar. Holding a swinging pendulum prism, selective outline.
```

#### #72 - Tinker (`tinker`)
* **Requirements**: Fighter: 1, Rogue: 4, Mage: 4 (Total: 9)
* **Palette**: Balanced Emerald and Violet, Minor Crimson
```text
A chibi tinker standing proudly beside a small clockwork turret in an inventive wrench-ready stance, wearing welding goggles on their forehead and a heavy leather tool apron. Featuring large, expressive anime eyes. The outfit is accented with balanced vibrant emerald work clothes and vibrant violet glowing arcane capacitors, with minor crimson safety valves. Holding an oversized steam wrench and a whirring clockwork spider bot, selective outline.
```

#### #73 - Technomancer (`technomancer`)
* **Requirements**: Fighter: 1, Rogue: 3, Mage: 4 (Total: 8)
* **Palette**: Dominant Violet, Secondary Emerald, Minor Crimson
```text
A chibi technomancer standing in a high-tech conduit-channeling pose with glowing wire gauntlets, wearing reinforced artisan coats layered with brass circuitry conduits. Featuring large, expressive anime eyes. The outfit is accented with dominant violet on the humming energy conduits, vibrant emerald on the leather chassis harness, and a subtle crimson power gauge on the forearm. Holding an arcane soldering rod sparking with mana, selective outline.
```

#### #74 - Animist (`animist`)
* **Requirements**: Fighter: 1, Rogue: 3, Mage: 5 (Total: 9)
* **Palette**: Dominant Violet, Secondary Emerald, Minor Crimson
```text
A chibi animist kneeling in a reverent, earth-listening posture with hand resting on the soil, wearing primal shaman wraps adorned with river stones and feathers. Featuring large, expressive anime eyes. The outfit is accented with dominant violet on the hovering spirit wisps and robe patterns, lush emerald on the mossy tunic, and subtle crimson on the tribal totem ties. Holding a carved bone rattle that echoes with spirit echoes, selective outline.
```

#### #75 - Geomancer (`geomancer`)
* **Requirements**: Fighter: 1, Rogue: 2, Mage: 5 (Total: 8)
* **Palette**: Dominant Violet, Secondary Emerald, Minor Crimson
```text
A chibi geomancer stomping one foot down in an earth-shaking hex-raising stance, wearing mineral-encrusted stonekeeper robes with heavy slate pauldrons. Featuring large, expressive anime eyes. The outfit is accented with dominant violet magical fissures coursing along the stone robes, vibrant emerald moss on the shoulder rocks, and subtle crimson on the chisel strap. Holding an engraved granite geological staff, selective outline.
```

#### #76 - Dream-walker (`dream-walker`)
* **Requirements**: Fighter: 1, Rogue: 2, Mage: 4 (Total: 7)
* **Palette**: Dominant Violet, Secondary Emerald, Minor Crimson
```text
A chibi dream-walker floating in a drowsy, dream-weaving float with head tilted, wearing gossamer sleep robes adorned with dreamcatcher webs. Featuring large, expressive anime eyes. The outfit is accented with ethereal violet across the drifting night robes, vibrant emerald feather charms on the dreamcatcher hoops, and a minor crimson tassel at the sash. Holding a glowing dreamcatcher staff caught with sleeping motes, selective outline.
```

#### #77 - Channeler (`channeler`)
* **Requirements**: Fighter: 1, Rogue: 1, Mage: 4 (Total: 6)
* **Palette**: Dominant Violet, Minor Emerald, Minor Crimson
```text
A chibi channeler standing in a pure mana-conduit posture with palms raised to pass energy, wearing flowing crystal-embroidered ritual vestments. Featuring large, expressive anime eyes. The outfit is accented with dominant radiant violet mana streams flowing down the sleeves, with minor emerald embroidery at the hem and tiny crimson prayer beads at the wrists. Holding a floating faceted mana reservoir prism, selective outline.
```

#### #78 - Sage (`sage`)
* **Requirements**: Fighter: 1, Rogue: 1, Mage: 3 (Total: 5)
* **Palette**: Dominant Violet, Minor Emerald, Minor Crimson
```text
A chibi sage standing in a wise, serene mentor posture stroking a long flowing beard, wearing voluminous astrological robes with star charts. Featuring large, expressive anime eyes. The outfit is accented with dominant deep violet on the celestial robes, minor emerald on the herbal pouch belt, and subtle crimson on the book clasp. Holding a tall gnarled wooden staff crowned with an armillary sphere, selective outline.
```

#### #79 - Theurge (`theurge`)
* **Requirements**: Fighter: 1, Rogue: 0, Mage: 3 (Total: 4)
* **Palette**: Major Violet, Minor Crimson
```text
A chibi theurge standing with arms outstretched invoking divine grace in an earnest celestial prayer stance, wearing immaculate white-and-purple ritual vestments. Featuring large, expressive anime eyes. The outfit is accented with rich violet on the ceremonial stoles and liturgical mantle, paired with crisp crimson embroidered cross sigils down the chest. Holding an elevated gilded celestial holy ankh, selective outline.
```

---

### Tier 2 & Tier 3: Arcane Masters, Illusions & Transmuters (84 - 96)

#### #84 - Philanderer (`philanderer`)
* **Requirements**: Fighter: 0, Rogue: 3, Mage: 1 (Total: 4)
* **Palette**: Major Emerald, Minor Violet
```text
A chibi philanderer leaning casually in a charming, heart-stealing bow with a tip of the hat, wearing a tailored emerald velvet coat with ruffled lace cravat and silk stockings. Featuring large, expressive anime eyes. The outfit is accented with dominant vibrant emerald across the lavish doublet and hat brim, with charming violet silk handkerchief and scented rose corsage. Holding a polished hand mirror and a jeweled rose, selective outline.
```

#### #85 - Stalker (`stalker`)
* **Requirements**: Fighter: 0, Rogue: 3, Mage: 2 (Total: 5)
* **Palette**: Major Emerald, Secondary Violet
```text
A chibi stalker crouching motionless in a shadow-draped hunting crouch, wearing camouflage ghillie leathers woven with midnight shrouds. Featuring large, expressive anime eyes. The outfit is accented with dominant dark emerald on the foliage cloak, paired with vibrant violet eye-glow and shadow smoke clinging to the boots. Holding a silent recurve hand crossbow with a poisoned quarrel, selective outline.
```

#### #86 - Chameleon (`chameleon`)
* **Requirements**: Fighter: 0, Rogue: 4, Mage: 2 (Total: 6)
* **Palette**: Dominant Emerald, Secondary Violet
```text
A chibi chameleon caught half-fading in a translucent camouflage stance blending into the background, wearing texture-shifting scale armor and a color-morphing hood. Featuring large, expressive anime eyes. The outfit is accented with dominant vibrant emerald scale patterns on the limbs, with shimmering violet optical distortion ripples warping across the torso. Holding a pair of refractive glass daggers, selective outline.
```

#### #87 - Trickster (`trickster`)
* **Requirements**: Fighter: 0, Rogue: 4, Mage: 3 (Total: 7)
* **Palette**: Dominant Emerald, Secondary Violet
```text
A chibi trickster juggling mirror shards with a mischievous, playful smirk in an agile ready stance, wearing an asymmetric court jester tunic with bells and soft turn-up shoes. Featuring large, expressive anime eyes. The outfit is accented with dominant vibrant emerald on the mismatched tunic panels, contrasted by rich vibrant violet on the collar bells, belt frills, and illusion mirrors. Holding a spinning optical mirror and smoke poppers, selective outline.
```

#### #88 - Magician (`magician`)
* **Requirements**: Fighter: 0, Rogue: 5, Mage: 3 (Total: 8)
* **Palette**: Dominant Emerald, Secondary Violet
```text
A chibi magician pulling a magical dove from a top hat in a flamboyant stage reveal posture, wearing a sleek emerald tuxedo tailcoat, white gloves, and satin vest. Featuring large, expressive anime eyes. The outfit is accented with dominant emerald on the tailored showman coat, accompanied by vibrant violet silk cape lining and sparkling flash-powder bursts. Holding an ebony magician wand tipped in silver, selective outline.
```

#### #89 - Shadow-mancer (`shadow-mancer`)
* **Requirements**: Fighter: 0, Rogue: 5, Mage: 4 (Total: 9)
* **Palette**: Balanced Emerald and Violet
```text
A chibi shadow-mancer standing enveloped in swirling living shadow tentacles in an eerie summoner pose, wearing a form-fitting ninja robe fused with shadowy smoke tendrils. Featuring large, expressive anime eyes. The outfit is accented with balanced vibrant emerald on the stealth body wrap, with deep vibrant violet dark-matter shadows and shadowy spikes writhing from the mantle. Holding a shadowy crystal dagger formed from solid darkness, selective outline.
```

#### #90 - Alchemist (`alchemist`)
* **Requirements**: Fighter: 0, Rogue: 4, Mage: 4 (Total: 8)
* **Palette**: Balanced Emerald and Violet
```text
A chibi alchemist in a frantic, mad-science stance hurling a smoking flask, wearing a heavy leather brewing apron lined with bubbling test tube loops and thick rubber gloves. Featuring large, expressive anime eyes. The outfit is accented with balanced vibrant emerald bubbling acids in glass vials and vibrant violet transmutation elixirs on the apron straps. Holding a round-bottom chemical flask bubbling with vapor, selective outline.
```

#### #91 - Binder (`binder`)
* **Requirements**: Fighter: 0, Rogue: 4, Mage: 5 (Total: 9)
* **Palette**: Dominant Violet, Secondary Emerald
```text
A chibi binder holding down glowing occult chains in a commanding spirit-binding posture, wearing esoteric ceremonial vestments covered in sealing wax and runic locks. Featuring large, expressive anime eyes. The outfit is accented with dominant vibrant violet on the occult robes and chain glows, accompanied by rich emerald sealing ribbons and talisman pouches. Holding a heavy brass astral seal amulet, selective outline.
```

#### #92 - Conjurer (`conjurer`)
* **Requirements**: Fighter: 0, Rogue: 3, Mage: 5 (Total: 8)
* **Palette**: Dominant Violet, Secondary Emerald
```text
A chibi conjurer pulling a glowing astral barrier out of empty space in a spatial folding pose, wearing layered spatial traveler robes with celestial star lining. Featuring large, expressive anime eyes. The outfit is accented with dominant vibrant violet across the star-studded mantle, with vibrant emerald trims along dimensional pocket seams and glove cuffs. Holding a glowing spatial rift ring between both hands, selective outline.
```

#### #93 - Illusionist (`illusionist`)
* **Requirements**: Fighter: 0, Rogue: 3, Mage: 4 (Total: 7)
* **Palette**: Dominant Violet, Secondary Emerald
```text
A chibi illusionist standing with a shimmering holographic mirror duplicate in a confusing, double-take stance, wearing phantasmal silk robes that shimmer with mirages. Featuring large, expressive anime eyes. The outfit is accented with dominant vibrant violet across the phantasmal robes, highlighted by vibrant emerald holographic glints and prism brooches. Holding a glowing prismatic mirage crystal orb, selective outline.
```

#### #94 - Shaman (`shaman`)
* **Requirements**: Fighter: 0, Rogue: 2, Mage: 4 (Total: 6)
* **Palette**: Dominant Violet, Secondary Emerald
```text
A chibi shaman planting a carved animal totem into the ground in an ancestral hex-warding stance, wearing feathered tribal robes and wooden mask pushed back onto hair. Featuring large, expressive anime eyes. The outfit is accented with dominant vibrant violet spirit wisps swirling from the totem, accented with vibrant emerald moss wraps and vine belts. Holding a miniature carved wooden eagle totem, selective outline.
```

#### #95 - Seer (`seer`)
* **Requirements**: Fighter: 0, Rogue: 2, Mage: 3 (Total: 5)
* **Palette**: Dominant Violet, Secondary Emerald
```text
A chibi seer gazing into a floating crystal orb in an entranced, prophetic divination stance, wearing flowing stargazing silks and a crescent moon headpiece. Featuring large, expressive anime eyes. The outfit is accented with dominant rich violet across the divination robes, trimmed with vibrant emerald zodiac embroidery along the hem and sleeves. Holding a swirling clairvoyant glass scrying sphere, selective outline.
```

#### #96 - Arcanist (`arcanist`)
* **Requirements**: Fighter: 0, Rogue: 1, Mage: 3 (Total: 4)
* **Palette**: Major Violet, Minor Emerald
```text
A chibi arcanist standing in an intense mathematical spellcraft pose calculating geometric runes in the air, wearing a crisp geometric scholar robe with parchment satchels. Featuring large, expressive anime eyes. The outfit is accented with major vibrant violet across the scholar robes and glowing formula arrays, with minor vibrant emerald trim on the inkwell belts and parchment quill strap. Holding an engraved geometric ruler wand and an open grimoire, selective outline.
```
