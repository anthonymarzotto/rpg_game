import { describe, it, expect } from 'vitest';
import { runSquadSimulation, formatSquadSimulationReport } from './squadSimulation';

describe('Normalized Squad Combat Benchmarks (Level-4 Parity)', () => {
  it('runs 100 randomized Level-4 normalized 3v3 matches with full telemetry', () => {
    const result = runSquadSimulation({
      matches: 100,
      maxTurnsPerMatch: 80,
      arenaRadius: 4,
      enableElevationTopography: true,
      normalizedLevel: 4,
      baseSeed: 991122
    });

    const report = formatSquadSimulationReport(
      result,
      'NORMALIZED SQUAD COMBAT BENCHMARK REPORT (Level 4 Parity / Archetype-Weighted Stats)'
    );
    console.log('\n' + report + '\n');

    expect(result.totalMatches).toBe(100);
    expect(result.teamAWins + result.teamBWins + result.timeouts).toBe(100);
  }, 60000);
});
