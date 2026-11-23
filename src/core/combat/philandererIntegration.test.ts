import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { createRecruit } from '../units/unitFactory';
import { createCombatState, executeAbility } from './resolver';
import { canExecuteAbility } from './validator';
import { endActiveTurn } from './turnClock';
import { evaluateFrontArcDetection } from './conditions';
import { MockDiceRoller } from './dice';
import { HEX_DIRECTIONS } from '../grid/hex';
import {
  PHILANDERER_PACKAGE,
  BILLET_DOUX,
  BECKONING_GLANCE,
  LOOKING_GLASS_GLARE,
  CAPTIVATING_PRESENCE
} from '../../data/packages/philanderer';
import { STRIKE, SPARK } from '../../data/packages';
import { getClassPackage, getAbilityById, getPassiveById } from '../../data/packages';
import { resolveUnitLoadout, LoadoutLookupProviders } from '../units/loadout';
import { applyConditionToUnit } from './effects/conditionHandler';
import { Unit } from '../types/unit';
import { EncounterObjective } from './types';

const testLoadoutProviders: LoadoutLookupProviders = {
  getPackage: getClassPackage,
  getAbility: getAbilityById,
  getPassive: getPassiveById
};

function createPhilandererUnit(id: string, name: string, faction: 'PLAYER' | 'ENEMY' = 'PLAYER'): Unit {
  const recruit = createRecruit(id, name, {
    faction,
    loadout: {
      activeClassId: 'philanderer',
      wildcardAbilityIds: [],
      wildcardPassiveIds: []
    }
  });
  (recruit as any).baseAttributes = { force: 1, finesse: 4, focus: 2 };
  (recruit as any).unlockedNodes = ['thief', 'infiltrator', 'cat-burglar', 'philanderer'];
  return recruit;
}

