import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Unit } from '../../core/types/unit';
import { createRadialArena } from '../../core/grid/templates';
import { createCombatState } from '../../core/combat/resolver';
import { SeededDiceRoller } from '../../core/combat/dice';
import {
  executeHostileTurnAsync,
  formatActionDescription,
  delayWithAbort,
  PACING_PRESETS,
  CombatExecutionObserver
} from './asyncTurnSequencer';

function createMockCombatUnit(
  id: string,
  name: string,
  faction: 'PLAYER' | 'ENEMY',
  vitals?: Partial<Unit['effectiveVitals']>
): Unit {
  return {
    id,
    name,
    gender: 'female',
    race: 'human',
    faction,
    progression: {
      unitId: id,
      currentLevel: 1,
      archetypePoints: { fighter: 1, rogue: 0, mage: 0 },
      constellation: []
    },
    baseAttributes: { force: 2, finesse: 2, focus: 2 },
    effectiveVitals: {
      maxHp: 30,
      maxAp: 3,
      speed: 10,
      move: 3,
      evasion: 10,
      resolve: 10,
      armor: 1,
      ward: 0,
      ...vitals
    },
    loadout: {
      activeClassId: faction === 'ENEMY' ? 'warrior' : 'novice',
      wildcardAbilityIds: [],
      wildcardPassiveIds: []
    },
    starterAbilityIds: ['strike']
  };
}

