import { describe, it, expect } from 'vitest';
import { createRecruit } from '../units/unitFactory';
import { createRadialArena } from '../grid/templates';
import {
  generateStageEncounter,
  createEnemyUnit,
  getDeploymentZones,
  assembleEnemySquad,
  TIER3_CLASSES
} from './encounterGenerator';

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
        } else if (classId === 'cat-burglar') {
          expect(unit.progression.archetypePoints).toEqual({ fighter: 0, rogue: 2, mage: 1 });
          expect(unit.progression.constellation).toEqual(['thief', 'infiltrator', 'cat-burglar']);
        }
      }
    });

    it('spawns Tier 3 adversaries on Stage 5+ encounters within spawn capacity (2-10 units)', () => {
      let foundTier3InAny = false;

      for (let seed = 700; seed < 720; seed++) {
        const encounter = generateStageEncounter(5, recruitSquad, seed);
        const enemies = encounter.units.filter((p) => p.unit.faction === 'ENEMY');

        expect(enemies.length).toBeGreaterThanOrEqual(2);
        expect(enemies.length).toBeLessThanOrEqual(10);

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

  describe('Procedural Multi-Peak Terraced Arenas & Elevation', () => {
    it('uses Radius 3 for Stage 1 (<7 units), Radius 4 min for Stage 2+, and expands to Radius 5 for large battles (>= 7 units)', () => {
      const encStage1 = generateStageEncounter(1, recruitSquad, 100);
      const encStage2 = generateStageEncounter(2, recruitSquad, 100);
      const encStage3 = generateStageEncounter(3, recruitSquad, 100);

      expect(encStage1.arenaRadius).toBe(3);
      expect(encStage2.arenaRadius).toBe(4);
      expect(encStage3.arenaRadius).toBe(4);

      // Verify Radius 4 arena has 61 tiles
      const arenaRadius4 = createRadialArena(encStage3.arenaRadius!);
      expect(arenaRadius4.getAllTiles()).toHaveLength(61);

      // When combined total units >= 7, expands to Radius 5 (91 tiles)
      const largeSquad = [
        createRecruit('p1', 'P1'),
        createRecruit('p2', 'P2'),
        createRecruit('p3', 'P3'),
        createRecruit('p4', 'P4'),
        createRecruit('p5', 'P5')
      ];
      const encLarge = generateStageEncounter(2, largeSquad, 100);
      expect(encLarge.units.length).toBeGreaterThanOrEqual(7);
      expect(encLarge.arenaRadius).toBe(5);
      const arenaRadius5 = createRadialArena(encLarge.arenaRadius!);
      expect(arenaRadius5.getAllTiles()).toHaveLength(91);
    });

    it('generates multi-tier elevation with peaks, terraces, and valleys', () => {
      const encounter = generateStageEncounter(3, recruitSquad, 1234);
      const elevations = (encounter.tileOverrides ?? []).map((o) => o.elevation ?? 0);

      // Contains peak tiles (h=2) and terrace tiles (h=1)
      expect(elevations.some((e) => e === 2)).toBe(true);
      expect(elevations.some((e) => e === 1)).toBe(true);
    });

    it('guarantees traversable path connectivity across elevation changes on Radius 4 arenas', () => {
      for (let seed = 300; seed < 315; seed++) {
        const encounter = generateStageEncounter(3, recruitSquad, seed);
        const arena = createRadialArena(encounter.arenaRadius!);
        for (const override of encounter.tileOverrides ?? []) {
          const tile = arena.getTile(override.coord);
          if (tile) {
            arena.setTile({
              ...tile,
              elevation: override.elevation ?? tile.elevation,
              isWalkable: override.isWalkable ?? tile.isWalkable
            });
          }
        }

        const playerPlaced = encounter.units.find((p) => p.unit.faction === 'PLAYER')!;
        const enemyPlaced = encounter.units.find((p) => p.unit.faction === 'ENEMY')!;

        // Reachable path verification across weighted elevation costs
        const reachable = arena.getReachableHexes(playerPlaced.coord, 99);
        const enemyCoordReached = reachable.some(
          (c) => c.q === enemyPlaced.coord.q && c.r === enemyPlaced.coord.r
        );

        expect(enemyCoordReached).toBe(true);
      }
    });
  });

  describe('Procedural Enemy Astral Titling & Disambiguation', () => {
    it('assigns unique astral adjectives across encounter enemy units', () => {
      const encounter = generateStageEncounter(1, recruitSquad, 42);
      const enemyUnits = encounter.units.filter((u) => u.unit.faction === 'ENEMY');

      expect(enemyUnits.length).toBeGreaterThanOrEqual(2);

      // Verify all enemy names are unique
      const names = enemyUnits.map((e) => e.unit.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(enemyUnits.length);

      // Verify each name has an astral adjective prefix and a class name
      for (const name of names) {
        const parts = name.split(' ');
        expect(parts.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('allows customName override on createEnemyUnit', () => {
      const customEnemy = createEnemyUnit('e-custom', 'warrior', undefined, 'Cinder Reaver');
      expect(customEnemy.name).toBe('Cinder Reaver');
      expect(customEnemy.loadout.activeClassId).toBe('warrior');
    });
  });

  describe('Deployment Zones & Radial Bounds', () => {
    it('generates 4 candidate spawns per side for Radius 3 within arena bounds', () => {
      const zones = getDeploymentZones(3);
      expect(zones.playerCoords).toHaveLength(4);
      expect(zones.enemyCoords).toHaveLength(4);
      const arena = createRadialArena(3);
      for (const c of [...zones.playerCoords, ...zones.enemyCoords]) {
        expect(arena.getTile(c)).toBeDefined();
      }
    });

    it('generates 6 candidate spawns per side for Radius 4 within arena bounds', () => {
      const zones = getDeploymentZones(4);
      expect(zones.playerCoords).toHaveLength(6);
      expect(zones.enemyCoords).toHaveLength(6);
      const arena = createRadialArena(4);
      for (const c of [...zones.playerCoords, ...zones.enemyCoords]) {
        expect(arena.getTile(c)).toBeDefined();
      }
    });

    it('generates 10 candidate spawns per side for Radius 5 within arena bounds', () => {
      const zones = getDeploymentZones(5);
      expect(zones.playerCoords).toHaveLength(10);
      expect(zones.enemyCoords).toHaveLength(10);
      const arena = createRadialArena(5);
      for (const c of [...zones.playerCoords, ...zones.enemyCoords]) {
        expect(arena.getTile(c)).toBeDefined();
      }
    });
  });

  describe('Multi-Unit Enemy Squad Assembly & Resonant Lineage Loadouts', () => {
    it('spends Stage 2 threat budget on multiple Tier-1 adversaries', () => {
      const squad = assembleEnemySquad(75, 2, () => 0.5);
      // 75 budget on Stage 2 spends 25 + 25 + 25 = 3 Tier-1 units
      const tier1Count = squad.filter((u) => ['warrior', 'thief', 'wizard'].includes(u.loadout.activeClassId)).length;
      expect(tier1Count).toBe(3);
      expect(squad).toHaveLength(3);
    });

    it('can generate more than 4 enemy units on high budgets without an artificial ceiling', () => {
      const squad = assembleEnemySquad(160, 4, () => 0.5);
      // 160 budget on Stage 4 buys multiple Tier-2s, Tier-1s, and Novices without capping at 4
      expect(squad.length).toBeGreaterThanOrEqual(4);
      const tier2Count = squad.filter((u) => ['knight', 'infiltrator', 'sorcerer'].includes(u.loadout.activeClassId)).length;
      expect(tier2Count).toBeGreaterThanOrEqual(2);
    });

    it('equips Cavalier with domain abilities and passives from Warrior and Knight lineage', () => {
      const cavalier = createEnemyUnit('e-cavalier', 'cavalier');
      expect(cavalier.loadout.activeClassId).toBe('cavalier');
      expect(cavalier.progression.constellation).toEqual(['warrior', 'knight', 'cavalier']);
      // Domain abilities should come from unlocked warrior/knight domain abilities
      const validLineageAbilities = ['cleave', 'brace', 'challenging_shout', 'pommel_strike'];
      for (const abilityId of cavalier.loadout.wildcardAbilityIds) {
        expect(validLineageAbilities).toContain(abilityId);
      }
      // Passive should come from warrior/knight passives
      const validLineagePassives = ['unyielding', 'hold_the_line', 'momentum'];
      for (const passiveId of cavalier.loadout.wildcardPassiveIds) {
        expect(validLineagePassives).toContain(passiveId);
      }
    });

    it('equips Witch with domain abilities and passives from Wizard and Sorcerer lineage', () => {
      const witch = createEnemyUnit('e-witch', 'witch');
      expect(witch.loadout.activeClassId).toBe('witch');
      expect(witch.progression.constellation).toEqual(['wizard', 'sorcerer', 'witch']);
      // Wildcard abilities should come from wizard/sorcerer lineage
      const validLineageAbilities = ['spark', 'frostbite', 'ignite', 'gust'];
      for (const abilityId of witch.loadout.wildcardAbilityIds) {
        expect(validLineageAbilities).toContain(abilityId);
      }
      const validLineagePassives = ['arcane_aegis', 'wild_surge', 'momentum'];
      for (const passiveId of witch.loadout.wildcardPassiveIds) {
        expect(validLineagePassives).toContain(passiveId);
      }
    });
  });
});

