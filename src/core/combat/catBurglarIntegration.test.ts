import { describe, it, expect } from 'vitest';
import { CombatState, CombatUnit } from './types';
import { Arena } from '../grid/arena';
import { createRadialArena } from '../grid/templates';
import { executeAbility, executeMove } from './resolver';
import {
  ROOFTOP_VAULT,
  PILFER,
  FLASH_POWDER,
  FELINE_GRACE,
  CAT_BURGLAR_PACKAGE
} from '../../data/packages/catBurglar';
import { Unit } from '../types/unit';
import { SeededDiceRoller } from './dice';
import { getAttackRollModifier } from './attackRoll';

function createMockCombatUnit(
  id: string,
  name: string,
  faction: 'PLAYER' | 'ENEMY',
  options?: {
    finesse?: number;
    evasion?: number;
    elevation?: number;
    passives?: typeof FELINE_GRACE[];
  }
): CombatUnit {
  const unit: Unit = {
    id,
    name,
    gender: 'female',
    race: 'human',
    faction,
    baseAttributes: {
      force: 10,
      finesse: options?.finesse ?? 14,
      focus: 10
    },
    effectiveVitals: {
      maxHp: 20,
      maxAp: 3,
      speed: 10,
      armor: 0,
      ward: 0,
      evasion: options?.evasion ?? 10,
      resolve: 10,
      move: 3
    },
    progression: {
      level: 3,
      unspentAttributePoints: 0,
      archetypes: { fighter: 0, rogue: 2, mage: 1 },
      constellation: ['thief', 'infiltrator', 'cat-burglar'],
      nodeHarmonizationSurges: {}
    },
    equippedShards: {}
  };

  return {
    unit,
    faction,
    currentHp: 20,
    currentAp: 3,
    initiativeGauge: 0,
    isDefeated: false,
    inBattleXp: { fighter: 0, rogue: 0, mage: 0 },
    activeModifiers: [],
    activeConditions: [],
    abilityModifiers: [],
    abilities: [ROOFTOP_VAULT, PILFER, FLASH_POWDER],
    passives: options?.passives ?? [FELINE_GRACE],
    facing: 0
  };
}

