import { describe, it, expect } from 'vitest';
import {
  assembleEnemySquad,
  getDeploymentZones,
  generateArenaTerrain
} from './encounterGenerator';
import { createSimulatedCombatant } from '../combat/simulation';
import { buildEncounterState, EncounterDefinition, PlacedUnit } from '../combat/encounter';
import { decideNextActionWithTrace, executeAiAction } from '../ai/decisionEngine';
import { endActiveTurn } from '../combat/turnClock';
import { SeededDiceRoller } from '../combat/dice';
import { createRng } from '../prng';
import { HEX_DIRECTIONS } from '../grid/hex';

describe('Procedural Threat Encounter Playtest (~150 Threat)', () => {
  it('assembles a balanced 4 to 5 unit enemy squad at 150 threat budget', () => {
    const seeds = [101, 202, 303, 404, 505, 606, 707, 808];
    const unitCounts: number[] = [];
    let tier4Count = 0;

    for (const seed of seeds) {
      const rng = createRng(seed);
      const squad = assembleEnemySquad(150, 5, rng);

      unitCounts.push(squad.length);
      expect(squad.length).toBeGreaterThanOrEqual(3);
      expect(squad.length).toBeLessThanOrEqual(6);

      const hasTier4 = squad.some(
        (u) => u.loadout?.activeClassId === 'shield-bearer' || u.loadout?.activeClassId === 'dragoon'
      );
      if (hasTier4) {
        tier4Count++;
      }
    }

    // Over multiple seeds, 4-5 unit squads are generated and Tier 4 units appear
    expect(unitCounts.some((cnt) => cnt === 4 || cnt === 5)).toBe(true);
    expect(tier4Count).toBeGreaterThan(0);
  });

  it('runs automated combat simulation for 150-threat encounters against a player vanguard', () => {
    // Player vanguard squad of 3 promoted units (Level 3, approx 120-140 threat)
    const playerSquad = [
      createSimulatedCombatant({ classId: 'warrior', normalizedLevel: 3 }, 'PLAYER', 'P1'),
      createSimulatedCombatant({ classId: 'cavalier', normalizedLevel: 3 }, 'PLAYER', 'P2'),
      createSimulatedCombatant({ classId: 'witch', normalizedLevel: 3 }, 'PLAYER', 'P3')
    ];

    let playerWins = 0;
    let enemyWins = 0;
    let timeouts = 0;
    const trials = 10;

    for (let t = 0; t < trials; t++) {
      const seed = 54321 + t * 97;
      const rng = createRng(seed);
      const enemies = assembleEnemySquad(150, 5, rng);

      expect(enemies.length).toBeGreaterThanOrEqual(3);
      expect(enemies.length).toBeLessThanOrEqual(6);

      const totalUnits = playerSquad.length + enemies.length;
      const radius = totalUnits >= 7 ? 5 : 4;
      const { playerCoords, enemyCoords } = getDeploymentZones(radius);
      const tileOverrides = generateArenaTerrain(radius, playerCoords, enemyCoords, rng);

      const placedUnits: PlacedUnit[] = [
        ...playerSquad.map((unit, idx) => ({
          unit: { ...unit, faction: 'PLAYER' as const },
          coord: playerCoords[idx],
          facing: HEX_DIRECTIONS.EAST
        })),
        ...enemies.map((unit, idx) => ({
          unit,
          coord: enemyCoords[idx],
          facing: HEX_DIRECTIONS.WEST
        }))
      ];

      const encounter: EncounterDefinition = {
        id: `playtest-150-threat-${seed}`,
        name: `150-Threat Trial ${t + 1}`,
        arenaRadius: radius,
        tileOverrides,
        units: placedUnits,
        objectives: [
          {
            id: 'rout_enemies',
            description: 'Defeat all hostile combatants',
            condition: { kind: 'FACTION_DEFEATED', faction: 'ENEMY' }
          }
        ]
      };

      const diceRoller = new SeededDiceRoller(seed);
      const state = buildEncounterState(encounter, diceRoller);

      let turns = 0;
      const maxTurns = 80;

      while (state.outcome === 'IN_PROGRESS' && turns < maxTurns) {
        turns++;
        const activeId = state.activeUnitId;
        const cu = state.units.get(activeId);
        if (!cu || cu.isDefeated || cu.currentHp <= 0) {
          continue;
        }

        let steps = 0;
        while (steps < 10) {
          steps++;
          if (!cu || cu.isDefeated || cu.currentAp <= 0 || state.activeUnitId !== activeId || state.outcome !== 'IN_PROGRESS') {
            break;
          }

          const { action } = decideNextActionWithTrace(state, activeId, { diceRoller });
          if (action.type === 'CONSERVE_AP') {
            break;
          }

          executeAiAction(state, activeId, action, diceRoller);
        }

        if (state.activeUnitId === activeId && state.outcome === 'IN_PROGRESS') {
          endActiveTurn(state);
        }
      }

      if (state.outcome === 'VICTORY') {
        playerWins++;
      } else if (state.outcome === 'DEFEAT') {
        enemyWins++;
      } else {
        timeouts++;
      }
    }

    expect(playerWins + enemyWins + timeouts).toBe(trials);
    expect(timeouts).toBeLessThanOrEqual(2);
  });
});
