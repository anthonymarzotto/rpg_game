import { describe, it, expect } from 'vitest';
import { Unit } from '../types/unit';
import { createRadialArena } from '../grid/templates';
import { createCombatState } from '../combat/resolver';
import {
  scoreBuffAbility,
  scoreDebuffAndUtility,
  canTeamCapitalizeOnSetup
} from './heuristics';
import { LEAD_THE_CHARGE, CHALLENGING_SHOUT, POMMEL_STRIKE } from '../../data/packages/knight';
import { INTERCEPT_STEP } from '../../data/packages/shieldBearer';
import { FLASH_POWDER } from '../../data/packages/catBurglar';
import { STRIKE } from '../../data/packages/novice';

function createMockUnit(
  id: string,
  name: string,
  faction: 'PLAYER' | 'ENEMY',
  overrides?: Partial<Unit['effectiveVitals']> & {
    activeClassId?: string;
    abilities?: string[];
  }
): Unit {
  return {
    id,
    name,
    gender: 'male',
    race: 'human',
    faction,
    progression: {
      unitId: id,
      currentLevel: 1,
      archetypePoints: { fighter: 1, rogue: 0, mage: 0 },
      constellation: [],
      milestoneSelections: {}
    },
    baseAttributes: { force: 10, finesse: 10, focus: 10 },
    effectiveVitals: {
      maxHp: 30,
      maxAp: 3,
      speed: 10,
      move: 3,
      evasion: 10,
      resolve: 10,
      armor: 2,
      ward: 1,
      ...overrides
    },
    loadout: {
      activeClassId: overrides?.activeClassId ?? 'warrior',
      wildcardAbilityIds: overrides?.abilities ?? [],
      wildcardPassiveIds: []
    },
    starterAbilityIds: overrides?.abilities ?? ['strike']
  };
}

