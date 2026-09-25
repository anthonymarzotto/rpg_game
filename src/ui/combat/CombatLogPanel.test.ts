import { describe, it, expect } from 'vitest';
import { parseCombatLogMessage } from './CombatLogPanel';
import { CombatLogEntry } from '../../core/combat/types';

describe('parseCombatLogMessage', () => {
  it('parses universal move action entry', () => {
    const entry: CombatLogEntry = {
      turnNumber: 1,
      actorUnitId: 'player-warrior',
      actionId: 'move',
      message: 'Alden (Warrior) moved to (1, 0). [Remaining AP: 2]'
    };

    const parsed = parseCombatLogMessage(entry);
    expect(parsed.type).toBe('MOVE');
    if (parsed.type === 'MOVE') {
      expect(parsed.actor).toBe('Alden (Warrior)');
      expect(parsed.isPlayer).toBe(true);
      expect(parsed.coord).toEqual({ q: 1, r: 0 });
      expect(parsed.remainingAp).toBe(2);
      expect(parsed.turn).toBe(1);
    }
  });

  it('parses real engine damaging attack with mitigation and arrow breakdown', () => {
    const entry: CombatLogEntry = {
      turnNumber: 2,
      actorUnitId: 'player-warrior',
      actionId: 'power_strike',
      message:
        'Alden (Warrior) used Power Strike on Bandit Fighter A: [d20: 16+1 vs DC 11 -> HIT] [Damage: 1d6(4)+0 - 0 Armor -> 4] (HP: 16/20)'
    };

    const parsed = parseCombatLogMessage(entry);
    expect(parsed.type).toBe('ATTACK');
    if (parsed.type === 'ATTACK') {
      expect(parsed.actor).toBe('Alden (Warrior)');
      expect(parsed.isPlayer).toBe(true);
      expect(parsed.ability).toBe('Power Strike');
      expect(parsed.target).toBe('Bandit Fighter A');
      expect(parsed.d20).toBe('16+1');
      expect(parsed.defenseTarget).toBe(11);
      expect(parsed.hitOutcome).toBe('HIT');
      expect(parsed.damageTotal).toBe('4');
      expect(parsed.damageBreakdown).toBe('1d6(4)+0 - 0 Armor');
      expect(parsed.targetHp).toBe(16);
      expect(parsed.targetMaxHp).toBe(20);
    }
  });

  it('parses critical hit attack entry', () => {
    const entry: CombatLogEntry = {
      turnNumber: 3,
      actorUnitId: 'player-thief',
      actionId: 'sneak_attack',
      message:
        'Lyra (Thief) used Sneak Attack on Bandit Skirmisher B: [d20: 20+2 vs DC 12 -> CRITICAL_HIT] [Damage: 2d6(6, 6)+2 - 0 Armor -> 14] (HP: 0/20)'
    };

    const parsed = parseCombatLogMessage(entry);
    expect(parsed.type).toBe('ATTACK');
    if (parsed.type === 'ATTACK') {
      expect(parsed.hitOutcome).toBe('CRITICAL_HIT');
      expect(parsed.damageTotal).toBe('14');
      expect(parsed.targetHp).toBe(0);
    }
  });

  it('parses miss attack entry', () => {
    const entry: CombatLogEntry = {
      turnNumber: 1,
      actorUnitId: 'dummy-a',
      actionId: 'strike',
      message:
        'Bandit Fighter A used Strike on Alden (Warrior): [d20: 4+1 vs DC 13 -> MISS] [Damage: 0 (Miss)] (HP: 20/20)'
    };

    const parsed = parseCombatLogMessage(entry);
    expect(parsed.type).toBe('ATTACK');
    if (parsed.type === 'ATTACK') {
      expect(parsed.isPlayer).toBe(false);
      expect(parsed.hitOutcome).toBe('MISS');
      expect(parsed.damageTotal).toBe('0');
      expect(parsed.targetHp).toBe(20);
    }
  });

  it('parses attack with secondary details such as knockback and wall collision', () => {
    const entry: CombatLogEntry = {
      turnNumber: 2,
      actorUnitId: 'player-warrior',
      actionId: 'shield_bash',
      message:
        'Alden (Warrior) used Shield Bash on Bandit Fighter A: [d20: 15+1 vs DC 11 -> HIT] [Damage: 1d6(5)+1 - 1 Armor -> 5] (HP: 15/20) 💥 [Knockback Collision: Slammed into Map Boundary! Took +1 collision damage.]'
    };

    const parsed = parseCombatLogMessage(entry);
    expect(parsed.type).toBe('ATTACK');
    if (parsed.type === 'ATTACK') {
      expect(parsed.secondaryDetail).toContain('Knockback Collision: Slammed into Map Boundary');
    }
  });

  it('parses buff/ward ability entry with status tag', () => {
    const entry: CombatLogEntry = {
      turnNumber: 1,
      actorUnitId: 'player-wizard',
      actionId: 'minor_ward',
      message: 'Vael (Wizard) used Minor Ward. 🛡️ [Armor Buff: +2 Armor for 2 turn(s)]'
    };

    const parsed = parseCombatLogMessage(entry);
    expect(parsed.type).toBe('BUFF');
    if (parsed.type === 'BUFF') {
      expect(parsed.actor).toBe('Vael (Wizard)');
      expect(parsed.ability).toBe('Minor Ward');
      expect(parsed.effectDetail).toContain('+2 Armor for 2 turn(s)');
    }
  });

  it('falls back to generic on unrecognized messages', () => {
    const entry: CombatLogEntry = {
      turnNumber: 5,
      actorUnitId: 'dummy-a',
      actionId: 'special',
      message: 'A mysterious omen echoes through the arena.'
    };

    const parsed = parseCombatLogMessage(entry);
    expect(parsed.type).toBe('GENERIC');
    if (parsed.type === 'GENERIC') {
      expect(parsed.rawMessage).toBe('A mysterious omen echoes through the arena.');
    }
  });

  it('safely handles empty or malformed entries', () => {
    const parsed = parseCombatLogMessage({
      turnNumber: 1,
      actorUnitId: '',
      actionId: '',
      message: ''
    });
    expect(parsed.type).toBe('GENERIC');
  });
});
