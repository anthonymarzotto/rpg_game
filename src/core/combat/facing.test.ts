import { describe, it, expect } from 'vitest';
import {
  HEX_DIRECTIONS,
  getDirectionBetween,
  getFacingAngleDegrees,
  getCombatArc,
  HexCoord
} from '../grid/hex';
import { createRadialArena } from '../grid/templates';
import { createRecruit } from '../units/unitFactory';
import {
  createCombatState,
  executeMove,
  executeAbility,
  isFlankOrRear
} from './resolver';
import { SNEAK_ATTACK, STRIKE, ARCANE_BLAST } from '../../data/packages';
import { MockDiceRoller } from './dice';
import { computeTargetPreview } from './targetPreview';

describe('Directional Facing & Combat Arcs', () => {
  describe('Hex Direction & Arc Mathematics', () => {
    it('getDirectionBetween correctly identifies all 6 pointy-topped neighbor directions', () => {
      const origin: HexCoord = { q: 0, r: 0 };

      expect(getDirectionBetween(origin, { q: 1, r: 0 })).toBe(HEX_DIRECTIONS.EAST);
      expect(getDirectionBetween(origin, { q: 1, r: -1 })).toBe(HEX_DIRECTIONS.NORTHEAST);
      expect(getDirectionBetween(origin, { q: 0, r: -1 })).toBe(HEX_DIRECTIONS.NORTHWEST);
      expect(getDirectionBetween(origin, { q: -1, r: 0 })).toBe(HEX_DIRECTIONS.WEST);
      expect(getDirectionBetween(origin, { q: -1, r: 1 })).toBe(HEX_DIRECTIONS.SOUTHWEST);
      expect(getDirectionBetween(origin, { q: 0, r: 1 })).toBe(HEX_DIRECTIONS.SOUTHEAST);
    });

    it('getDirectionBetween handles distant and diagonal hexes', () => {
      const origin: HexCoord = { q: 0, r: 0 };

      expect(getDirectionBetween(origin, { q: 3, r: 0 })).toBe(HEX_DIRECTIONS.EAST);
      expect(getDirectionBetween(origin, { q: -3, r: 0 })).toBe(HEX_DIRECTIONS.WEST);
      expect(getDirectionBetween(origin, { q: 3, r: -3 })).toBe(HEX_DIRECTIONS.NORTHEAST);
      expect(getDirectionBetween(origin, origin)).toBe(HEX_DIRECTIONS.EAST);
    });

    it('getFacingAngleDegrees returns exact SVG rotation angles', () => {
      expect(getFacingAngleDegrees(HEX_DIRECTIONS.EAST)).toBe(0);
      expect(getFacingAngleDegrees(HEX_DIRECTIONS.NORTHEAST)).toBe(300);
      expect(getFacingAngleDegrees(HEX_DIRECTIONS.NORTHWEST)).toBe(240);
      expect(getFacingAngleDegrees(HEX_DIRECTIONS.WEST)).toBe(180);
      expect(getFacingAngleDegrees(HEX_DIRECTIONS.SOUTHWEST)).toBe(120);
      expect(getFacingAngleDegrees(HEX_DIRECTIONS.SOUTHEAST)).toBe(60);
    });

    it('getCombatArc partitions adjacent hexes into FRONT, FLANK, and REAR', () => {
      // Target at (0, 0) facing WEST (3)
      const targetCoord: HexCoord = { q: 0, r: 0 };
      const targetFacing = HEX_DIRECTIONS.WEST;

      // Front arc (180° forward: direct front and front-angles)
      expect(getCombatArc(targetFacing, targetCoord, { q: -1, r: 0 })).toBe('FRONT');
      expect(getCombatArc(targetFacing, targetCoord, { q: 0, r: -1 })).toBe('FRONT');
      expect(getCombatArc(targetFacing, targetCoord, { q: -1, r: 1 })).toBe('FRONT');

      // Flank arc (lateral side angles)
      expect(getCombatArc(targetFacing, targetCoord, { q: 1, r: -1 })).toBe('FLANK');
      expect(getCombatArc(targetFacing, targetCoord, { q: 0, r: 1 })).toBe('FLANK');

      // Rear arc (direct rear)
      expect(getCombatArc(targetFacing, targetCoord, { q: 1, r: 0 })).toBe('REAR');
    });
  });

  describe('Combat Unit Facing Dynamics', () => {
    it('updates unit facing when executing movement', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
      arena.setUnitPosition('hero', { q: 0, r: 0 });

      const state = createCombatState(arena, [hero], 'hero');
      const heroCu = state.units.get('hero')!;

      // Initial player facing is EAST (0)
      expect(heroCu.facing).toBe(HEX_DIRECTIONS.EAST);

      // Move Northwest: (0, 0) -> (0, -1)
      executeMove(state, 'hero', { q: 0, r: -1 });
      expect(heroCu.facing).toBe(HEX_DIRECTIONS.NORTHWEST);

      // Move East: (0, -1) -> (1, -1)
      executeMove(state, 'hero', { q: 1, r: -1 });
      expect(heroCu.facing).toBe(HEX_DIRECTIONS.EAST);
    });

    it('updates unit facing when executing an ability towards a target', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
      const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 0, r: 1 }); // Southeast of hero

      const state = createCombatState(arena, [hero, enemy], 'hero');
      const heroCu = state.units.get('hero')!;

      expect(heroCu.facing).toBe(HEX_DIRECTIONS.EAST);

      // Strike enemy at (0, 1)
      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [3] });
      executeAbility(state, 'hero', STRIKE, { targetUnitId: 'enemy' }, dice);

      expect(heroCu.facing).toBe(HEX_DIRECTIONS.SOUTHEAST);
    });

    it('updates target facing to face the attack when hit by an attack', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
      const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 1, r: 0 }); // East of hero

      const state = createCombatState(arena, [hero, enemy], 'hero');
      const enemyCu = state.units.get('enemy')!;

      // Enemy starts facing EAST (facing away from hero who is to the WEST at (0, 0))
      enemyCu.facing = HEX_DIRECTIONS.EAST;

      // Hero strikes enemy from rear with a hit
      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [4] });
      const result = executeAbility(state, 'hero', STRIKE, { targetUnitId: 'enemy' }, dice);

      expect(result.type).toBe('ATTACK');
      // When hit, enemy should turn around to face the attacker at (0, 0) -> WEST (3)
      expect(enemyCu.facing).toBe(HEX_DIRECTIONS.WEST);
    });

    it('does NOT update target facing when an attack misses', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
      const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 1, r: 0 }); // East of hero

      const state = createCombatState(arena, [hero, enemy], 'hero');
      const enemyCu = state.units.get('enemy')!;

      // Enemy starts facing EAST (facing away from hero)
      enemyCu.facing = HEX_DIRECTIONS.EAST;

      // Hero attacks but rolls a MISS (d20 = 1)
      const dice = new MockDiceRoller({ d20Rolls: [1] });
      const result = executeAbility(state, 'hero', STRIKE, { targetUnitId: 'enemy' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.hitOutcome).toBe('MISS');
      }
      // Target was not hit, facing remains unchanged
      expect(enemyCu.facing).toBe(HEX_DIRECTIONS.EAST);
    });

    it('updates secondary splash targets to face the attack origin when hit by AoE damage', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
      const primaryEnemy = createRecruit('enemy-1', 'Primary Enemy', { faction: 'ENEMY' });
      const bystanderEnemy = createRecruit('enemy-2', 'Bystander Enemy', { faction: 'ENEMY' });

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition(primaryEnemy.id, { q: 2, r: 0 });
      arena.setUnitPosition(bystanderEnemy.id, { q: 2, r: 1 }); // Adjacent to primary, within 1 hex

      const state = createCombatState(arena, [hero, primaryEnemy, bystanderEnemy], 'hero');
      const bystanderCu = state.units.get(bystanderEnemy.id)!;
      // Bystander facing SOUTHEAST initially
      bystanderCu.facing = HEX_DIRECTIONS.SOUTHEAST;

      // Hero casts Arcane Blast (aoeRadius = 1) centered on primaryEnemy
      const dice = new MockDiceRoller({ d20Rolls: [18], damageRolls: [4, 3] });
      executeAbility(state, 'hero', ARCANE_BLAST, { targetUnitId: primaryEnemy.id }, dice);

      // Hero is at (0, 0), bystander is at (2, 1).
      // Bystander should face Northwest towards (0, 0)
      expect(bystanderCu.facing).toBe(getDirectionBetween({ q: 2, r: 1 }, { q: 0, r: 0 }));
    });
  });

  describe('Tactical Flanking & Sneak Attack Resolution', () => {
    it('frontal attack does NOT grant Sneak Attack bonus or Advantage', () => {
      const arena = createRadialArena(3);
      const thief = createRecruit('thief', 'Thief', { faction: 'PLAYER' });
      const dummy = createRecruit('dummy', 'Dummy', { faction: 'ENEMY' });

      arena.setUnitPosition('thief', { q: 0, r: 0 });
      arena.setUnitPosition('dummy', { q: 1, r: 0 }); // East of thief

      const state = createCombatState(arena, [thief, dummy], 'thief');
      const dummyCu = state.units.get('dummy')!;
      // Dummy faces WEST (toward thief at (0, 0))
      dummyCu.facing = HEX_DIRECTIONS.WEST;

      // Thief attacks from front
      expect(isFlankOrRear(state, 'thief', 'dummy')).toBe(false);

      const preview = computeTargetPreview(state, 'thief', SNEAK_ATTACK, { q: 1, r: 0 })!;
      expect(preview.combatArc).toBe('FRONT');
      expect(preview.isFlankAdvantage).toBe(false);

      // Attack deals baseline 1d4 damage, single d20 roll
      const dice = new MockDiceRoller({ d20Rolls: [12], damageRolls: [3] });
      const result = executeAbility(state, 'thief', SNEAK_ATTACK, { targetUnitId: 'dummy' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.d20Roll).toBe(12);
        expect(result.details.damageDealt).toBe(3); // 3 (1d4)
      }
    });

    it('rear attack grants Sneak Attack Advantage and +1d6 precision damage', () => {
      const arena = createRadialArena(3);
      const thief = createRecruit('thief', 'Thief', { faction: 'PLAYER' });
      const dummy = createRecruit('dummy', 'Dummy', { faction: 'ENEMY' });

      arena.setUnitPosition('thief', { q: 2, r: 0 }); // East of dummy
      arena.setUnitPosition('dummy', { q: 1, r: 0 });

      const state = createCombatState(arena, [thief, dummy], 'thief');
      const dummyCu = state.units.get('dummy')!;
      // Dummy faces WEST (away from thief at (2, 0))
      dummyCu.facing = HEX_DIRECTIONS.WEST;

      // Thief attacks from REAR
      expect(isFlankOrRear(state, 'thief', 'dummy')).toBe(true);

      const preview = computeTargetPreview(state, 'thief', SNEAK_ATTACK, { q: 1, r: 0 })!;
      expect(preview.combatArc).toBe('REAR');
      expect(preview.isFlankAdvantage).toBe(true);
      expect(preview.diceDescription).toContain('+1d6');

      // Attack rolls with Advantage (rolls 5 and 18 -> takes 18) and adds 1d4 + 1d6 damage (3 + 5 = 8)
      const dice = new MockDiceRoller({ d20Rolls: [5, 18], damageRolls: [3, 5] });
      const result = executeAbility(state, 'thief', SNEAK_ATTACK, { targetUnitId: 'dummy' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.d20Roll).toBe(18); // Advantage picked 18
        expect(result.details.damageDealt).toBe(8); // 3 (1d4) + 5 (1d6)
      }
    });

    it('flank attack (lateral angle) grants Sneak Attack Advantage and +1d6 damage', () => {
      const arena = createRadialArena(3);
      const thief = createRecruit('thief', 'Thief');
      const dummy = createRecruit('dummy', 'Dummy');

      arena.setUnitPosition('thief', { q: 2, r: -1 }); // Northeast of dummy (Flank angle)
      arena.setUnitPosition('dummy', { q: 1, r: 0 });

      const state = createCombatState(arena, [thief, dummy], 'thief');
      const dummyCu = state.units.get('dummy')!;
      dummyCu.facing = HEX_DIRECTIONS.WEST;

      expect(isFlankOrRear(state, 'thief', 'dummy')).toBe(true);

      const preview = computeTargetPreview(state, 'thief', SNEAK_ATTACK, { q: 1, r: 0 })!;
      expect(preview.combatArc).toBe('FLANK');
      expect(preview.isFlankAdvantage).toBe(true);
    });

    it('allied pincer triggers flanking even when attacking from the front arc', () => {
      const arena = createRadialArena(3);
      const thief = createRecruit('thief', 'Thief');
      const ally = createRecruit('ally', 'Warrior');
      const dummy = createRecruit('dummy', 'Dummy');

      arena.setUnitPosition('thief', { q: 0, r: 0 }); // In front of dummy
      arena.setUnitPosition('dummy', { q: 1, r: 0 }); // Facing West towards thief
      arena.setUnitPosition('ally', { q: 2, r: 0 });  // Ally behind dummy

      const state = createCombatState(arena, [thief, ally, dummy], 'thief');
      const dummyCu = state.units.get('dummy')!;
      dummyCu.facing = HEX_DIRECTIONS.WEST;

      // Even though thief is in FRONT arc, ally is also adjacent to dummy -> Allied Pincer!
      expect(isFlankOrRear(state, 'thief', 'dummy')).toBe(true);
    });

    it('standing next to an obstacle does NOT count as flanked without flank/rear positioning', () => {
      const arena = createRadialArena(3);
      // Make (1, 1) an unwalkable wall/obstacle next to dummy
      arena.setTile({ coord: { q: 1, r: 1 }, isWalkable: false, elevation: 0 });

      const thief = createRecruit('thief', 'Thief');
      const dummy = createRecruit('dummy', 'Dummy');

      arena.setUnitPosition('thief', { q: 0, r: 0 }); // In front of dummy
      arena.setUnitPosition('dummy', { q: 1, r: 0 }); // Facing West towards thief

      const state = createCombatState(arena, [thief, dummy], 'thief');
      const dummyCu = state.units.get('dummy')!;
      dummyCu.facing = HEX_DIRECTIONS.WEST;

      // The old synthetic rule would have returned true because dummy is adjacent to an obstacle.
      // Under True Directional Facing, this must be FALSE.
      expect(isFlankOrRear(state, 'thief', 'dummy')).toBe(false);
    });
  });
});
