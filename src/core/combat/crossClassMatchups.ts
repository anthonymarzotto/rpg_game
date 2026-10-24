import { runCombatSimulation, SimulationResult } from './simulation';

export interface ClassMatchupProfile {
  readonly classId: string;
  readonly name: string;
  readonly shortCode: string;
  readonly tier: number;
}

export const MATCHUP_CLASSES: readonly ClassMatchupProfile[] = [
  // Tier 1
  { classId: 'warrior', name: 'Warrior', shortCode: 'WAR', tier: 1 },
  { classId: 'thief', name: 'Thief', shortCode: 'THF', tier: 1 },
  { classId: 'wizard', name: 'Wizard', shortCode: 'WIZ', tier: 1 },
  // Tier 2
  { classId: 'knight', name: 'Knight', shortCode: 'KNT', tier: 2 },
  { classId: 'infiltrator', name: 'Infiltrator', shortCode: 'INF', tier: 2 },
  { classId: 'sorcerer', name: 'Sorcerer', shortCode: 'SOR', tier: 2 },
  // Tier 3
  { classId: 'cavalier', name: 'Cavalier', shortCode: 'CAV', tier: 3 },
  { classId: 'berserker', name: 'Berserker', shortCode: 'BRS', tier: 3 },
  { classId: 'highwayman', name: 'Highwayman', shortCode: 'HWM', tier: 3 },
  { classId: 'cat-burglar', name: 'Cat-Burglar', shortCode: 'CTB', tier: 3 },
  { classId: 'warlock', name: 'Warlock', shortCode: 'WLK', tier: 3 },
  { classId: 'witch', name: 'Witch', shortCode: 'WTC', tier: 3 }
];

export interface MatchupRecord {
  readonly classA: ClassMatchupProfile;
  readonly classB: ClassMatchupProfile;
  readonly trials: number;
  readonly winsA: number;
  readonly winsB: number;
  readonly timeouts: number;
  readonly winRateA: number;
  readonly winRateB: number;
  readonly avgTurns: number;
  readonly avgDmgA: number;
  readonly avgDmgB: number;
}

export interface ClassOverallStats {
  readonly profile: ClassMatchupProfile;
  readonly totalTrials: number;
  readonly totalWins: number;
  readonly totalLosses: number;
  readonly totalTimeouts: number;
  readonly winRatePercent: number;
  readonly matchupWins: number;
  readonly matchupLosses: number;
  readonly matchupTies: number;
  readonly totalDamage: number;
  readonly avgDamagePerTrial: number;
  readonly avgTurnsPerTrial: number;
  readonly topAbilities: readonly { id: string; count: number }[];
}

export interface CellRecord {
  readonly wins: number;
  readonly losses: number;
  readonly timeouts: number;
  readonly winRatePercent: number;
}

export interface CrossClassSimulationResult {
  readonly trialsPerMatchup: number;
  readonly totalMatchups: number;
  readonly totalDuels: number;
  readonly matchups: readonly MatchupRecord[];
  readonly leaderboard: readonly ClassOverallStats[];
  readonly matrix: Record<string, Record<string, CellRecord>>;
}

export interface CrossClassSimulationOptions {
  readonly classes?: readonly ClassMatchupProfile[];
  readonly trialsPerMatchup?: number;
  readonly maxTurnsPerTrial?: number;
  readonly arenaRadius?: number;
  readonly baseSeed?: number;
}

/**
 * Runs a complete round-robin 1v1 tournament across all supplied classes.
 * Alternates player/enemy factions equally across trials to eliminate turn-order advantage.
 */
