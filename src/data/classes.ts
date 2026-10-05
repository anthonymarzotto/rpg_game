import { ClassDefinition } from '../core/types/class';
import { ClassRegistry, createClassRegistry } from '../core/progression/registry';

export const CLASS_CATALOG: readonly ClassDefinition[] = [
  { no: '00', id: 'warrior', name: 'Warrior', description: 'A stalwart frontline fighter disciplined in martial defense, heavy weaponry, and reliable combat fundamentals.', requirements: { fighter: 1, rogue: 0, mage: 0 }, totalPoints: 1 },
  { no: '01', id: 'cavalier', name: 'Cavalier', description: 'A mounted shock vanguard combining raw martial power with momentum to break enemy battle lines.', requirements: { fighter: 2, rogue: 1, mage: 0 }, totalPoints: 3 },
  { no: '02', id: 'knight', name: 'Knight', description: 'A heavily armored bastion commanding the frontline with taunts, protective wards, and tactical crowd control.', requirements: { fighter: 2, rogue: 0, mage: 0 }, totalPoints: 2 },
  { no: '03', id: 'berserker', name: 'Berserker', description: 'A ferocious warrior channeling arcane fury into reckless cleaves that grow deadlier as health wanes.', requirements: { fighter: 2, rogue: 0, mage: 1 }, totalPoints: 3 },
  { no: '04', id: 'pugilist', name: 'Pugilist', description: 'A relentless bare-knuckle brawler combining dense martial conditioning with swift infighting footwork.', requirements: { fighter: 3, rogue: 2, mage: 0 }, totalPoints: 5 },
  { no: '05', id: 'shield-bearer', name: 'Shield-bearer', description: 'A dedicated guardian specializing in impenetrable phalanx stances and kinetic shield impacts.', requirements: { fighter: 3, rogue: 1, mage: 0 }, totalPoints: 4 },
  { no: '06', id: 'weapon-master', name: 'Weapon Master', description: 'An expert tactician proficient with all armaments, adapting martial forms to exploit any weakness.', requirements: { fighter: 3, rogue: 1, mage: 1 }, totalPoints: 5 },
  { no: '07', id: 'dragoon', name: 'Dragoon', description: 'An aerial lancer leaping across hexes to impale priority targets with devastating plunging momentum.', requirements: { fighter: 3, rogue: 0, mage: 1 }, totalPoints: 4 },
  { no: '08', id: 'sentinel', name: 'Sentinel', description: 'A vigilant gatekeeper weaving protective elemental wards around allies while anchoring the line with steel.', requirements: { fighter: 3, rogue: 0, mage: 2 }, totalPoints: 5 },
  { no: '09', id: 'fencer', name: 'Fencer', description: 'A master of the rapier who dances along combat arcs with precise thrusts and lightning ripostes.', requirements: { fighter: 4, rogue: 3, mage: 0 }, totalPoints: 7 },
  { no: '10', id: 'soldier', name: 'Soldier', description: 'A battle-hardened veteran skilled in unit coordination, tactical suppression, and disciplined maneuvers.', requirements: { fighter: 4, rogue: 2, mage: 0 }, totalPoints: 6 },
  { no: '11', id: 'samurai', name: 'Samurai', description: 'A disciplined swordsman bound by an honorable code, unleashing single-strike iaijutsu cuts.', requirements: { fighter: 4, rogue: 2, mage: 1 }, totalPoints: 7 },
  { no: '12', id: 'martial-artist', name: 'Martial Artist', description: 'A disciplined combatant channeling inner spiritual energy through lightning-fast unarmed strikes.', requirements: { fighter: 4, rogue: 1, mage: 1 }, totalPoints: 6 },
  { no: '13', id: 'monk', name: 'Monk', description: 'An ascetic mystic combining physical conditioning with meditative wards and spiritual purification.', requirements: { fighter: 4, rogue: 1, mage: 2 }, totalPoints: 7 },
  { no: '14', id: 'dragon-knight', name: 'Dragon Knight', description: 'A knight clad in draconic scales, breathing elemental wrath and cleaving foes with heavy lances.', requirements: { fighter: 4, rogue: 0, mage: 2 }, totalPoints: 6 },
  { no: '15', id: 'dark-knight', name: 'Dark Knight', description: 'A vengeful warrior sacrificing vitality to wield abyssal flames and drain life from fallen foes.', requirements: { fighter: 4, rogue: 0, mage: 3 }, totalPoints: 7 },
  { no: '16', id: 'archer', name: 'Archer', description: 'A disciplined longbow specialist raining arrows from afar with piercing accuracy.', requirements: { fighter: 5, rogue: 4, mage: 0 }, totalPoints: 9 },
  { no: '17', id: 'corsair', name: 'Corsair', description: 'A daring swashbuckler skilled in dirty boarding maneuvers, quick cutlass thrusts, and rope agility.', requirements: { fighter: 5, rogue: 3, mage: 0 }, totalPoints: 8 },
  { no: '18', id: 'beast-rider', name: 'Beast Rider', description: 'A mounted terror riding bonded predatory beasts, crushing ranks with ferocious coordinated strikes.', requirements: { fighter: 5, rogue: 3, mage: 1 }, totalPoints: 9 },
  { no: '19', id: 'ronin', name: 'Ronin', description: 'A masterless wanderer whose unpredictable blade strikes exploit holes in traditional formations.', requirements: { fighter: 5, rogue: 2, mage: 1 }, totalPoints: 8 },
  { no: '20', id: 'warlord', name: 'Warlord', description: 'An imposing commander whose tactical shouts and presence rally allies to extraordinary feats.', requirements: { fighter: 5, rogue: 2, mage: 2 }, totalPoints: 9 },
  { no: '21', id: 'herald', name: 'Herald', description: 'A battlefield standard-bearer whose booming chants and war horns turn the tide of engagement.', requirements: { fighter: 5, rogue: 1, mage: 2 }, totalPoints: 8 },
  { no: '22', id: 'inquisitor', name: 'Inquisitor', description: 'A zealous hunter rooting out occult heresy with punitive steel and silencing sigils.', requirements: { fighter: 5, rogue: 1, mage: 3 }, totalPoints: 9 },
  { no: '23', id: 'blade-singer', name: 'Blade-singer', description: 'An agile combatant whose rhythmic sword dance harmonizes martial strikes with defensive magic.', requirements: { fighter: 5, rogue: 0, mage: 3 }, totalPoints: 8 },
  { no: '24', id: 'paladin', name: 'Paladin', description: 'A holy champion clad in blessed plate armor, wielding radiant smites and protective blessings.', requirements: { fighter: 5, rogue: 0, mage: 4 }, totalPoints: 9 },
  { no: '25', id: 'marksman', name: 'Marksman', description: 'A surgical sharpshooter delivering lethal hits to enemy vitals from extreme distances.', requirements: { fighter: 4, rogue: 5, mage: 0 }, totalPoints: 9 },
  { no: '26', id: 'duellist', name: 'Duellist', description: 'A single-combat specialist who isolates priority targets and dismantles them with parries.', requirements: { fighter: 4, rogue: 4, mage: 0 }, totalPoints: 8 },
  { no: '27', id: 'marauder', name: 'Marauder', description: 'A ruthless raider striking vulnerable flanks with brutal speed and overwhelming violence.', requirements: { fighter: 4, rogue: 4, mage: 1 }, totalPoints: 9 },
  { no: '28', id: 'raider', name: 'Raider', description: 'A swift pillager excelling at disrupting supply lines, skirmishing, and evading counterattacks.', requirements: { fighter: 4, rogue: 3, mage: 1 }, totalPoints: 8 },
  { no: '29', id: 'adventurer', name: 'Adventurer', description: 'A resourceful and adaptable explorer equipped with tricks, tools, and versatile battlefield skills.', requirements: { fighter: 4, rogue: 3, mage: 2 }, totalPoints: 9 },
  { no: '30', id: 'strategist', name: 'Strategist', description: 'A brilliant military mind reading the spatial flow of combat to outmaneuver opposing forces.', requirements: { fighter: 4, rogue: 2, mage: 2 }, totalPoints: 8 },
  { no: '31', id: 'diplomat', name: 'Diplomat', description: 'A commanding presence who controls engagements through psychological pressure and tactical negotiation.', requirements: { fighter: 4, rogue: 2, mage: 3 }, totalPoints: 9 },
  { no: '32', id: 'templar', name: 'Templar', description: 'A sworn holy guardian anchoring combat zones with divine barriers and punishing maces.', requirements: { fighter: 4, rogue: 1, mage: 3 }, totalPoints: 8 },
  { no: '33', id: 'spellsword', name: 'Spellsword', description: 'A lethal combatant channeling destructive elemental spells directly along their blade edge.', requirements: { fighter: 4, rogue: 1, mage: 4 }, totalPoints: 9 },
  { no: '34', id: 'death-knight', name: 'Death Knight', description: 'A grim harbinger commanding necrotic energies, chilling auras, and inexorable physical might.', requirements: { fighter: 4, rogue: 0, mage: 4 }, totalPoints: 8 },
  { no: '35', id: 'battlemage', name: 'Battlemage', description: 'An armored frontline spellcaster capable of detonating destructive magic at point-blank range.', requirements: { fighter: 4, rogue: 0, mage: 5 }, totalPoints: 9 },
  { no: '36', id: 'bandit', name: 'Bandit', description: 'A ruthless ambusher specializing in staggered targets, dirty strikes, and opportunistic escapes.', requirements: { fighter: 3, rogue: 4, mage: 0 }, totalPoints: 7 },
  { no: '37', id: 'gunslinger', name: 'Gunslinger', description: 'A quick-draw gunner commanding the mid-range with rapid discharges and bullet trick-shots.', requirements: { fighter: 3, rogue: 5, mage: 0 }, totalPoints: 8 },
  { no: '38', id: 'assassin', name: 'Assassin', description: 'A lethal shadow operative ending high-value targets with silent, fatal precision strikes.', requirements: { fighter: 3, rogue: 5, mage: 1 }, totalPoints: 9 },
  { no: '39', id: 'ranger', name: 'Ranger', description: 'A wilderness scout and tracker using natural terrain and archery to outwit opposing squads.', requirements: { fighter: 3, rogue: 4, mage: 1 }, totalPoints: 8 },
  { no: '40', id: 'ninja', name: 'Ninja', description: 'A covert assassin blending ninjutsu arts, throwing blades, smoke screens, and decoy escapes.', requirements: { fighter: 3, rogue: 4, mage: 2 }, totalPoints: 9 },
  { no: '41', id: 'merchant', name: 'Merchant', description: 'A shrewd opportunist who manipulates resources, hires mercenary support, and buys tactical leverage.', requirements: { fighter: 3, rogue: 3, mage: 2 }, totalPoints: 8 },
  { no: '42', id: 'bard', name: 'Bard', description: 'A versatile maestro weaving martial combat, rogue guile, and arcane music into harmonious anthems.', requirements: { fighter: 3, rogue: 3, mage: 3 }, totalPoints: 9 },
  { no: '43', id: 'dancer', name: 'Dancer', description: 'An enchanting skirmisher whose rhythmic steps distract enemy eyes while weaving mystical boons.', requirements: { fighter: 3, rogue: 2, mage: 3 }, totalPoints: 8 },
  { no: '44', id: 'arcane-archer', name: 'Arcane Archer', description: 'An elite archer imbuing arrows with explosive elemental runes and homing trajectory spells.', requirements: { fighter: 3, rogue: 2, mage: 4 }, totalPoints: 9 },
  { no: '45', id: 'red-mage', name: 'Red Mage', description: 'A versatile combatant who fluidly alternates between rapier lunges and elemental spellcraft.', requirements: { fighter: 3, rogue: 1, mage: 4 }, totalPoints: 8 },
  { no: '46', id: 'blue-mage', name: 'Blue Mage', description: 'A scholarly magus who studies the unusual abilities of monsters and reflects them back at foes.', requirements: { fighter: 3, rogue: 1, mage: 5 }, totalPoints: 9 },
  { no: '47', id: 'cleric', name: 'Cleric', description: 'A devout war priest who wields divine healing light while smashing heretics with heavy warhammers.', requirements: { fighter: 3, rogue: 0, mage: 5 }, totalPoints: 8 },
  { no: '48', id: 'battle-priest', name: 'Battle-priest', description: 'A zealous vanguard preacher leading holy charges with righteous fury and fiery sermons.', requirements: { fighter: 3, rogue: 0, mage: 4 }, totalPoints: 7 },
  { no: '49', id: 'cutpurse', name: 'Cutpurse', description: 'A nimble street scoundrel targeting coin pouches, hamstringing heels, and slipping through alleys.', requirements: { fighter: 2, rogue: 3, mage: 0 }, totalPoints: 5 },
  { no: '50', id: 'scout', name: 'Scout', description: 'A light reconnaissance pathfinder claiming high ground and spotting hidden ambushes.', requirements: { fighter: 2, rogue: 4, mage: 0 }, totalPoints: 6 },
  { no: '51', id: 'hunter', name: 'Hunter', description: 'A patient trapper pinning prey with snaring wire, bleed darts, and relentless tracking.', requirements: { fighter: 2, rogue: 4, mage: 1 }, totalPoints: 7 },
  { no: '52', id: 'explorer', name: 'Explorer', description: 'A seasoned trailblazer braving hazardous terrain, uncharted ruins, and unexpected anomalies.', requirements: { fighter: 2, rogue: 5, mage: 1 }, totalPoints: 8 },
  { no: '53', id: 'beastmaster', name: 'Beastmaster', description: 'A primal commander coordinating pack tactics with animal companions to flank and isolate foes.', requirements: { fighter: 2, rogue: 5, mage: 2 }, totalPoints: 9 },
  { no: '54', id: 'horizon-walker', name: 'Horizon Walker', description: 'A planar nomad slipping between spatial dimensional folds to strike from impossible angles.', requirements: { fighter: 2, rogue: 4, mage: 2 }, totalPoints: 8 },
  { no: '55', id: 'strider', name: 'Strider', description: 'A silent vagabond traveling the outer astral wastes with survival cunning and cloaking magic.', requirements: { fighter: 2, rogue: 4, mage: 3 }, totalPoints: 9 },
  { no: '56', id: 'loremaster', name: 'Loremaster', description: 'A scholar of ancient histories analyzing enemy traits to expose structural combat flaws.', requirements: { fighter: 2, rogue: 3, mage: 3 }, totalPoints: 8 },
  { no: '57', id: 'enchanter', name: 'Enchanter', description: 'An arcane artisan etching reinforcing glyphs onto ally gear and crippling hexes onto enemies.', requirements: { fighter: 2, rogue: 3, mage: 4 }, totalPoints: 9 },
  { no: '58', id: 'summoner', name: 'Summoner', description: 'A mystic conduit summoning astral spirits and planar beasts to command the hex grid.', requirements: { fighter: 2, rogue: 2, mage: 4 }, totalPoints: 8 },
  { no: '59', id: 'psion', name: 'Psion', description: 'A master of pure mind-force unleashing telekinetic shocks and crushing psychic pressure.', requirements: { fighter: 2, rogue: 2, mage: 5 }, totalPoints: 9 },
  { no: '60', id: 'elementalist', name: 'Elementalist', description: 'A primal mage commanding the devastating interactions between flame, frost, and storm.', requirements: { fighter: 2, rogue: 1, mage: 5 }, totalPoints: 8 },
  { no: '61', id: 'necromancer', name: 'Necromancer', description: 'A dark occultist manipulating life essences, raising bone thralls, and spreading rot.', requirements: { fighter: 2, rogue: 1, mage: 4 }, totalPoints: 7 },
  { no: '62', id: 'druid', name: 'Druid', description: 'A guardian of natural balance commanding grasping vines, animal shapes, and soothing rain.', requirements: { fighter: 2, rogue: 0, mage: 4 }, totalPoints: 6 },
  { no: '63', id: 'acolyte', name: 'Acolyte', description: 'A humble practitioner learning holy rites, healing salves, and minor protective chants.', requirements: { fighter: 2, rogue: 0, mage: 3 }, totalPoints: 5 },
  { no: '64', id: 'highwayman', name: 'Highwayman', description: 'A masked skirmisher ambushing road travelers with point-blank buckshot and rapid pistol whips.', requirements: { fighter: 1, rogue: 2, mage: 0 }, totalPoints: 3 },
  { no: '65', id: 'ballistician', name: 'Ballistician', description: 'A siege craft engineer calculating lethal projectile arcs for heavy ballistas and catapults.', requirements: { fighter: 1, rogue: 3, mage: 0 }, totalPoints: 4 },
  { no: '66', id: 'spy', name: 'Spy', description: 'An undercover agent gathering vital reconnaissance and sabotaging enemy abilities from within.', requirements: { fighter: 1, rogue: 3, mage: 1 }, totalPoints: 5 },
  { no: '67', id: 'poisoner', name: 'Poisoner', description: 'A sinister herbalist coating daggers and darts with insidious toxins that sap strength over time.', requirements: { fighter: 1, rogue: 4, mage: 1 }, totalPoints: 6 },
  { no: '68', id: 'trap-master', name: 'Trap-master', description: 'A devious battlefield engineer seeding the grid with caltrops, spring-snares, and explosive charges.', requirements: { fighter: 1, rogue: 4, mage: 2 }, totalPoints: 7 },
  { no: '69', id: 'dark-delver', name: 'Dark Delver', description: 'A subterranean stalker possessing acute darkvision, keen hearing, and uncanny climbing reflexes.', requirements: { fighter: 1, rogue: 5, mage: 2 }, totalPoints: 8 },
  { no: '70', id: 'gambler', name: 'Gambler', description: 'A thrill-seeker wagering turn economy on high-variance dice rolls that yield massive payoffs.', requirements: { fighter: 1, rogue: 5, mage: 3 }, totalPoints: 9 },
  { no: '71', id: 'mentalist', name: 'Mentalist', description: 'A psychic saboteur projecting nightmares and illusions to break enemy morale and coordination.', requirements: { fighter: 1, rogue: 4, mage: 3 }, totalPoints: 8 },
  { no: '72', id: 'tinker', name: 'Tinker', description: 'A creative gadgeteer building clockwork mechanisms, steam traps, and automated combat turrets.', requirements: { fighter: 1, rogue: 4, mage: 4 }, totalPoints: 9 },
  { no: '73', id: 'technomancer', name: 'Technomancer', description: 'An innovative artisan blending magical energy conduits with intricate mechanical apparatuses.', requirements: { fighter: 1, rogue: 3, mage: 4 }, totalPoints: 8 },
  { no: '74', id: 'animist', name: 'Animist', description: 'A spirit whisperer communing with the slumbering souls of land, stone, and astral ether.', requirements: { fighter: 1, rogue: 3, mage: 5 }, totalPoints: 9 },
  { no: '75', id: 'geomancer', name: 'Geomancer', description: 'An earth-shaper manipulating hex elevations, summoning stone pillars, and opening fissures.', requirements: { fighter: 1, rogue: 2, mage: 5 }, totalPoints: 8 },
  { no: '76', id: 'dream-walker', name: 'Dream-walker', description: 'An ethereal vagabond invading the subconscious minds of sleeping and waking foes alike.', requirements: { fighter: 1, rogue: 2, mage: 4 }, totalPoints: 7 },
  { no: '77', id: 'channeler', name: 'Channeler', description: 'A selfless mystic channeling raw mana directly into allied reservoirs to sustain great spells.', requirements: { fighter: 1, rogue: 1, mage: 4 }, totalPoints: 6 },
  { no: '78', id: 'sage', name: 'Sage', description: 'A wise elder dispensing profound cosmic guidance, protective wards, and restorative blessings.', requirements: { fighter: 1, rogue: 1, mage: 3 }, totalPoints: 5 },
  { no: '79', id: 'theurge', name: 'Theurge', description: 'A practitioner bridging mortal faith and celestial power to channel divine intervention.', requirements: { fighter: 1, rogue: 0, mage: 3 }, totalPoints: 4 },
  { no: '80', id: 'warlock', name: 'Warlock', description: 'A bold spellcaster bound to otherworldly patrons, unleashing eldritch blasts and draining vitality.', requirements: { fighter: 1, rogue: 0, mage: 2 }, totalPoints: 3 },
  { no: '81', id: 'thief', name: 'Thief', description: 'A swift and elusive rogue mastering stealth, evasion, dirty tricks, and surprise attacks.', requirements: { fighter: 0, rogue: 1, mage: 0 }, totalPoints: 1 },
  { no: '82', id: 'infiltrator', name: 'Infiltrator', description: 'A covert operative striking critical vitals from stealth while disrupting enemy defenses.', requirements: { fighter: 0, rogue: 2, mage: 0 }, totalPoints: 2 },
  { no: '83', id: 'cat-burglar', name: 'Cat-burglar', description: 'An agile second-story specialist scaling obstacles, dodging traps, and vanishing with smoke powder.', requirements: { fighter: 0, rogue: 2, mage: 1 }, totalPoints: 3 },
  { no: '84', id: 'philanderer', name: 'Philanderer', description: 'A charming rogue disarming enemies with silver-tongued flattery before striking vulnerable openings.', requirements: { fighter: 0, rogue: 3, mage: 1 }, totalPoints: 4 },
  { no: '85', id: 'stalker', name: 'Stalker', description: 'A patient shadow hunter tracking prey from concealed vantage points before striking fatally.', requirements: { fighter: 0, rogue: 3, mage: 2 }, totalPoints: 5 },
  { no: '86', id: 'chameleon', name: 'Chameleon', description: 'A master of camouflage blending seamlessly into any background hex to evade detection.', requirements: { fighter: 0, rogue: 4, mage: 2 }, totalPoints: 6 },
  { no: '87', id: 'trickster', name: 'Trickster', description: 'A mischievous rogue using optical mirrors, dummy targets, and playful feints to sow chaos.', requirements: { fighter: 0, rogue: 4, mage: 3 }, totalPoints: 7 },
  { no: '88', id: 'magician', name: 'Magician', description: 'A theatrical conjurer baffling audiences and enemies with sleight of hand and flash detonations.', requirements: { fighter: 0, rogue: 5, mage: 3 }, totalPoints: 8 },
  { no: '89', id: 'shadow-mancer', name: 'Shadow-mancer', description: 'A dark magus weaving living shadows into grasping tentacles, shadowy cloaks, and spikes.', requirements: { fighter: 0, rogue: 5, mage: 4 }, totalPoints: 9 },
  { no: '90', id: 'alchemist', name: 'Alchemist', description: 'A master of transmutations hurling volatile concoctions, healing elixirs, and acidic brews.', requirements: { fighter: 0, rogue: 4, mage: 4 }, totalPoints: 8 },
  { no: '91', id: 'binder', name: 'Binder', description: 'An esoteric ritualist trapping astral entities within runic seals to siphon their supernatural powers.', requirements: { fighter: 0, rogue: 4, mage: 5 }, totalPoints: 9 },
  { no: '92', id: 'conjurer', name: 'Conjurer', description: 'A spatial wizard folding distances, creating phantom barricades, and pulling items from thin air.', requirements: { fighter: 0, rogue: 3, mage: 5 }, totalPoints: 8 },
  { no: '93', id: 'illusionist', name: 'Illusionist', description: 'A phantasm artist warping battlefield perceptions with false duplicates and illusory terrain.', requirements: { fighter: 0, rogue: 3, mage: 4 }, totalPoints: 7 },
  { no: '94', id: 'shaman', name: 'Shaman', description: 'A tribal intermediary planting elemental totems to ward friendly hexes and curse trespassers.', requirements: { fighter: 0, rogue: 2, mage: 4 }, totalPoints: 6 },
  { no: '95', id: 'seer', name: 'Seer', description: 'A far-seeing mystic peering into the tapestry of time to anticipate attacks and shift initiatives.', requirements: { fighter: 0, rogue: 2, mage: 3 }, totalPoints: 5 },
  { no: '96', id: 'arcanist', name: 'Arcanist', description: 'A scholarly researcher deciphering the fundamental geometric and mathematical laws of magic.', requirements: { fighter: 0, rogue: 1, mage: 3 }, totalPoints: 4 },
  { no: '97', id: 'witch', name: 'Witch', description: 'An occult practitioner hexing targets with debilitating curses, baleful omens, and bubbling brews.', requirements: { fighter: 0, rogue: 1, mage: 2 }, totalPoints: 3 },
  { no: '98', id: 'sorcerer', name: 'Sorcerer', description: 'A natural-born spellcaster pulsing with raw, volatile magic that alters reality through wild metamagic.', requirements: { fighter: 0, rogue: 0, mage: 2 }, totalPoints: 2 },
  { no: '99', id: 'wizard', name: 'Wizard', description: 'A dedicated academic who has mastered classical spellcraft through rigorous study and runic memorization.', requirements: { fighter: 0, rogue: 0, mage: 1 }, totalPoints: 1 }
];

export const CLASSES_BY_ID: Readonly<Record<string, ClassDefinition>> = Object.freeze(
  CLASS_CATALOG.reduce<Record<string, ClassDefinition>>((acc, cls) => {
    acc[cls.id] = cls;
    return acc;
  }, {})
);

export const CLASS_REGISTRY: ClassRegistry = createClassRegistry(CLASS_CATALOG);

export const CLASSES_BY_COORD: ReadonlyMap<string, ClassDefinition> = new Map(
  CLASS_CATALOG.map((cls) => [`${cls.requirements.fighter},${cls.requirements.rogue},${cls.requirements.mage}`, cls])
);

export const CLASSES_BY_TIER: Readonly<Record<number, readonly ClassDefinition[]>> = Object.freeze(
  CLASS_CATALOG.reduce<Record<number, ClassDefinition[]>>((acc, cls) => {
    if (!acc[cls.totalPoints]) {
      acc[cls.totalPoints] = [];
    }
    acc[cls.totalPoints].push(cls);
    return acc;
  }, {})
);
