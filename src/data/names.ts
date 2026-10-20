/**
 * Centralized naming catalog for Astral Tactics.
 *
 * To add names, surnames, or titles, simply append strings to the
 * exported arrays below. Procedural generators will automatically
 * include them.
 */

// ============================================================================
// 1. Player Recruit First Names (Masculine / Neutral Fantasy)
// ============================================================================
export const MALE_FIRST_NAMES: readonly string[] = [
  'Alden', 'Alastair', 'Balthazar', 'Boran', 'Bram', 'Brant', 'Brennan', 'Caelum',
  'Caspian', 'Cassian', 'Castor', 'Cedric', 'Corin', 'Corvus', 'Damian', 'Darian',
  'Darius', 'Davor', 'Dorian', 'Eldon', 'Evander', 'Fenrir', 'Finnian', 'Gareth',
  'Garrick', 'Gideon', 'Hadrian', 'Harlan', 'Jocelyn', 'Julian', 'Kael', 'Kaelen',
  'Kieran', 'Leander', 'Leopold', 'Lorcan', 'Lucan', 'Lucien', 'Magnus', 'Malakor',
  'Marcus', 'Merrick', 'Nolan', 'Oberon', 'Orin', 'Orion', 'Osric', 'Perrin',
  'Roland', 'Ronan', 'Rowan', 'Rune', 'Severin', 'Silas', 'Soren', 'Sterling',
  'Thaddeus', 'Theron', 'Therius', 'Tiberius', 'Torin', 'Tristan', 'Vael', 'Valen',
  'Varek', 'Varick', 'Vesper', 'Warren', 'Zephyr'
];

// ============================================================================
// 2. Player Recruit Surnames & Noble / Astral Houses
// ============================================================================
export const SURNAMES_AND_HOUSES: readonly string[] = [
  'Ash', 'Barrow', 'Blackwood', 'Blight', 'Brand', 'Cinder', 'Crag', 'Crest',
  'Cross', 'Crow', 'Drake', 'Dusk', 'Fell', 'Finch', 'Flint', 'Fox',
  'Frost', 'Gale', 'Grave', 'Grey', 'Harrow', 'Hawke', 'Holt', 'Ironwood',
  'Moor', 'North', 'Rivers', 'Rook', 'Spire', 'Stark', 'Storm', 'Thorne',
  'Vale', 'Vane', 'Vesper', 'Warden', 'Winter', 'Wolf'
];

// ============================================================================
// 3. Player Recruit Compound Astral Epithets
// ============================================================================
export const ASTRAL_EPITHETS: readonly string[] = [
  'Aetherbound', 'Ashveil', 'Bloodbound', 'Dawnseeker', 'Deepstrider', 'Duskborn',
  'Flamekeeper', 'Frostveil', 'Gloomstrider', 'Gravekeeper', 'Ironheart', 'Lightbringer',
  'Moonshadow', 'Nightwhisper', 'Oathkeeper', 'Runechaser', 'Shadowmend', 'Skywatcher',
  'Soulbinder', 'Spellweaver', 'Starfall', 'Starlight', 'Starweaver', 'Stormborn',
  'Sunseeker', 'Sunstrider', 'Voidseeker', 'Voidwalker', 'Wayseeker', 'Windwalker'
];

// ============================================================================
// 4. Enemy Astral Adjectives (Occult, Elemental & Cosmic)
// ============================================================================
export const ENEMY_ASTRAL_ADJECTIVES: readonly string[] = [
  'Abyssal', 'Aether', 'Ash', 'Ashen', 'Astral', 'Blighted', 'Chaos', 'Chrono',
  'Cinder', 'Cosmic', 'Dread', 'Dusk', 'Eclipse', 'Fell', 'Feral', 'Frost',
  'Gale', 'Grim', 'Hollow', 'Iron', 'Lunar', 'Nebula', 'Obsidian', 'Riven',
  'Savage', 'Shadow', 'Silent', 'Solar', 'Spectral', 'Starlight', 'Umbral', 'Vile',
  'Void', 'Warped', 'Zenith'
];

// ============================================================================
// Helper Utilities
// ============================================================================

/**
 * Extracts the primary first name from a full unit name for compact standee/chip display.
 * (e.g., "Alden Vale" -> "Alden")
 */
export function getPrimaryFirstName(fullName: string): string {
  if (!fullName) return '';
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

/**
 * Procedurally generates a compound recruit name (First + Surname/Epithet)
 * using the provided PRNG, avoiding collision with existing squad names.
 */
export function generateProceduralRecruitName(
  rng: () => number,
  existingNames?: ReadonlySet<string> | readonly string[]
): string {
  const existingSet = existingNames
    ? existingNames instanceof Set
      ? existingNames
      : new Set(existingNames)
    : new Set<string>();

  // Filter first names to prioritize unused first names
  const availableFirstNames = MALE_FIRST_NAMES.filter(
    (name) => !Array.from(existingSet).some((existing) => getPrimaryFirstName(existing) === name)
  );
  const firstPool = availableFirstNames.length > 0 ? availableFirstNames : MALE_FIRST_NAMES;
  const firstName = firstPool[Math.floor(rng() * firstPool.length)];

  // 50% chance for noble house/surname, 50% for compound epithet
  const useEpithet = rng() < 0.5;
  const secondPool = useEpithet ? ASTRAL_EPITHETS : SURNAMES_AND_HOUSES;
  const secondPart = secondPool[Math.floor(rng() * secondPool.length)];

  const candidate = `${firstName} ${secondPart}`;
  return candidate;
}

/**
 * Assigns distinct astral adjectives without replacement to an enemy squad.
 */
export function assignEnemyTitles<T extends { readonly id: string; readonly className: string }>(
  enemies: readonly T[],
  rng: () => number
): (T & { readonly name: string })[] {
  // Shuffle adjective pool with PRNG (Fisher-Yates)
  const pool = [...ENEMY_ASTRAL_ADJECTIVES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = pool[i];
    pool[i] = pool[j];
    pool[j] = temp;
  }

  return enemies.map((enemy, index) => {
    let title: string;
    if (index < pool.length) {
      title = `${pool[index]} ${enemy.className}`;
    } else {
      // Suffix fallback if squad exceeds adjective pool size
      const fallbackAdj = pool[index % pool.length];
      const cycle = Math.floor(index / pool.length) + 1;
      title = `${fallbackAdj} ${enemy.className} ${cycle}`;
    }
    return {
      ...enemy,
      name: title
    };
  });
}