describe('AI Heuristics', () => {
  describe('scoreBuffAbility', () => {
    it('scales Lead the Charge AoE rally above 4 when unbuffed allies are inside aoeRadius', () => {
      const arena = createRadialArena(4);
      const knight = createMockUnit('knight-1', 'Enemy Knight', 'ENEMY', {
        activeClassId: 'knight',
        abilities: ['lead_the_charge', 'challenging_shout', 'pommel_strike']
      });
      const ally1 = createMockUnit('ally-1', 'Ally Vanguard', 'ENEMY');
      const ally2 = createMockUnit('ally-2', 'Ally Striker', 'ENEMY');
      const hero = createMockUnit('hero-1', 'Hero', 'PLAYER');

      arena.setUnitPosition(knight.id, { q: 0, r: 0 });
      arena.setUnitPosition(ally1.id, { q: 1, r: 0 });
      arena.setUnitPosition(ally2.id, { q: 0, r: 1 });
      arena.setUnitPosition(hero.id, { q: 4, r: 0 });

      const state = createCombatState(arena, [knight, ally1, ally2, hero], knight.id);
      const knightCu = state.units.get(knight.id)!;
      const heroCu = state.units.get(hero.id)!;

      const soloRes = scoreBuffAbility(
        knightCu,
        knightCu,
        LEAD_THE_CHARGE,
        { q: 0, r: 0 },
        { q: 0, r: 0 },
        [heroCu],
        state,
        'SUPPORT'
      );

      expect(soloRes.score).toBeGreaterThan(4);
      expect(soloRes.reason).toContain('Rally');
    });

    it('gates Intercept Step (POSITION_SWAP) to rescuing allies closer to threats than the actor', () => {
      const arena = createRadialArena(5);
      const sb = createMockUnit('sb-1', 'Shield-bearer', 'ENEMY', {
        activeClassId: 'shield-bearer',
        abilities: ['intercept_step']
      });
      const fragileAlly = createMockUnit('ally-1', 'Fragile Archer', 'ENEMY', { maxHp: 20 });
      const hero = createMockUnit('hero-1', 'Hero', 'PLAYER');

      // Threatened case: hero at (2,0), fragile ally at (1,0) [dist 1], sb at (0,0) [dist 2]
      arena.setUnitPosition(sb.id, { q: 0, r: 0 });
      arena.setUnitPosition(fragileAlly.id, { q: 1, r: 0 });
      arena.setUnitPosition(hero.id, { q: 2, r: 0 });

      const state = createCombatState(arena, [sb, fragileAlly, hero], sb.id);
      const sbCu = state.units.get(sb.id)!;
      const allyCu = state.units.get(fragileAlly.id)!;
      const heroCu = state.units.get(hero.id)!;

      const rescueRes = scoreBuffAbility(
        sbCu,
        allyCu,
        INTERCEPT_STEP,
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        [heroCu],
        state,
        'BRAWLER'
      );
      expect(rescueRes.score).toBeGreaterThan(0);

      // Non-rescue case 1: actor is already closer to hero than ally
      arena.setUnitPosition(fragileAlly.id, { q: -3, r: 0 });
      arena.setUnitPosition(sb.id, { q: 1, r: 0 });
      arena.setUnitPosition(fragileAlly.id, { q: 0, r: 0 });
      const nonRescueCloser = scoreBuffAbility(
        sbCu,
        allyCu,
        INTERCEPT_STEP,
        { q: 1, r: 0 },
        { q: 0, r: 0 },
        [heroCu],
        state,
        'BRAWLER'
      );
      expect(nonRescueCloser.score).toBe(0);

      // Non-rescue case 2: ally is unthreatened (minHostileDist > 2)
      arena.setUnitPosition(fragileAlly.id, { q: -3, r: 0 });
      arena.setUnitPosition(sb.id, { q: 0, r: 0 });
      arena.setUnitPosition(fragileAlly.id, { q: 1, r: 0 });
      arena.setUnitPosition(hero.id, { q: 4, r: 0 });
      const nonRescueFar = scoreBuffAbility(
        sbCu,
        allyCu,
        INTERCEPT_STEP,
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        [heroCu],
        state,
        'BRAWLER'
      );
      expect(nonRescueFar.score).toBe(0);
    });
  });

  describe('scoreDebuffAndUtility and canTeamCapitalizeOnSetup', () => {
    it('awards +8.0 TARGET_CHALLENGED combo bonus on Pommel Strike and still scores Challenging Shout on unchallenged hostiles', () => {
      const arena = createRadialArena(4);
      const knight = createMockUnit('knight-1', 'Knight', 'ENEMY', {
        activeClassId: 'knight',
        abilities: ['challenging_shout', 'pommel_strike']
      });
      const hero = createMockUnit('hero-1', 'Hero', 'PLAYER');

      arena.setUnitPosition(knight.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero.id, { q: 1, r: 0 });

      const state = createCombatState(arena, [knight, hero], knight.id);
      const knightCu = state.units.get(knight.id)!;
      const heroCu = state.units.get(hero.id)!;

      const shoutRes = scoreDebuffAndUtility(
        knightCu,
        heroCu,
        CHALLENGING_SHOUT,
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        state,
        'SUPPORT'
      );
      expect(shoutRes.score).toBeGreaterThan(0);

      const basePommel = scoreDebuffAndUtility(
        knightCu,
        heroCu,
        POMMEL_STRIKE,
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        state,
        'SUPPORT'
      );

      heroCu.activeConditions.push({
        type: 'CHALLENGED',
        durationTurns: 2,
        sourceUnitId: knight.id
      });

      const comboPommel = scoreDebuffAndUtility(
        knightCu,
        heroCu,
        POMMEL_STRIKE,
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        state,
        'SUPPORT'
      );

      expect(comboPommel.score - basePommel.score).toBeCloseTo(8.0, 5);
    });

    it('gates 1-turn Flash Powder setup utility on whether self or a teammate can capitalize in range', () => {
      const arena = createRadialArena(8);
      const thief = createMockUnit('thief-1', 'Cat Burglar', 'ENEMY', {
        activeClassId: 'cat-burglar',
        abilities: ['flash_powder', 'strike']
      });
      const farAlly = createMockUnit('ally-far', 'Far Ally', 'ENEMY', { move: 3 });
      const hero = createMockUnit('hero-1', 'Hero', 'PLAYER');

      arena.setUnitPosition(thief.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero.id, { q: 2, r: 0 });
      arena.setUnitPosition(farAlly.id, { q: -4, r: 0 }); // dist 6 from hero (> move 3 + range 1 = 4)

      const state = createCombatState(arena, [thief, farAlly, hero], thief.id);
      const thiefCu = state.units.get(thief.id)!;
      const farAllyCu = state.units.get(farAlly.id)!;
      const heroCu = state.units.get(hero.id)!;
      (thiefCu as { abilities: typeof thiefCu.abilities }).abilities = [FLASH_POWDER, STRIKE];
      (farAllyCu as { abilities: typeof farAllyCu.abilities }).abilities = [STRIKE];

      // With 1 AP remaining, thief cannot follow up with Strike (1 AP after Flash Powder costs 1 AP -> 0 AP left) and farAlly is too far
      thiefCu.currentAp = 1;
      expect(canTeamCapitalizeOnSetup(thiefCu, FLASH_POWDER, { q: 0, r: 0 }, { q: 2, r: 0 }, state)).toBe(false);
      const uncapitalizedScore = scoreDebuffAndUtility(
        thiefCu,
        heroCu,
        FLASH_POWDER,
        { q: 0, r: 0 },
        { q: 2, r: 0 },
        state,
        'SKIRMISHER'
      );
      expect(uncapitalizedScore.score).toBe(0);

      // Moving ally within move (3) + range (1) = 4 hexes of hero enables setup capitalization
      arena.setUnitPosition(farAlly.id, { q: -1, r: 0 }); // dist 3 from hero
      expect(canTeamCapitalizeOnSetup(thiefCu, FLASH_POWDER, { q: 0, r: 0 }, { q: 2, r: 0 }, state)).toBe(true);
      const capitalizedScore = scoreDebuffAndUtility(
        thiefCu,
        heroCu,
        FLASH_POWDER,
        { q: 0, r: 0 },
        { q: 2, r: 0 },
        state,
        'SKIRMISHER'
      );
      expect(capitalizedScore.score).toBeGreaterThan(0);

      // Also preserves defensive rescue utility when target threatens an adjacent ally even with no follow-up attackers
      arena.setUnitPosition(farAlly.id, { q: 3, r: 0 }); // dist 1 from hero (threatensAlly)
      farAllyCu.currentAp = 0;
      (farAllyCu as { abilities: typeof farAllyCu.abilities }).abilities = [];
      const rescueUtility = scoreDebuffAndUtility(
        thiefCu,
        heroCu,
        FLASH_POWDER,
        { q: 0, r: 0 },
        { q: 2, r: 0 },
        state,
        'SKIRMISHER'
      );
      expect(rescueUtility.score).toBeGreaterThan(0);
    });
  });
});
