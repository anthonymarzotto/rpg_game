import { ClassDefinition } from '../core/types/class';

export const CLASS_CATALOG: readonly ClassDefinition[] = [
  { no: '00', id: 'warrior', name: 'Warrior', requirements: { fighter: 1, rogue: 0, mage: 0 }, totalPoints: 1 },
  { no: '01', id: 'cavalier', name: 'Cavalier', requirements: { fighter: 2, rogue: 1, mage: 0 }, totalPoints: 3 },
  { no: '02', id: 'knight', name: 'Knight', requirements: { fighter: 2, rogue: 0, mage: 0 }, totalPoints: 2 },
  { no: '03', id: 'berserker', name: 'Berserker', requirements: { fighter: 2, rogue: 0, mage: 1 }, totalPoints: 3 },
  { no: '04', id: 'pugilist', name: 'Pugilist', requirements: { fighter: 3, rogue: 2, mage: 0 }, totalPoints: 5 },
  { no: '05', id: 'shield-bearer', name: 'Shield-bearer', requirements: { fighter: 3, rogue: 1, mage: 0 }, totalPoints: 4 },
  { no: '06', id: 'weapon-master', name: 'Weapon Master', requirements: { fighter: 3, rogue: 1, mage: 1 }, totalPoints: 5 },
  { no: '07', id: 'dragoon', name: 'Dragoon', requirements: { fighter: 3, rogue: 0, mage: 1 }, totalPoints: 4 },
  { no: '08', id: 'sentinel', name: 'Sentinel', requirements: { fighter: 3, rogue: 0, mage: 2 }, totalPoints: 5 },
  { no: '09', id: 'fencer', name: 'Fencer', requirements: { fighter: 4, rogue: 3, mage: 0 }, totalPoints: 7 },
  { no: '10', id: 'soldier', name: 'Soldier', requirements: { fighter: 4, rogue: 2, mage: 0 }, totalPoints: 6 },
  { no: '11', id: 'samurai', name: 'Samurai', requirements: { fighter: 4, rogue: 2, mage: 1 }, totalPoints: 7 },
  { no: '12', id: 'martial-artist', name: 'Martial Artist', requirements: { fighter: 4, rogue: 1, mage: 1 }, totalPoints: 6 },
  { no: '13', id: 'monk', name: 'Monk', requirements: { fighter: 4, rogue: 1, mage: 2 }, totalPoints: 7 },
  { no: '14', id: 'dragon-knight', name: 'Dragon Knight', requirements: { fighter: 4, rogue: 0, mage: 2 }, totalPoints: 6 },
  { no: '15', id: 'dark-knight', name: 'Dark Knight', requirements: { fighter: 4, rogue: 0, mage: 3 }, totalPoints: 7 },
  { no: '16', id: 'archer', name: 'Archer', requirements: { fighter: 5, rogue: 4, mage: 0 }, totalPoints: 9 },
  { no: '17', id: 'corsair', name: 'Corsair', requirements: { fighter: 5, rogue: 3, mage: 0 }, totalPoints: 8 },
  { no: '18', id: 'beast-rider', name: 'Beast Rider', requirements: { fighter: 5, rogue: 3, mage: 1 }, totalPoints: 9 },
  { no: '19', id: 'ronin', name: 'Ronin', requirements: { fighter: 5, rogue: 2, mage: 1 }, totalPoints: 8 },
  { no: '20', id: 'warlord', name: 'Warlord', requirements: { fighter: 5, rogue: 2, mage: 2 }, totalPoints: 9 },
  { no: '21', id: 'herald', name: 'Herald', requirements: { fighter: 5, rogue: 1, mage: 2 }, totalPoints: 8 },
  { no: '22', id: 'inquisitor', name: 'Inquisitor', requirements: { fighter: 5, rogue: 1, mage: 3 }, totalPoints: 9 },
  { no: '23', id: 'blade-singer', name: 'Blade-singer', requirements: { fighter: 5, rogue: 0, mage: 3 }, totalPoints: 8 },
  { no: '24', id: 'paladin', name: 'Paladin', requirements: { fighter: 5, rogue: 0, mage: 4 }, totalPoints: 9 },
  { no: '25', id: 'marksman', name: 'Marksman', requirements: { fighter: 4, rogue: 5, mage: 0 }, totalPoints: 9 },
  { no: '26', id: 'duellist', name: 'Duellist', requirements: { fighter: 4, rogue: 4, mage: 0 }, totalPoints: 8 },
  { no: '27', id: 'marauder', name: 'Marauder', requirements: { fighter: 4, rogue: 4, mage: 1 }, totalPoints: 9 },
  { no: '28', id: 'raider', name: 'Raider', requirements: { fighter: 4, rogue: 3, mage: 1 }, totalPoints: 8 },
  { no: '29', id: 'adventurer', name: 'Adventurer', requirements: { fighter: 4, rogue: 3, mage: 2 }, totalPoints: 9 },
  { no: '30', id: 'strategist', name: 'Strategist', requirements: { fighter: 4, rogue: 2, mage: 2 }, totalPoints: 8 },
  { no: '31', id: 'diplomat', name: 'Diplomat', requirements: { fighter: 4, rogue: 2, mage: 3 }, totalPoints: 9 },
  { no: '32', id: 'templar', name: 'Templar', requirements: { fighter: 4, rogue: 1, mage: 3 }, totalPoints: 8 },
  { no: '33', id: 'spellsword', name: 'Spellsword', requirements: { fighter: 4, rogue: 1, mage: 4 }, totalPoints: 9 },
  { no: '34', id: 'death-knight', name: 'Death Knight', requirements: { fighter: 4, rogue: 0, mage: 4 }, totalPoints: 8 },
  { no: '35', id: 'battlemage', name: 'Battlemage', requirements: { fighter: 4, rogue: 0, mage: 5 }, totalPoints: 9 },
  { no: '36', id: 'bandit', name: 'Bandit', requirements: { fighter: 3, rogue: 4, mage: 0 }, totalPoints: 7 },
  { no: '37', id: 'gunslinger', name: 'Gunslinger', requirements: { fighter: 3, rogue: 5, mage: 0 }, totalPoints: 8 },
  { no: '38', id: 'assassin', name: 'Assassin', requirements: { fighter: 3, rogue: 5, mage: 1 }, totalPoints: 9 },
  { no: '39', id: 'ranger', name: 'Ranger', requirements: { fighter: 3, rogue: 4, mage: 1 }, totalPoints: 8 },
  { no: '40', id: 'ninja', name: 'Ninja', requirements: { fighter: 3, rogue: 4, mage: 2 }, totalPoints: 9 },
  { no: '41', id: 'merchant', name: 'Merchant', requirements: { fighter: 3, rogue: 3, mage: 2 }, totalPoints: 8 },
  { no: '42', id: 'bard', name: 'Bard', requirements: { fighter: 3, rogue: 3, mage: 3 }, totalPoints: 9 },
  { no: '43', id: 'dancer', name: 'Dancer', requirements: { fighter: 3, rogue: 2, mage: 3 }, totalPoints: 8 },
  { no: '44', id: 'arcane-archer', name: 'Arcane Archer', requirements: { fighter: 3, rogue: 2, mage: 4 }, totalPoints: 9 },
  { no: '45', id: 'red-mage', name: 'Red Mage', requirements: { fighter: 3, rogue: 1, mage: 4 }, totalPoints: 8 },
  { no: '46', id: 'blue-mage', name: 'Blue Mage', requirements: { fighter: 3, rogue: 1, mage: 5 }, totalPoints: 9 },
  { no: '47', id: 'cleric', name: 'Cleric', requirements: { fighter: 3, rogue: 0, mage: 5 }, totalPoints: 8 },
  { no: '48', id: 'battle-priest', name: 'Battle-priest', requirements: { fighter: 3, rogue: 0, mage: 4 }, totalPoints: 7 },
  { no: '49', id: 'cutpurse', name: 'Cutpurse', requirements: { fighter: 2, rogue: 3, mage: 0 }, totalPoints: 5 },
  { no: '50', id: 'scout', name: 'Scout', requirements: { fighter: 2, rogue: 4, mage: 0 }, totalPoints: 6 },
  { no: '51', id: 'hunter', name: 'Hunter', requirements: { fighter: 2, rogue: 4, mage: 1 }, totalPoints: 7 },
  { no: '52', id: 'explorer', name: 'Explorer', requirements: { fighter: 2, rogue: 5, mage: 1 }, totalPoints: 8 },
  { no: '53', id: 'beastmaster', name: 'Beastmaster', requirements: { fighter: 2, rogue: 5, mage: 2 }, totalPoints: 9 },
  { no: '54', id: 'horizon-walker', name: 'Horizon Walker', requirements: { fighter: 2, rogue: 4, mage: 2 }, totalPoints: 8 },
  { no: '55', id: 'strider', name: 'Strider', requirements: { fighter: 2, rogue: 4, mage: 3 }, totalPoints: 9 },
  { no: '56', id: 'loremaster', name: 'Loremaster', requirements: { fighter: 2, rogue: 3, mage: 3 }, totalPoints: 8 },
  { no: '57', id: 'enchanter', name: 'Enchanter', requirements: { fighter: 2, rogue: 3, mage: 4 }, totalPoints: 9 },
  { no: '58', id: 'summoner', name: 'Summoner', requirements: { fighter: 2, rogue: 2, mage: 4 }, totalPoints: 8 },
  { no: '59', id: 'psion', name: 'Psion', requirements: { fighter: 2, rogue: 2, mage: 5 }, totalPoints: 9 },
  { no: '60', id: 'elementalist', name: 'Elementalist', requirements: { fighter: 2, rogue: 1, mage: 5 }, totalPoints: 8 },
  { no: '61', id: 'necromancer', name: 'Necromancer', requirements: { fighter: 2, rogue: 1, mage: 4 }, totalPoints: 7 },
  { no: '62', id: 'druid', name: 'Druid', requirements: { fighter: 2, rogue: 0, mage: 4 }, totalPoints: 6 },
  { no: '63', id: 'acolyte', name: 'Acolyte', requirements: { fighter: 2, rogue: 0, mage: 3 }, totalPoints: 5 },
  { no: '64', id: 'highwayman', name: 'Highwayman', requirements: { fighter: 1, rogue: 2, mage: 0 }, totalPoints: 3 },
  { no: '65', id: 'ballistician', name: 'Ballistician', requirements: { fighter: 1, rogue: 3, mage: 0 }, totalPoints: 4 },
  { no: '66', id: 'spy', name: 'Spy', requirements: { fighter: 1, rogue: 3, mage: 1 }, totalPoints: 5 },
  { no: '67', id: 'poisoner', name: 'Poisoner', requirements: { fighter: 1, rogue: 4, mage: 1 }, totalPoints: 6 },
  { no: '68', id: 'trap-master', name: 'Trap-master', requirements: { fighter: 1, rogue: 4, mage: 2 }, totalPoints: 7 },
  { no: '69', id: 'dark-delver', name: 'Dark Delver', requirements: { fighter: 1, rogue: 5, mage: 2 }, totalPoints: 8 },
  { no: '70', id: 'gambler', name: 'Gambler', requirements: { fighter: 1, rogue: 5, mage: 3 }, totalPoints: 9 },
  { no: '71', id: 'mentalist', name: 'Mentalist', requirements: { fighter: 1, rogue: 4, mage: 3 }, totalPoints: 8 },
  { no: '72', id: 'tinker', name: 'Tinker', requirements: { fighter: 1, rogue: 4, mage: 4 }, totalPoints: 9 },
  { no: '73', id: 'technomancer', name: 'Technomancer', requirements: { fighter: 1, rogue: 3, mage: 4 }, totalPoints: 8 },
  { no: '74', id: 'animist', name: 'Animist', requirements: { fighter: 1, rogue: 3, mage: 5 }, totalPoints: 9 },
  { no: '75', id: 'geomancer', name: 'Geomancer', requirements: { fighter: 1, rogue: 2, mage: 5 }, totalPoints: 8 },
  { no: '76', id: 'dream-walker', name: 'Dream-walker', requirements: { fighter: 1, rogue: 2, mage: 4 }, totalPoints: 7 },
  { no: '77', id: 'channeler', name: 'Channeler', requirements: { fighter: 1, rogue: 1, mage: 4 }, totalPoints: 6 },
  { no: '78', id: 'sage', name: 'Sage', requirements: { fighter: 1, rogue: 1, mage: 3 }, totalPoints: 5 },
  { no: '79', id: 'theurge', name: 'Theurge', requirements: { fighter: 1, rogue: 0, mage: 3 }, totalPoints: 4 },
  { no: '80', id: 'warlock', name: 'Warlock', requirements: { fighter: 1, rogue: 0, mage: 2 }, totalPoints: 3 },
  { no: '81', id: 'thief', name: 'Thief', requirements: { fighter: 0, rogue: 1, mage: 0 }, totalPoints: 1 },
  { no: '82', id: 'infiltrator', name: 'Infiltrator', requirements: { fighter: 0, rogue: 2, mage: 0 }, totalPoints: 2 },
  { no: '83', id: 'cat-burglar', name: 'Cat-burglar', requirements: { fighter: 0, rogue: 2, mage: 1 }, totalPoints: 3 },
  { no: '84', id: 'philanderer', name: 'Philanderer', requirements: { fighter: 0, rogue: 3, mage: 1 }, totalPoints: 4 },
  { no: '85', id: 'stalker', name: 'Stalker', requirements: { fighter: 0, rogue: 3, mage: 2 }, totalPoints: 5 },
  { no: '86', id: 'chameleon', name: 'Chameleon', requirements: { fighter: 0, rogue: 4, mage: 2 }, totalPoints: 6 },
  { no: '87', id: 'trickster', name: 'Trickster', requirements: { fighter: 0, rogue: 4, mage: 3 }, totalPoints: 7 },
  { no: '88', id: 'magician', name: 'Magician', requirements: { fighter: 0, rogue: 5, mage: 3 }, totalPoints: 8 },
  { no: '89', id: 'shadow-mancer', name: 'Shadow-mancer', requirements: { fighter: 0, rogue: 5, mage: 4 }, totalPoints: 9 },
  { no: '90', id: 'alchemist', name: 'Alchemist', requirements: { fighter: 0, rogue: 4, mage: 4 }, totalPoints: 8 },
  { no: '91', id: 'binder', name: 'Binder', requirements: { fighter: 0, rogue: 4, mage: 5 }, totalPoints: 9 },
  { no: '92', id: 'conjurer', name: 'Conjurer', requirements: { fighter: 0, rogue: 3, mage: 5 }, totalPoints: 8 },
  { no: '93', id: 'illusionist', name: 'Illusionist', requirements: { fighter: 0, rogue: 3, mage: 4 }, totalPoints: 7 },
  { no: '94', id: 'shaman', name: 'Shaman', requirements: { fighter: 0, rogue: 2, mage: 4 }, totalPoints: 6 },
  { no: '95', id: 'seer', name: 'Seer', requirements: { fighter: 0, rogue: 2, mage: 3 }, totalPoints: 5 },
  { no: '96', id: 'arcanist', name: 'Arcanist', requirements: { fighter: 0, rogue: 1, mage: 3 }, totalPoints: 4 },
  { no: '97', id: 'witch', name: 'Witch', requirements: { fighter: 0, rogue: 1, mage: 2 }, totalPoints: 3 },
  { no: '98', id: 'sorcerer', name: 'Sorcerer', requirements: { fighter: 0, rogue: 0, mage: 2 }, totalPoints: 2 },
  { no: '99', id: 'wizard', name: 'Wizard', requirements: { fighter: 0, rogue: 0, mage: 1 }, totalPoints: 1 }
];

export const CLASSES_BY_ID: Readonly<Record<string, ClassDefinition>> = Object.freeze(
  CLASS_CATALOG.reduce<Record<string, ClassDefinition>>((acc, cls) => {
    acc[cls.id] = cls;
    return acc;
  }, {})
);

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
