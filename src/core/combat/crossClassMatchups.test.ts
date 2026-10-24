import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  runCrossClassMatchups,
  formatCrossClassReport,
  formatCrossClassMarkdown,
  MATCHUP_CLASSES
} from './crossClassMatchups';

describe('Cross-Class Matchup Matrix Simulation', () => {
  it('runs a complete 1v1 round-robin tournament across all 12 classes (10 trials each)', () => {
    const trialsPerMatchup = 10;
    const maxTurnsPerTrial = 60;

    const result = runCrossClassMatchups({
      classes: MATCHUP_CLASSES,
      trialsPerMatchup,
      maxTurnsPerTrial
    });

    // 12 classes -> 12 * 11 / 2 = 66 matchups
    // 66 matchups * 10 duels = 660 duels
    expect(result.totalMatchups).toBe(66);
    expect(result.totalDuels).toBe(660);
    expect(result.leaderboard.length).toBe(12);

    // Format ASCII report and display in console
    const asciiReport = formatCrossClassReport(result);
    console.log('\n' + asciiReport + '\n');

    // Format Markdown report and write to docs/reports/1v1_cross_class_matrix.md
    const markdownReport = formatCrossClassMarkdown(result);
    const reportsDir = path.resolve(process.cwd(), 'docs', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    const reportPath = path.join(reportsDir, '1v1_cross_class_matrix.md');
    fs.writeFileSync(reportPath, markdownReport, 'utf-8');

    // Assert file was written
    expect(fs.existsSync(reportPath)).toBe(true);
    expect(markdownReport.length).toBeGreaterThan(500);

    // Basic sanity checks on matrix integrity
    for (const c of MATCHUP_CLASSES) {
      const stats = result.leaderboard.find((l) => l.profile.classId === c.classId);
      expect(stats).toBeDefined();
      expect(stats!.totalTrials).toBe(11 * trialsPerMatchup); // 11 opponents * 10
      expect(stats!.totalWins + stats!.totalLosses + stats!.totalTimeouts).toBe(110);
    }
  }, 120000); // 120s timeout allowance
});
