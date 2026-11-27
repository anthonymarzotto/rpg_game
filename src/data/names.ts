/**
 * Centralized naming catalog for Astral Tactics.
 *
 * Grounded in The Firmament's hopeful twilight tournament setting: everyday mortal
 * Wayfarers with hometown/craft surnames, warm starlight epithets, and Rival Company
 * guild/town contender prefixes.
 *
 * To add names, surnames, or titles, simply append strings to the
 * exported arrays below. Procedural generators will automatically
 * include them.
 */

// ============================================================================
// 1. Player Wayfarer First Names (Male / Neutral Everyday & Fantasy)
// ============================================================================
export const MALE_FIRST_NAMES: readonly string[] = [
  'Alden', 'Alastair', 'Alistair', 'Arthur', 'Boran', 'Bram', 'Brant', 'Brennan',
  'Caelum', 'Callum', 'Caspian', 'Cassian', 'Castor', 'Cedric', 'Corin', 'Damian',
  'Darian', 'Darius', 'Davor', 'Dorian', 'Eldon', 'Evander', 'Finnian', 'Gareth',
  'Garrick', 'Gideon', 'Hadrian', 'Harlan', 'Hollis', 'Jocelyn', 'Julian', 'Kael',
  'Kaelen', 'Kieran', 'Leander', 'Leopold', 'Lorcan', 'Lucan', 'Lucien', 'Magnus',
  'Marcus', 'Matthew', 'Merrick', 'Milo', 'Nolan', 'Oberon', 'Orin', 'Orion',
  'Osric', 'Perrin', 'Roland', 'Ronan', 'Rowan', 'Rune', 'Silas', 'Soren',
  'Sterling', 'Thaddeus', 'Theron', 'Thomas', 'Tiberius', 'Torin', 'Tristan', 'Vael',
  'Valen', 'Varek', 'Varick', 'Vesper', 'Warren', 'Wesley', 'Zephyr'
];

// ============================================================================
// 2. Player Wayfarer Surnames, Hometowns & Crafts
// ============================================================================
export const SURNAMES_AND_HOUSES: readonly string[] = [
  'Alder', 'Ash', 'Briar', 'Brook', 'Cedar', 'Cooper', 'Crag', 'Crest',
  'Cross', 'Finch', 'Flint', 'Fox', 'Frost', 'Gale', 'Grey', 'Harbor',
  'Hawke', 'Holt', 'Ironwood', 'Linden', 'Meadow', 'Miller', 'Millfield', 'Moor',
  'North', 'Oakhaven', 'Orchard', 'Riverbend', 'Rivers', 'Rook', 'Rowan', 'Spire',
  'Storm', 'Thatcher', 'Thorne', 'Vale', 'Vane', 'Warden', 'Weaver', 'Winter'
];

// ============================================================================
// 3. Player Wayfarer Trail & Starlight Epithets
// ============================================================================
export const ASTRAL_EPITHETS: readonly string[] = [
  'Aetherbound', 'Bellflower', 'Brightshield', 'Clearwater', 'Cloudrunner', 'Dawnseeker',
  'Daybreak', 'Deepstrider', 'Flamekeeper', 'Frostveil', 'Hearthlight', 'Highstep',
  'Ironheart', 'Lanternborn', 'Lightbringer', 'Moonbeam', 'Oathkeeper', 'Pathfinder',
  'Runechaser', 'Skywatcher', 'Spellweaver', 'Starfall', 'Starlight', 'Starweaver',
  'Stormborn', 'Sunseeker', 'Sunstrider', 'Trailblazer', 'Wayseeker', 'Windwalker'
];

// ============================================================================
// 4. Rival Company Contender Prefixes (Towns, Guilds, Academies & Celestial Banners)
// ============================================================================
export const ENEMY_ASTRAL_ADJECTIVES: readonly string[] = [
  'Academy', 'Aurora', 'Banner', 'Bellflower', 'Briarwood', 'Cedar', 'Cobalt', 'Copper',
  'Crestfall', 'Gale', 'Guild', 'Harbor', 'Hearth', 'Highland', 'Lantern', 'Lunar',
  'Meadow', 'Millfield', 'Moonlit', 'Oakhaven', 'Riverbend', 'Rowan', 'Saffron', 'Scholar',
  'Silverleaf', 'Solar', 'Solstice', 'Starlit', 'Suncrest', 'Tidewater', 'Vesper', 'Watch'
];

// ============================================================================
// 5. Traveling Company Names, Rival Companies & Trial Grounds Landmarks
// ============================================================================
export const COMPANY_NAMES: readonly string[] = [
  'Hearthlight Band',
  'Lanternwatch Company',
  'Oakhaven Wayfarers',
  'Starlit Rovers',
  'Riverbend Companions',
  'Bellflower Fellowship',
  'Rowan Trail Company',
  'Twilight Striders'
];

export const RIVAL_COMPANY_NAMES: readonly string[] = [
  'Riverbend Watch',
  'Oakhaven Scholars',
  'Lantern Guild',
  'Suncrest Patrol',
  'Bellflower Circle',
  'Highland Artisans',
  'Silverleaf Wardens',
  'Harbor Freeblades',
  'Cedar Crest Academy',
  'Millfield Bannermen'
];

export const ARENA_GROUNDS: readonly string[] = [
  'Slate Amphitheater',
  'Sun-Bleached Terrace',
  'Bellflower Plaza',
  'Colonnade Ring',
  'Starlight Dais',
  'Granite Overlook'
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
 * Procedurally generates a traveling company name using the provided PRNG.
 */
export function generateCompanyName(rng: () => number): string {
  return COMPANY_NAMES[Math.floor(rng() * COMPANY_NAMES.length)] ?? 'Hearthlight Band';
}

/**
 * Procedurally generates a tournament bout title pairing a Rival Company with a Trial Grounds arena.
 */
export function generateBoutTitle(rng: () => number): string {
  const rival = RIVAL_COMPANY_NAMES[Math.floor(rng() * RIVAL_COMPANY_NAMES.length)] ?? 'Riverbend Watch';
  const ground = ARENA_GROUNDS[Math.floor(rng() * ARENA_GROUNDS.length)] ?? 'Slate Amphitheater';
  return `vs. ${rival} — ${ground}`;
}

/**
 * Procedurally generates a compound wayfarer name (First + Surname/Epithet)
 * using the provided PRNG, avoiding collision with existing company names.
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

  // 50% chance for hometown/craft surname, 50% for starlight/trail epithet
  const useEpithet = rng() < 0.5;
  const secondPool = useEpithet ? ASTRAL_EPITHETS : SURNAMES_AND_HOUSES;
  const secondPart = secondPool[Math.floor(rng() * secondPool.length)];

  const candidate = `${firstName} ${secondPart}`;
  return candidate;
}

/**
 * Assigns distinct Rival Company contender prefixes without replacement across an opposing band.
 */
export function assignEnemyTitles<T extends { readonly id: string; readonly className: string }>(
  enemies: readonly T[],
  rng: () => number
): (T & { readonly name: string })[] {
  // Shuffle prefix pool with PRNG (Fisher-Yates)
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
      // Suffix fallback if opposing band exceeds prefix pool size
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
