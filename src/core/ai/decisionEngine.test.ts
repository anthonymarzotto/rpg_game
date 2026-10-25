import { describe, it, expect, vi } from 'vitest';
import * as resolver from '../combat/resolver';
import { Unit } from '../types/unit';
import { createRadialArena } from '../grid/templates';
import { createCombatState } from '../combat/resolver';
import { HEX_DIRECTIONS, getDirectionBetween, hexDistance } from '../grid/hex';
import {
  decideNextAction,
  decideNextActionWithTrace,
  executeAiTurn,
  executeAiAction
} from './decisionEngine';
import { SeededDiceRoller } from '../combat/dice';
import { STRIKE, SPARK, FROSTBITE } from '../../data/packages/novice';
import { SMOKE_VEIL } from '../../data/packages/infiltrator';
import { ARCANE_BLAST } from '../../data/packages/wizard';
import { ELDRITCH_BLAST } from '../../data/packages/warlock';
import { scoreTargetThreat, scoreDebuffAndUtility } from './heuristics';

function createMockUnit(
  id: string,
  name: string,
  faction: 'PLAYER' | 'ENEMY',
  overrides?: Partial<Unit['effectiveVitals']> & {
    baseAttributes?: { force: number; finesse: number; focus: number };
    abilities?: string[];
    passives?: string[];
    activeClassId?: string;
    starterAbilityIds?: string[];
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
    baseAttributes: overrides?.baseAttributes ?? { force: 10, finesse: 10, focus: 10 },
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
      activeClassId: overrides?.activeClassId ?? (faction === 'ENEMY' ? 'warrior' : 'novice'),
      wildcardAbilityIds: overrides?.abilities ?? [],
      wildcardPassiveIds: overrides?.passives ?? []
    },
    starterAbilityIds: overrides?.starterAbilityIds ?? overrides?.abilities ?? ['strike']
  };
}

