import { describe, it, expect } from 'vitest';
import { runSquadSimulation, formatSquadSimulationReport } from './squadSimulation';

describe('Squad Combat Benchmarks (3v3 Mixed Tiers)', () => {
  it('runs 100 randomized mixed-tier 3v3 matches with full telemetry', () => {
    const result = runSquadSimulation({
      matches: 100,
      maxTurnsPerMatch: 80,
      arenaRadius: 4,
      enableElevationTopography: true,
      baseSeed: 991122
    });

    const report = formatSquadSimulationReport(result);
    console.log('\n' + report + '\n');

    expect(result.totalMatches).toBe(100);
    expect(result.teamAWins + result.teamBWins + result.timeouts).toBe(100);
  }, 60000);
});
