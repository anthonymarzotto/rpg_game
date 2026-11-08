import { describe, it, expect, beforeEach } from 'vitest';
import { combatLogger } from './combatLogger';
import { CombatState, CombatUnit } from './types';
import { Arena } from '../grid/arena';
import { createRecruit } from '../units/unitFactory';

function createMockUnit(id: string, name: string, faction: 'PLAYER' | 'ENEMY' | 'NEUTRAL'): CombatUnit {
  const unit = createRecruit(id, name, { faction });
  return {
    unit,
    faction,
    currentHp: unit.effectiveVitals.maxHp,
    currentAp: 3,
    initiativeGauge: 0,
    isDefeated: false,
    inBattleXp: { fighter: 0, rogue: 0, mage: 0 },
    activeModifiers: [],
    activeConditions: [],
    abilityModifiers: [],
    abilities: [],
    passives: [],
    facing: 0,
  };
}

describe('combatLogger', () => {
  let state: CombatState;
  let playerHero: CombatUnit;
  let enemyNovice: CombatUnit;
  let neutralEntity: CombatUnit;

  beforeEach(() => {
    playerHero = createMockUnit('campaign-101-hero-1', 'Garrick the Bold', 'PLAYER');
    enemyNovice = createMockUnit('stage-1-enemy-1', 'Ash Thief', 'ENEMY');
    neutralEntity = createMockUnit('neutral-golem', 'Stone Sentry', 'NEUTRAL');

    state = {
      arena: new Arena([]),
      units: new Map([
        [playerHero.unit.id, playerHero],
        [enemyNovice.unit.id, enemyNovice],
        [neutralEntity.unit.id, neutralEntity]
      ]),
      activeUnitId: playerHero.unit.id,
      turnNumber: 3,
      combatLog: [],
      outcome: 'IN_PROGRESS',
      partyXpPool: { fighter: 0, rogue: 0, mage: 0 }
    };
  });

  it('logAttack stamps faction, actorUnitId, and indexes all affectedUnitIds', () => {
    const entry = combatLogger.logAttack(state, {
      actorCu: playerHero,
      ability: { id: 'power_strike', name: 'Power Strike' },
      targetCu: enemyNovice,
      rollResult: {
        d20: 17,
        modifier: 2,
        hitOutcome: 'SOLID_HIT',
        targetDefense: 11
      },
      damageTotal: 6,
      damageBreakdown: '1d6(4)+2 - 0 Armor'
    });

    expect(state.combatLog.length).toBe(1);
    expect(entry.turnNumber).toBe(3);
    expect(entry.actorUnitId).toBe('campaign-101-hero-1');
    expect(entry.faction).toBe('PLAYER');
    expect(entry.affectedUnitIds).toContain('campaign-101-hero-1');
    expect(entry.affectedUnitIds).toContain('stage-1-enemy-1');
    expect(entry.metadata.type).toBe('ATTACK');
    if (entry.metadata.type === 'ATTACK') {
      expect(entry.metadata.hitOutcome).toBe('SOLID_HIT');
      expect(entry.metadata.damageTotal).toBe('6');
      expect(entry.metadata.actor).toBe('Garrick the Bold');
      expect(entry.metadata.target).toBe('Ash Thief');
    }
  });

  it('logAttack correctly assigns ENEMY faction when enemy attacks player', () => {
    const entry = combatLogger.logAttack(state, {
      actorCu: enemyNovice,
      ability: { id: 'skirmish', name: 'Skirmish' },
      targetCu: playerHero,
      damageTotal: 3
    });

    expect(entry.faction).toBe('ENEMY');
    expect(entry.actorUnitId).toBe('stage-1-enemy-1');
    expect(entry.affectedUnitIds).toEqual(['stage-1-enemy-1', 'campaign-101-hero-1']);
  });

  it('logMove records destination, AP left, and unit faction', () => {
    const entry = combatLogger.logMove(state, {
      cu: playerHero,
      destination: { q: 1, r: -1 },
      remainingAp: 2
    });

    expect(entry.faction).toBe('PLAYER');
    expect(entry.actionId).toBe('move');
    expect(entry.affectedUnitIds).toEqual(['campaign-101-hero-1']);
    expect(entry.metadata.type).toBe('MOVE');
    if (entry.metadata.type === 'MOVE') {
      expect(entry.metadata.coord).toEqual({ q: 1, r: -1 });
      expect(entry.metadata.remainingAp).toBe(2);
    }
  });

  it('logPassive records structured PASSIVE card for trait trigger', () => {
    const entry = combatLogger.logPassive(state, {
      cu: playerHero,
      passiveName: 'Feline Grace',
      passiveId: 'feline_grace',
      effectDetail: 'Negated 8 Fall Impact Damage from plunging ledge'
    });

    expect(entry.faction).toBe('PLAYER');
    expect(entry.metadata.type).toBe('PASSIVE');
    if (entry.metadata.type === 'PASSIVE') {
      expect(entry.metadata.passiveName).toBe('Feline Grace');
      expect(entry.metadata.effectDetail).toBe('Negated 8 Fall Impact Damage from plunging ledge');
    }
  });

  it('logEnvironment records structured ENVIRONMENT hazard card', () => {
    playerHero.currentHp = 12;
    const entry = combatLogger.logEnvironment(state, {
      cu: playerHero,
      hazardName: 'Ledge Plunge',
      damage: 8,
      effectDetail: 'Delta h = -2 cliff drop'
    });

    expect(entry.faction).toBe('PLAYER');
    expect(entry.metadata.type).toBe('ENVIRONMENT');
    if (entry.metadata.type === 'ENVIRONMENT') {
      expect(entry.metadata.hazardName).toBe('Ledge Plunge');
      expect(entry.metadata.damage).toBe(8);
      expect(entry.metadata.targetHp).toBe(12);
    }
  });

  it('logBuff records buff card with affected units', () => {
    const entry = combatLogger.logBuff(state, {
      actorCu: playerHero,
      ability: { id: 'bolster', name: 'Bolster' },
      targetCu: playerHero,
      effectDetail: '+2 Armor for 2 turns'
    });

    expect(entry.faction).toBe('PLAYER');
    expect(entry.metadata.type).toBe('BUFF');
  });

  it('logInitiative records all participating units in affectedUnitIds', () => {
    const entry = combatLogger.logInitiative(state, {
      rolls: [
        { unitName: 'Garrick the Bold', unitId: playerHero.unit.id, roll: 18, isPlayer: true },
        { unitName: 'Ash Thief', unitId: enemyNovice.unit.id, roll: 14, isPlayer: false }
      ]
    });

    expect(entry.faction).toBe('NEUTRAL');
    expect(entry.affectedUnitIds).toContain('campaign-101-hero-1');
    expect(entry.affectedUnitIds).toContain('stage-1-enemy-1');
  });
});
