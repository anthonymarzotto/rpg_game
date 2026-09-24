import { describe, it, expect } from 'vitest';
import { Unit } from '../types/unit';
import { createRadialArena } from '../grid/templates';
import { createCombatState } from '../combat/resolver';
import { HEX_DIRECTIONS, getDirectionBetween } from '../grid/hex';
import { decideNextAction, executeAiTurn, executeAiAction } from './decisionEngine';
import { SeededDiceRoller } from '../combat/dice';
import { STRIKE } from '../../data/packages/novice';

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
      constellation: []
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
});
