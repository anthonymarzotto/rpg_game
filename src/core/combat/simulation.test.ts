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
      expect(cavalier.effectiveVitals.speed).toBe(11); // 10 + 1*1
    });

    it('respects attribute overrides and custom levels', () => {
      const customBerserker = createSimulatedCombatant({
        classId: 'berserker',
        level: 4,
        baseAttributes: { force: 3, finesse: 1 }
      });
      expect(customBerserker.baseAttributes).toEqual({ force: 3, finesse: 1, focus: 1 });
      expect(customBerserker.effectiveVitals.maxHp).toBe(32); // Base 12 + Level 4 * 5 = 32
      expect(customBerserker.effectiveVitals.speed).toBe(11); // 10 + 1*1
    });

    it('generates normalized combatants at Level 4 parity with archetype-weighted attributes', () => {
      // Pure classes: all points reach 4 in their required domain
      const warrior = createSimulatedCombatant({ classId: 'warrior', normalizedLevel: 4 });
      expect(warrior.baseAttributes).toEqual({ force: 4, finesse: 0, focus: 0 });
      expect(warrior.effectiveVitals.maxHp).toBe(32);
      expect(warrior.effectiveVitals.armor).toBe(4);

      const thief = createSimulatedCombatant({ classId: 'thief', normalizedLevel: 4 });
      expect(thief.baseAttributes).toEqual({ force: 0, finesse: 4, focus: 0 });
      expect(thief.effectiveVitals.maxHp).toBe(32);
      expect(thief.effectiveVitals.speed).toBe(14);
      expect(thief.effectiveVitals.evasion).toBe(14);

      const wizard = createSimulatedCombatant({ classId: 'wizard', normalizedLevel: 4 });
      expect(wizard.baseAttributes).toEqual({ force: 0, finesse: 0, focus: 4 });
      expect(wizard.effectiveVitals.maxHp).toBe(32);
      expect(wizard.effectiveVitals.ward).toBe(4);

      // Hybrid class: Cavalier (2 Fighter, 1 Rogue) receives 4 points split between Force and Finesse
      const rngForce = () => 0.1; // picks force (index 0)
      const cavForce = createSimulatedCombatant({ classId: 'cavalier', normalizedLevel: 4, rng: rngForce });
      expect(cavForce.baseAttributes).toEqual({ force: 3, finesse: 1, focus: 0 });
      expect(cavForce.effectiveVitals.maxHp).toBe(32);

      const rngFinesse = () => 0.9; // picks finesse (index 1)
      const cavFinesse = createSimulatedCombatant({ classId: 'cavalier', normalizedLevel: 4, rng: rngFinesse });
      expect(cavFinesse.baseAttributes).toEqual({ force: 2, finesse: 2, focus: 0 });
      expect(cavFinesse.effectiveVitals.maxHp).toBe(32);
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
        maxTurnsPerTrial: 1,
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