describe('Tier 4 Philanderer Integration', () => {
  it('resolves Philanderer active class package and allows equipping domain abilities and passive as wildcards', () => {
    const phil = createPhilandererUnit('p1', 'Casanova');
    const resolved = resolveUnitLoadout(phil, testLoadoutProviders);
    expect(resolved.combatAbilities.map((a) => a.id)).toEqual([
      'billet_doux',
      'beckoning_glance',
      'looking_glass_glare'
    ]);
    expect(resolved.activePassives.some((p) => p.id === CAPTIVATING_PRESENCE.id)).toBe(true);
    expect(PHILANDERER_PACKAGE.aiProfile).toBe('SUPPORT');

    const catBurglarWithWildcards: Unit = {
      ...phil,
      loadout: {
        activeClassId: 'cat-burglar',
        wildcardAbilityIds: ['beckoning_glance', 'looking_glass_glare'],
        wildcardPassiveIds: ['captivating_presence']
      }
    };
    const resolvedWildcard = resolveUnitLoadout(catBurglarWithWildcards, testLoadoutProviders);
    expect(resolvedWildcard.combatAbilities.map((a) => a.id)).toContain('beckoning_glance');
    expect(resolvedWildcard.combatAbilities.map((a) => a.id)).toContain('looking_glass_glare');
    expect(resolvedWildcard.activePassives.map((p) => p.id)).toContain('captivating_presence');
  });

  it('Billet-Doux resolves Crit (2T Charmed), Solid Hit (1T Charmed), Graze (1T Exposed), and Miss (none) while preserving base-faction victory checks', () => {
    const arena = createRadialArena(4);
    const phil = createPhilandererUnit('phil', 'Casanova', 'PLAYER');
    const enemy = createRecruit('enemy', 'Enemy Guard', { faction: 'ENEMY' });
    (enemy as any).effectiveVitals = { ...enemy.effectiveVitals, maxHp: 30, resolve: 14 };

    arena.setUnitPosition('phil', { q: 0, r: 0 });
    arena.setUnitPosition('enemy', { q: 3, r: 0 });

    const objectives: readonly EncounterObjective[] = [
      {
        id: 'rout_enemies',
        description: 'Defeat all enemies',
        condition: { kind: 'FACTION_DEFEATED', faction: 'ENEMY' }
      }
    ];

    const state = createCombatState(arena, [phil, enemy], 'phil', testLoadoutProviders, objectives);
    const philCu = state.units.get('phil')!;
    const enemyCu = state.units.get('enemy')!;

    // 1. Miss: finesse 4 + d20(4) = 8 vs Resolve 14 -> MISS
    philCu.currentAp = 3;
    executeAbility(state, 'phil', BILLET_DOUX, { targetUnitId: 'enemy' }, new MockDiceRoller({ d20Rolls: [4] }));
    expect(enemyCu.activeConditions).toHaveLength(0);
    expect(enemyCu.faction).toBe('ENEMY');

    // 2. Graze: finesse 4 + d20(7) = 11 vs Resolve 14 (within 5 graze margin) -> GRAZE -> EXPOSED (1t)
    philCu.currentAp = 3;
    const grazeRes = executeAbility(
      state,
      'phil',
      BILLET_DOUX,
      { targetUnitId: 'enemy' },
      new MockDiceRoller({ d20Rolls: [7] })
    );
    expect(grazeRes.type).toBe('ATTACK');
    if (grazeRes.type === 'ATTACK') {
      expect(grazeRes.details.hitOutcome).toBe('GRAZE');
      expect(grazeRes.details.damageDealt).toBe(0);
    }
    expect(enemyCu.activeConditions.some((c) => c.type === 'EXPOSED' && c.durationTurns === 1)).toBe(true);
    expect(enemyCu.activeConditions.some((c) => c.type === 'CHARMED')).toBe(false);
    enemyCu.activeConditions = [];

    // 3. Solid Hit: finesse 4 + d20(12) = 16 vs Resolve 14 -> SOLID_HIT -> CHARMED (1t)
    philCu.currentAp = 3;
    const hitRes = executeAbility(
      state,
      'phil',
      BILLET_DOUX,
      { targetUnitId: 'enemy' },
      new MockDiceRoller({ d20Rolls: [12] })
    );
    expect(hitRes.type).toBe('ATTACK');
    if (hitRes.type === 'ATTACK') {
      expect(hitRes.details.hitOutcome).toBe('SOLID_HIT');
      expect(hitRes.details.damageDealt).toBe(0);
    }
    expect(enemyCu.activeConditions.some((c) => c.type === 'CHARMED' && c.durationTurns === 1)).toBe(true);
    expect(enemyCu.faction).toBe('PLAYER');
    // Charming the sole living enemy does NOT prematurely end the encounter
    expect(state.outcome).toBe('IN_PROGRESS');

    // End Philanderer's turn -> Enemy takes 1 charmed turn on PLAYER faction, then reverts to ENEMY at turn end
    enemyCu.initiativeGauge = 200;
    endActiveTurn(state);
    expect(state.activeUnitId).toBe('enemy');
    expect(enemyCu.faction).toBe('PLAYER');
    endActiveTurn(state);
    expect(enemyCu.activeConditions.some((c) => c.type === 'CHARMED')).toBe(false);
    expect(enemyCu.faction).toBe('ENEMY');

    // 4. Critical Hit: natural 20 -> CRITICAL_HIT -> CHARMED (2t)
    state.activeUnitId = 'phil';
    philCu.currentAp = 3;
    const critRes = executeAbility(
      state,
      'phil',
      BILLET_DOUX,
      { targetUnitId: 'enemy' },
      new MockDiceRoller({ d20Rolls: [20] })
    );
    expect(critRes.type).toBe('ATTACK');
    if (critRes.type === 'ATTACK') {
      expect(critRes.details.hitOutcome).toBe('CRITICAL_HIT');
    }
    expect(enemyCu.activeConditions.some((c) => c.type === 'CHARMED' && c.durationTurns === 2)).toBe(true);
    expect(enemyCu.faction).toBe('PLAYER');
  });

  it('Beckoning Glance pulls target 1 hex, rotates facing toward Philanderer, and applies EXPOSED on Hit (but not on Graze)', () => {
    const arena = createRadialArena(4);
    const phil = createPhilandererUnit('phil', 'Casanova', 'PLAYER');
    const enemy = createRecruit('enemy', 'Archer', { faction: 'ENEMY' });
    (enemy as any).effectiveVitals = { ...enemy.effectiveVitals, maxHp: 30, resolve: 14 };

    arena.setUnitPosition('phil', { q: 0, r: 0 });
    arena.setUnitPosition('enemy', { q: 2, r: 0 });

    const state = createCombatState(arena, [phil, enemy], 'phil');
    const philCu = state.units.get('phil')!;
    const enemyCu = state.units.get('enemy')!;
    enemyCu.facing = HEX_DIRECTIONS.EAST; // facing away from Philanderer at (0, 0)

    // 1. Graze: finesse 4 + d20(7) = 11 vs Resolve 14 -> GRAZE -> no pull, no facing change, no EXPOSED
    philCu.currentAp = 3;
    executeAbility(
      state,
      'phil',
      BECKONING_GLANCE,
      { targetUnitId: 'enemy' },
      new MockDiceRoller({ d20Rolls: [7] })
    );
    expect(arena.getUnitPosition('enemy')).toEqual({ q: 2, r: 0 });
    expect(enemyCu.facing).toBe(HEX_DIRECTIONS.EAST);
    expect(enemyCu.activeConditions.some((c) => c.type === 'EXPOSED')).toBe(false);

    // 2. Solid Hit: finesse 4 + d20(12) = 16 vs Resolve 14 -> pulled to (1, 0), faces WEST toward (0, 0), EXPOSED
    executeAbility(
      state,
      'phil',
      BECKONING_GLANCE,
      { targetUnitId: 'enemy' },
      new MockDiceRoller({ d20Rolls: [12] })
    );
    expect(arena.getUnitPosition('enemy')).toEqual({ q: 1, r: 0 });
    expect(enemyCu.facing).toBe(HEX_DIRECTIONS.WEST);
    expect(enemyCu.activeConditions.some((c) => c.type === 'EXPOSED' && c.durationTurns === 1)).toBe(true);
  });

  it('Looking-Glass Glare deals 1d4 + Focus magical damage and inflicts BLINDED on Hit (clamping range to 1, imposing Disadvantage, and disabling stealth detection)', () => {
    const arena = createRadialArena(4);
    const phil = createPhilandererUnit('phil', 'Casanova', 'PLAYER');
    const enemy = createRecruit('enemy', 'Enemy Mage', { faction: 'ENEMY' });
    (enemy as any).effectiveVitals = { ...enemy.effectiveVitals, maxHp: 30, resolve: 12, ward: 0 };

    arena.setUnitPosition('phil', { q: 0, r: 0 });
    arena.setUnitPosition('enemy', { q: 2, r: 0 });

    const state = createCombatState(arena, [phil, enemy], 'phil');
    const philCu = state.units.get('phil')!;
    const enemyCu = state.units.get('enemy')!;

    // Solid Hit: focus 2 + d20(14) = 16 vs Resolve 12; damage = 1d4(3) + focus(2) = 5
    const hitRes = executeAbility(
      state,
      'phil',
      LOOKING_GLASS_GLARE,
      { targetUnitId: 'enemy' },
      new MockDiceRoller({ d20Rolls: [14], damageRolls: [3] })
    );
    expect(hitRes.type).toBe('ATTACK');
    if (hitRes.type === 'ATTACK') {
      expect(hitRes.details.hitOutcome).toBe('SOLID_HIT');
      expect(hitRes.details.damageDealt).toBe(5);
    }
    expect(enemyCu.activeConditions.some((c) => c.type === 'BLINDED' && c.durationTurns === 1)).toBe(true);

    // Switch turn to Blinded enemy at (2, 0)
    state.activeUnitId = 'enemy';
    enemyCu.currentAp = 3;

    // 1. Range clamped to 1: cannot cast Spark (range 3) at Philanderer at distance 2
    const rangedCheck = canExecuteAbility(state, 'enemy', SPARK, { targetUnitId: 'phil' });
    expect(rangedCheck.valid).toBe(false);

    // 2. Move enemy adjacent to (1, 0): cannot detect Stealthed unit in front arc while Blinded
    arena.setUnitPosition('enemy', { q: 1, r: 0 });
    enemyCu.facing = HEX_DIRECTIONS.WEST;
    applyConditionToUnit(philCu, 'STEALTH', 1, 'phil');
    expect(evaluateFrontArcDetection(state, 'enemy', { q: 1, r: 0 }, HEX_DIRECTIONS.WEST, 'TURN_START')).toHaveLength(0);
    philCu.activeConditions = [];

    // 3. Melee attack at distance 1 rolls with Disadvantage from BLINDED
    const blindStrike = executeAbility(
      state,
      'enemy',
      STRIKE,
      { targetUnitId: 'phil' },
      new MockDiceRoller({ d20Rolls: [18, 6], damageRolls: [3] })
    );
    expect(blindStrike.type).toBe('ATTACK');
    if (blindStrike.type === 'ATTACK') {
      expect(blindStrike.details.diceBreakdown?.advantage).toBe('DISADVANTAGE');
      expect(blindStrike.details.d20Roll).toBe(6);
    }
  });

  it('Captivating Presence penalizes enemies within 3 hexes in the FRONT arc by -2 Attack Roll when attacking Philanderer or allies', () => {
    const arena = createRadialArena(4);
    const phil = createPhilandererUnit('phil', 'Casanova', 'PLAYER');
    const ally = createRecruit('ally', 'Vanguard Ally', { faction: 'PLAYER' });
    const frontEnemy = createRecruit('front', 'Front Enemy', { faction: 'ENEMY' });
    const rearEnemy = createRecruit('rear', 'Rear Enemy', { faction: 'ENEMY' });

    arena.setUnitPosition('phil', { q: 0, r: 0 });
    arena.setUnitPosition('ally', { q: 1, r: 1 });
    arena.setUnitPosition('front', { q: 1, r: 0 }); // distance 1 in Philanderer's FRONT arc (EAST)
    arena.setUnitPosition('rear', { q: -1, r: 0 }); // distance 1 in Philanderer's REAR arc (WEST)

    const state = createCombatState(arena, [phil, ally, frontEnemy, rearEnemy], 'front');
    const philCu = state.units.get('phil')!;
    philCu.facing = HEX_DIRECTIONS.EAST;

    // Front enemy attacks Ally -> suffers -2 from Captivating Presence
    state.units.get('front')!.currentAp = 3;
    const frontAtk = executeAbility(
      state,
      'front',
      STRIKE,
      { targetUnitId: 'ally' },
      new MockDiceRoller({ d20Rolls: [15], damageRolls: [3] })
    );
    expect(frontAtk.type).toBe('ATTACK');
    if (frontAtk.type === 'ATTACK') {
      expect(frontAtk.details.modifier).toBe(-2);
    }

    // Rear enemy attacks Philanderer from behind -> 0 aura penalty
    state.activeUnitId = 'rear';
    state.units.get('rear')!.currentAp = 3;
    const rearAtk = executeAbility(
      state,
      'rear',
      STRIKE,
      { targetUnitId: 'phil' },
      new MockDiceRoller({ d20Rolls: [15], damageRolls: [3] })
    );
    expect(rearAtk.type).toBe('ATTACK');
    if (rearAtk.type === 'ATTACK') {
      expect(rearAtk.details.modifier).toBe(0);
    }
  });
});
