import { describe, it, expect } from 'vitest';
import {
  createSimulatedCombatant,
  runCombatSimulation,
  formatSimulationReport
} from './simulation';

describe('Combat Simulation Framework', () => {
  describe('createSimulatedCombatant', () => {
    it('automatically resolves default triad attributes from class requirements', () => {
      const cavalier = createSimulatedCombatant({ classId: 'cavalier' });
      // Cavalier requirements: fighter 2, rogue 1, mage 0
      expect(cavalier.baseAttributes).toEqual({ force: 2, finesse: 1, focus: 0 });
      // Total points = 3 -> level 3
      expect(cavalier.effectiveVitals.maxHp).toBe(27); // 20 + 2*2 + 3*1
      expect(cavalier.effectiveVitals.speed).toBe(12); // 10 + 1*2
    });

    it('respects attribute overrides and custom levels', () => {
      const customBerserker = createSimulatedCombatant({
        classId: 'berserker',
        level: 4,
        baseAttributes: { force: 3, finesse: 1 }
      });
      expect(customBerserker.baseAttributes).toEqual({ force: 3, finesse: 1, focus: 1 });
      expect(customBerserker.effectiveVitals.maxHp).toBe(32); // Base 12 + Level 4 * 5 = 32
      expect(customBerserker.effectiveVitals.speed).toBe(12); // 10 + 1*2
    });
  });

  describe('runCombatSimulation & reporting', () => {
    it('executes a simulation batch and aggregates metrics accurately', () => {
      const result = runCombatSimulation({
        combatantA: { classId: 'cavalier', name: 'Cavalier' },
        combatantB: { classId: 'highwayman', name: 'Highwayman' },
        trials: 4,
        maxTurnsPerTrial: 50,
        alternateFactions: true,
        baseSeed: 12345
      });

      expect(result.trials).toBe(4);
      expect(result.totalTurns).toBeGreaterThan(0);
      expect(result.combatantA.wins + result.combatantB.wins + result.timeouts).toBe(4);
      expect(result.combatantA.totalDamageDealt + result.combatantB.totalDamageDealt).toBeGreaterThan(0);

      // Verify XP metrics tracked
      expect(result.combatantA.totalXpCurrent).toBeGreaterThan(0);
      expect(result.combatantA.totalXpDirectionA).toBeGreaterThanOrEqual(result.combatantA.totalXpCurrent);
      expect(result.partyXpPool).toBeDefined();
      expect(result.partyXpPool.total.fighter + result.partyXpPool.total.rogue + result.partyXpPool.total.mage).toBeGreaterThan(0);

      // Formatted report verification
      const report = formatSimulationReport(result);
      expect(report).toContain('COMBAT BALANCE SIMULATION REPORT');
      expect(report).toContain('Combatant A: Cavalier (cavalier)');
      expect(report).toContain('Combatant B: Highwayman (highwayman)');
      expect(report).toContain('Shared Party XP Pool:');
    });

    it('detects timeouts and reports them without artificially awarding wins', () => {
      // Highwayman vs Berserker hits timeout due to infinite Stand and Deliver loop
      const result = runCombatSimulation({
        combatantA: { classId: 'highwayman', name: 'Highwayman' },
        combatantB: { classId: 'berserker', name: 'Berserker' },
        trials: 2,
        maxTurnsPerTrial: 15,
        baseSeed: 999
      });

      expect(result.trials).toBe(2);
      expect(result.timeouts).toBe(2);
      expect(result.timeoutRatePercent).toBe(100);
      expect(result.combatantA.wins).toBe(0);
      expect(result.combatantB.wins).toBe(0);

      const report = formatSimulationReport(result);
      expect(report).toContain('Timeouts: 2 (100%)');
    });

    it('runs benchmark duel between Cavalier and Highwayman and logs report', () => {
      const result = runCombatSimulation({
        combatantA: { classId: 'cavalier', name: 'Cavalier' },
        combatantB: { classId: 'highwayman', name: 'Highwayman' },
        trials: 20,
        maxTurnsPerTrial: 60,
        alternateFactions: true,
        baseSeed: 42000
      });

      const report = formatSimulationReport(result);
      console.log('\n' + report + '\n');
      expect(result.trials).toBe(20);
    });
  });
});
