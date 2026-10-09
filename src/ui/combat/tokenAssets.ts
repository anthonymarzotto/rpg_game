import { Unit } from '../../core/types/unit';
import { CLASS_CATALOG } from '../../data/classes';
import { HexDirection } from '../../core/grid/hex';

export type TokenAesthetic = 'pixel';

/**
 * Whitelist of unit token identifiers with completed pixel graphic sets.
 */
export const AVAILABLE_PIXEL_TOKENS = new Set<string>([
  '000_human_male', // Novice
  '00_human_male',  // Warrior
  '01_human_male',  // Cavalier
  '02_human_male',  // Knight
  '03_human_male',  // Berserker
  '64_human_male',  // Highwayman
  '80_human_male',  // Warlock
  '81_human_male',  // Thief
  '82_human_male',  // Infiltrator
  '83_human_male',  // Cat-burglar
  '97_human_male',  // Witch
  '98_human_male',  // Sorcerer
  '99_human_male',  // Wizard
]);

/**
 * Class badge colors / palette mapping.
 */
export const CLASS_BADGE_PALETTES: Record<string, { primary: string; border: string }> = {
  berserker: { primary: '#b91c1c', border: '#ef4444' }, // Crimson
  warrior: { primary: '#ea580c', border: '#f97316' },
  cavalier: { primary: '#f59e0b', border: '#fbbf24' },
  knight: { primary: '#3b82f6', border: '#60a5fa' },
  thief: { primary: '#059669', border: '#10b981' },
  infiltrator: { primary: '#047857', border: '#34d399' },
  wizard: { primary: '#7c3aed', border: '#8b5cf6' },
  sorcerer: { primary: '#6d28d9', border: '#a78bfa' },
  novice: { primary: '#64748b', border: '#94a3b8' },
  highwayman: { primary: '#d97706', border: '#f59e0b' },
  warlock: { primary: '#4f46e5', border: '#6366f1' },
  witch: { primary: '#9333ea', border: '#a855f7' }
};

/**
 * Resolves the primary and border palette colors for a class badge.
 * Defaults to the neutral Novice palette if the class is not recognized or undefined.
 */
export function getClassBadgePalette(classId?: string): { primary: string; border: string } {
  if (!classId) return CLASS_BADGE_PALETTES.novice;
  const key = classId.toLowerCase();
  return CLASS_BADGE_PALETTES[key] ?? CLASS_BADGE_PALETTES.novice;
}

/**
 * Maps the 6 pointy-topped hex directions to their corresponding 8-way pixel sprite rotation.
 * 0: East (+1, 0)
 * 1: Northeast (+1, -1)
 * 2: Northwest (0, -1)
 * 3: West (-1, 0)
 * 4: Southwest (-1, +1)
 * 5: Southeast (0, +1)
 */
export const HEX_TO_PIXEL_ROTATION: Record<HexDirection, string> = {
  0: 'east',
  1: 'north-east',
  2: 'north-west',
  3: 'west',
  4: 'south-west',
  5: 'south-east',
};

/**
 * Resolves the available pixel token identifier for a unit.
 * If a specific gender/race sprite set hasn't been generated yet,
 * it gracefully falls back to the available variant for that class (e.g. female falls back to male).
 */
export function resolvePixelTokenBase(unit: Unit): string | null {
  const activeClassId = unit.loadout.activeClassId;

  let classNo = '000';
  if (activeClassId !== 'novice') {
    const classDef = CLASS_CATALOG.find((c) => c.id === activeClassId);
    if (classDef) {
      classNo = classDef.no;
    }
  }

  // 1. Exact match (e.g. 81_human_female)
  const exact = `${classNo}_${unit.race}_${unit.gender}`;
  if (AVAILABLE_PIXEL_TOKENS.has(exact)) {
    return exact;
  }

  // 2. Gender fallback for the same class and race (e.g. 81_human_male)
  const altGender = unit.gender === 'female' ? 'male' : 'female';
  const genderFallback = `${classNo}_${unit.race}_${altGender}`;
  if (AVAILABLE_PIXEL_TOKENS.has(genderFallback)) {
    return genderFallback;
  }

  // 3. Human base fallback if a non-human race lacks graphics
  const humanFallback = `${classNo}_human_${unit.gender}`;
  if (AVAILABLE_PIXEL_TOKENS.has(humanFallback)) {
    return humanFallback;
  }
  const humanMaleFallback = `${classNo}_human_male`;
  if (AVAILABLE_PIXEL_TOKENS.has(humanMaleFallback)) {
    return humanMaleFallback;
  }

  return null;
}

/**
 * Standard pixel rotation sprite names needed for gameplay and UI.
 */
export const PIXEL_ROTATIONS = [
  'east',
  'north-east',
  'north',
  'north-west',
  'west',
  'south-west',
  'south-east',
  'south'
] as const;

/**
 * Checks whether an asset source URL belongs to the pixel token set.
 */
export function isPixelAsset(src: string | null): boolean {
  return typeof src === 'string' && src.includes('/tokens/pixel/');
}

/**
 * Maps a Unit and optional facing direction to its corresponding pixel sprite PNG URL.
 * Returns null if the unit has no pixel assets available yet (triggering vector circle fallback).
 */
export function resolveTokenAssetPath(
  unit: Unit,
  facing?: HexDirection
): string | null {
  const pixelBase = resolvePixelTokenBase(unit);
  if (!pixelBase) {
    return null;
  }
  // When facing is specified on the hex grid, resolve 6-direction rotation;
  // For general UI portraits (ribbons, banners, modals), default to 'south' (front-facing)
  const rotation = facing !== undefined ? HEX_TO_PIXEL_ROTATION[facing] : 'south';
  return `/assets/tokens/pixel/${pixelBase}/Idle/rotations/${rotation}.png`;
}

/**
 * Returns all rotation frame asset URLs required to render a unit's pixel sprite.
 * Returns an empty array if the unit has no pixel assets available yet.
 */
export function getUnitTokenUrls(unit: Unit): string[] {
  const pixelBase = resolvePixelTokenBase(unit);
  if (!pixelBase) {
    return [];
  }
  return PIXEL_ROTATIONS.map(
    (rot) => `/assets/tokens/pixel/${pixelBase}/Idle/rotations/${rot}.png`
  );
}

const imageCache = new Map<string, HTMLImageElement>();

/**
 * Preloads and decodes image URLs into the browser cache asynchronously.
 * Skips images that have already been requested.
 */
export function preloadImageUrls(urls: Iterable<string>): Promise<void[]> {
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return Promise.resolve([]);
  }

  const promises: Promise<void>[] = [];
  for (const url of urls) {
    if (!url || imageCache.has(url)) continue;

    const img = new Image();
    img.src = url;
    imageCache.set(url, img);
    if (typeof img.decode === 'function') {
      promises.push(img.decode().catch(() => {}));
    }
  }

  return Promise.all(promises);
}

/**
 * Clears the in-memory preloaded image cache (primarily used in testing).
 */
export function clearImageCache(): void {
  imageCache.clear();
}

/**
 * Eagerly preloads token assets strictly for the units participating in the current battle.
 * Avoids loading unused class assets across the catalog.
 */
export function preloadCombatUnitTokens(
  units: Iterable<Unit>
): Promise<void[]> {
  const urlSet = new Set<string>();
  for (const unit of units) {
    const urls = getUnitTokenUrls(unit);
    for (const url of urls) {
      urlSet.add(url);
    }
  }
  return preloadImageUrls(urlSet);
}