describe('asyncTurnSequencer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formatActionDescription', () => {
    it('formats MOVE action with coordinates', () => {
      const arena = createRadialArena(3);
      const enemy = createMockCombatUnit('orc', 'Orc Warrior', 'ENEMY');
      arena.setUnitPosition(enemy.id, { q: 0, r: 0 });
      const state = createCombatState(arena, [enemy], enemy.id);
      const cu = state.units.get(enemy.id)!;

      const desc = formatActionDescription(state, cu, {
        type: 'MOVE',
        destination: { q: 1, r: -1 },
        score: 10,
        reason: 'move'
      });
      expect(desc).toBe('Orc moves to (1, -1)');
    });

    it('formats ABILITY action with target name', () => {
      const arena = createRadialArena(3);
      const enemy = createMockCombatUnit('orc', 'Orc Warrior', 'ENEMY');
      const hero = createMockCombatUnit('hero', 'Alden Hero', 'PLAYER');
      arena.setUnitPosition(enemy.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero.id, { q: 1, r: 0 });
      const state = createCombatState(arena, [enemy, hero], enemy.id);
      const cu = state.units.get(enemy.id)!;

      const desc = formatActionDescription(state, cu, {
        type: 'ABILITY',
        ability: cu.abilities[0],
        target: { coord: { q: 1, r: 0 }, targetUnitId: hero.id },
        score: 15,
        reason: 'strike'
      });
      expect(desc).toBe(`Orc uses ${cu.abilities[0].name} on Alden Hero`);
    });

    it('formats CONSERVE_AP with unspent AP and CTB recovery', () => {
      const arena = createRadialArena(3);
      const enemy = createMockCombatUnit('orc', 'Orc Warrior', 'ENEMY');
      arena.setUnitPosition(enemy.id, { q: 0, r: 0 });
      const state = createCombatState(arena, [enemy], enemy.id);
      const cu = state.units.get(enemy.id)!;
      cu.currentAp = 2;

      const desc = formatActionDescription(state, cu, {
        type: 'CONSERVE_AP',
        unspentAp: 2,
        score: 5,
        reason: 'bank'
      });
      expect(desc).toBe('Orc banks 2 AP (+40 CTB)');
    });
  });

  describe('delayWithAbort', () => {
    it('resolves immediately when delay is 0', async () => {
      const p = delayWithAbort(0);
      await expect(p).resolves.toBeUndefined();
    });

    it('resolves after specified milliseconds', async () => {
      let resolved = false;
      delayWithAbort(300).then(() => {
        resolved = true;
      });
      expect(resolved).toBe(false);
      vi.advanceTimersByTime(299);
      expect(resolved).toBe(false);
      vi.advanceTimersByTime(1);
      await Promise.resolve(); // flush microtasks
      expect(resolved).toBe(true);
    });

    it('aborts early when AbortSignal is triggered', async () => {
      const controller = new AbortController();
      let resolved = false;
      delayWithAbort(1000, controller.signal).then(() => {
        resolved = true;
      });
      expect(resolved).toBe(false);
      controller.abort();
      await Promise.resolve(); // flush microtasks
      expect(resolved).toBe(true);
    });
  });

  describe('executeHostileTurnAsync', () => {
    it('executes hostile turn instantly under INSTANT preset', async () => {
      const arena = createRadialArena(3);
      const enemy = createMockCombatUnit('enemy', 'Orc', 'ENEMY', { speed: 8 });
      const hero = createMockCombatUnit('hero', 'Alden', 'PLAYER', { maxHp: 40, speed: 12 });
      arena.setUnitPosition(enemy.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero.id, { q: 1, r: 0 });
      const state = createCombatState(arena, [enemy, hero], enemy.id);

      const events: string[] = [];
      const observer: CombatExecutionObserver = {
        onTurnTransitionStart: () => events.push('transition-start'),
        onActionStart: (_actor, action) => events.push(`action-start:${action.type}`),
        onActionResolved: (_actor, action) => events.push(`action-resolved:${action.type}`),
        onTurnCompleted: () => events.push('turn-completed')
      };

      const roller = new SeededDiceRoller(42);
      await executeHostileTurnAsync(
        state,
        enemy.id,
        PACING_PRESETS.INSTANT,
        observer,
        undefined,
        roller
      );

      expect(events[0]).toBe('transition-start');
      expect(events).toContain('action-start:ABILITY');
      expect(events).toContain('action-resolved:ABILITY');
      expect(events[events.length - 1]).toBe('turn-completed');

      // Turn must be completed, AP spent or banked, and active unit handed off to faster hero
      const enemyCu = state.units.get(enemy.id)!;
      expect(enemyCu.currentAp).toBe(0);
      expect(state.activeUnitId).toBe(hero.id);
    });

    it('observes timing pauses under NORMAL preset', async () => {
      const arena = createRadialArena(3);
      const enemy = createMockCombatUnit('enemy', 'Orc', 'ENEMY', { speed: 8 });
      const hero = createMockCombatUnit('hero', 'Alden', 'PLAYER', { maxHp: 40, speed: 12 });
      // Enemy at (0, 0), hero at (2, 0) requires MOVE + ABILITIES (3 actions total)
      arena.setUnitPosition(enemy.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero.id, { q: 2, r: 0 });
      const state = createCombatState(arena, [enemy, hero], enemy.id);

      const resolvedActions: string[] = [];
      const observer: CombatExecutionObserver = {
        onActionResolved: (_actor, action) => resolvedActions.push(action.type)
      };

      const promise = executeHostileTurnAsync(
        state,
        enemy.id,
        PACING_PRESETS.NORMAL,
        observer,
        undefined,
        new SeededDiceRoller(42)
      );

      // Transition delay is 400ms
      await vi.advanceTimersByTimeAsync(399);
      expect(resolvedActions.length).toBe(0);

      // Transition ends (400ms) -> Step 1 (MOVE: 1 AP) executes
      await vi.advanceTimersByTimeAsync(1);
      expect(resolvedActions.length).toBe(1);
      expect(resolvedActions[0]).toBe('MOVE');

      // Step delay is 600ms -> Step 2 (Power Strike: 2 AP) executes at 400 + 600 = 1000ms
      await vi.advanceTimersByTimeAsync(600);
      expect(resolvedActions.length).toBe(2);
      expect(resolvedActions[1]).toBe('ABILITY');

      // Finish step 2's post-action delay (600ms) to conclude turn
      await vi.advanceTimersByTimeAsync(600);

      await promise;
      expect(state.units.get(enemy.id)!.currentAp).toBe(0);
      expect(state.activeUnitId).toBe(hero.id);
    });

    it('halts immediately when signal is aborted mid-sequence', async () => {
      const arena = createRadialArena(3);
      const enemy = createMockCombatUnit('enemy', 'Orc', 'ENEMY');
      const hero = createMockCombatUnit('hero', 'Alden', 'PLAYER', { maxHp: 40 });
      arena.setUnitPosition(enemy.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero.id, { q: 1, r: 0 });
      const state = createCombatState(arena, [enemy, hero], enemy.id);

      const controller = new AbortController();
      let actionsRun = 0;
      const observer: CombatExecutionObserver = {
        onActionResolved: () => {
          actionsRun++;
        }
      };

      const promise = executeHostileTurnAsync(
        state,
        enemy.id,
        PACING_PRESETS.NORMAL,
        observer,
        controller.signal,
        new SeededDiceRoller(42)
      );

      // Wait 400ms for transition -> Action 1 fires
      await vi.advanceTimersByTimeAsync(400);
      expect(actionsRun).toBe(1);

      // Abort while waiting for next step
      controller.abort();
      await vi.advanceTimersByTimeAsync(1000);
      await promise;

      // No further actions should have executed after abort
      expect(actionsRun).toBe(1);
    });
  });
});
