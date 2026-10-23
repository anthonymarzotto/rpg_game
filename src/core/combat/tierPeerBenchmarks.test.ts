import { describe, it } from 'vitest';
import { runCombatSimulation, SimulationResult } from './simulation';

interface TierClassInfo {
  classId: string;
  name: string;
  tier: number;
}

const TIER_1_CLASSES: TierClassInfo[] = [
  { classId: 'warrior', name: 'Warrior', tier: 1 },
  { classId: 'thief', name: 'Thief', tier: 1 },
  { classId: 'wizard', name: 'Wizard', tier: 1 }
];

const TIER_2_CLASSES: TierClassInfo[] = [
  { classId: 'knight', name: 'Knight', tier: 2 },
  { classId: 'infiltrator', name: 'Infiltrator', tier: 2 },
  { classId: 'sorcerer', name: 'Sorcerer', tier: 2 }
];

const TIER_3_CLASSES: TierClassInfo[] = [
  { classId: 'cavalier', name: 'Cavalier', tier: 3 },
  { classId: 'berserker', name: 'Berserker', tier: 3 },
  { classId: 'highwayman', name: 'Highwayman', tier: 3 },
  { classId: 'cat-burglar', name: 'Cat-Burglar', tier: 3 },
  { classId: 'warlock', name: 'Warlock', tier: 3 },
  { classId: 'witch', name: 'Witch', tier: 3 }
];

function runTierBenchmarks(tierName: string, classes: TierClassInfo[], trials = 25) {
  console.log(`\n================================================================================`);
  console.log(`BENCHMARK SUITE: ${tierName.toUpperCase()} (Trials per matchup: ${trials})`);
  console.log(`================================================================================\n`);

  const results: { a: TierClassInfo; b: TierClassInfo; res: SimulationResult }[] = [];
  const classStats: Record<
    string,
    { name: string; wins: number; matches: number; totalTrials: number; totalDmg: number; totalTurns: number }
  > = {};

  for (const c of classes) {
    classStats[c.classId] = {
      name: c.name,
      wins: 0,
      matches: 0,
      totalTrials: 0,
      totalDmg: 0,
      totalTurns: 0
    };
  }

  // Run all unique pairs
  for (let i = 0; i < classes.length; i++) {
    for (let j = i + 1; j < classes.length; j++) {
      const clsA = classes[i];
      const clsB = classes[j];

      const res = runCombatSimulation({
        combatantA: { classId: clsA.classId, name: clsA.name },
        combatantB: { classId: clsB.classId, name: clsB.name },
        trials,
        maxTurnsPerTrial: 80,
        alternateFactions: true,
        baseSeed: 54321 + i * 100 + j * 10
      });

      results.push({ a: clsA, b: clsB, res });

      classStats[clsA.classId].wins += res.combatantA.wins;
      classStats[clsA.classId].totalTrials += trials;
      classStats[clsA.classId].totalDmg += res.combatantA.totalDamageDealt;
      classStats[clsA.classId].totalTurns += res.combatantA.totalTurns;

      classStats[clsB.classId].wins += res.combatantB.wins;
      classStats[clsB.classId].totalTrials += trials;
      classStats[clsB.classId].totalDmg += res.combatantB.totalDamageDealt;
      classStats[clsB.classId].totalTurns += res.combatantB.totalTurns;
    }
  }

  // Print Matchup Matrix / Table
  console.log(`--- MATCHUP RESULTS ---`);
  for (const { a, b, res } of results) {
    const cA = res.combatantA;
    const cB = res.combatantB;
    console.log(
      `${a.name.padEnd(14)} vs ${b.name.padEnd(14)} | ${cA.wins.toString().padStart(2)} - ${cB.wins
        .toString()
        .padStart(2)} (Timeouts: ${res.timeouts}) | Avg Turns: ${res.avgTurnsPerTrial.toFixed(
        1
      )} | Win Rate: ${cA.name} ${(cA.winRatePercent).toFixed(1)}% vs ${cB.name} ${(cB.winRatePercent).toFixed(1)}%`
    );
    const formatAbilities = (usages: Readonly<Record<string, number>>) =>
      Object.entries(usages)
        .sort((x, y) => y[1] - x[1])
        .map(([id, n]) => `${id}: ${n}`)
        .join(', ');
    console.log(`   ${a.name} abilities: ${formatAbilities(cA.abilityUsages)}`);
    console.log(`   ${b.name} abilities: ${formatAbilities(cB.abilityUsages)}`);
  }

  console.log(`\n--- ${tierName.toUpperCase()} OVERALL LEADERBOARD ---`);
  const ranked = Object.entries(classStats)
    .map(([id, s]) => ({
      id,
      name: s.name,
      winRate: s.totalTrials > 0 ? (s.wins / s.totalTrials) * 100 : 0,
      wins: s.wins,
      trials: s.totalTrials,
      avgDmg: s.totalTrials > 0 ? s.totalDmg / s.totalTrials : 0,
      avgTurns: s.totalTrials > 0 ? s.totalTurns / s.totalTrials : 0
    }))
    .sort((x, y) => y.winRate - x.winRate);

  for (const r of ranked) {
    console.log(
      `${r.name.padEnd(14)} | Win Rate: ${r.winRate.toFixed(1)}% (${r.wins}/${
        r.trials
      }) | Avg Dmg: ${r.avgDmg.toFixed(1)} | Avg Turns/Trial: ${r.avgTurns.toFixed(1)}`
    );
  }
  console.log(`\n`);

  return { results, ranked };
}

describe('Tier Peer Benchmarks', () => {
  it('runs 25 trials for Tier 1 peers', () => {
    runTierBenchmarks('Tier 1', TIER_1_CLASSES, 25);
  });

  it('runs 25 trials for Tier 2 peers', () => {
    runTierBenchmarks('Tier 2', TIER_2_CLASSES, 25);
  });

  it('runs 25 trials for Tier 3 peers', () => {
    runTierBenchmarks('Tier 3', TIER_3_CLASSES, 25);
  }, 30000);
});
