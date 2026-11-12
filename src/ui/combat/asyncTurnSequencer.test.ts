import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Unit } from '../../core/types/unit';
import { createRadialArena } from '../../core/grid/templates';
import { createCombatState } from '../../core/combat/resolver';
import { SeededDiceRoller } from '../../core/combat/dice';
import { calculateTurnTransitionTicks } from '../../core/combat/turnClock';
import {
  executeHostileTurnAsync,
  formatActionDescription,
  delayWithAbort,
  calculateClockPacing,
  PACING_PRESETS,
  CombatExecutionObserver
} from './asyncTurnSequencer';
import * as aiModule from '../../core/ai';

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
      constellation: [],
      milestoneSelections: {}
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

    it('awaits async onActionResolved promises before advancing to next step (UX.19)', async () => {
      const arena = createRadialArena(3);
      const enemy = createMockCombatUnit('enemy', 'Orc', 'ENEMY', { speed: 8 });
      const hero = createMockCombatUnit('hero', 'Alden', 'PLAYER', { maxHp: 40, speed: 12 });
      arena.setUnitPosition(enemy.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero.id, { q: 1, r: 0 });
      const state = createCombatState(arena, [enemy, hero], enemy.id);

      let resolveGate: (() => void) | null = null;
      let turnDone = false;

      const observer: CombatExecutionObserver = {
        onActionResolved: () => {
          if (!resolveGate) {
            return new Promise<void>((res) => {
              resolveGate = res;
            });
          }
        },
        onTurnCompleted: () => {
          turnDone = true;
        }
      };

      const promise = executeHostileTurnAsync(
        state,
        enemy.id,
        PACING_PRESETS.INSTANT,
        observer,
        undefined,
        new SeededDiceRoller(42)
      );

      await vi.advanceTimersByTimeAsync(0);
      expect(resolveGate).not.toBeNull();
      expect(turnDone).toBe(false);

      resolveGate!();
      await promise;
      expect(turnDone).toBe(true);
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

      // Finish step 2's post-action delay (600ms) and clock advancement pacing (1000ms) to conclude turn
      await vi.advanceTimersByTimeAsync(600);
      await vi.advanceTimersByTimeAsync(1000);

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

    it('pre-validates MOVE and falls back to AP banking on invalid destination, logging fault and triggering callbacks', async () => {
      const arena = createRadialArena(3);
      const enemy = createMockCombatUnit('enemy', 'Orc', 'ENEMY', { speed: 8 });
      const hero = createMockCombatUnit('hero', 'Alden', 'PLAYER', { maxHp: 40, speed: 50 });
      arena.setUnitPosition(enemy.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero.id, { q: 2, r: 0 });
      const state = createCombatState(arena, [enemy, hero], enemy.id);
      const initialTurnNumber = state.turnNumber;

      // Mock decideNextAction to propose an illegal move out of arena bounds / unreachable hex
      const decideSpy = vi.spyOn(aiModule, 'decideNextAction').mockReturnValue({
        type: 'MOVE',
        destination: { q: 10, r: 10 }, // completely off arena
        score: 10,
        reason: 'illegal move'
      });
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      let faultReported: { reason: string } | null = null;
      let completedUnspentAp: number | null = null;

      const observer: CombatExecutionObserver = {
        onActionFault: (_actor, _action, reason) => {
          faultReported = { reason };
        },
        onTurnCompleted: (_actor, unspentAp) => {
          completedUnspentAp = unspentAp;
        }
      };

      await executeHostileTurnAsync(
        state,
        enemy.id,
        PACING_PRESETS.INSTANT,
        observer,
        undefined,
        new SeededDiceRoller(42)
      );

      // Fault must be reported
      expect(faultReported).not.toBeNull();
      expect(faultReported!.reason).toContain('not reachable');

      // Diagnostic entry must exist in state.combatLog
      const faultLog = state.combatLog.find((entry) => entry.actionId === 'ai_fault');
      expect(faultLog).toBeDefined();
      expect(faultLog!.message).toContain('⚠️ [AI Fault]');
      expect(faultLog!.metadata.type).toBe('GENERIC');

      // Unspent AP (3 AP) was banked and CTB recovery applied cleanly
      expect(completedUnspentAp).toBe(3);
      // Faster hero takes next turn
      expect(state.activeUnitId).toBe(hero.id);
      expect(state.units.get(enemy.id)!.currentAp).toBe(0);
      expect(state.turnNumber).toBe(initialTurnNumber + 1);

      decideSpy.mockRestore();
      warnSpy.mockRestore();
    });

    it('pre-validates ABILITY and falls back to AP banking on uncastable ability, logging fault and concluding turn', async () => {
      const arena = createRadialArena(3);
      const enemy = createMockCombatUnit('enemy', 'Orc', 'ENEMY', { speed: 8 });
      const hero = createMockCombatUnit('hero', 'Alden', 'PLAYER', { maxHp: 40, speed: 50 });
      arena.setUnitPosition(enemy.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero.id, { q: 2, r: 0 }); // Hero is 2 hexes away, out of range for melee Strike (range 1)
      const state = createCombatState(arena, [enemy, hero], enemy.id);
      const enemyCu = state.units.get(enemy.id)!;
      const initialTurnNumber = state.turnNumber;

      // Mock decideNextAction to propose Strike against the out-of-range hero
      const decideSpy = vi.spyOn(aiModule, 'decideNextAction').mockReturnValue({
        type: 'ABILITY',
        ability: enemyCu.abilities[0], // Strike (range 1)
        target: { coord: { q: 2, r: 0 }, targetUnitId: hero.id },
        score: 15,
        reason: 'out of range strike'
      });
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      let faultReported: { reason: string } | null = null;
      let turnCompleted = false;

      const observer: CombatExecutionObserver = {
        onActionFault: (_actor, _action, reason) => {
          faultReported = { reason };
        },
        onTurnCompleted: () => {
          turnCompleted = true;
        }
      };

      await executeHostileTurnAsync(
        state,
        enemy.id,
        PACING_PRESETS.INSTANT,
        observer,
        undefined,
        new SeededDiceRoller(42)
      );

      expect(faultReported).not.toBeNull();
      expect(turnCompleted).toBe(true);

      const faultLog = state.combatLog.find((entry) => entry.actionId === 'ai_fault');
      expect(faultLog).toBeDefined();
      expect(faultLog!.message).toContain('out of range');

      // Turn concluded cleanly and advanced to hero
      expect(state.turnNumber).toBe(initialTurnNumber + 1);
      expect(state.activeUnitId).toBe(hero.id);
      expect(state.units.get(enemy.id)!.currentAp).toBe(0);

      decideSpy.mockRestore();
      warnSpy.mockRestore();
    });

    it('catches execution error from executeAiAction, logs fault, and guarantees endActiveTurn in finally', async () => {
      const arena = createRadialArena(3);
      const enemy = createMockCombatUnit('enemy', 'Orc', 'ENEMY');
      const hero = createMockCombatUnit('hero', 'Alden', 'PLAYER', { maxHp: 40 });
      arena.setUnitPosition(enemy.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero.id, { q: 1, r: 0 });
      const state = createCombatState(arena, [enemy, hero], enemy.id);
      const initialTurnNumber = state.turnNumber;

      const executeSpy = vi.spyOn(aiModule, 'executeAiAction').mockImplementationOnce(() => {
        throw new Error('Simulation crash during action resolution');
      });
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      let completedCalled = false;
      const observer: CombatExecutionObserver = {
        onTurnCompleted: () => {
          completedCalled = true;
        }
      };

      await executeHostileTurnAsync(
        state,
        enemy.id,
        PACING_PRESETS.INSTANT,
        observer,
        undefined,
        new SeededDiceRoller(42)
      );

      expect(completedCalled).toBe(true);
      expect(state.turnNumber).toBe(initialTurnNumber + 1);

      const faultLog = state.combatLog.find((entry) => entry.actionId === 'ai_fault');
      expect(faultLog).toBeDefined();
      expect(faultLog!.message).toContain('Simulation crash during action resolution');

      executeSpy.mockRestore();
      warnSpy.mockRestore();
    });

    it('Task 4.1: records AI decision traces and captures faultReason in state.aiDecisionLog', async () => {
      const arena = createRadialArena(3);
      const enemy = createMockCombatUnit('enemy', 'Hostile Scout', 'ENEMY', {
        maxHp: 30
      });
      const hero = createMockCombatUnit('hero', 'Alden', 'PLAYER', { maxHp: 40 });
      arena.setUnitPosition(enemy.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero.id, { q: 1, r: 0 });
      const state = createCombatState(arena, [enemy, hero], enemy.id);

      expect(state.aiDecisionLog).toBeDefined();

      await executeHostileTurnAsync(
        state,
        enemy.id,
        PACING_PRESETS.INSTANT,
        {},
        undefined,
        new SeededDiceRoller(42)
      );

      expect(state.aiDecisionLog!.length).toBeGreaterThan(0);
      const firstTrace = state.aiDecisionLog![0];
      expect(firstTrace.actorUnitId).toBe(enemy.id);
      expect(firstTrace.chosenAction).toBeDefined();
      expect(firstTrace.topCandidates.length).toBeGreaterThan(0);
    });

    it('calculates turn transition ticks correctly', () => {
      const arena = createRadialArena(3);
      const enemy = createMockCombatUnit('enemy', 'Orc', 'ENEMY', { speed: 10 });
      const hero = createMockCombatUnit('hero', 'Alden', 'PLAYER', { speed: 10 });
      arena.setUnitPosition(enemy.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero.id, { q: 1, r: 0 });
      const state = createCombatState(arena, [enemy, hero], enemy.id);

      // 1. Both units have 0 gauge -> requires ticks to reach 100
      const ticks = calculateTurnTransitionTicks(state, enemy.id, 0);
      expect(ticks).toBe(10); // 10 ticks * 10 speed = 100

      // 2. If hero already has 100 gauge -> 0 ticks (immediate transition)
      state.units.get(hero.id)!.initiativeGauge = 100;
      expect(calculateTurnTransitionTicks(state, enemy.id, 0)).toBe(0);

      // 3. If acting unit had overflow 40 and banked 3 AP (40 + 60 = 100) -> 0 ticks
      state.units.get(hero.id)!.initiativeGauge = 0;
      state.units.get(enemy.id)!.initiativeGauge = 140; // 40 overflow
      expect(calculateTurnTransitionTicks(state, enemy.id, 3)).toBe(0);
    });

    it('calculates clock pacing based on speed mode and tick count', () => {
      // 0 ticks -> 0ms duration across all speeds
      expect(calculateClockPacing(0, 'NORMAL')).toEqual({ totalDurationMs: 0, stepIntervalMs: 0 });
      expect(calculateClockPacing(0, 'FAST')).toEqual({ totalDurationMs: 0, stepIntervalMs: 0 });
      expect(calculateClockPacing(0, 'INSTANT')).toEqual({ totalDurationMs: 0, stepIntervalMs: 0 });

      // INSTANT speed always 0ms
      expect(calculateClockPacing(10, 'INSTANT')).toEqual({ totalDurationMs: 0, stepIntervalMs: 0 });

      // NORMAL: 1000ms duration, floor(1000 / 5) = 200ms step interval
      const normalPacing = calculateClockPacing(5, 'NORMAL');
      expect(normalPacing.totalDurationMs).toBe(1000);
      expect(normalPacing.stepIntervalMs).toBe(200);

      // NORMAL: clamping min interval to 50ms when ticks are high
      const highTickPacing = calculateClockPacing(50, 'NORMAL');
      expect(highTickPacing.totalDurationMs).toBe(1000);
      expect(highTickPacing.stepIntervalMs).toBe(50);

      // FAST: 300ms duration, floor(300 / 3) = 100ms step interval
      const fastPacing = calculateClockPacing(3, 'FAST');
      expect(fastPacing.totalDurationMs).toBe(300);
      expect(fastPacing.stepIntervalMs).toBe(100);
    });

    it('invokes onClockAdvancing during turn handoff when ticks > 0 and transitions immediately when ticks === 0', async () => {
      const arena = createRadialArena(3);
      const enemy = createMockCombatUnit('enemy', 'Orc', 'ENEMY', { speed: 10 });
      const hero = createMockCombatUnit('hero', 'Alden', 'PLAYER', { speed: 50 });
      arena.setUnitPosition(enemy.id, { q: 0, r: 0 });
      arena.setUnitPosition(hero.id, { q: 1, r: 0 });
      const state = createCombatState(arena, [enemy, hero], enemy.id);

      let clockAdvancingCalled = false;
      let advancedTicks = 0;
      const observer: CombatExecutionObserver = {
        onClockAdvancing: (ticks) => {
          clockAdvancingCalled = true;
          advancedTicks = ticks;
        }
      };

      // Mock decideNextAction to immediately conserve AP
      const decideSpy = vi.spyOn(aiModule, 'decideNextAction').mockReturnValue({
        type: 'CONSERVE_AP',
        score: 1,
        reason: 'done',
        unspentAp: 3
      });

      const promise = executeHostileTurnAsync(
        state,
        enemy.id,
        PACING_PRESETS.NORMAL,
        observer,
        undefined,
        new SeededDiceRoller(42)
      );

      // Initial transition delay: 400ms
      await vi.advanceTimersByTimeAsync(400);

      // Turn conservation happens, entering finally block with ticks > 0
      // onClockAdvancing is called
      expect(clockAdvancingCalled).toBe(true);
      expect(advancedTicks).toBeGreaterThan(0);

      // Advance clock advancement pacing (1000ms)
      await vi.advanceTimersByTimeAsync(1000);
      await promise;

      expect(state.activeUnitId).toBe(hero.id);

      decideSpy.mockRestore();
    });
  });
});