export function runCrossClassMatchups(
  options?: CrossClassSimulationOptions
): CrossClassSimulationResult {
  const classes = options?.classes ?? MATCHUP_CLASSES;
  const trials = options?.trialsPerMatchup ?? 10;
  const maxTurnsPerTrial = options?.maxTurnsPerTrial ?? 60;
  const arenaRadius = options?.arenaRadius ?? 3;
  const baseSeed = options?.baseSeed ?? 42000;

  const matchups: MatchupRecord[] = [];
  const matrix: Record<string, Record<string, CellRecord>> = {};
  const abilityUsagesByClass: Record<string, Record<string, number>> = {};
  const statsByClass: Record<
    string,
    {
      profile: ClassMatchupProfile;
      wins: number;
      losses: number;
      timeouts: number;
      matchupWins: number;
      matchupLosses: number;
      matchupTies: number;
      totalDamage: number;
      totalTurns: number;
    }
  > = {};

  for (const c of classes) {
    matrix[c.classId] = {};
    abilityUsagesByClass[c.classId] = {};
    statsByClass[c.classId] = {
      profile: c,
      wins: 0,
      losses: 0,
      timeouts: 0,
      matchupWins: 0,
      matchupLosses: 0,
      matchupTies: 0,
      totalDamage: 0,
      totalTurns: 0
    };
  }

  let pairIndex = 0;
  for (let i = 0; i < classes.length; i++) {
    for (let j = i + 1; j < classes.length; j++) {
      const clsA = classes[i];
      const clsB = classes[j];
      pairIndex++;

      const res: SimulationResult = runCombatSimulation({
        combatantA: { classId: clsA.classId, name: clsA.name },
        combatantB: { classId: clsB.classId, name: clsB.name },
        trials,
        maxTurnsPerTrial,
        arenaRadius,
        alternateFactions: true,
        baseSeed: baseSeed + pairIndex * 137
      });

      const winsA = res.combatantA.wins;
      const winsB = res.combatantB.wins;
      const timeouts = res.timeouts;

      const record: MatchupRecord = {
        classA: clsA,
        classB: clsB,
        trials,
        winsA,
        winsB,
        timeouts,
        winRateA: res.combatantA.winRatePercent,
        winRateB: res.combatantB.winRatePercent,
        avgTurns: res.avgTurnsPerTrial,
        avgDmgA: res.combatantA.avgDamageDealt,
        avgDmgB: res.combatantB.avgDamageDealt
      };
      matchups.push(record);

      // Record matrix cells
      matrix[clsA.classId][clsB.classId] = {
        wins: winsA,
        losses: winsB,
        timeouts,
        winRatePercent: (winsA / trials) * 100
      };
      matrix[clsB.classId][clsA.classId] = {
        wins: winsB,
        losses: winsA,
        timeouts,
        winRatePercent: (winsB / trials) * 100
      };

      // Accumulate stats for A
      statsByClass[clsA.classId].wins += winsA;
      statsByClass[clsA.classId].losses += winsB;
      statsByClass[clsA.classId].timeouts += timeouts;
      statsByClass[clsA.classId].totalDamage += res.combatantA.totalDamageDealt;
      statsByClass[clsA.classId].totalTurns += res.combatantA.totalTurns;
      if (winsA > winsB) statsByClass[clsA.classId].matchupWins++;
      else if (winsA < winsB) statsByClass[clsA.classId].matchupLosses++;
      else statsByClass[clsA.classId].matchupTies++;

      for (const [abId, cnt] of Object.entries(res.combatantA.abilityUsages)) {
        abilityUsagesByClass[clsA.classId][abId] =
          (abilityUsagesByClass[clsA.classId][abId] ?? 0) + cnt;
      }

      // Accumulate stats for B
      statsByClass[clsB.classId].wins += winsB;
      statsByClass[clsB.classId].losses += winsA;
      statsByClass[clsB.classId].timeouts += timeouts;
      statsByClass[clsB.classId].totalDamage += res.combatantB.totalDamageDealt;
      statsByClass[clsB.classId].totalTurns += res.combatantB.totalTurns;
      if (winsB > winsA) statsByClass[clsB.classId].matchupWins++;
      else if (winsB < winsA) statsByClass[clsB.classId].matchupLosses++;
      else statsByClass[clsB.classId].matchupTies++;

      for (const [abId, cnt] of Object.entries(res.combatantB.abilityUsages)) {
        abilityUsagesByClass[clsB.classId][abId] =
          (abilityUsagesByClass[clsB.classId][abId] ?? 0) + cnt;
      }
    }
  }

  // Calculate leaderboard
  const totalOpponents = classes.length - 1;
  const totalTrialsPerClass = totalOpponents * trials;

  const leaderboard: ClassOverallStats[] = Object.values(statsByClass)
    .map((s) => {
      const topAbilities = Object.entries(abilityUsagesByClass[s.profile.classId])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, count]) => ({ id, count }));

      return {
        profile: s.profile,
        totalTrials: totalTrialsPerClass,
        totalWins: s.wins,
        totalLosses: s.losses,
        totalTimeouts: s.timeouts,
        winRatePercent: totalTrialsPerClass > 0 ? (s.wins / totalTrialsPerClass) * 100 : 0,
        matchupWins: s.matchupWins,
        matchupLosses: s.matchupLosses,
        matchupTies: s.matchupTies,
        totalDamage: s.totalDamage,
        avgDamagePerTrial: totalTrialsPerClass > 0 ? s.totalDamage / totalTrialsPerClass : 0,
        avgTurnsPerTrial: totalTrialsPerClass > 0 ? s.totalTurns / totalTrialsPerClass : 0,
        topAbilities
      };
    })
    .sort((a, b) => b.winRatePercent - a.winRatePercent || b.matchupWins - a.matchupWins);

  return {
    trialsPerMatchup: trials,
    totalMatchups: matchups.length,
    totalDuels: matchups.length * trials,
    matchups,
    leaderboard,
    matrix
  };
}