describe('Cat-burglar Integration & Abilities', () => {
  describe('Rooftop Vault', () => {
    it('leaps to an unoccupied target hex and grants self +2 Evasion for 1 turn upon landing', () => {
      const arena = createRadialArena(4);
      arena.setTile({ coord: { q: 0, r: 0 }, elevation: 0, isWalkable: true });
      arena.setTile({ coord: { q: 2, r: 0 }, elevation: 2, isWalkable: true });

      const burglar = createMockCombatUnit('burglar', 'Cat-burglar', 'PLAYER');
      arena.setUnitPosition('burglar', { q: 0, r: 0 });

      const state: CombatState = {
        arena,
        units: new Map([['burglar', burglar]]),
        activeUnitId: 'burglar',
        turnNumber: 1,
        combatLog: [],
        outcome: 'IN_PROGRESS'
      };

      const result = executeAbility(state, 'burglar', ROOFTOP_VAULT, {
        coord: { q: 2, r: 0 }
      });

      expect(result.events.some((e) => e.type === 'DISPLACEMENT')).toBe(true);
      expect(arena.getUnitPosition('burglar')).toEqual({ q: 2, r: 0 });
      expect(burglar.currentAp).toBe(2);

      const evasionMod = burglar.activeModifiers.find((m) => m.stat === 'evasion');
      expect(evasionMod).toBeDefined();
      expect(evasionMod?.value).toBe(2);
      expect(evasionMod?.durationTurns).toBe(1);
    });

    it('leaps cleanly over an intervening unwalkable obstacle without colliding', () => {
      const arena = createRadialArena(4);
      arena.setTile({ coord: { q: 0, r: 0 }, elevation: 0, isWalkable: true });
      arena.setTile({ coord: { q: 1, r: 0 }, elevation: 0, isWalkable: false, terrainType: 'OBSTACLE' });
      arena.setTile({ coord: { q: 2, r: 0 }, elevation: 0, isWalkable: true });

      const burglar = createMockCombatUnit('burglar', 'Cat-burglar', 'PLAYER');
      arena.setUnitPosition('burglar', { q: 0, r: 0 });

      const state: CombatState = {
        arena,
        units: new Map([['burglar', burglar]]),
        activeUnitId: 'burglar',
        turnNumber: 1,
        combatLog: [],
        outcome: 'IN_PROGRESS'
      };

      const result = executeAbility(state, 'burglar', ROOFTOP_VAULT, {
        coord: { q: 2, r: 0 }
      });

      expect(arena.getUnitPosition('burglar')).toEqual({ q: 2, r: 0 });
      expect(result.events.some((e) => e.type === 'COLLISION')).toBe(false);
    });
  });

  describe('Pilfer (Tempo Theft)', () => {
    it('siphons 20 CTB ticks from target directly into user on a Solid Hit', () => {
      const arena = createRadialArena(4);
      arena.setTile({ coord: { q: 0, r: 0 }, elevation: 0, isWalkable: true });
      arena.setTile({ coord: { q: 1, r: 0 }, elevation: 0, isWalkable: true });

      const burglar = createMockCombatUnit('burglar', 'Cat-burglar', 'PLAYER');
      burglar.initiativeGauge = 10;
      const target = createMockCombatUnit('target', 'Target Guard', 'ENEMY');
      target.initiativeGauge = 50;

      arena.setUnitPosition('burglar', { q: 0, r: 0 });
      arena.setUnitPosition('target', { q: 1, r: 0 });

      const state: CombatState = {
        arena,
        units: new Map([
          ['burglar', burglar],
          ['target', target]
        ]),
        activeUnitId: 'burglar',
        turnNumber: 1,
        combatLog: [],
        outcome: 'IN_PROGRESS'
      };

      // Force high roll for solid hit
      const diceRoller = new SeededDiceRoller([15, 3]);

      const result = executeAbility(
        state,
        'burglar',
        PILFER,
        { targetUnitId: 'target' },
        diceRoller
      );

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.events.some((e) => e.type === 'DAMAGE')).toBe(true);
      }
      expect(target.currentHp).toBeLessThan(20);
      expect(target.initiativeGauge).toBe(30); // 50 - 20
      expect(burglar.initiativeGauge).toBe(30); // 10 + 20
    });

    it('negates secondary CTB siphon on a Graze', () => {
      const arena = createRadialArena(4);
      arena.setTile({ coord: { q: 0, r: 0 }, elevation: 0, isWalkable: true });
      arena.setTile({ coord: { q: 1, r: 0 }, elevation: 0, isWalkable: true });

      const burglar = createMockCombatUnit('burglar', 'Cat-burglar', 'PLAYER', { finesse: 10 });
      burglar.initiativeGauge = 10;
      const target = createMockCombatUnit('target', 'Target Guard', 'ENEMY', { evasion: 18 });
      target.initiativeGauge = 50;

      arena.setUnitPosition('burglar', { q: 0, r: 0 });
      arena.setUnitPosition('target', { q: 1, r: 0 });

      const state: CombatState = {
        arena,
        units: new Map([
          ['burglar', burglar],
          ['target', target]
        ]),
        activeUnitId: 'burglar',
        turnNumber: 1,
        combatLog: [],
        outcome: 'IN_PROGRESS'
      };

      // Finesse 10 vs Evasion 18: diff = -8. d20 = 7 -> score = 17 -> Graze (Evasion - 5 to Evasion - 1)
      const diceRoller = new SeededDiceRoller([7, 4]);

      const result = executeAbility(
        state,
        'burglar',
        PILFER,
        { targetUnitId: 'target' },
        diceRoller
      );

      // Graze should deal halved damage but negate CTB delay and boost
      expect(target.initiativeGauge).toBe(50);
      expect(burglar.initiativeGauge).toBe(10);
    });
  });

  describe('Feline Grace Passive', () => {
    it('negates unmitigated fall impact damage when dropping down cliffs', () => {
      const arena = createRadialArena(4);
      arena.setTile({ coord: { q: 0, r: 0 }, elevation: 2, isWalkable: true });
      arena.setTile({ coord: { q: 1, r: 0 }, elevation: 0, isWalkable: true });

      const burglar = createMockCombatUnit('burglar', 'Cat-burglar', 'PLAYER', {
        passives: [FELINE_GRACE]
      });
      arena.setUnitPosition('burglar', { q: 0, r: 0 });

      const state: CombatState = {
        arena,
        units: new Map([['burglar', burglar]]),
        activeUnitId: 'burglar',
        turnNumber: 1,
        combatLog: [],
        outcome: 'IN_PROGRESS'
      };

      executeMove(state, 'burglar', { q: 1, r: 0 });

      // Height drop delta = -2 -> normally 8 unmitigated fall damage
      // With Feline Grace, HP remains full 20!
      expect(burglar.currentHp).toBe(20);
      expect(
        state.combatLog.some((l) => l.message.includes('Fall Damage Immunity'))
      ).toBe(true);
    });
  });

  describe('Flash Powder (Disorienting AoE)', () => {
    it('throws flash powder to a target hex, rotating enemy facings 180° away and inflicting -2 Attack Roll for 1 turn', () => {
      const arena = createRadialArena(4);
      const burglar = createMockCombatUnit('burglar', 'Cat-burglar', 'PLAYER');
      const enemy1 = createMockCombatUnit('enemy1', 'Target Guard 1', 'ENEMY');
      const enemy2 = createMockCombatUnit('enemy2', 'Target Guard 2', 'ENEMY');
      const ally = createMockCombatUnit('ally', 'Allied Knight', 'PLAYER');

      // Place burglar at (0, 0), blast center at (2, 0).
      // Enemy 1 is directly at blast center (2, 0), facing 3 (West towards burglar).
      // Enemy 2 is at (2, 1) (adjacent in AoE radius 1), facing 3.
      // Ally is at (1, 0) (within AoE radius 1, but friendly).
      arena.setUnitPosition('burglar', { q: 0, r: 0 });
      arena.setUnitPosition('enemy1', { q: 2, r: 0 });
      arena.setUnitPosition('enemy2', { q: 2, r: 1 });
      arena.setUnitPosition('ally', { q: 1, r: 0 });

      enemy1.facing = 3;
      enemy2.facing = 3;
      ally.facing = 0;

      const state: CombatState = {
        arena,
        units: new Map([
          ['burglar', burglar],
          ['enemy1', enemy1],
          ['enemy2', enemy2],
          ['ally', ally]
        ]),
        activeUnitId: 'burglar',
        turnNumber: 1,
        combatLog: [],
        outcome: 'IN_PROGRESS'
      };

      const result = executeAbility(state, 'burglar', FLASH_POWDER, {
        coord: { q: 2, r: 0 }
      });

      expect(result.type).toBe('SUPPORT');

      // Enemy 1 at blast center (2, 0) should be forced to face away from burglar (East = 0)
      expect(enemy1.facing).toBe(0);

      // Enemy 2 at (2, 1) should be forced to face away from blast center (2, 0)
      // Vector from (2, 1) to (2, 0) is North (r - 1) -> direction 2
      // Opposite direction is South (direction 5)
      expect(enemy2.facing).toBe(5);

      // Both enemies should have active modifier for attackRoll: -2
      const mod1 = enemy1.activeModifiers.find((m) => m.stat === 'attackRoll');
      expect(mod1).toBeDefined();
      expect(mod1?.value).toBe(-2);
      expect(mod1?.durationTurns).toBe(1);

      const mod2 = enemy2.activeModifiers.find((m) => m.stat === 'attackRoll');
      expect(mod2).toBeDefined();
      expect(mod2?.value).toBe(-2);

      // Ally should NOT have the debuff
      const allyMod = ally.activeModifiers.find((m) => m.stat === 'attackRoll');
      expect(allyMod).toBeUndefined();

      // Enemy 1 attack roll modifier reflects the -2 penalty
      // Base Finesse = 14, minus 2 attackRoll debuff = 12
      expect(getAttackRollModifier(enemy1, PILFER)).toBe(12);
    });
  });
});
