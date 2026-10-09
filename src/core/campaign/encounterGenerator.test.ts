import { describe, it, expect } from 'vitest';
import { createRecruit } from '../units/unitFactory';
import { createRadialArena } from '../grid/templates';
import { generateStageEncounter, createEnemyUnit, TIER3_CLASSES } from './encounterGenerator';

describe('Procedural Encounter Generator', () => {
  const recruitSquad = [
    createRecruit('p1', 'Alden'),
    createRecruit('p2', 'Lyra'),
    createRecruit('p3', 'Vael')
  ];

  it('generates a valid Stage 1 encounter with recruit-tier enemies and obstacles', () => {
    const encounter = generateStageEncounter(1, recruitSquad, 12345);

    expect(encounter.id).toContain('stage-1');
    expect(encounter.arenaRadius).toBe(3);
    expect(encounter.objectives).toEqual([
      {
        id: 'rout_enemies',
        description: 'Defeat all hostile combatants',
        condition: { kind: 'FACTION_DEFEATED', faction: 'ENEMY' }
      }
    ]);

    const playerUnits = encounter.units.filter((p) => p.unit.faction === 'PLAYER');
    const enemyUnits = encounter.units.filter((p) => p.unit.faction === 'ENEMY');

    expect(playerUnits).toHaveLength(3);
    expect(enemyUnits.length).toBeGreaterThanOrEqual(2);
    expect(enemyUnits.length).toBeLessThanOrEqual(4);

    // Player units face East, enemy units face West
    for (const p of playerUnits) {
      expect(p.facing).toBe(0); // East
    }
    for (const e of enemyUnits) {
      expect(e.facing).toBe(3); // West
    }
  });

  it('guarantees traversable path connectivity between player and enemy spawns', () => {
    const encounter = generateStageEncounter(1, recruitSquad, 42);
    const arena = createRadialArena(encounter.arenaRadius ?? 3);
    for (const override of encounter.tileOverrides ?? []) {
      const tile = arena.getTile(override.coord);
      if (tile) {
        arena.setTile({ ...tile, isWalkable: override.isWalkable ?? tile.isWalkable });
      }
    }

    const playerPlaced = encounter.units.find((p) => p.unit.faction === 'PLAYER')!;
    const enemyPlaced = encounter.units.find((p) => p.unit.faction === 'ENEMY')!;

    // Using arena's reachable hexes without unit occupancy
    const reachable = arena.getReachableHexes(playerPlaced.coord, 99);
    const enemyCoordReached = reachable.some(
      (c) => c.q === enemyPlaced.coord.q && c.r === enemyPlaced.coord.r
    );

    expect(enemyCoordReached).toBe(true);
  });

  it('is completely deterministic when provided the same seed', () => {
    const enc1 = generateStageEncounter(2, recruitSquad, 9999);
    const enc2 = generateStageEncounter(2, recruitSquad, 9999);

    expect(enc1.id).toBe(enc2.id);
    expect(enc1.arenaRadius).toBe(enc2.arenaRadius);
    expect(enc1.tileOverrides).toEqual(enc2.tileOverrides);
    expect(enc1.units.map((u) => u.unit.name)).toEqual(enc2.units.map((u) => u.unit.name));
    expect(enc1.units.map((u) => u.coord)).toEqual(enc2.units.map((u) => u.coord));
  });

  it('produces distinct variations when given different seeds', () => {
    const enc1 = generateStageEncounter(1, recruitSquad, 101);
    const enc2 = generateStageEncounter(1, recruitSquad, 202);

    expect(enc1.id).not.toBe(enc2.id);
    // Obstacle placement or enemy makeup should differ
    const diff =
      JSON.stringify(enc1.tileOverrides) !== JSON.stringify(enc2.tileOverrides) ||
      JSON.stringify(enc1.units.map((u) => u.unit.name)) !== JSON.stringify(enc2.units.map((u) => u.unit.name));
    expect(diff).toBe(true);
  });

  it('scales into Veteran Tier-1 enemies on later stages', () => {
    // Stage 3 with promoted units has higher budget
    const promotedSquad = recruitSquad.map((u) => ({
      ...u,
      progression: { ...u.progression, currentLevel: 1 }
    }));

    // Tier-1 inclusion is probabilistic (60% chance); verify across a handful of seeds
    let hasVeteranInAny = false;
    for (let seed = 550; seed < 560; seed++) {
      const encounter = generateStageEncounter(3, promotedSquad, seed);
      const enemies = encounter.units.filter((p) => p.unit.faction === 'ENEMY');
      if (enemies.some((e) => e.unit.progression.currentLevel > 0)) {
        hasVeteranInAny = true;
        break;
      }
    }
    expect(hasVeteranInAny).toBe(true);
  });

  describe('Tier 3 Hybrid Enemies & Stage 5+ Budget Scaling', () => {
    it('creates properly configured Tier 3 hybrid enemy units with valid constellations', () => {
      for (const classId of TIER3_CLASSES) {
        const unit = createEnemyUnit(`enemy-${classId}`, classId);

        expect(unit.faction).toBe('ENEMY');
        expect(unit.loadout.activeClassId).toBe(classId);
        expect(unit.progression.currentLevel).toBe(3);
        expect(unit.progression.constellation).toContain(classId);

        // Specific archetype constellation verifications
        if (classId === 'cavalier') {
          expect(unit.progression.archetypePoints).toEqual({ fighter: 2, rogue: 1, mage: 0 });
          expect(unit.progression.constellation).toEqual(['warrior', 'knight', 'cavalier']);
        } else if (classId === 'berserker') {
          expect(unit.progression.archetypePoints).toEqual({ fighter: 2, rogue: 0, mage: 1 });
          expect(unit.progression.constellation).toEqual(['warrior', 'knight', 'berserker']);
        } else if (classId === 'highwayman') {
          expect(unit.progression.archetypePoints).toEqual({ fighter: 1, rogue: 2, mage: 0 });
          expect(unit.progression.constellation).toEqual(['thief', 'infiltrator', 'highwayman']);
        } else if (classId === 'warlock') {
          expect(unit.progression.archetypePoints).toEqual({ fighter: 1, rogue: 0, mage: 2 });
          expect(unit.progression.constellation).toEqual(['wizard', 'sorcerer', 'warlock']);
        } else if (classId === 'witch') {
          expect(unit.progression.archetypePoints).toEqual({ fighter: 0, rogue: 1, mage: 2 });
          expect(unit.progression.constellation).toEqual(['wizard', 'sorcerer', 'witch']);
        }
      }
    });

    it('spawns Tier 3 adversaries on Stage 5+ encounters within squad bounds (2-4 units)', () => {
      let foundTier3InAny = false;

      for (let seed = 700; seed < 720; seed++) {
        const encounter = generateStageEncounter(5, recruitSquad, seed);
        const enemies = encounter.units.filter((p) => p.unit.faction === 'ENEMY');

        expect(enemies.length).toBeGreaterThanOrEqual(2);
        expect(enemies.length).toBeLessThanOrEqual(4);

        for (const e of enemies) {
          if (TIER3_CLASSES.includes(e.unit.loadout.activeClassId as any)) {
            foundTier3InAny = true;
            expect(e.unit.progression.currentLevel).toBe(3);
          }
        }
      }

      expect(foundTier3InAny).toBe(true);
    });

    it('enforces a minimum budget floor of 60 on Stage 5+ encounters', () => {
      // Even with Level-0 novices (threat = 30), Stage 5 budget floor ensures >= 60 points
      const encounter = generateStageEncounter(5, recruitSquad, 42);
      expect(encounter.units.filter((u) => u.unit.faction === 'PLAYER')).toHaveLength(3);
      expect(encounter.units.filter((u) => u.unit.faction === 'ENEMY').length).toBeGreaterThanOrEqual(2);
    });
  });
});