/**
 * Formats cross-class simulation results into a clean, human-readable ASCII report for terminal output.
 */
export function formatCrossClassReport(result: CrossClassSimulationResult): string {
  const lines: string[] = [];
  const pad = (str: string | number, len: number, alignLeft = true) => {
    const s = String(str);
    return alignLeft ? s.padEnd(len) : s.padStart(len);
  };

  lines.push('========================================================================================================================');
  lines.push(`1v1 CROSS-CLASS COMBAT BALANCE MATRIX`);
  lines.push(`Total Classes: ${MATCHUP_CLASSES.length} | Matchup Pairs: ${result.totalMatchups} | Trials/Pair: ${result.trialsPerMatchup} | Total Duels: ${result.totalDuels}`);
  lines.push('========================================================================================================================\n');

  // 1. Leaderboard Table
  lines.push('--- OVERALL CLASS LEADERBOARD (Sorted by Win Rate across all matchups) ---');
  lines.push('------------------------------------------------------------------------------------------------------------------------');
  lines.push(
    ` ${pad('Rank', 4)} | ${pad('Class', 12)} | ${pad('Tier', 4)} | ${pad('Win Rate', 9)} | ${pad('Duels (W-L-T)', 15)} | ${pad('Matchups (W-L-T)', 16)} | ${pad('Avg Dmg', 8)} | ${pad('Top Abilities', 30)}`
  );
  lines.push('------------------------------------------------------------------------------------------------------------------------');

  result.leaderboard.forEach((row, idx) => {
    const rankStr = pad(idx + 1, 4, false);
    const nameStr = pad(row.profile.name, 12);
    const tierStr = pad(`T${row.profile.tier}`, 4);
    const winRateStr = pad(`${row.winRatePercent.toFixed(1)}%`, 9, false);
    const duelRecordStr = pad(`${row.totalWins}-${row.totalLosses}-${row.totalTimeouts}`, 15);
    const matchRecordStr = pad(`${row.matchupWins}-${row.matchupLosses}-${row.matchupTies}`, 16);
    const avgDmgStr = pad(row.avgDamagePerTrial.toFixed(1), 8, false);
    const abilitiesStr = row.topAbilities.map((a) => `${a.id}(${a.count})`).join(', ');

    lines.push(
      ` ${rankStr} | ${nameStr} | ${tierStr} | ${winRateStr} | ${duelRecordStr} | ${matchRecordStr} | ${avgDmgStr} | ${abilitiesStr}`
    );
  });
  lines.push('------------------------------------------------------------------------------------------------------------------------\n');

  // 2. 12x12 Matrix Grid
  lines.push('--- HEAD-TO-HEAD MATCHUP MATRIX (Row vs Column: Win % of Row Class against Column Class) ---');
  const cols = MATCHUP_CLASSES.map((c) => c.shortCode);
  const headerCols = cols.map((c) => pad(c, 5, false)).join(' ');
  lines.push(`CLASS        | T | ${headerCols} | OVERALL WIN% (W-L)`);
  lines.push(`-------------+---+-${'-'.repeat(cols.length * 6)}-+-------------------`);

  for (const rowClass of MATCHUP_CLASSES) {
    const cells: string[] = [];
    for (const colClass of MATCHUP_CLASSES) {
      if (rowClass.classId === colClass.classId) {
        cells.push(pad('--', 5, false));
      } else {
        const cell = result.matrix[rowClass.classId]?.[colClass.classId];
        if (!cell) {
          cells.push(pad('?', 5, false));
        } else {
          cells.push(pad(`${cell.winRatePercent.toFixed(0)}%`, 5, false));
        }
      }
    }
    const stat = result.leaderboard.find((l) => l.profile.classId === rowClass.classId)!;
    const namePad = pad(rowClass.name, 12);
    const tierPad = pad(`T${rowClass.tier}`, 1);
    const rowWin = pad(`${stat.winRatePercent.toFixed(1)}% (${stat.totalWins}-${stat.totalLosses})`, 17);
    lines.push(`${namePad} | ${tierPad} | ${cells.join(' ')} | ${rowWin}`);
  }
  lines.push(`-------------+---+-${'-'.repeat(cols.length * 6)}-+-------------------\n`);

  // 3. Highlighted Matchup Breakdown (Favored & Countered)
  lines.push('--- CLASS MATCHUP PROFILES (Best Matchups vs Tough Matchups) ---');
  for (const stat of result.leaderboard) {
    const rowId = stat.profile.classId;
    const allOpponents = MATCHUP_CLASSES.filter((c) => c.classId !== rowId);

    const favored = allOpponents
      .filter((opp) => (result.matrix[rowId]?.[opp.classId]?.winRatePercent ?? 0) >= 60)
      .map((opp) => `${opp.name} (${result.matrix[rowId][opp.classId].wins}-${result.matrix[rowId][opp.classId].losses})`)
      .join(', ');

    const countered = allOpponents
      .filter((opp) => (result.matrix[rowId]?.[opp.classId]?.winRatePercent ?? 0) <= 40)
      .map((opp) => `${opp.name} (${result.matrix[rowId][opp.classId].wins}-${result.matrix[rowId][opp.classId].losses})`)
      .join(', ');

    const even = allOpponents
      .filter((opp) => {
        const wr = result.matrix[rowId]?.[opp.classId]?.winRatePercent ?? 0;
        return wr > 40 && wr < 60;
      })
      .map((opp) => `${opp.name} (${result.matrix[rowId][opp.classId].wins}-${result.matrix[rowId][opp.classId].losses})`)
      .join(', ');

    lines.push(`• ${stat.profile.name} (T${stat.profile.tier}) — Overall Win Rate: ${stat.winRatePercent.toFixed(1)}%`);
    if (favored) lines.push(`    Favored vs (>60%):   ${favored}`);
    if (countered) lines.push(`    Countered by (<40%): ${countered}`);
    if (even) lines.push(`    Even Matchups:       ${even}`);
  }
  lines.push('========================================================================================================================\n');

  return lines.join('\n');
}

