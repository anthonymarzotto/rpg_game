import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { createRecruit } from '../units/unitFactory';
import { createCombatState } from './resolver';
import { STRIKE, SPARK, QUICK_THRUST } from '../../data/abilities';
import { computeTargetPreview } from './targetPreview';
import { PassiveTrait } from '../types/passive';

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
    expect(preview!.rollAdvantage).toBe('NORMAL');

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
    expect(preview!.blockReason).toContain('Line-of-Sight is blocked');
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

  it('computes Disadvantage hit probability (p^2) when Challenged by a different enemy', () => {
    const arena = createRadialArena(3);
    const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
    (hero as any).baseAttributes = { force: 3, finesse: 4, focus: 0 };

    const challenger = createRecruit('knight', 'Knight', { faction: 'ENEMY' });
    (challenger as any).effectiveVitals = {
      ...challenger.effectiveVitals,
      evasion: 14,
      armor: 2
    };

    const target = createRecruit('goblin', 'Goblin', { faction: 'ENEMY' });
    (target as any).effectiveVitals = {
      ...target.effectiveVitals,
      evasion: 14,
      armor: 2
    };

    arena.setUnitPosition('hero', { q: 0, r: 0 });
    arena.setUnitPosition('knight', { q: 1, r: 0 });
    arena.setUnitPosition('goblin', { q: 0, r: 1 });

    const state = createCombatState(arena, [hero, challenger, target], 'hero');
    const heroCu = state.units.get('hero')!;

    // Apply CHALLENGED sourced from knight
    heroCu.activeConditions.push({
      type: 'CHALLENGED',
      durationTurns: 2,
      sourceUnitId: 'knight'
    });

    // Preview attack against non-challenger (goblin): should have DISADVANTAGE
    const previewOther = computeTargetPreview(state, 'hero', STRIKE, { q: 0, r: 1 });
    expect(previewOther).not.toBeNull();
    expect(previewOther!.rollAdvantage).toBe('DISADVANTAGE');
    // Normal single p = 11/20 = 0.55. Under Disadvantage: 0.55^2 = 0.3025 -> 30%
    expect(previewOther!.toHitChance).toBe(30);

    // Preview attack against challenger (knight): should be NORMAL
    const previewChallenger = computeTargetPreview(state, 'hero', STRIKE, { q: 1, r: 0 });
    expect(previewChallenger).not.toBeNull();
    expect(previewChallenger!.rollAdvantage).toBe('NORMAL');
    expect(previewChallenger!.toHitChance).toBe(55);
  });

  it('computes Disadvantage hit probability when attacking upward from severe low ground', () => {
    const arena = createRadialArena(4);
    const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
    (hero as any).baseAttributes = { force: 0, finesse: 0, focus: 4 };

    const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });
    (enemy as any).effectiveVitals = {
      ...enemy.effectiveVitals,
      resolve: 14
    };

    // Hero at elevation 0, Enemy at elevation 2 -> elevationDelta = -2 (Low ground disadvantage)
    arena.setTile({ coord: { q: 0, r: 0 }, elevation: 0, isWalkable: true });
    arena.setTile({ coord: { q: 2, r: 0 }, elevation: 2, isWalkable: true });

    arena.setUnitPosition('hero', { q: 0, r: 0 });
    arena.setUnitPosition('enemy', { q: 2, r: 0 });

    const state = createCombatState(arena, [hero, enemy], 'hero');

    // SPARK has range 3, targets RESOLVE with focus
    const preview = computeTargetPreview(state, 'hero', SPARK, { q: 2, r: 0 });
    expect(preview).not.toBeNull();
    expect(preview!.rollAdvantage).toBe('DISADVANTAGE');
    // p = (21 - (14 - 4)) / 20 = 11/20 = 0.55 -> 0.55^2 = 0.3025 -> 30%
    expect(preview!.toHitChance).toBe(30);
  });

  it('computes elevationVantageRange when attacking downward from high ground with a ranged ability', () => {
    const arena = createRadialArena(5);
    const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
    const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });

    // Hero at elevation 2, Enemy at elevation 0 -> elevationDelta = 2
    arena.setTile({ coord: { q: 0, r: 0 }, elevation: 2, isWalkable: true });
    arena.setTile({ coord: { q: 4, r: 0 }, elevation: 0, isWalkable: true });

    arena.setUnitPosition('hero', { q: 0, r: 0 });
    arena.setUnitPosition('enemy', { q: 4, r: 0 });

    const state = createCombatState(arena, [hero, enemy], 'hero');

    // SPARK (base range 3) against enemy at distance 4:
    // With vantage dh = 2, max range is 3 + 2 = 5 -> valid!
    const preview = computeTargetPreview(state, 'hero', SPARK, { q: 4, r: 0 });
    expect(preview).not.toBeNull();
    expect(preview!.elevationVantageRange).toBe(2);
    expect(preview!.rollAdvantage).toBe('ADVANTAGE');
  });

  it('factors in protective aura penalty in target preview', () => {
    const arena = createRadialArena(3);
    const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
    (hero as any).baseAttributes = { force: 3, finesse: 4, focus: 0 };

    const target = createRecruit('grunt', 'Grunt', { faction: 'ENEMY' });
    (target as any).effectiveVitals = {
      ...target.effectiveVitals,
      evasion: 14
    };

    const protector = createRecruit('paladin', 'Paladin', { faction: 'ENEMY' });
    const protectiveAura: PassiveTrait = {
      id: 'misfortune_ward',
      name: 'Misfortune Ward',
      description: '-2 attack roll to enemies attacking nearby allies',
      hook: 'ALWAYS',
      aura: {
        radius: 2,
        targetScope: 'ALLIES',
        attackRollPenalty: 2
      }
    };

    arena.setUnitPosition('hero', { q: 0, r: 0 });
    arena.setUnitPosition('grunt', { q: 1, r: 0 });
    arena.setUnitPosition('paladin', { q: 2, r: 0 }); // dist 1 to grunt

    const state = createCombatState(arena, [hero, target, protector], 'hero');
    (state.units.get('paladin') as any).passives = [protectiveAura];

    const preview = computeTargetPreview(state, 'hero', STRIKE, { q: 1, r: 0 });
    expect(preview).not.toBeNull();
    // Base modifier = 4, aura penalty = 2 -> net modifier = 2
    // needed = 14 - 2 = 12 -> p = (21 - 12)/20 = 9/20 = 45%
    expect(preview!.toHitChance).toBe(45);
  });

  it('cancels Advantage and Disadvantage to NORMAL in preview', () => {
    const arena = createRadialArena(4);
    const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
    (hero as any).baseAttributes = { force: 0, finesse: 0, focus: 4 };

    const challenger = createRecruit('knight', 'Knight', { faction: 'ENEMY' });
    const target = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });
    (target as any).effectiveVitals = {
      ...target.effectiveVitals,
      resolve: 14
    };

    // Hero at elevation 2, Target at elevation 0 -> High ground (+2 delta grants Advantage)
    arena.setTile({ coord: { q: 0, r: 0 }, elevation: 2, isWalkable: true });
    arena.setTile({ coord: { q: 2, r: 0 }, elevation: 0, isWalkable: true });

    arena.setUnitPosition('hero', { q: 0, r: 0 });
    arena.setUnitPosition('knight', { q: 0, r: 1 });
    arena.setUnitPosition('enemy', { q: 2, r: 0 });

    const state = createCombatState(arena, [hero, challenger, target], 'hero');
    const heroCu = state.units.get('hero')!;

    // Impart CHALLENGED (Disadvantage when attacking 'enemy')
    heroCu.activeConditions.push({
      type: 'CHALLENGED',
      durationTurns: 2,
      sourceUnitId: 'knight'
    });

    const preview = computeTargetPreview(state, 'hero', SPARK, { q: 2, r: 0 });
    expect(preview).not.toBeNull();
    // High Ground (Advantage) + Challenged (Disadvantage) cancel to NORMAL
    expect(preview!.rollAdvantage).toBe('NORMAL');
    // Base p = (21 - 10)/20 = 55%
    expect(preview!.toHitChance).toBe(55);
  });
});