describe('Headless AI Decision Engine', () => {
  it('prioritizes finishing blow on low-HP target over full-HP target', () => {
    const arena = createRadialArena(3);
    const enemy = createMockUnit('enemy-1', 'Orc Fighter', 'ENEMY');
    const weakHero = createMockUnit('hero-weak', 'Weak Hero', 'PLAYER', { maxHp: 30 });
    const healthyHero = createMockUnit('hero-healthy', 'Healthy Hero', 'PLAYER', { maxHp: 30 });

    arena.setUnitPosition(enemy.id, { q: 0, r: 0 });
    arena.setUnitPosition(weakHero.id, { q: 1, r: 0 });
    arena.setUnitPosition(healthyHero.id, { q: -1, r: 0 });

    const state = createCombatState(arena, [enemy, weakHero, healthyHero], enemy.id);
    // Set weak hero to 2 HP
    state.units.get(weakHero.id)!.currentHp = 2;

    const action = decideNextAction(state, enemy.id);

    expect(action.type).toBe('ABILITY');
    if (action.type === 'ABILITY') {
      expect(action.target.targetUnitId).toBe(weakHero.id);
      expect(action.reason).toContain('Finishing blow');
    }
  });

  it('exploits defensive vulnerabilities (low Evasion vs Kinetic, low Resolve vs Magic)', () => {
    const arena = createRadialArena(3);
    // Enemy equipped with Strike (Kinetic vs Evasion)
    const physicalEnemy = createMockUnit('enemy-phys', 'Physical Bruiser', 'ENEMY');
    // Hero A: Low Evasion (8), High Resolve (16)
    const lowEvasionHero = createMockUnit('hero-low-eva', 'Low Evasion Hero', 'PLAYER', {
      evasion: 6,
      resolve: 16
    });
    // Hero B: High Evasion (16), Low Resolve (8)
    const lowResolveHero = createMockUnit('hero-low-res', 'Low Resolve Hero', 'PLAYER', {
      evasion: 16,
      resolve: 6
    });

    arena.setUnitPosition(physicalEnemy.id, { q: 0, r: 0 });
    arena.setUnitPosition(lowEvasionHero.id, { q: 1, r: 0 });
    arena.setUnitPosition(lowResolveHero.id, { q: -1, r: 0 });

    const statePhys = createCombatState(arena, [physicalEnemy, lowEvasionHero, lowResolveHero], physicalEnemy.id);
    const physAction = decideNextAction(statePhys, physicalEnemy.id);

    expect(physAction.type).toBe('ABILITY');
    if (physAction.type === 'ABILITY') {
      // Physical attacker should choose the low evasion target
      expect(physAction.target.targetUnitId).toBe(lowEvasionHero.id);
    }

    // Mage enemy equipped with Spark (Magic vs Resolve)
    const arenaMage = createRadialArena(3);
    const mageEnemy = createMockUnit('enemy-mage', 'Goblin Mage', 'ENEMY', {
      activeClassId: 'wizard',
      abilities: ['spark']
    });
    arenaMage.setUnitPosition(mageEnemy.id, { q: 0, r: 0 });
    arenaMage.setUnitPosition(lowEvasionHero.id, { q: 2, r: 0 });
    arenaMage.setUnitPosition(lowResolveHero.id, { q: -2, r: 0 });

    const stateMage = createCombatState(arenaMage, [mageEnemy, lowEvasionHero, lowResolveHero], mageEnemy.id);
    const mageAction = decideNextAction(stateMage, mageEnemy.id);

    expect(mageAction.type).toBe('ABILITY');
    if (mageAction.type === 'ABILITY') {
      // Mage attacker should choose the low resolve target
      expect(mageAction.target.targetUnitId).toBe(lowResolveHero.id);
    }
  });

  it('skirmisher moves to target flank/rear arc before striking to trigger sneak attack advantage', () => {
    const arena = createRadialArena(3);
    const rogueEnemy = createMockUnit('enemy-rogue', 'Bandit Rogue', 'ENEMY', {
      activeClassId: 'thief',
      abilities: ['sneak_attack']
    });
    const targetHero = createMockUnit('hero-target', 'Hero Target', 'PLAYER');

    // Place target facing EAST at (1, 0)
    arena.setUnitPosition(targetHero.id, { q: 1, r: 0 });
    // Place rogue in front of target at (2, 0) (East of target)
    arena.setUnitPosition(rogueEnemy.id, { q: 2, r: 0 });

    const state = createCombatState(arena, [rogueEnemy, targetHero], rogueEnemy.id);
    const targetCu = state.units.get(targetHero.id)!;
    targetCu.facing = HEX_DIRECTIONS.EAST;

    // Rear arc of target facing EAST is WEST (q: 0, r: 0)
    // Flank arcs are NORTHWEST (q: 1, r: -1) and SOUTHWEST (q: 1, r: 1)
    const action = decideNextAction(state, rogueEnemy.id);

    expect(action.type).toBe('MOVE');
    if (action.type === 'MOVE') {
      // Rogue should reposition into rear (0, 0) or flank
      expect(action.reason).toMatch(/flank|rear/i);
    }
  });

  it('standoff caster unit steps away to preferred range when in melee', () => {
    const arena = createRadialArena(3);
    const casterEnemy = createMockUnit('enemy-caster', 'Cultist Caster', 'ENEMY', {
      activeClassId: 'wizard',
      abilities: ['spark']
    });
    const meleeHero = createMockUnit('hero-melee', 'Warrior Hero', 'PLAYER');

    // Both adjacent at melee range (distance 1)
    arena.setUnitPosition(casterEnemy.id, { q: 0, r: 0 });
    arena.setUnitPosition(meleeHero.id, { q: 1, r: 0 });

    const state = createCombatState(arena, [casterEnemy, meleeHero], casterEnemy.id);

    // Sniper / Caster profile prefers range 2
    const action = decideNextAction(state, casterEnemy.id, { profileOverride: 'SNIPER' });

    expect(action.type).toBe('MOVE');
    if (action.type === 'MOVE') {
      expect(action.reason).toContain('standoff');
    }
  });

  it('conserves AP when no targets are reachable and moving provides no benefit', () => {
    const arena = createRadialArena(4);
    const brawler = createMockUnit('enemy-brawler', 'Brawler', 'ENEMY', { move: 1 });
    const distantHero = createMockUnit('hero-far', 'Far Hero', 'PLAYER');

    // Placed far away, with 1 AP remaining
    arena.setUnitPosition(brawler.id, { q: 3, r: 0 });
    arena.setUnitPosition(distantHero.id, { q: -3, r: 0 });

    const state = createCombatState(arena, [brawler, distantHero], brawler.id);
    const cu = state.units.get(brawler.id)!;
    cu.currentAp = 1;

    // Moving 1 hex closer still leaves distance 5 (no attack possible next turn either)
    const action = decideNextAction(state, brawler.id, {
      weightsOverride: { apConservationThreshold: 10.0 }
    });

    expect(action.type).toBe('CONSERVE_AP');
    if (action.type === 'CONSERVE_AP') {
      expect(action.unspentAp).toBe(1);
    }
  });

  it('executes a deterministic sequence with seeded dice tie-breaking', () => {
    const arena = createRadialArena(3);
    const enemy = createMockUnit('enemy', 'Enemy', 'ENEMY');
    // Two identical heroes symmetrically placed
    const hero1 = createMockUnit('hero-1', 'Hero One', 'PLAYER');
    const hero2 = createMockUnit('hero-2', 'Hero Two', 'PLAYER');

    arena.setUnitPosition(enemy.id, { q: 0, r: 0 });
    arena.setUnitPosition(hero1.id, { q: 1, r: 0 });
    arena.setUnitPosition(hero2.id, { q: -1, r: 0 });

    const state1 = createCombatState(arena, [enemy, hero1, hero2], enemy.id);
    const roller1 = new SeededDiceRoller(42);
    const action1 = decideNextAction(state1, enemy.id, { diceRoller: roller1 });

    const arena2 = createRadialArena(3);
    arena2.setUnitPosition(enemy.id, { q: 0, r: 0 });
    arena2.setUnitPosition(hero1.id, { q: 1, r: 0 });
    arena2.setUnitPosition(hero2.id, { q: -1, r: 0 });
    const state2 = createCombatState(arena2, [enemy, hero1, hero2], enemy.id);
    const roller2 = new SeededDiceRoller(42);
    const action2 = decideNextAction(state2, enemy.id, { diceRoller: roller2 });

    expect(action1).toEqual(action2);
  });

  it('executeAiTurn runs full iterative turn: moves to target, strikes twice, and concludes turn', () => {
    const arena = createRadialArena(3);
    const enemy = createMockUnit('enemy-brawler', 'Orc Brawler', 'ENEMY', {
      baseAttributes: { force: 2, finesse: 0, focus: 0 },
      activeClassId: 'novice'
    });
    const targetHero = createMockUnit('target-hero', 'Target Hero', 'PLAYER', {
      maxHp: 40,
      armor: 0,
      speed: 12
    });

    // Enemy at (0, 0), hero at (2, 0) — distance 2 (needs 1 move to reach melee range)
    arena.setUnitPosition(enemy.id, { q: 0, r: 0 });
    arena.setUnitPosition(targetHero.id, { q: 2, r: 0 });

    const state = createCombatState(arena, [enemy, targetHero], enemy.id);
    const heroCu = state.units.get(targetHero.id)!;
    const initialHp = heroCu.currentHp;

    const roller = new SeededDiceRoller(12345);
    const actions = executeAiTurn(state, enemy.id, { diceRoller: roller });

    // Enemy had 3 AP:
    // Step 1: MOVE to (1, 0) [1 AP]
    // Step 2: STRIKE [1 AP]
    // Step 3: STRIKE [1 AP]
    expect(actions.length).toBe(3);
    expect(actions[0].type).toBe('MOVE');
    expect(actions[1].type).toBe('ABILITY');
    expect(actions[2].type).toBe('ABILITY');

    // Target HP must be reduced
    expect(heroCu.currentHp).toBeLessThan(initialHp);

    // Enemy turn concluded, AP spent
    const enemyCu = state.units.get(enemy.id)!;
    expect(enemyCu.currentAp).toBe(0);
    // Turn handed off to faster targetHero
    expect(state.activeUnitId).toBe(targetHero.id);
  });

  it('strictly rejects Minor Ward when active ward modifier is present', () => {
    const arena = createRadialArena(3);
    const wizardEnemy = createMockUnit('wizard-enemy', 'Hostile Wizard', 'ENEMY', {
      activeClassId: 'wizard',
      abilities: ['spark', 'minor_ward'],
      starterAbilityIds: ['spark', 'minor_ward']
    });
    const playerHero = createMockUnit('player-hero', 'Player Hero', 'PLAYER');

    arena.setUnitPosition(wizardEnemy.id, { q: 0, r: 0 });
    arena.setUnitPosition(playerHero.id, { q: 1, r: 0 });

    const state = createCombatState(arena, [wizardEnemy, playerHero], wizardEnemy.id);
    const wizardCu = state.units.get(wizardEnemy.id)!;
    // Add active ward modifier
    wizardCu.activeModifiers.push({ stat: 'ward', value: 2, durationTurns: 1 });

    const nextAction = decideNextAction(state, wizardEnemy.id);

    // Must NOT decide Minor Ward
    if (nextAction.type === 'ABILITY') {
      expect(nextAction.ability.id).not.toBe('minor_ward');
    }
  });

  it('does not repeatedly cast Minor Ward when threatened from behind, turning and attacking with Spark', () => {
    const arena = createRadialArena(3);
    const wizardEnemy = createMockUnit('wizard-enemy', 'Hostile Wizard', 'ENEMY', {
      activeClassId: 'wizard',
      abilities: ['spark', 'minor_ward'],
      starterAbilityIds: ['spark', 'minor_ward'],
      maxHp: 20,
      resolve: 10,
      ward: 1
    });

    const playerHero = createMockUnit('player-hero', 'Player Hero', 'PLAYER', {
      maxHp: 60,
      resolve: 8,
      evasion: 10
    });

    // Wizard at (0, 0)
    arena.setUnitPosition(wizardEnemy.id, { q: 0, r: 0 });
    // Player is directly behind the Wizard (at -1, 0, while wizard starts facing EAST)
    arena.setUnitPosition(playerHero.id, { q: -1, r: 0 });

    const state = createCombatState(arena, [wizardEnemy, playerHero], wizardEnemy.id);
    const wizardCu = state.units.get(wizardEnemy.id)!;
    wizardCu.facing = HEX_DIRECTIONS.EAST; // explicitly facing East, player is at West (rear arc)

    // Execute the full AI turn with 3 AP
    const roller = new SeededDiceRoller(42);
    const actions = executeAiTurn(state, wizardEnemy.id, { diceRoller: roller });

    // Wizard must not cast minor_ward more than once
    const wardActions = actions.filter(
      (a) => a.type === 'ABILITY' && a.ability.id === 'minor_ward'
    );
    expect(wardActions.length).toBeLessThanOrEqual(1);

    // Wizard should use remaining AP to attack with Spark (or reposition and attack)
    const offensiveActions = actions.filter(
      (a) => a.type === 'ABILITY' && a.ability.id === 'spark'
    );
    expect(offensiveActions.length).toBeGreaterThanOrEqual(1);

    // After attacking player, wizard's facing must point directly toward the target
    const finalWizardPos = state.arena.getUnitPosition(wizardEnemy.id)!;
    const heroPos = state.arena.getUnitPosition(playerHero.id)!;
    expect(wizardCu.facing).toBe(getDirectionBetween(finalWizardPos, heroPos));
  });

  it('turns to face and attack threatening rear target with Spark when stationary', () => {
    const arena = createRadialArena(3);
    const stationaryWizard = createMockUnit('stationary-wizard', 'Stationary Wizard', 'ENEMY', {
      activeClassId: 'wizard',
      abilities: ['spark', 'minor_ward'],
      starterAbilityIds: ['spark', 'minor_ward'],
      move: 0,
      maxHp: 20,
      resolve: 10,
      ward: 1
    });

    const playerHero = createMockUnit('player-hero', 'Player Hero', 'PLAYER', {
      maxHp: 30,
      resolve: 8,
      evasion: 10
    });

    // Wizard at (0, 0) facing EAST
    arena.setUnitPosition(stationaryWizard.id, { q: 0, r: 0 });
    // Player directly behind wizard at (-1, 0)
    arena.setUnitPosition(playerHero.id, { q: -1, r: 0 });

    const state = createCombatState(arena, [stationaryWizard, playerHero], stationaryWizard.id);
    const wizardCu = state.units.get(stationaryWizard.id)!;
    wizardCu.facing = HEX_DIRECTIONS.EAST;

    // First action: casts minor_ward once (or attacks directly)
    // Then attacks with Spark against the hero at (-1, 0)
    const roller = new SeededDiceRoller(42);
    const actions = executeAiTurn(state, stationaryWizard.id, { diceRoller: roller });

    const sparkActions = actions.filter(
      (a) => a.type === 'ABILITY' && a.ability.id === 'spark'
    );
    expect(sparkActions.length).toBeGreaterThanOrEqual(1);

    // Wizard was stationary at (0, 0) and hero was at (-1, 0)
    // Wizard must now be facing WEST (3)
    expect(wizardCu.facing).toBe(HEX_DIRECTIONS.WEST);
  });

  it('berserker brawler primes Blood Frenzy before executing Reckless Cleave when adjacent to healthy enemy', () => {
    const arena = createRadialArena(3);
    const berserkerEnemy = createMockUnit('berserker-enemy', 'Hostile Berserker', 'ENEMY', {
      activeClassId: 'berserker'
    });
    const playerHero = createMockUnit('player-hero', 'Player Hero', 'PLAYER', {
      maxHp: 60,
      resolve: 10,
      evasion: 10
    });

    arena.setUnitPosition(berserkerEnemy.id, { q: 0, r: 0 });
    arena.setUnitPosition(playerHero.id, { q: 1, r: 0 });

    const state = createCombatState(arena, [berserkerEnemy, playerHero], berserkerEnemy.id);
    const nextAction = decideNextAction(state, berserkerEnemy.id);

    expect(nextAction.type).toBe('ABILITY');
    if (nextAction.type === 'ABILITY') {
      expect(nextAction.ability.id).toBe('blood_frenzy');
      expect(nextAction.reason).toContain('Blood Frenzy');
    }
  });

  it('berserker brawler avoids Blood Frenzy when current HP is dangerously low (<= 5 HP)', () => {
    const arena = createRadialArena(3);
    const berserkerEnemy = createMockUnit('berserker-enemy', 'Hostile Berserker', 'ENEMY', {
      activeClassId: 'berserker'
    });
    const playerHero = createMockUnit('player-hero', 'Player Hero', 'PLAYER', {
      maxHp: 60,
      resolve: 10,
      evasion: 10
    });

    arena.setUnitPosition(berserkerEnemy.id, { q: 0, r: 0 });
    arena.setUnitPosition(playerHero.id, { q: 1, r: 0 });

    const state = createCombatState(arena, [berserkerEnemy, playerHero], berserkerEnemy.id);
    const berserkerCu = state.units.get(berserkerEnemy.id)!;
    berserkerCu.currentHp = 4; // dangerously low

    const nextAction = decideNextAction(state, berserkerEnemy.id);

    expect(nextAction.type).toBe('ABILITY');
    if (nextAction.type === 'ABILITY') {
      expect(nextAction.ability.id).not.toBe('blood_frenzy');
    }
  });

  it('berserker brawler executes full turn: primes Blood Frenzy then hits with Reckless Cleave', () => {
    const arena = createRadialArena(3);
    const berserkerEnemy = createMockUnit('berserker-enemy', 'Hostile Berserker', 'ENEMY', {
      activeClassId: 'berserker'
    });
    const playerHero = createMockUnit('player-hero', 'Player Hero', 'PLAYER', {
      maxHp: 60,
      resolve: 10,
      evasion: 10,
      armor: 1,
      speed: 12
    });

    arena.setUnitPosition(berserkerEnemy.id, { q: 0, r: 0 });
    arena.setUnitPosition(playerHero.id, { q: 1, r: 0 });

    const state = createCombatState(arena, [berserkerEnemy, playerHero], berserkerEnemy.id);
    const berserkerCu = state.units.get(berserkerEnemy.id)!;
    const initialHp = berserkerCu.currentHp;

    const roller = new SeededDiceRoller(42);
    const actions = executeAiTurn(state, berserkerEnemy.id, { diceRoller: roller });

    expect(actions.length).toBe(2);
    expect(actions[0].type).toBe('ABILITY');
    if (actions[0].type === 'ABILITY') {
      expect(actions[0].ability.id).toBe('blood_frenzy');
    }
    expect(actions[1].type).toBe('ABILITY');
    if (actions[1].type === 'ABILITY') {
      expect(actions[1].ability.id).toBe('reckless_cleave');
    }

    // Berserker sacrificed 3 HP for Blood Frenzy
    expect(berserkerCu.currentHp).toBe(initialHp - 3);
    expect(berserkerCu.currentAp).toBe(0);
  });

  describe('executeAiAction', () => {
    it('executes MOVE action and returns destination details', () => {
      const arena = createRadialArena(3);
      const enemy = createMockUnit('enemy', 'Goblin', 'ENEMY');
      arena.setUnitPosition(enemy.id, { q: 0, r: 0 });
      const state = createCombatState(arena, [enemy], enemy.id);

      const result = executeAiAction(state, enemy.id, {
        type: 'MOVE',
        destination: { q: 1, r: 0 },
        score: 10,
        reason: 'advance'
      });

      expect(result.type).toBe('MOVE');
      if (result.type === 'MOVE') {
        expect(result.destination).toEqual({ q: 1, r: 0 });
      }
      expect(state.arena.getUnitPosition(enemy.id)).toEqual({ q: 1, r: 0 });
      expect(state.units.get(enemy.id)!.currentAp).toBe(2);
    });

    it('executes ABILITY action and returns full AbilityResolution', () => {
      const arena = createRadialArena(3);
      const enemy = createMockUnit('enemy', 'Goblin', 'ENEMY');
      const hero = createMockUnit('hero', 'Hero', 'PLAYER', { maxHp: 30 });
      arena.setUnitPosition(enemy.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero.id, { q: 1, r: 0 });
      const state = createCombatState(arena, [enemy, hero], enemy.id);

      const roller = new SeededDiceRoller(999);
      const result = executeAiAction(
        state,
        enemy.id,
        {
          type: 'ABILITY',
          ability: STRIKE,
          target: { coord: { q: 1, r: 0 }, targetUnitId: hero.id },
          score: 15,
          reason: 'strike'
        },
        roller
      );

      expect(result.type).toBe('ABILITY');
      if (result.type === 'ABILITY') {
        expect(result.ability.id).toBe('strike');
        expect(result.resolution).toBeDefined();
        expect(result.resolution.type).toBe('ATTACK');
      }
      expect(state.units.get(enemy.id)!.currentAp).toBe(2);
    });

    it('handles CONSERVE_AP without modifying grid state', () => {
      const arena = createRadialArena(3);
      const enemy = createMockUnit('enemy', 'Goblin', 'ENEMY');
      arena.setUnitPosition(enemy.id, { q: 0, r: 0 });
      const state = createCombatState(arena, [enemy], enemy.id);

      const result = executeAiAction(state, enemy.id, {
        type: 'CONSERVE_AP',
        unspentAp: 3,
        score: 5,
        reason: 'bank CTB'
      });

      expect(result.type).toBe('CONSERVE_AP');
      if (result.type === 'CONSERVE_AP') {
        expect(result.unspentAp).toBe(3);
      }
      expect(state.units.get(enemy.id)!.currentAp).toBe(3);
    });
  });

  describe('Tier 3 Hybrid AI Profiles & Tactical Primer Heuristics', () => {
    it('cavalier brawler initiates straight-line Lance Charge into melee contact', () => {
      const arena = createRadialArena(3);
      const cavalier = createMockUnit('cav-enemy', 'Hostile Cavalier', 'ENEMY', {
        activeClassId: 'cavalier',
        baseAttributes: { force: 14, finesse: 10, focus: 10 }
      });
      const hero = createMockUnit('player-hero', 'Player Hero', 'PLAYER', {
        maxHp: 50,
        armor: 1
      });

      arena.setUnitPosition(cavalier.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero.id, { q: 2, r: 0 });

      const state = createCombatState(arena, [cavalier, hero], cavalier.id);
      const action = decideNextAction(state, cavalier.id);

      expect(action.type).toBe('ABILITY');
      if (action.type === 'ABILITY') {
        expect(action.ability.id).toBe('lance_charge');
      }

      const roller = new SeededDiceRoller(42);
      const result = executeAiAction(state, cavalier.id, action, roller);
      expect(result.type).toBe('ABILITY');
      expect(state.arena.getUnitPosition(cavalier.id)).toEqual({ q: 1, r: 0 });
      expect(state.arena.getUnitPosition(hero.id)).toEqual({ q: 3, r: 0 });
    });

    it('cavalier brawler taunts adjacent enemy with Flamboyant Flourish when engaged', () => {
      const arena = createRadialArena(3);
      const cavalier = createMockUnit('cav-enemy', 'Hostile Cavalier', 'ENEMY', {
        activeClassId: 'cavalier'
      });
      const hero = createMockUnit('player-hero', 'Player Hero', 'PLAYER', {
        maxHp: 50,
        armor: 1
      });

      arena.setUnitPosition(cavalier.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero.id, { q: 1, r: 0 });

      const state = createCombatState(arena, [cavalier, hero], cavalier.id);
      state.units.get(cavalier.id)!.currentAp = 1;
      state.units.get(hero.id)!.facing = HEX_DIRECTIONS.WEST;

      const action = decideNextAction(state, cavalier.id);
      expect(action.type).toBe('ABILITY');
      if (action.type === 'ABILITY') {
        expect(action.ability.id).toBe('flamboyant_flourish');
      }

      const roller = new SeededDiceRoller(42);
      const result = executeAiAction(state, cavalier.id, action, roller);
      expect(result.type).toBe('ABILITY');

      const heroCu = state.units.get(hero.id)!;
      const cavCu = state.units.get(cavalier.id)!;
      expect(heroCu.activeConditions.some((c) => c.type === 'CHALLENGED')).toBe(true);
      expect(cavCu.activeModifiers.some((m) => m.stat === 'evasion' && m.value > 0)).toBe(true);
    });

    it('highwayman skirmisher primes Stand and Deliver! before Point-Blank Buckshot on armored foe at range 2', () => {
      const arena = createRadialArena(3);
      const highwayman = createMockUnit('hw-enemy', 'Hostile Highwayman', 'ENEMY', {
        activeClassId: 'highwayman',
        baseAttributes: { force: 10, finesse: 14, focus: 10 }
      });
      const hero = createMockUnit('player-hero', 'Player Hero', 'PLAYER', {
        maxHp: 50,
        armor: 2,
        resolve: 10,
        evasion: 10
      });

      arena.setUnitPosition(highwayman.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero.id, { q: 2, r: 0 }); // Range 2 standoff

      const state = createCombatState(arena, [highwayman, hero], highwayman.id);
      const roller = new SeededDiceRoller(42);
      const actions = executeAiTurn(state, highwayman.id, { diceRoller: roller });

      const abilityActions = actions.filter((a) => a.type === 'ABILITY');
      expect(abilityActions.length).toBe(2);
      expect(abilityActions[0].ability.id).toBe('stand_and_deliver');
      expect(abilityActions[1].ability.id).toBe('point_blank_buckshot');
    });

    it('highwayman skirmisher executes Gallant Flourish melee contingency with retreat step when engaged at distance 1', () => {
      const arena = createRadialArena(3);
      const highwayman = createMockUnit('hw-enemy', 'Hostile Highwayman', 'ENEMY', {
        activeClassId: 'highwayman',
        baseAttributes: { force: 10, finesse: 14, focus: 10 }
      });
      const hero = createMockUnit('player-hero', 'Player Hero', 'PLAYER', {
        maxHp: 50,
        armor: 2,
        resolve: 10,
        evasion: 10
      });

      arena.setUnitPosition(highwayman.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero.id, { q: 1, r: 0 }); // Distance 1 melee contact

      const state = createCombatState(arena, [highwayman, hero], highwayman.id);
      const roller = new SeededDiceRoller(42);
      const actions = executeAiTurn(state, highwayman.id, { diceRoller: roller });

      const abilityActions = actions.filter((a) => a.type === 'ABILITY');
      // Should execute Gallant Flourish in the turn sequence
      expect(abilityActions.some((a) => a.ability.id === 'gallant_flourish')).toBe(true);

      // And Highwayman retreats away from (1, 0) to (-1, 0)
      expect(arena.getUnitPosition(highwayman.id)).toEqual({ q: -1, r: 0 });
    });

    it('warlock sniper repels adjacent enemy with Eldritch Blast knockback spacing', () => {
      const arena = createRadialArena(3);
      const warlock = createMockUnit('warlock-enemy', 'Hostile Warlock', 'ENEMY', {
        activeClassId: 'warlock',
        baseAttributes: { force: 10, finesse: 10, focus: 14 }
      });
      const hero = createMockUnit('player-hero', 'Player Hero', 'PLAYER', {
        maxHp: 50,
        armor: 0,
        resolve: 10,
        evasion: 10
      });

      arena.setUnitPosition(warlock.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero.id, { q: 1, r: 0 });

      const state = createCombatState(arena, [warlock, hero], warlock.id);
      state.units.get(warlock.id)!.currentAp = 2;

      const action = decideNextAction(state, warlock.id);
      expect(action.type).toBe('ABILITY');
      if (action.type === 'ABILITY') {
        expect(action.ability.id).toBe('eldritch_blast');
      }

      const roller = new SeededDiceRoller(42);
      const result = executeAiAction(state, warlock.id, action, roller);
      expect(result.type).toBe('ABILITY');
      expect(state.arena.getUnitPosition(hero.id)).toEqual({ q: 2, r: 0 });
    });

    it('warlock sniper uses Pact Blade melee contingency against armored target with 1 AP', () => {
      const arena = createRadialArena(3);
      const warlock = createMockUnit('warlock-enemy', 'Hostile Warlock', 'ENEMY', {
        activeClassId: 'warlock',
        baseAttributes: { force: 10, finesse: 10, focus: 14 }
      });
      const hero = createMockUnit('player-hero', 'Player Hero', 'PLAYER', {
        maxHp: 50,
        armor: 3,
        resolve: 10,
        evasion: 10
      });

      arena.setUnitPosition(warlock.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero.id, { q: 1, r: 0 });

      const state = createCombatState(arena, [warlock, hero], warlock.id);
      state.units.get(warlock.id)!.currentAp = 1;

      const action = decideNextAction(state, warlock.id);
      expect(action.type).toBe('ABILITY');
      if (action.type === 'ABILITY') {
        expect(action.ability.id).toBe('pact_blade');
      }
    });

    it('witch support executes composite move-and-buff to reach frontline ally with Witchs Talisman', () => {
      const arena = createRadialArena(3);
      const witch = createMockUnit('witch-enemy', 'Hostile Witch', 'ENEMY', {
        activeClassId: 'witch'
      });
      const ally = createMockUnit('ally-enemy', 'Allied Bruiser', 'ENEMY', {
        activeClassId: 'warrior',
        maxHp: 40
      });
      const hero = createMockUnit('player-hero', 'Player Hero', 'PLAYER', {
        maxHp: 50
      });

      arena.setUnitPosition(witch.id, { q: -2, r: 0 });
      arena.setUnitPosition(ally.id, { q: 1, r: 0 });
      arena.setUnitPosition(hero.id, { q: 2, r: 0 });

      const state = createCombatState(arena, [witch, ally, hero], witch.id);
      state.units.get(witch.id)!.currentAp = 2;
      state.units.get(ally.id)!.initiativeGauge = 10;

      const action = decideNextAction(state, witch.id);
      expect(action.type).toBe('MOVE');
      if (action.type === 'MOVE') {
        expect(action.reason).toContain("Enables Witch's Talisman on ally Allied Bruiser");
      }
    });

    it('witch support forces target facing reversal with Poppet Needle when enemy threatens frontline', () => {
      const arena = createRadialArena(3);
      const witch = createMockUnit('witch-enemy', 'Hostile Witch', 'ENEMY', {
        activeClassId: 'witch'
      });
      const ally = createMockUnit('ally-enemy', 'Allied Bruiser', 'ENEMY', {
        activeClassId: 'warrior'
      });
      const hero = createMockUnit('player-hero', 'Player Hero', 'PLAYER', {
        maxHp: 50
      });

      arena.setUnitPosition(witch.id, { q: 0, r: 2 });
      arena.setUnitPosition(hero.id, { q: 0, r: 1 });
      arena.setUnitPosition(ally.id, { q: 0, r: 0 });

      const state = createCombatState(arena, [witch, ally, hero], witch.id);
      state.units.get(witch.id)!.currentAp = 2;

      const action = decideNextAction(state, witch.id);
      expect(action.type).toBe('ABILITY');
      if (action.type === 'ABILITY') {
        expect(action.ability.id).toBe('poppet_needle');
      }

      const roller = new SeededDiceRoller(42);
      const result = executeAiAction(state, witch.id, action, roller);
      expect(result.type).toBe('ABILITY');

      const heroCu = state.units.get(hero.id)!;
      const expectedOppositeFacing = ((getDirectionBetween({ q: 0, r: 1 }, { q: 0, r: 2 }) + 3) % 6);
      expect(heroCu.facing).toBe(expectedOppositeFacing);
      expect(heroCu.activeModifiers.some((m) => m.stat === 'resolve' && m.value < 0)).toBe(true);
    });

    it('cat-burglar skirmisher executes the Solo Heist combo (Flash -> Vault -> Pilfer) in a single 3-AP turn', () => {
      const arena = createRadialArena(3);
      const catBurglar = createMockUnit('cat-burglar-enemy', 'Hostile Cat-Burglar', 'ENEMY', {
        activeClassId: 'cat-burglar',
        baseAttributes: { force: 10, finesse: 14, focus: 10 }
      });
      const hero = createMockUnit('player-hero', 'Player Hero', 'PLAYER', {
        maxHp: 50,
        armor: 1,
        evasion: 10,
        resolve: 10
      });

      arena.setUnitPosition(catBurglar.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero.id, { q: 2, r: 0 });

      const state = createCombatState(arena, [catBurglar, hero], catBurglar.id);
      state.units.get(hero.id)!.facing = HEX_DIRECTIONS.WEST;

      const roller = new SeededDiceRoller(42);
      const actions = executeAiTurn(state, catBurglar.id, { diceRoller: roller });

      expect(actions.length).toBe(3);
      expect(actions[0].type).toBe('ABILITY');
      if (actions[0].type === 'ABILITY') {
        expect(actions[0].ability.id).toBe('flash_powder');
      }
      expect(actions[1].type).toBe('ABILITY');
      if (actions[1].type === 'ABILITY') {
        expect(actions[1].ability.id).toBe('rooftop_vault');
      }
      expect(actions[2].type).toBe('ABILITY');
      if (actions[2].type === 'ABILITY') {
        expect(actions[2].ability.id).toBe('pilfer');
      }

      // Verify outcomes: Hero was rotated away and debuffed, Burglar closed into melee and dealt damage
      const heroCu = state.units.get(hero.id)!;
      expect(heroCu.activeModifiers.some((m) => m.stat === 'attackRoll' && m.value < 0)).toBe(true);
      expect(heroCu.currentHp).toBeLessThan(50);
      const finalBurglarPos = state.arena.getUnitPosition(catBurglar.id)!;
      const finalHeroPos = state.arena.getUnitPosition(hero.id)!;
      expect(hexDistance(finalBurglarPos, finalHeroPos)).toBe(1);
    });

    it('cat-burglar skirmisher evaluates high-ground leaping with Rooftop Vault when target is elevated on cliff', () => {
      const arena = createRadialArena(3);
      arena.setTile({ coord: { q: 1, r: 0 }, elevation: 2, isWalkable: true });
      arena.setTile({ coord: { q: 2, r: 0 }, elevation: 2, isWalkable: true });

      const catBurglar = createMockUnit('cat-burglar-enemy', 'Hostile Cat-Burglar', 'ENEMY', {
        activeClassId: 'cat-burglar',
        baseAttributes: { force: 10, finesse: 14, focus: 10 }
      });
      const hero = createMockUnit('player-hero', 'Player Hero', 'PLAYER', {
        maxHp: 50
      });

      arena.setUnitPosition(catBurglar.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero.id, { q: 2, r: 0 });

      const state = createCombatState(arena, [catBurglar, hero], catBurglar.id);
      state.units.get(catBurglar.id)!.currentAp = 2;

      const action = decideNextAction(state, catBurglar.id);
      expect(action.type).toBe('ABILITY');
      if (action.type === 'ABILITY') {
        expect(action.ability.id).toBe('rooftop_vault');
        expect(action.reason).toContain('high ground');
      }
    });

    it('cat-burglar does not spam Flash Powder when target already has -2 Attack Roll debuff', () => {
      const arena = createRadialArena(3);
      const catBurglar = createMockUnit('cat-burglar-enemy', 'Hostile Cat-Burglar', 'ENEMY', {
        activeClassId: 'cat-burglar',
        baseAttributes: { force: 10, finesse: 14, focus: 10 }
      });
      const hero = createMockUnit('player-hero', 'Player Hero', 'PLAYER', {
        maxHp: 50
      });

      arena.setUnitPosition(catBurglar.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero.id, { q: 1, r: 0 });

      const state = createCombatState(arena, [catBurglar, hero], catBurglar.id);
      state.units.get(catBurglar.id)!.currentAp = 1;
      state.units.get(hero.id)!.activeModifiers.push({
        stat: 'attackRoll',
        value: -2,
        durationTurns: 1
      });

      const action = decideNextAction(state, catBurglar.id);
      expect(action.type).toBe('ABILITY');
      if (action.type === 'ABILITY') {
        expect(action.ability.id).toBe('pilfer');
      }
    });

    it('ai thief with Shadow Step does not attempt cliff ascension when target is elevated', () => {
      const arena = createRadialArena(3);
      arena.setTile({ coord: { q: 1, r: 0 }, elevation: 2, isWalkable: true });

      const thief = createMockUnit('thief-enemy', 'Hostile Thief', 'ENEMY', {
        activeClassId: 'thief',
        baseAttributes: { force: 10, finesse: 14, focus: 10 }
      });
      const hero = createMockUnit('player-hero', 'Player Hero', 'PLAYER', {
        maxHp: 50
      });

      arena.setUnitPosition(thief.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero.id, { q: 1, r: 0 });

      const state = createCombatState(arena, [thief, hero], thief.id);
      state.units.get(thief.id)!.currentAp = 2;

      const action = decideNextAction(state, thief.id);
      // Thief must not pick shadow_step to (1, 0) because destination has elevation 2 vs actor elevation 0
      if (action.type === 'ABILITY') {
        expect(action.ability.id).not.toBe('shadow_step');
      }
    });

    it('cat-burglar skirmisher executes the 3-hex Solo Heist combo across the full 3-hex vault range', () => {
      const arena = createRadialArena(4);
      const catBurglar = createMockUnit('cat-burglar-enemy', 'Hostile Cat-Burglar', 'ENEMY', {
        activeClassId: 'cat-burglar',
        baseAttributes: { force: 10, finesse: 14, focus: 10 }
      });
      const hero = createMockUnit('player-hero', 'Player Hero', 'PLAYER', {
        maxHp: 50,
        armor: 1,
        evasion: 10,
        resolve: 10
      });

      arena.setUnitPosition(catBurglar.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero.id, { q: 3, r: 0 });

      const state = createCombatState(arena, [catBurglar, hero], catBurglar.id);
      state.units.get(hero.id)!.facing = HEX_DIRECTIONS.WEST;

      const roller = new SeededDiceRoller(42);
      const actions = executeAiTurn(state, catBurglar.id, { diceRoller: roller });

      expect(actions.length).toBe(3);
      expect(actions[0].type).toBe('ABILITY');
      if (actions[0].type === 'ABILITY') {
        expect(actions[0].ability.id).toBe('flash_powder');
      }
      expect(actions[1].type).toBe('ABILITY');
      if (actions[1].type === 'ABILITY') {
        expect(actions[1].ability.id).toBe('rooftop_vault');
      }
      expect(actions[2].type).toBe('ABILITY');
      if (actions[2].type === 'ABILITY') {
        expect(actions[2].ability.id).toBe('pilfer');
      }

      const finalBurglarPos = state.arena.getUnitPosition(catBurglar.id)!;
      const finalHeroPos = state.arena.getUnitPosition(hero.id)!;
      expect(hexDistance(finalBurglarPos, finalHeroPos)).toBe(1);
    });

    it('cross-class wildcard unit evaluates primer ability without relying on source class package', () => {
      const arena = createRadialArena(3);
      // Unit has 'thief' class (Skirmisher), NOT 'cat-burglar', but borrows 'flash_powder' as a wildcard ability
      const skirmisher = createMockUnit('thief-enemy', 'Hostile Thief', 'ENEMY', {
        activeClassId: 'thief',
        abilities: ['flash_powder'],
        baseAttributes: { force: 10, finesse: 14, focus: 10 }
      });
      const hero = createMockUnit('player-hero', 'Player Hero', 'PLAYER', {
        maxHp: 50,
        evasion: 10
      });

      arena.setUnitPosition(skirmisher.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero.id, { q: 2, r: 0 });

      const state = createCombatState(arena, [skirmisher, hero], skirmisher.id);
      state.units.get(skirmisher.id)!.currentAp = 2;

      // Ensure flash_powder is evaluated as a primer despite thief not being a cat-burglar
      const action = decideNextAction(state, skirmisher.id);
      expect(action.type).toBe('ABILITY');
      if (action.type === 'ABILITY') {
        expect(action.ability.id).toBe('flash_powder');
        expect(action.reason).toContain('Prime flash powder disorientation before strike');
      }
    });

    it('knight does not repeat challenging_shout on already-challenged target, conserving AP', () => {
      const arena = createRadialArena(3);
      const knight = createMockUnit('knight-enemy', 'Hostile Knight', 'ENEMY', {
        activeClassId: 'knight',
        starterAbilityIds: ['challenging_shout']
      });
      const hero = createMockUnit('player-hero', 'Player Hero', 'PLAYER', {
        maxHp: 50,
        armor: 1
      });

      arena.setUnitPosition(knight.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero.id, { q: 2, r: 0 });

      const state = createCombatState(arena, [knight, hero], knight.id);
      const knightCu = state.units.get(knight.id)!;
      knightCu.currentAp = 1;

      // Hero already has CHALLENGED from this knight
      state.units.get(hero.id)!.activeConditions.push({
        type: 'CHALLENGED',
        durationTurns: 2,
        sourceUnitId: knight.id
      });

      const action = decideNextAction(state, knight.id);
      expect(action.type).toBe('CONSERVE_AP');
      expect(action.reason).toContain('Conserving');
    });

    it('witch does not repeat witchs_talisman on ally with active speed buff or high initiative', () => {
      const arena = createRadialArena(3);
      const witch = createMockUnit('witch-enemy', 'Hostile Witch', 'ENEMY', {
        activeClassId: 'witch',
        starterAbilityIds: ['witchs_talisman']
      });
      const ally = createMockUnit('ally-enemy', 'Frontline Ally', 'ENEMY', {
        maxHp: 50
      });
      const hero = createMockUnit('player-hero', 'Player Hero', 'PLAYER', {
        maxHp: 50
      });

      arena.setUnitPosition(witch.id, { q: 0, r: 0 });
      arena.setUnitPosition(ally.id, { q: 1, r: 0 });
      arena.setUnitPosition(hero.id, { q: 2, r: 0 });

      const state = createCombatState(arena, [witch, ally, hero], witch.id);
      state.units.get(witch.id)!.currentAp = 1;

      // Ally already has speed buff from a previous cast
      state.units.get(ally.id)!.activeModifiers.push({
        stat: 'speed',
        value: 2,
        durationTurns: 1
      });

      const action = decideNextAction(state, witch.id);
      expect(action.type).toBe('CONSERVE_AP');
      expect(action.reason).toContain('Conserving');
    });

    it('decideNextAction checks effectiveAbility apCost when modified by abilityModifiers', () => {
      const arena = createRadialArena(3);
      const enemy = createMockUnit('enemy', 'Hostile Novice', 'ENEMY', {
        activeClassId: 'novice',
        starterAbilityIds: ['strike'] // Strike base apCost is 1
      });
      const hero = createMockUnit('player-hero', 'Player Hero', 'PLAYER', { maxHp: 50 });

      arena.setUnitPosition(enemy.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero.id, { q: 1, r: 0 });

      const state = createCombatState(arena, [enemy, hero], enemy.id);
      const enemyCu = state.units.get(enemy.id)!;
      enemyCu.currentAp = 1;

      // Add abilityModifier that increases Strike's AP cost by +1 (effective AP cost = 2)
      enemyCu.abilityModifiers.push({
        id: 'tax_mod',
        name: 'Tax Modifier',
        targetAbilityIds: ['strike'],
        deltas: {
          apCost: 1
        }
      });

      const action = decideNextAction(state, enemy.id);
      // Since effective AP cost is 2 and enemy has 1 AP, Strike cannot be chosen
      expect(action.type).toBe('CONSERVE_AP');
      expect(action.reason).toContain('Conserving');
    });

    it('executeAiTurn concludes cleanly with endActiveTurn even if action execution fails', () => {
      const arena = createRadialArena(3);
      const enemy = createMockUnit('enemy', 'Hostile Warrior', 'ENEMY');
      const hero = createMockUnit('player-hero', 'Player Hero', 'PLAYER', { maxHp: 50 });

      arena.setUnitPosition(enemy.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero.id, { q: 1, r: 0 });

      const state = createCombatState(arena, [enemy, hero], enemy.id);
      const initialTurnNumber = state.turnNumber;

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(resolver, 'executeAbility').mockImplementationOnce(() => {
        throw new Error('Simulated ability execution throw');
      });

      const executed = executeAiTurn(state, enemy.id);
      expect(executed.length).toBeGreaterThan(0);
      expect(state.turnNumber).toBe(initialTurnNumber + 1);

      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('decideNextActionWithTrace captures winning action and ranked candidate alternatives', () => {
      const arena = createRadialArena(3);
      const enemy = createMockUnit('enemy', 'Hostile Novice', 'ENEMY', {
        activeClassId: 'novice',
        starterAbilityIds: ['strike']
      });
      const hero1 = createMockUnit('hero1', 'Hero One', 'PLAYER', { maxHp: 30 });
      const hero2 = createMockUnit('hero2', 'Hero Two', 'PLAYER', { maxHp: 10 }); // Low HP attracts focus fire

      arena.setUnitPosition(enemy.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero1.id, { q: 1, r: 0 });
      arena.setUnitPosition(hero2.id, { q: 0, r: 1 });

      const state = createCombatState(arena, [enemy, hero1, hero2], enemy.id);
      const result = decideNextActionWithTrace(state, enemy.id);

      expect(result.action).toBeDefined();
      expect(result.trace).toBeDefined();
      expect(result.trace.actorUnitId).toBe(enemy.id);
      expect(result.trace.turnNumber).toBe(state.turnNumber);
      expect(result.trace.chosenAction).toEqual(result.action);
      expect(result.trace.topCandidates.length).toBeGreaterThan(0);
      expect(result.trace.totalCandidatesEvaluated).toBeGreaterThanOrEqual(result.trace.topCandidates.length);

      // Top candidate rank 1 should match the highest score
      expect(result.trace.topCandidates[0].rank).toBe(1);
      if (result.trace.topCandidates.length > 1) {
        expect(result.trace.topCandidates[0].score).toBeGreaterThanOrEqual(result.trace.topCandidates[1].score);
      }
    });

    it('executeAiTurn records traces to state.aiDecisionLog when initialized', () => {
      const arena = createRadialArena(3);
      const enemy = createMockUnit('enemy', 'Hostile Novice', 'ENEMY', {
        activeClassId: 'novice',
        starterAbilityIds: ['strike']
      });
      const hero = createMockUnit('hero', 'Player Hero', 'PLAYER', { maxHp: 40 });

      arena.setUnitPosition(enemy.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero.id, { q: 1, r: 0 });

      const state = createCombatState(arena, [enemy, hero], enemy.id);
      // Initialize aiDecisionLog array on combat state
      const mutableState = state as { aiDecisionLog?: any[] };
      mutableState.aiDecisionLog = [];

      executeAiTurn(state, enemy.id);

      expect(mutableState.aiDecisionLog.length).toBeGreaterThan(0);
      expect(mutableState.aiDecisionLog[0].actorUnitId).toBe(enemy.id);
      expect(mutableState.aiDecisionLog[0].chosenAction).toBeDefined();
    });

    it('assigns zero utility to Smoke Veil when actor already has active STEALTH (prevents loop)', () => {
      const arena = createRadialArena(3);
      const infiltrator = createMockUnit('infiltrator', 'Hostile Infiltrator', 'ENEMY', {
        activeClassId: 'infiltrator',
        starterAbilityIds: ['smoke_veil']
      });
      const hero = createMockUnit('hero', 'Player Hero', 'PLAYER', { maxHp: 50 });

      arena.setUnitPosition(infiltrator.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero.id, { q: 2, r: 0 }); // Distance 2: hero out of melee reach

      const state = createCombatState(arena, [infiltrator, hero], infiltrator.id);
      const infCu = state.units.get(infiltrator.id)!;
      (infCu as { abilities: readonly any[] }).abilities = [SMOKE_VEIL];

      // Give infiltrator active STEALTH condition
      infCu.activeConditions.push({
        type: 'STEALTH',
        durationTurns: 1,
        sourceUnitId: infiltrator.id
      });

      const action = decideNextAction(state, infiltrator.id);
      // Since actor already has STEALTH, Smoke Veil cannot be scored or chosen
      if (action.type === 'ABILITY') {
        expect(action.ability.id).not.toBe('smoke_veil');
      }
    });

    it('asserts Smoke Veil has no artificial oncePerTurn restriction to preserve player/AI multi-action combos', () => {
      expect(SMOKE_VEIL.oncePerTurn).toBeFalsy();
    });
  });

  describe('Damaging AoE Ground Hex AI Evaluation', () => {
    it('targets an empty ground hex between multiple enemies to maximize blast splash damage', () => {
      const arena = createRadialArena(3);
      const wizard = createMockUnit('wizard', 'Enemy Wizard', 'ENEMY', {
        baseAttributes: { force: 0, finesse: 0, focus: 4 },
        activeClassId: 'wizard'
      });
      const heroA = createMockUnit('heroA', 'Hero A', 'PLAYER', { maxHp: 30 });
      const heroB = createMockUnit('heroB', 'Hero B', 'PLAYER', { maxHp: 30 });

      arena.setUnitPosition(wizard.id, { q: 0, r: 0 });
      // Two enemies positioned so that empty hex (2, 0) catches both in blast radius 1
      arena.setUnitPosition(heroA.id, { q: 2, r: -1 }); // dist 1 from (2, 0)
      arena.setUnitPosition(heroB.id, { q: 2, r: 1 });  // dist 1 from (2, 0)

      const state = createCombatState(arena, [wizard, heroA, heroB], wizard.id);
      state.units.get(heroA.id)!.facing = 3; // Facing West towards wizard
      state.units.get(heroB.id)!.facing = 3; // Facing West towards wizard
      const wizCu = state.units.get(wizard.id)!;
      // Wizard has both single-target Spark and AoE Arcane Blast
      (wizCu as { abilities: readonly any[] }).abilities = [SPARK, ARCANE_BLAST];

      const action = decideNextAction(state, wizard.id);

      expect(action.type).toBe('ABILITY');
      if (action.type === 'ABILITY') {
        expect(action.ability.id).toBe('arcane_blast');
        expect(action.target?.coord).toEqual({ q: 2, r: 0 });
      }
    });

    it('suppresses AoE blast when an ally is caught in the blast radius and chooses single-target alternative', () => {
      const arena = createRadialArena(3);
      const wizard = createMockUnit('wizard', 'Enemy Wizard', 'ENEMY', {
        baseAttributes: { force: 0, finesse: 0, focus: 4 },
        activeClassId: 'wizard'
      });
      const enemyHero = createMockUnit('hero', 'Player Hero', 'PLAYER', { maxHp: 30 });
      const allyOrc = createMockUnit('orc', 'Allied Orc', 'ENEMY', { maxHp: 30 });

      arena.setUnitPosition(wizard.id, { q: 0, r: 0 });
      arena.setUnitPosition(enemyHero.id, { q: 2, r: 0 });
      // Allied Orc is caught in blast radius 1 of enemyHero
      arena.setUnitPosition(allyOrc.id, { q: 2, r: 1 });

      const state = createCombatState(arena, [wizard, enemyHero, allyOrc], wizard.id);
      const wizCu = state.units.get(wizard.id)!;
      // Wizard has single-target Spark and AoE Arcane Blast
      (wizCu as { abilities: readonly any[] }).abilities = [SPARK, ARCANE_BLAST];

      const action = decideNextAction(state, wizard.id);

      // With ally caught, Arcane Blast incurs -25 friendly fire penalty, so AI should select SPARK instead
      expect(action.type).toBe('ABILITY');
      if (action.type === 'ABILITY') {
        expect(action.ability.id).toBe('spark');
        expect(action.target?.targetUnitId).toBe(enemyHero.id);
      }
    });
  });

  describe('AI Threat Scoring, Tactical Movement Denial, and High-Ground Disruption (Change ai-threat-and-tactical-disruption)', () => {
    describe('Hostile Movement Denial (SLOW) & Non-Redundancy', () => {
      it('scores positive utility for Frostbite SLOW against mobile target with Move >= 2', () => {
        const arena = createRadialArena(3);
        const mage = createMockUnit('mage', 'Hostile Mage', 'ENEMY', {
          baseAttributes: { force: 0, finesse: 0, focus: 4 },
          activeClassId: 'wizard'
        });
        const target = createMockUnit('hero', 'Player Hero', 'PLAYER', { move: 3 });

        arena.setUnitPosition(mage.id, { q: 0, r: 0 });
        arena.setUnitPosition(target.id, { q: 1, r: 0 });

        const state = createCombatState(arena, [mage, target], mage.id);
        const mageCu = state.units.get(mage.id)!;
        const targetCu = state.units.get(target.id)!;

        const utility = scoreDebuffAndUtility(mageCu, targetCu, FROSTBITE, { q: 0, r: 0 }, { q: 1, r: 0 }, state, 'SNIPER');
        expect(utility.score).toBeGreaterThanOrEqual(6.0);
        expect(utility.reason).toContain('Impair target Move (-1 Move)');
      });

      it('awards kiting utility bonus when applying SLOW to advancing melee BRAWLER at distance >= 2', () => {
        const arena = createRadialArena(3);
        const mage = createMockUnit('mage', 'Hostile Mage', 'ENEMY', {
          baseAttributes: { force: 0, finesse: 0, focus: 4 },
          activeClassId: 'wizard'
        });
        const brawler = createMockUnit('warrior', 'Player Warrior', 'PLAYER', {
          activeClassId: 'warrior',
          move: 3
        });

        arena.setUnitPosition(mage.id, { q: 0, r: 0 });
        arena.setUnitPosition(brawler.id, { q: 2, r: 0 });

        const state = createCombatState(arena, [mage, brawler], mage.id);
        const mageCu = state.units.get(mage.id)!;
        const brawlerCu = state.units.get(brawler.id)!;

        const utility = scoreDebuffAndUtility(mageCu, brawlerCu, FROSTBITE, { q: 0, r: 0 }, { q: 2, r: 0 }, state, 'SNIPER');
        expect(utility.score).toBeGreaterThanOrEqual(10.0);
        expect(utility.reason).toContain('Kite advancing melee threat');
      });

      it('suppresses SLOW utility when target already has an active negative Move modifier', () => {
        const arena = createRadialArena(3);
        const mage = createMockUnit('mage', 'Hostile Mage', 'ENEMY', {
          baseAttributes: { force: 0, finesse: 0, focus: 4 },
          activeClassId: 'wizard'
        });
        const target = createMockUnit('hero', 'Player Hero', 'PLAYER', { move: 3 });

        arena.setUnitPosition(mage.id, { q: 0, r: 0 });
        arena.setUnitPosition(target.id, { q: 2, r: 0 });

        const state = createCombatState(arena, [mage, target], mage.id);
        const mageCu = state.units.get(mage.id)!;
        const targetCu = state.units.get(target.id)!;

        targetCu.activeModifiers.push({
          stat: 'move',
          value: -1,
          durationTurns: 1
        });

        const utility = scoreDebuffAndUtility(mageCu, targetCu, FROSTBITE, { q: 0, r: 0 }, { q: 2, r: 0 }, state, 'SNIPER');
        expect(utility.score).toBe(0);
        expect(utility.reason).toBeUndefined();
      });

      it('universal non-redundancy guard suppresses non-damaging slow on already slowed target', () => {
        const arena = createRadialArena(3);
        const actor = createMockUnit('actor', 'Hostile Actor', 'ENEMY');
        const target = createMockUnit('hero', 'Player Hero', 'PLAYER', { move: 3 });

        arena.setUnitPosition(actor.id, { q: 0, r: 0 });
        arena.setUnitPosition(target.id, { q: 1, r: 0 });

        const state = createCombatState(arena, [actor, target], actor.id);
        const actorCu = state.units.get(actor.id)!;
        const targetCu = state.units.get(target.id)!;

        targetCu.activeModifiers.push({
          stat: 'move',
          value: -1,
          durationTurns: 1
        });

        const nonDamagingSlowAbility = {
          ...FROSTBITE,
          id: 'mud_trap',
          name: 'Mud Trap',
          damageType: 'NONE' as const,
          effects: [{ type: 'SLOW' as const, magnitude: 1, durationTurns: 1 }]
        };

        const utility = scoreDebuffAndUtility(actorCu, targetCu, nonDamagingSlowAbility, { q: 0, r: 0 }, { q: 1, r: 0 }, state, 'SUPPORT');
        expect(utility.score).toBe(0);
      });
    });

    describe('High-Ground Disruption & Knockback Cliff Plunge', () => {
      it('awards cliff plunge fall damage utility when knockback pushes target down a ledge (dh <= -2)', () => {
        const arena = createRadialArena(3);
        arena.setTile({ coord: { q: 1, r: 0 }, elevation: 2, isWalkable: true });
        arena.setTile({ coord: { q: 2, r: 0 }, elevation: 0, isWalkable: true });

        const warlock = createMockUnit('warlock', 'Hostile Warlock', 'ENEMY', {
          baseAttributes: { force: 0, finesse: 0, focus: 4 },
          activeClassId: 'warlock'
        });
        const target = createMockUnit('hero', 'Player Hero', 'PLAYER', { maxHp: 40 });

        arena.setUnitPosition(warlock.id, { q: 0, r: 0 });
        arena.setUnitPosition(target.id, { q: 1, r: 0 });

        const state = createCombatState(arena, [warlock, target], warlock.id);
        const warlockCu = state.units.get(warlock.id)!;
        const targetCu = state.units.get(target.id)!;

        const utility = scoreDebuffAndUtility(warlockCu, targetCu, ELDRITCH_BLAST, { q: 0, r: 0 }, { q: 1, r: 0 }, state, 'SNIPER');
        expect(utility.score).toBeGreaterThanOrEqual(14.0);
        expect(utility.reason).toContain('Cliff plunge fall damage hazard');
      });

      it('awards vantage disruption utility when knockback shoves an elevated target down from high ground', () => {
        const arena = createRadialArena(3);
        arena.setTile({ coord: { q: 0, r: 0 }, elevation: 0, isWalkable: true });
        arena.setTile({ coord: { q: 1, r: 0 }, elevation: 1, isWalkable: true }); // Target on high ground (+1)
        arena.setTile({ coord: { q: 2, r: 0 }, elevation: 0, isWalkable: true }); // Destination pushed down to 0

        const warlock = createMockUnit('warlock', 'Hostile Warlock', 'ENEMY', {
          baseAttributes: { force: 0, finesse: 0, focus: 4 },
          activeClassId: 'warlock'
        });
        const target = createMockUnit('hero', 'Player Hero', 'PLAYER', { maxHp: 40 });

        arena.setUnitPosition(warlock.id, { q: 0, r: 0 });
        arena.setUnitPosition(target.id, { q: 1, r: 0 });

        const state = createCombatState(arena, [warlock, target], warlock.id);
        const warlockCu = state.units.get(warlock.id)!;
        const targetCu = state.units.get(target.id)!;

        const utility = scoreDebuffAndUtility(warlockCu, targetCu, ELDRITCH_BLAST, { q: 0, r: 0 }, { q: 1, r: 0 }, state, 'SNIPER');
        expect(utility.score).toBeGreaterThanOrEqual(6.0);
        expect(utility.reason).toContain('Disrupt high-ground vantage');
      });
    });

    describe('Archetype Threat Weighting & Decision Engine Integration', () => {
      it('scoreTargetThreat maps archetype weights correctly', () => {
        const sniper = createMockUnit('sniper', 'Warlock Sniper', 'PLAYER', { activeClassId: 'warlock' });
        const support = createMockUnit('support', 'Witch Support', 'PLAYER', { activeClassId: 'witch' });
        const skirmisher = createMockUnit('skirmisher', 'Highwayman Skirmisher', 'PLAYER', { activeClassId: 'highwayman' });
        const brawler = createMockUnit('brawler', 'Warrior Brawler', 'PLAYER', { activeClassId: 'warrior' });

        const arena = createRadialArena(3);
        const state = createCombatState(arena, [sniper, support, skirmisher, brawler], sniper.id);

        expect(scoreTargetThreat(state.units.get(sniper.id)!).score).toBe(10.0);
        expect(scoreTargetThreat(state.units.get(support.id)!).score).toBe(8.0);
        expect(scoreTargetThreat(state.units.get(skirmisher.id)!).score).toBe(4.0);
        expect(scoreTargetThreat(state.units.get(brawler.id)!).score).toBe(0);
      });

      it('AI attacker prioritizes elevated Warlock (SNIPER) over frontline Warrior (BRAWLER) despite low-ground Disadvantage', () => {
        const arena = createRadialArena(3);
        arena.setTile({ coord: { q: 0, r: 0 }, elevation: 0, isWalkable: true });
        arena.setTile({ coord: { q: 2, r: 0 }, elevation: 0, isWalkable: true }); // Warrior on flat ground
        arena.setTile({ coord: { q: 0, r: 2 }, elevation: 2, isWalkable: true }); // Warlock on high ground (+2 delta, imposes Disadvantage)

        const attacker = createMockUnit('attacker', 'Enemy Mage', 'ENEMY', {
          baseAttributes: { force: 0, finesse: 0, focus: 4 },
          activeClassId: 'wizard',
          starterAbilityIds: ['spark']
        });
        const warrior = createMockUnit('warrior', 'Player Warrior', 'PLAYER', {
          activeClassId: 'warrior',
          maxHp: 50,
          ward: 2
        });
        const warlock = createMockUnit('warlock', 'Player Warlock', 'PLAYER', {
          activeClassId: 'warlock',
          maxHp: 50,
          ward: 0
        });

        arena.setUnitPosition(attacker.id, { q: 0, r: 0 });
        arena.setUnitPosition(warrior.id, { q: 2, r: 0 });
        arena.setUnitPosition(warlock.id, { q: 0, r: 2 });

        const state = createCombatState(arena, [attacker, warrior, warlock], attacker.id);
        const attCu = state.units.get(attacker.id)!;
        (attCu as { abilities: readonly any[] }).abilities = [SPARK];
        state.units.get(warrior.id)!.facing = getDirectionBetween({ q: 2, r: 0 }, { q: 0, r: 0 });
        state.units.get(warlock.id)!.facing = getDirectionBetween({ q: 0, r: 2 }, { q: 0, r: 0 });

        const action = decideNextAction(state, attacker.id);
        expect(action.type).toBe('ABILITY');
        if (action.type === 'ABILITY') {
          expect(action.target?.targetUnitId).toBe(warlock.id);
          expect(action.reason).toContain('High threat sniper/caster');
        }
      });

      it('repositioning attack factors in target threat weighting in move-and-act evaluation', () => {
        const arena = createRadialArena(3);
        const attacker = createMockUnit('attacker', 'Enemy Mage', 'ENEMY', {
          baseAttributes: { force: 0, finesse: 0, focus: 4 },
          activeClassId: 'wizard',
          starterAbilityIds: ['spark']
        });
        const warrior = createMockUnit('warrior', 'Player Warrior', 'PLAYER', {
          activeClassId: 'warrior',
          maxHp: 50
        });
        const warlock = createMockUnit('warlock', 'Player Warlock', 'PLAYER', {
          activeClassId: 'warlock',
          maxHp: 50
        });

        arena.setUnitPosition(attacker.id, { q: 0, r: 0 });
        arena.setUnitPosition(warrior.id, { q: 0, r: 1 });
        arena.setUnitPosition(warlock.id, { q: 3, r: 0 });

        const state = createCombatState(arena, [attacker, warrior, warlock], attacker.id);
        const attCu = state.units.get(attacker.id)!;
        attCu.currentAp = 2; // Enough to move 1 hex and cast Spark (1 AP move + 1 AP Spark)
        (attCu as { abilities: readonly any[] }).abilities = [SPARK];

        const action = decideNextAction(state, attacker.id);
        expect(action.type).toBe('MOVE');
        if (action.type === 'MOVE') {
          expect(action.destination.q).toBeGreaterThan(0);
          expect(action.reason).toContain('Player Warlock');
          expect(action.reason).toContain('High threat sniper/caster');
        }
      });

      it('prioritizes attacking the challenger over non-challenger to avoid EXPOSED retaliation', () => {
        const arena = createRadialArena(3);
        const enemy = createMockUnit('enemy-1', 'Orc Fighter', 'ENEMY', {
          baseAttributes: { force: 3, finesse: 3, focus: 0 }
        });
        const knight = createMockUnit('knight-1', 'Knight', 'PLAYER', {
          activeClassId: 'knight',
          armor: 2,
          maxHp: 30
        });
        const wizard = createMockUnit('wizard-1', 'Wizard', 'PLAYER', {
          activeClassId: 'wizard',
          armor: 0,
          maxHp: 30
        });

        arena.setUnitPosition(enemy.id, { q: 0, r: 0 });
        arena.setUnitPosition(knight.id, { q: 1, r: 0 });
        arena.setUnitPosition(wizard.id, { q: 0, r: 1 });

        const state = createCombatState(arena, [enemy, knight, wizard], enemy.id);
        const enemyCu = state.units.get(enemy.id)!;
        (enemyCu as { abilities: readonly any[] }).abilities = [STRIKE];

        // Enemy is challenged by the Knight
        enemyCu.activeConditions.push({
          type: 'CHALLENGED',
          durationTurns: 2,
          sourceUnitId: knight.id
        });

        const action = decideNextAction(state, enemy.id);

        expect(action.type).toBe('ABILITY');
        if (action.type === 'ABILITY') {
          // Despite wizard having 0 armor and high threat, enemy attacks Knight to avoid defiance penalty and EXPOSED
          expect(action.target?.targetUnitId).toBe(knight.id);
        }
      });
    });
  });
});