/**
 * Formats cross-class simulation results into a Markdown document.
 */
export function formatCrossClassMarkdown(result: CrossClassSimulationResult): string {
  const lines: string[] = [];

  lines.push('# 1v1 Cross-Class Balance Simulation Matrix');
  lines.push(`\n**Trials per Pair:** ${result.trialsPerMatchup} | **Total Matchup Pairs:** ${result.totalMatchups} | **Total Duels:** ${result.totalDuels}\n`);

  lines.push('## Overall Leaderboard\n');
  lines.push('| Rank | Class | Tier | Overall Win % | Duel Record (W-L-T) | Matchup Record (W-L-T) | Avg Dmg | Top Abilities |');
  lines.push('| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :--- |');

  result.leaderboard.forEach((r, idx) => {
    const abilities = r.topAbilities.map((a) => `\`${a.id}\` (${a.count})`).join(', ');
    lines.push(
      `| ${idx + 1} | **${r.profile.name}** | T${r.profile.tier} | **${r.winRatePercent.toFixed(1)}%** | ${r.totalWins}-${r.totalLosses}-${r.totalTimeouts} | ${r.matchupWins}-${r.matchupLosses}-${r.matchupTies} | ${r.avgDamagePerTrial.toFixed(1)} | ${abilities} |`
    );
  });

  lines.push('\n## 12x12 Head-to-Head Win Rate Matrix\n');
  lines.push('> *Values represent the Win % of the **Row Class** against the **Column Class** across all trials.*');

  const headers = ['Class', 'Tier', ...MATCHUP_CLASSES.map((c) => c.shortCode), 'Overall Win %'];
  lines.push(`\n| ${headers.join(' | ')} |`);
  lines.push(`| :--- | :---: | ${MATCHUP_CLASSES.map(() => ':---:').join(' | ')} | :---: |`);

  for (const row of MATCHUP_CLASSES) {
    const cells: string[] = [];
    for (const col of MATCHUP_CLASSES) {
      if (row.classId === col.classId) {
        cells.push('—');
      } else {
        const c = result.matrix[row.classId]?.[col.classId];
        cells.push(c ? `${c.winRatePercent.toFixed(0)}%` : '?');
      }
    }
    const stat = result.leaderboard.find((l) => l.profile.classId === row.classId)!;
    lines.push(`| **${row.name}** | T${row.tier} | ${cells.join(' | ')} | **${stat.winRatePercent.toFixed(1)}%** |`);
  }

  lines.push('\n## Matchup Profiles\n');
  for (const stat of result.leaderboard) {
    const rowId = stat.profile.classId;
    const allOpponents = MATCHUP_CLASSES.filter((c) => c.classId !== rowId);

    const favored = allOpponents
      .filter((opp) => (result.matrix[rowId]?.[opp.classId]?.winRatePercent ?? 0) >= 60)
      .map((opp) => `**${opp.name}** (${result.matrix[rowId][opp.classId].wins}-${result.matrix[rowId][opp.classId].losses})`)
      .join(', ');

    const countered = allOpponents
      .filter((opp) => (result.matrix[rowId]?.[opp.classId]?.winRatePercent ?? 0) <= 40)
      .map((opp) => `**${opp.name}** (${result.matrix[rowId][opp.classId].wins}-${result.matrix[rowId][opp.classId].losses})`)
      .join(', ');

    lines.push(`### ${stat.profile.name} (Tier ${stat.profile.tier}) — Win Rate: ${stat.winRatePercent.toFixed(1)}%`);
    lines.push(`- **Strong Against (>=60%):** ${favored || 'None'}`);
    lines.push(`- **Vulnerable Against (<=40%):** ${countered || 'None'}`);
    lines.push('');
  }

  return lines.join('\n');
}
