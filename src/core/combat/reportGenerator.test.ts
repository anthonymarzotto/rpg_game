import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { createCombatState } from './resolver';
import { Unit } from '../types/unit';
import { generateTrialMarkdownReport } from './reportGenerator';
import { AIDecisionTrace } from '../ai/types';

function createMockUnit(
  id: string,
  name: string,
  faction: 'PLAYER' | 'ENEMY',
  overrides?: Partial<Unit['effectiveVitals']>
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
      maxHp: overrides?.maxHp ?? 30,
      maxAp: overrides?.maxAp ?? 4,
      armor: overrides?.armor ?? 2,
      ward: overrides?.ward ?? 1,
      speed: overrides?.speed ?? 10,
      move: overrides?.move ?? 3,
      evasion: overrides?.evasion ?? 10,
      resolve: overrides?.resolve ?? 10
    },
    loadout: {
      activeClassId: 'novice',
      wildcardAbilityIds: [],
      wildcardPassiveIds: []
    },
    starterAbilityIds: []
  };
}

describe('reportGenerator', () => {
  it('Task 3.1: formats encounter metadata, combatants overview table, and log excerpts', () => {
    const arena = createRadialArena(3);
    const hero = createMockUnit('hero', 'Valen', 'PLAYER', { maxHp: 38 });
    const enemy = createMockUnit('enemy', 'Gorik', 'ENEMY', { maxHp: 42 });

    arena.setUnitPosition(hero.id, { q: 0, r: 0 });
    arena.setUnitPosition(enemy.id, { q: 1, r: 0 });

    const state = createCombatState(arena, [hero, enemy], enemy.id);
    state.turnNumber = 3;

    state.combatLog.push({
      turnNumber: 3,
      actorUnitId: enemy.id,
      actionId: 'strike',
      message: 'Gorik strikes Valen for 8 damage',
      metadata: { type: 'GENERIC', actor: 'Gorik', text: 'Strike' }
    });

    const report = generateTrialMarkdownReport(state, {
      encounterName: 'Trial of the Novice',
      stage: 2
    });

    expect(report).toContain('# Astral Tactics — Trial Diagnostic Report');
    expect(report).toContain('**Encounter:** Trial of the Novice | **Stage:** 2 | **Turn:** 3');
    expect(report).toContain('| Valen | PLAYER |');
    expect(report).toContain('| Gorik | ENEMY |');
    expect(report).toContain('- [Turn 3] Gorik strikes Valen for 8 damage');
  });

  it('Task 3.1: highlights runtime crashes and in-game AI action faults', () => {
    const arena = createRadialArena(3);
    const enemy = createMockUnit('enemy', 'Novice Mage', 'ENEMY');
    arena.setUnitPosition(enemy.id, { q: 0, r: 0 });
    const state = createCombatState(arena, [enemy], enemy.id);

    state.combatLog.push({
      turnNumber: 2,
      actorUnitId: enemy.id,
      actionId: 'ai_fault',
      message: '⚠️ [AI Fault] Novice Mage could not execute Arcane Blast: Target out of range.',
      metadata: { type: 'GENERIC', actor: 'Novice Mage' }
    });

    const crashError = new Error('Canvas render context detached');

    const report = generateTrialMarkdownReport(state, { error: crashError });

    expect(report).toContain('## 🚨 Runtime Crash / Exception');
    expect(report).toContain('Canvas render context detached');
    expect(report).toContain('## ⚠️ Detected AI / Action Faults');
    expect(report).toContain('Novice Mage could not execute Arcane Blast');
  });

  it('Task 3.1: formats AI decision telemetry with candidate rankings and reasons', () => {
    const arena = createRadialArena(3);
    const enemy = createMockUnit('enemy', 'Novice Warrior', 'ENEMY');
    arena.setUnitPosition(enemy.id, { q: 0, r: 0 });
    const state = createCombatState(arena, [enemy], enemy.id);

    const mockTrace: AIDecisionTrace = {
      turnNumber: 1,
      actorUnitId: enemy.id,
      actorName: 'Novice Warrior',
      profile: 'BRAWLER',
      weights: {
        killBonus: 20,
        expectedDamageWeight: 1.5,
        vulnerabilityWeight: 2,
        flankWeight: 3,
        standoffWeight: 2,
        preferredStandoffRange: 1,
        focusFireWeight: 4,
        apConservationThreshold: 5
      },
      currentAp: 3,
      chosenAction: {
        type: 'MOVE',
        destination: { q: 1, r: 0 },
        score: 18.5,
        reason: 'Move to (1, 0) — Approaching Valen'
      },
      topCandidates: [
        {
          type: 'MOVE',
          action: {
            type: 'MOVE',
            destination: { q: 1, r: 0 },
            score: 18.5,
            reason: 'Move to (1, 0) — Approaching Valen'
          },
          score: 18.5,
          reason: 'Approaching Valen',
          rank: 1
        },
        {
          type: 'CONSERVE_AP',
          action: {
            type: 'CONSERVE_AP',
            unspentAp: 3,
            score: 0,
            reason: 'Conserve AP'
          },
          score: 0,
          reason: 'Conserve AP',
          rank: 2
        }
      ],
      totalCandidatesEvaluated: 4,
      apConservationThreshold: 5,
      timestamp: Date.now()
    };

    const stateWithLog = {
      ...state,
      aiDecisionLog: [mockTrace]
    };

    const report = generateTrialMarkdownReport(stateWithLog);

    expect(report).toContain('## Recent AI Decision Telemetry');
    expect(report).toContain('### Turn 1 — Novice Warrior (Profile: BRAWLER)');
    expect(report).toContain('**Winning Action:** `MOVE` (Score: 18.5)');
    expect(report).toContain('1. **[MOVE]** Score: 18.5 — Approaching Valen');
    expect(report).toContain('2. **[CONSERVE_AP]** Score: 0 — Conserve AP');
  });
});
