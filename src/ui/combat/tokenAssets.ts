import { Unit } from '../../core/types/unit';
import { CLASS_CATALOG } from '../../data/classes';

export type TokenAesthetic = 'stained-glass' | 'enamel' | 'classic';

/**
 * Maps a Unit and chosen aesthetic to its corresponding token PNG asset URL.
 * Returns null if aesthetic is 'classic' (which renders the legacy vector circle).
 */
export function resolveTokenAssetPath(
  unit: Unit,
  aesthetic: TokenAesthetic
): string | null {
  if (aesthetic === 'classic') {
    return null;
  }

  const activeClassId = unit.loadout.activeClassId;

  // Novice is '000', otherwise look up the 2-digit class number from catalog
  let classNo = '000';
  if (activeClassId !== 'novice') {
    const classDef = CLASS_CATALOG.find((c) => c.id === activeClassId);
    if (classDef) {
      classNo = classDef.no;
    }
  }

  const race = unit.race;
  const gender = unit.gender;
  const suffix = aesthetic === 'stained-glass' ? '_glass' : '';

  return `/assets/tokens/${aesthetic}/${classNo}_${race}_${gender}${suffix}.png`;
}
