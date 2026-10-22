import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseCombatLogMessage, CombatLogPanel } from './CombatLogPanel';
import { CombatLogEntry } from '../../core/combat/types';

describe('parseCombatLogMessage', () => {
  it('parses universal move action entry', () => {
    const entry: CombatLogEntry = {
      turnNumber: 1,
      actorUnitId: 'player-warrior',
      actionId: 'move',
      message: 'Alden (Warrior) moved to (1, 0). [Remaining AP: 2]',
      metadata: {
        type: 'MOVE',
        actor: 'Alden (Warrior)',
        coord: { q: 1, r: 0 },
        remainingAp: 2
      }
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

  it('parses real engine damaging attack with mitigation and breakdown', () => {
    const entry: CombatLogEntry = {
      turnNumber: 2,
      actorUnitId: 'player-warrior',
      actionId: 'power_strike',
      message:
        'Alden (Warrior) used Power Strike on Bandit Brute A: [d20: 16+1 vs DC 11 -> HIT] [Damage: 1d6(4)+0 - 0 Armor -> 4] (HP: 16/20)',
      metadata: {
        type: 'ATTACK',
        actor: 'Alden (Warrior)',
        ability: 'Power Strike',
        target: 'Bandit Brute A',
        d20: '16+1',
        defenseTarget: 11,
        hitOutcome: 'HIT',
        damageTotal: '4',
        damageBreakdown: '1d6(4)+0 - 0 Armor',
        targetHp: 16,
        targetMaxHp: 20
      }
    };

    const parsed = parseCombatLogMessage(entry);
    expect(parsed.type).toBe('ATTACK');
    if (parsed.type === 'ATTACK') {
      expect(parsed.actor).toBe('Alden (Warrior)');
      expect(parsed.isPlayer).toBe(true);
      expect(parsed.ability).toBe('Power Strike');
      expect(parsed.target).toBe('Bandit Brute A');
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
        'Lyra (Thief) used Sneak Attack on Bandit Skirmisher B: [d20: 20+2 vs DC 12 -> CRITICAL_HIT] [Damage: 2d6(6, 6)+2 - 0 Armor -> 14] (HP: 0/20)',
      metadata: {
        type: 'ATTACK',
        actor: 'Lyra (Thief)',
        ability: 'Sneak Attack',
        target: 'Bandit Skirmisher B',
        d20: '20+2',
        defenseTarget: 12,
        hitOutcome: 'CRITICAL_HIT',
        damageTotal: '14',
        damageBreakdown: '2d6(6, 6)+2 - 0 Armor',
        targetHp: 0,
        targetMaxHp: 20
      }
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
        'Bandit Brute A used Strike on Alden (Warrior): [d20: 4+1 vs DC 13 -> MISS] [Damage: 0 (Miss)] (HP: 20/20)',
      metadata: {
        type: 'ATTACK',
        actor: 'Bandit Brute A',
        ability: 'Strike',
        target: 'Alden (Warrior)',
        d20: '4+1',
        defenseTarget: 13,
        hitOutcome: 'MISS',
        damageTotal: '0',
        damageBreakdown: '0 (Miss)',
        targetHp: 20,
        targetMaxHp: 20
      }
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
        'Alden (Warrior) used Shield Bash on Bandit Brute A: [d20: 15+1 vs DC 11 -> HIT] [Damage: 1d6(5)+1 - 1 Armor -> 5] (HP: 15/20) 💥 [Knockback Collision: Slammed into Map Boundary! Took +1 collision damage.]',
      metadata: {
        type: 'ATTACK',
        actor: 'Alden (Warrior)',
        ability: 'Shield Bash',
        target: 'Bandit Brute A',
        d20: '15+1',
        defenseTarget: 11,
        hitOutcome: 'HIT',
        damageTotal: '5',
        damageBreakdown: '1d6(5)+1 - 1 Armor',
        targetHp: 15,
        targetMaxHp: 20,
        secondaryDetail: 'Knockback Collision: Slammed into Map Boundary!'
      }
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
      message: 'Vael (Wizard) used Minor Ward. 🛡️ [Armor Buff: +2 Armor for 2 turn(s)]',
      metadata: {
        type: 'BUFF',
        actor: 'Vael (Wizard)',
        ability: 'Minor Ward',
        effectDetail: '+2 Armor for 2 turn(s)'
      }
    };

    const parsed = parseCombatLogMessage(entry);
    expect(parsed.type).toBe('BUFF');
    if (parsed.type === 'BUFF') {
      expect(parsed.actor).toBe('Vael (Wizard)');
      expect(parsed.ability).toBe('Minor Ward');
      expect(parsed.target).toBeUndefined();
      expect(parsed.effectDetail).toContain('+2 Armor for 2 turn(s)');
    }
  });

  it('parses targeted buff/debuff ability entry with target', () => {
    const entry: CombatLogEntry = {
      turnNumber: 2,
      actorUnitId: 'player-witch',
      actionId: 'witchs_talisman',
      message: "Morrigan (Witch) used Witch's Talisman on Alden (Warrior). ⚡ [Speed Buff: +2 Initiative for 2 turn(s)]",
      metadata: {
        type: 'BUFF',
        actor: 'Morrigan (Witch)',
        ability: "Witch's Talisman",
        target: 'Alden (Warrior)',
        effectDetail: '+2 Initiative for 2 turn(s)'
      }
    };

    const parsed = parseCombatLogMessage(entry);
    expect(parsed.type).toBe('BUFF');
    if (parsed.type === 'BUFF') {
      expect(parsed.actor).toBe('Morrigan (Witch)');
      expect(parsed.ability).toBe("Witch's Talisman");
      expect(parsed.target).toBe('Alden (Warrior)');
      expect(parsed.effectDetail).toContain('+2 Initiative for 2 turn(s)');
    }
  });

  it('falls back to generic on unrecognized or generic actions', () => {
    const entry: CombatLogEntry = {
      turnNumber: 5,
      actorUnitId: 'dummy-a',
      actionId: 'special',
      message: 'A mysterious omen echoes through the arena.',
      metadata: {
        type: 'GENERIC',
        actor: 'dummy-a',
        text: 'A mysterious omen echoes through the arena.'
      }
    };

    const parsed = parseCombatLogMessage(entry);
    expect(parsed.type).toBe('GENERIC');
    if (parsed.type === 'GENERIC') {
      expect(parsed.rawMessage).toBe('A mysterious omen echoes through the arena.');
    }
  });

  it('safely handles empty or malformed entries with action not defined fallback', () => {
    const parsed = parseCombatLogMessage({
      turnNumber: 1,
      actorUnitId: '',
      actionId: '',
      message: '',
      metadata: {
        type: 'GENERIC'
      }
    });
    expect(parsed.type).toBe('GENERIC');
    expect(parsed.rawMessage).toBe('This action is not yet defined');
  });

  it('falls back gracefully when metadata is missing on legacy or untyped entry', () => {
    const parsed = parseCombatLogMessage({
      turnNumber: 1,
      actorUnitId: '',
      actionId: '',
      message: ''
    } as unknown as CombatLogEntry);
    expect(parsed.type).toBe('GENERIC');
    expect(parsed.rawMessage).toBe('This action is not yet defined');
  });

  it('parses UTILITY entry with collision damage and secondary collision detail', () => {
    const entry: CombatLogEntry = {
      turnNumber: 2,
      actorUnitId: 'player-sorcerer',
      actionId: 'gust',
      message:
        'Sorcerer used Gust on Goblin. 💥 [Knockback Collision: Slammed into Obstacle! Took +2 collision damage.]',
      metadata: {
        type: 'UTILITY',
        actor: 'Sorcerer',
        ability: 'Gust',
        target: 'Goblin',
        damageTotal: '2',
        targetHp: 8,
        targetMaxHp: 10,
        secondaryDetail: '💥 [Knockback Collision: Slammed into Obstacle! Took +2 collision damage.]'
      }
    };

    const parsed = parseCombatLogMessage(entry);
    expect(parsed.type).toBe('UTILITY');
    if (parsed.type === 'UTILITY') {
      expect(parsed.actor).toBe('Sorcerer');
      expect(parsed.isPlayer).toBe(true);
      expect(parsed.ability).toBe('Gust');
      expect(parsed.target).toBe('Goblin');
      expect(parsed.damageTotal).toBe('2');
      expect(parsed.targetHp).toBe(8);
      expect(parsed.targetMaxHp).toBe(10);
      expect(parsed.secondaryDetail).toContain('Slammed into Obstacle');
    }
  });

  it('parses UTILITY entry for open displacement without damage', () => {
    const entry: CombatLogEntry = {
      turnNumber: 3,
      actorUnitId: 'player-sorcerer',
      actionId: 'gust',
      message: 'Sorcerer used Gust on Goblin. 💨 [Knockback: Pushed to (2, 0)]',
      metadata: {
        type: 'UTILITY',
        actor: 'Sorcerer',
        ability: 'Gust',
        target: 'Goblin',
        effectDetail: '💨 [Knockback: Pushed to (2, 0)]',
        secondaryDetail: '💨 [Knockback: Pushed to (2, 0)]'
      }
    };

    const parsed = parseCombatLogMessage(entry);
    expect(parsed.type).toBe('UTILITY');
    if (parsed.type === 'UTILITY') {
      expect(parsed.damageTotal).toBeUndefined();
      expect(parsed.targetHp).toBeUndefined();
      expect(parsed.secondaryDetail).toContain('Pushed to (2, 0)');
    }
  });

  it('parses and renders diagnostic warning entries (ai_fault) as amber fault cards', () => {
    const entry: CombatLogEntry = {
      turnNumber: 3,
      actorUnitId: 'enemy-goblin',
      actionId: 'ai_fault',
      message:
        '⚠️ [AI Fault] Goblin Mage could not execute Spark: Destination is not reachable. Conserving remaining AP.',
      metadata: {
        type: 'GENERIC',
        actor: 'Goblin Mage',
        text: '⚠️ [AI Fault] Spark: Destination is not reachable'
      }
    };

    const parsed = parseCombatLogMessage(entry);
    expect(parsed.type).toBe('FAULT');
    if (parsed.type === 'FAULT') {
      expect(parsed.actor).toBe('Goblin Mage');
      expect(parsed.actionName).toBe('Spark');
      expect(parsed.isPlayer).toBe(false);
      expect(parsed.reason).toContain('Destination is not reachable');
    }

    // Render component and verify .log-fault-card markup
    const html = renderToStaticMarkup(
      React.createElement(CombatLogPanel, {
        logEntries: [entry],
        turnNumber: 3
      })
    );

    expect(html).toContain('log-fault-card');
    expect(html).toContain('⚠️ AI FAULT');
    expect(html).toContain('Goblin Mage');
    expect(html).toContain('Spark');
    expect(html).toContain('Destination is not reachable');
  });

  it('parses structured INITIATIVE log entry and renders formatted initiative card', () => {
    const entry: CombatLogEntry = {
      turnNumber: 0,
      actorUnitId: '',
      actionId: 'initiative',
      message: 'Combat begins! Initiative rolled: Alden (18), Goblin Scout (9)',
      metadata: {
        type: 'INITIATIVE',
        rolls: [
          { unitName: 'Alden', roll: 18, isPlayer: true },
          { unitName: 'Goblin Scout', roll: 9, isPlayer: false }
        ]
      }
    };

    const parsed = parseCombatLogMessage(entry);
    expect(parsed.type).toBe('INITIATIVE');
    if (parsed.type === 'INITIATIVE') {
      expect(parsed.rolls).toHaveLength(2);
      expect(parsed.rolls[0].unitName).toBe('Alden');
      expect(parsed.rolls[0].roll).toBe(18);
      expect(parsed.rolls[0].isPlayer).toBe(true);
      expect(parsed.rolls[1].unitName).toBe('Goblin Scout');
      expect(parsed.rolls[1].roll).toBe(9);
      expect(parsed.rolls[1].isPlayer).toBe(false);
    }

    const html = renderToStaticMarkup(
      React.createElement(CombatLogPanel, {
        logEntries: [entry],
        turnNumber: 1
      })
    );

    expect(html).toContain('log-initiative-card');
    expect(html).toContain('log-turn-init');
    expect(html).toContain('START');
    expect(html).toContain('🎲 INITIATIVE');
    expect(html).toContain('Opening Turn Order');
    expect(html).toContain('chip-player');
    expect(html).toContain('Alden');
    expect(html).toContain('🎲 18');
    expect(html).toContain('chip-enemy');
    expect(html).toContain('Goblin Scout');
    expect(html).toContain('🎲 9');
  });

  it('parses unstructured initiative message fallback gracefully', () => {
    const entry: CombatLogEntry = {
      turnNumber: 0,
      actorUnitId: '',
      actionId: 'initiative',
      message: 'Combat begins! Initiative rolled: Alden (20), Brenna (15), Bandit (8)',
      metadata: {
        type: 'GENERIC',
        text: 'Initiative rolled: Alden (20), Brenna (15), Bandit (8)'
      }
    };

    const parsed = parseCombatLogMessage(entry);
    expect(parsed.type).toBe('INITIATIVE');
    if (parsed.type === 'INITIATIVE') {
      expect(parsed.rolls).toHaveLength(3);
      expect(parsed.rolls[0].unitName).toBe('Alden');
      expect(parsed.rolls[0].roll).toBe(20);
      expect(parsed.rolls[0].isPlayer).toBe(true);
      expect(parsed.rolls[2].unitName).toBe('Bandit');
      expect(parsed.rolls[2].roll).toBe(8);
      expect(parsed.rolls[2].isPlayer).toBe(false);
    }
  });
});

