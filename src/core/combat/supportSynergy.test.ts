import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  runSupportSynergyBenchmark,
  formatSupportSynergyReport,
  formatSupportSynergyMarkdown
} from './supportSynergy';

describe('2v2 Support Synergy Benchmark', () => {
  it('runs Option B: Knight vs Warrior (Control) across 10 partner classes', () => {
    const result = runSupportSynergyBenchmark({
      candidateClass: 'knight',
      controlClass: 'warrior',
      trialsPerMatchup: 6,
      maxTurnsPerMatch: 60,
      arenaRadius: 3,
      enableElevationTopography: true,
      baseSeed: 88200
    });

    expect(result.candidateClassId).toBe('knight');
    expect(result.controlClassId).toBe('warrior');
    expect(result.records.length).toBe(10);
    // 10 partners * 6 gauntlet teams * 6 trials * 2 teams = 720 matches
    expect(result.totalMatches).toBe(720);

    // Format ASCII report and display in console
    const asciiReport = formatSupportSynergyReport(result);
    console.log('\n' + asciiReport + '\n');

    // Format Markdown report and write to docs/reports/knight_support_synergy.md
    const markdownReport = formatSupportSynergyMarkdown(result);
    const reportsDir = path.resolve(process.cwd(), 'docs', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    const reportPath = path.join(reportsDir, 'knight_support_synergy.md');
    fs.writeFileSync(reportPath, markdownReport, 'utf-8');

    expect(fs.existsSync(reportPath)).toBe(true);
    expect(markdownReport.length).toBeGreaterThan(500);
  }, 120000);
});
