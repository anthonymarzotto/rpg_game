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

  it('runs 60 randomized Level-4 normalized 6v6 matches on a Radius-5 arena with full telemetry', () => {
    const result = runSquadSimulation({
      matches: 60,
      maxTurnsPerMatch: 140,
      arenaRadius: 5,
      squadSize: 6,
      enableElevationTopography: true,
      normalizedLevel: 4,
      baseSeed: 664422
    });

    const report = formatSquadSimulationReport(
      result,
      'NORMALIZED 6v6 SQUAD COMBAT BENCHMARK REPORT (Level 4 Parity / Radius-5 Arena)'
    );
    console.log('\n' + report + '\n');

    expect(result.totalMatches).toBe(60);
    expect(result.teamAWins + result.teamBWins + result.timeouts).toBe(60);
  }, 120000);
});
