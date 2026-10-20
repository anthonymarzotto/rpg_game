/**
 * Configuration and deterministic resolution for procedural combat arena backgrounds.
 */

export interface ArenaBackgroundConfig {
  /** Resolved web-accessible URL to background asset */
  readonly image: string;
  /** Base scale multiplier */
  readonly scale: number;
  /** X translation percentage */
  readonly translateX: number;
  /** Y translation percentage */
  readonly translateY: number;
  /** Whether to mirror horizontally for extra visual angle variety */
  readonly flipX: boolean;
  /** Optional CSS filter (e.g. subtle atmospheric hue rotation) */
  readonly filter?: string;
}

/**
 * Curated list of high-resolution pixel art astral background assets.
 */
export const ARENA_BACKGROUNDS = [
  '/assets/backgrounds/background1.webp', // Constellations & dual-tone nebulae
  '/assets/backgrounds/background2.webp', // Planetary ring & distant exoplanet
  '/assets/backgrounds/background3.webp'  // Cosmic astral rift singularity
] as const;

/**
 * Distinct framing angles across the 16:9 canvas to create variety per encounter:
 * 0: Centered calm vista (balanced composition)
 * 1: Upper-left focus (high nebulae and celestial constellation arches)
 * 2: Upper-right focus (planetary arcs or singular rifts)
 * 3: Lower-center focus (deep panoramic cosmic starfield)
 */
export const FRAMING_PRESETS = [
  { scale: 1.15, translateX: 0, translateY: 0 },
  { scale: 1.30, translateX: 4, translateY: 3 },
  { scale: 1.30, translateX: -4, translateY: 3 },
  { scale: 1.25, translateX: 0, translateY: -3 }
] as const;

/**
 * Computes a stable 32-bit positive integer hash from an encounter identifier.
 */
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

/**
 * Deterministically resolves the background image and framing parameters for an encounter.
 */
export function resolveArenaBackground(
  encounterId?: string,
  customBackground?: string
): ArenaBackgroundConfig {
  const seed = hashString(encounterId || 'novice-sandbox');

  let image: string;
  if (customBackground) {
    image = customBackground.startsWith('/')
      ? customBackground
      : `/assets/backgrounds/${customBackground}`;
  } else {
    const bgIndex = (seed >>> 0) % ARENA_BACKGROUNDS.length;
    image = ARENA_BACKGROUNDS[bgIndex];
  }

  const presetIndex = (seed >>> 2) % FRAMING_PRESETS.length;
  const preset = FRAMING_PRESETS[presetIndex] ?? FRAMING_PRESETS[0];

  // Flip horizontally on alternate hash patterns for orientation variety
  const flipX = ((seed >>> 4) & 1) === 1;

  // Gentle atmospheric hue-rotation for subtle mood distinction between astral sectors
  const hueOptions = [0, -8, 8, 12];
  const hueDeg = hueOptions[(seed >>> 5) % hueOptions.length];
  const filter = hueDeg !== 0 ? `hue-rotate(${hueDeg}deg)` : undefined;

  return {
    image,
    scale: preset.scale,
    translateX: preset.translateX,
    translateY: preset.translateY,
    flipX,
    filter
  };
}

/**
 * Computes the CSS transform string incorporating base framing and subtle camera parallax zoom.
 */
export function computeBackgroundTransform(
  config: ArenaBackgroundConfig,
  fieldZoom = 1.0
): string {
  // Parallax zoom: background scales at ~15% the rate of the hex field
  const parallaxScale = Math.round((config.scale * (1 + (fieldZoom - 1) * 0.15)) * 1000) / 1000;
  const flip = config.flipX ? 'scaleX(-1) ' : '';
  return `scale(${parallaxScale}) ${flip}translate(${config.translateX}%, ${config.translateY}%)`;
}
