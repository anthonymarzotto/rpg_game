import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { createRecruit } from '../units/unitFactory';
import { createCombatState } from './resolver';
import { STRIKE, SPARK, QUICK_THRUST } from '../../data/abilities';
import { computeTargetPreview } from './targetPreview';

describe('Target Preview Calculation', () => {
  it('computes accurate toHitChance and damage range for in-range physical strike', () => {
    const arena = createRadialArena(3);
    const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
    (hero as any).baseAttributes = { force: 3, finesse: 4, focus: 0 };

    const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });
    (enemy as any).effectiveVitals = {
      ...enemy.effectiveVitals,
      evasion: 14,
      armor: 2
    };

    arena.setUnitPosition('hero', { q: 0, r: 0 });
    arena.setUnitPosition('enemy', { q: 1, r: 0 });

    const state = createCombatState(arena, [hero, enemy], 'hero');

    // STRIKE: range 1, attackModifier: 'finesse', damage: 1d6 + force
    const preview = computeTargetPreview(state, 'hero', STRIKE, { q: 1, r: 0 });
    expect(preview).not.toBeNull();
    expect(preview!.targetUnitId).toBe('enemy');
    expect(preview!.targetName).toBe('Enemy');
    expect(preview!.defenseType).toBe('Evasion');
    expect(preview!.targetDefense).toBe(14);
    expect(preview!.isBlockedLoS).toBe(false);

    // To hit: d20 + 4 >= 14 -> needed = 10 -> (21 - 10)/20 = 11/20 = 55%
    expect(preview!.toHitChance).toBe(55);

    // Min dmg: 1 (min 1d6) + 3 (force) - 2 (armor) = 2
    // Max dmg: 6 (max 1d6) + 3 (force) - 2 (armor) = 7
    expect(preview!.damageRange).toBe('2 – 7 (Soak: 2)');
    expect(preview!.diceDescription).toBe('1d6 + force');
  });

  it('detects blocked Line of Sight when a terrain obstacle screens the target', () => {
    const arena = createRadialArena(3);
    const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
    const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });

    // Set rock wall at (0, 1)
    const rock = arena.getTile({ q: 0, r: 1 })!;
    arena.setTile({ ...rock, isWalkable: false, elevation: 3 });

    arena.setUnitPosition('hero', { q: 0, r: 0 });
    arena.setUnitPosition('enemy', { q: 0, r: 2 });

    const state = createCombatState(arena, [hero, enemy], 'hero');

    // SPARK: range 3
    const preview = computeTargetPreview(state, 'hero', SPARK, { q: 0, r: 2 });
    expect(preview).not.toBeNull();
    expect(preview!.isBlockedLoS).toBe(true);
    expect(preview!.blockReason).toBe('Line-of-Sight is screened/blocked');
  });

  it('returns null when target is out of range or tile has no valid enemy', () => {
    const arena = createRadialArena(3);
    const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
    const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });

    arena.setUnitPosition('hero', { q: 0, r: 0 });
    arena.setUnitPosition('enemy', { q: 2, r: 0 }); // dist 2

    const state = createCombatState(arena, [hero, enemy], 'hero');

    // QUICK_THRUST: range 1 -> enemy at dist 2 should return null
    const outOfRange = computeTargetPreview(state, 'hero', QUICK_THRUST, { q: 2, r: 0 });
    expect(outOfRange).toBeNull();

    // Empty tile
    const emptyTile = computeTargetPreview(state, 'hero', QUICK_THRUST, { q: 1, r: 0 });
    expect(emptyTile).toBeNull();
  });
});
