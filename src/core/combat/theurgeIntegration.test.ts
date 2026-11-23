import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { createRecruit } from '../units/unitFactory';
import { createCombatState, executeAbility } from './resolver';
import { canExecuteAbility } from './validator';
import { endActiveTurn } from './turnClock';
import {
  getEffectiveArmor,
  getEffectiveWard,
  getEffectiveMove,
  getEffectiveSpeed,
  getEffectiveStat
} from './effectiveVitals';
import { MockDiceRoller } from './dice';
import {
  THEURGE_PACKAGE,
  HENOSIS,
  ABSOLUTION,
  EMPYREAN_PILLAR,
  THEURGIC_SYNERGY
} from '../../data/packages/theurge';
import { getClassPackage, getAbilityById, getPassiveById } from '../../data/packages';
import { resolveUnitLoadout, LoadoutLookupProviders } from '../units/loadout';
import { applyConditionToUnit } from './effects/conditionHandler';
import { Unit } from '../types/unit';

const testLoadoutProviders: LoadoutLookupProviders = {
  getPackage: getClassPackage,
  getAbility: getAbilityById,
  getPassive: getPassiveById
};

function createTheurgeUnit(id: string, name: string, faction: 'PLAYER' | 'ENEMY' = 'PLAYER'): Unit {
  const recruit = createRecruit(id, name, {
    faction,
    loadout: {
      activeClassId: 'theurge',
      wildcardAbilityIds: [],
      wildcardPassiveIds: []
    }
  });
  (recruit as any).baseAttributes = { force: 2, finesse: 1, focus: 4 };
  (recruit as any).unlockedNodes = ['wizard', 'sorcerer', 'warlock', 'theurge'];
  return recruit;
}

describe('Tier 4 Theurge Integration', () => {
  it('resolves Theurge active class package and allows equipping domain abilities and passive as wildcards', () => {
    const theurge = createTheurgeUnit('t1', 'Iamblichus');
    const resolved = resolveUnitLoadout(theurge, testLoadoutProviders);
    expect(resolved.combatAbilities.map((a) => a.id)).toEqual([
      'henosis',
      'absolution',
      'empyrean_pillar'
    ]);
    expect(resolved.activePassives.some((p) => p.id === THEURGIC_SYNERGY.id)).toBe(true);
    expect(THEURGE_PACKAGE.aiProfile).toBe('SUPPORT');

    const warlockWithWildcards: Unit = {
      ...theurge,
      loadout: {
        activeClassId: 'warlock',
        wildcardAbilityIds: ['absolution', 'empyrean_pillar'],
        wildcardPassiveIds: ['theurgic_synergy']
      }
    };
    const resolvedWildcard = resolveUnitLoadout(warlockWithWildcards, testLoadoutProviders);
    expect(resolvedWildcard.combatAbilities.map((a) => a.id)).toContain('absolution');
    expect(resolvedWildcard.combatAbilities.map((a) => a.id)).toContain('empyrean_pillar');
    expect(resolvedWildcard.activePassives.map((p) => p.id)).toContain('theurgic_synergy');
  });

  it('Henosis elevates ally or self for 2 turns (+2/+2/+2/+1/+1), enforces strict 1-vessel lockout, transitions to 1-turn Mortal Ebb (-1/-1/-1/-1/-1), and blocks Mortal Ebb target while allowing another unit', () => {
    const arena = createRadialArena(4);
    const theurge = createTheurgeUnit('theurge', 'Iamblichus', 'PLAYER');
    const allyA = createRecruit('allyA', 'Vanguard A', { faction: 'PLAYER' });
    const allyB = createRecruit('allyB', 'Vanguard B', { faction: 'PLAYER' });
    const enemy = createRecruit('enemy', 'Enemy Sentry', { faction: 'ENEMY' });

    arena.setUnitPosition('theurge', { q: 0, r: 0 });
    arena.setUnitPosition('allyA', { q: 1, r: 0 });
    arena.setUnitPosition('allyB', { q: 0, r: 1 });
    arena.setUnitPosition('enemy', { q: 3, r: 0 });

    const state = createCombatState(arena, [theurge, allyA, allyB, enemy], 'theurge', testLoadoutProviders);
    const theurgeCu = state.units.get('theurge')!;
    const allyACu = state.units.get('allyA')!;
    const allyBCu = state.units.get('allyB')!;

    const baseArmorA = allyACu.unit.effectiveVitals.armor;
    const baseWardA = allyACu.unit.effectiveVitals.ward;
    const baseMoveA = allyACu.unit.effectiveVitals.move;
    const baseSpeedA = allyACu.unit.effectiveVitals.speed;

    // 1. Cast Henosis on allyA (costs 2 AP)
    theurgeCu.currentAp = 3;
    const res = executeAbility(state, 'theurge', HENOSIS, { targetUnitId: 'allyA' });
    expect(res.type).toBe('BUFF');
    expect(theurgeCu.currentAp).toBe(1);
    expect(allyACu.activeConditions.some((c) => c.type === 'HENOSIS' && c.durationTurns === 2)).toBe(true);

    // Check +2 Attack Roll, +2 Armor, +2 Ward, +1 Move, +1 Speed
    expect(getEffectiveStat(allyACu, 'attackRoll')).toBe(2);
    expect(getEffectiveArmor(allyACu)).toBe(baseArmorA + 2);
    expect(getEffectiveWard(allyACu)).toBe(baseWardA + 2);
    expect(getEffectiveMove(allyACu)).toBe(baseMoveA + 1);
    expect(getEffectiveSpeed(allyACu)).toBe(baseSpeedA + 1);

    // 2. Strict single-vessel lockout: cannot cast Henosis on allyB or self while allyA holds HENOSIS
    theurgeCu.currentAp = 3;
    const lockedOnB = canExecuteAbility(state, 'theurge', HENOSIS, { targetUnitId: 'allyB' });
    expect(lockedOnB.valid).toBe(false);
    const lockedOnSelf = canExecuteAbility(state, 'theurge', HENOSIS, { targetUnitId: 'theurge' });
    expect(lockedOnSelf.valid).toBe(false);

    // 3. Advance through allyA's 2 turns of Henosis
    allyACu.initiativeGauge = 250;
    endActiveTurn(state); // switches to allyA (Turn 1 of Henosis)
    expect(state.activeUnitId).toBe('allyA');
    allyACu.initiativeGauge = 250;
    endActiveTurn(state); // ends allyA Turn 1 -> durationTurns 2 -> 1
    expect(allyACu.activeConditions.find((c) => c.type === 'HENOSIS')?.durationTurns).toBe(1);

    // End allyA Turn 2 -> HENOSIS expires and transitions into 1-turn MORTAL_EBB
    expect(state.activeUnitId).toBe('allyA');
    theurgeCu.initiativeGauge = 250;
    endActiveTurn(state);
    expect(allyACu.activeConditions.some((c) => c.type === 'HENOSIS')).toBe(false);
    expect(allyACu.activeConditions.some((c) => c.type === 'MORTAL_EBB' && c.durationTurns === 1)).toBe(true);

    // Check Mortal Ebb penalties (-1 Attack Roll, -1 Armor, -1 Ward, -1 Move, -1 Speed with floors)
    expect(getEffectiveStat(allyACu, 'attackRoll')).toBe(-1);
    expect(getEffectiveArmor(allyACu)).toBe(Math.max(0, baseArmorA - 1));
    expect(getEffectiveWard(allyACu)).toBe(Math.max(0, baseWardA - 1));
    expect(getEffectiveMove(allyACu)).toBe(Math.max(1, baseMoveA - 1));
    expect(getEffectiveSpeed(allyACu)).toBe(Math.max(1, baseSpeedA - 1));

    // 4. While allyA is in MORTAL_EBB, Theurge cannot re-target allyA with Henosis, but CAN cast Henosis on allyB or self!
    expect(state.activeUnitId).toBe('theurge');
    theurgeCu.currentAp = 3;
    expect(canExecuteAbility(state, 'theurge', HENOSIS, { targetUnitId: 'allyA' }).valid).toBe(false);
    expect(canExecuteAbility(state, 'theurge', HENOSIS, { targetUnitId: 'allyB' }).valid).toBe(true);
    expect(canExecuteAbility(state, 'theurge', HENOSIS, { targetUnitId: 'theurge' }).valid).toBe(true);

    // Cast Henosis on Self
    executeAbility(state, 'theurge', HENOSIS, { targetUnitId: 'theurge' });
    expect(theurgeCu.activeConditions.some((c) => c.type === 'HENOSIS' && c.durationTurns === 2)).toBe(true);

    // 5. Defeat of the active vessel frees the lockout immediately
    theurgeCu.activeConditions = [];
    applyConditionToUnit(allyBCu, 'HENOSIS', 2, 'theurge');
    theurgeCu.currentAp = 3;
    expect(canExecuteAbility(state, 'theurge', HENOSIS, { targetUnitId: 'theurge' }).valid).toBe(false);

    allyBCu.isDefeated = true;
    allyBCu.currentHp = 0;
    arena.removeUnit('allyB');
    expect(canExecuteAbility(state, 'theurge', HENOSIS, { targetUnitId: 'theurge' }).valid).toBe(true);
  });

  it('Absolution purges all negative conditions (while preserving Mortal Ebb) and boosts CTB initiative by +20 on ally or self', () => {
    const arena = createRadialArena(3);
    const theurge = createTheurgeUnit('theurge', 'Iamblichus', 'PLAYER');
    const ally = createRecruit('ally', 'Ally', { faction: 'PLAYER' });
    const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });

    arena.setUnitPosition('theurge', { q: 0, r: 0 });
    arena.setUnitPosition('ally', { q: 1, r: 0 });
    arena.setUnitPosition('enemy', { q: 2, r: 0 });

    const state = createCombatState(arena, [theurge, ally, enemy], 'theurge', testLoadoutProviders);
    const theurgeCu = state.units.get('theurge')!;
    const allyCu = state.units.get('ally')!;

    applyConditionToUnit(allyCu, 'POISON', 2, 'enemy');
    applyConditionToUnit(allyCu, 'BURN', 2, 'enemy');
    applyConditionToUnit(allyCu, 'BLINDED', 1, 'enemy');
    applyConditionToUnit(allyCu, 'EXPOSED', 1, 'enemy');
    applyConditionToUnit(allyCu, 'CHALLENGED', 2, 'enemy');
    applyConditionToUnit(allyCu, 'TELEMETRY', 2, 'enemy');
    applyConditionToUnit(allyCu, 'MORTAL_EBB', 1, 'theurge');

    const startGauge = allyCu.initiativeGauge;
    executeAbility(state, 'theurge', ABSOLUTION, { targetUnitId: 'ally' });

    expect(allyCu.activeConditions.map((c) => c.type)).toEqual(['MORTAL_EBB']);
    expect(allyCu.initiativeGauge).toBe(startGauge + 20);

    // Can also self-cast Absolution
    applyConditionToUnit(theurgeCu, 'POISON', 2, 'enemy');
    const selfStartGauge = theurgeCu.initiativeGauge;
    executeAbility(state, 'theurge', ABSOLUTION, { targetUnitId: 'theurge' });
    expect(theurgeCu.activeConditions.some((c) => c.type === 'POISON')).toBe(false);
    expect(theurgeCu.initiativeGauge).toBe(selfStartGauge + 20);
  });

  it('Empyrean Pillar ignores low-ground elevation penalties, deals 1d4 + Focus magical damage, Delays CTB by 20 on Hit/Crit, and triggers Theurgic Synergy pulse around the Henosis vessel (or self) on Hit/Crit but NOT on Graze', () => {
    const arena = createRadialArena(4);
    const theurge = createTheurgeUnit('theurge', 'Iamblichus', 'PLAYER');
    const vessel = createRecruit('vessel', 'Blessed Knight', { faction: 'PLAYER' });
    const elevatedTarget = createRecruit('target', 'Elevated Sniper', { faction: 'ENEMY' });
    const adjacentToVessel = createRecruit('bystander', 'Frontline Orc', { faction: 'ENEMY' });
    const adjacentToTheurge = createRecruit('flanker', 'Flanking Bandit', { faction: 'ENEMY' });

    (elevatedTarget as any).effectiveVitals = {
      ...elevatedTarget.effectiveVitals,
      maxHp: 30,
      resolve: 14,
      ward: 0
    };

    // Place Theurge at low ground (0,0, elev 0) and target on high cliff (0,-2, elev 2 -> dh = -2)
    arena.setTile({ coord: { q: 0, r: 0 }, elevation: 0, isWalkable: true });
    arena.setTile({ coord: { q: 0, r: -1 }, elevation: 1, isWalkable: true });
    arena.setTile({ coord: { q: 0, r: -2 }, elevation: 2, isWalkable: true });

    arena.setUnitPosition('theurge', { q: 0, r: 0 });
    arena.setUnitPosition('flanker', { q: -1, r: 0 }); // adjacent to Theurge
    arena.setUnitPosition('target', { q: 0, r: -2 });
    arena.setUnitPosition('vessel', { q: 2, r: 0 });
    arena.setUnitPosition('bystander', { q: 3, r: 0 }); // adjacent to Vessel

    const state = createCombatState(
      arena,
      [theurge, vessel, elevatedTarget, adjacentToVessel, adjacentToTheurge],
      'theurge',
      testLoadoutProviders
    );
    const theurgeCu = state.units.get('theurge')!;
    const vesselCu = state.units.get('vessel')!;
    const targetCu = state.units.get('target')!;
    const bystanderCu = state.units.get('bystander')!;
    const flankerCu = state.units.get('flanker')!;

    // 1. Cast Henosis on vessel
    executeAbility(state, 'theurge', HENOSIS, { targetUnitId: 'vessel' });
    theurgeCu.currentAp = 3;
    targetCu.initiativeGauge = 50;
    const initialBystanderHp = bystanderCu.currentHp;
    const initialFlankerHp = flankerCu.currentHp;

    // 2. Solid Hit from low ground (dh = -2): ignoresElevationPenalty means NO Disadvantage and NO -2 penalty!
    // Focus (4) + d20 (11) = 15 vs Resolve 14 -> SOLID_HIT
    // Damage = 1d4(3) + Focus(4) = 7; CTB delayed 50 -> 30; Theurgic Synergy pulses 1 dmg around vessel (hitting bystander)
    const hitRes = executeAbility(
      state,
      'theurge',
      EMPYREAN_PILLAR,
      { targetUnitId: 'target' },
      new MockDiceRoller({ d20Rolls: [11], damageRolls: [3] })
    );
    expect(hitRes.type).toBe('ATTACK');
    if (hitRes.type === 'ATTACK') {
      expect(hitRes.details.hitOutcome).toBe('SOLID_HIT');
      expect(hitRes.details.diceBreakdown?.advantage).toBe('NORMAL');
      expect(hitRes.details.damageDealt).toBe(7);
    }
    expect(targetCu.initiativeGauge).toBe(30);
    expect(bystanderCu.currentHp).toBe(initialBystanderHp - 1);
    expect(flankerCu.currentHp).toBe(initialFlankerHp); // Pulse emitted from vessel, not self

    // 3. Graze outcome: Focus (4) + d20 (8) = 12 vs Resolve 14 -> GRAZE
    // Half damage, NO CTB delay, and NO Theurgic Synergy pulse!
    const grazeRes = executeAbility(
      state,
      'theurge',
      EMPYREAN_PILLAR,
      { targetUnitId: 'target' },
      new MockDiceRoller({ d20Rolls: [8], damageRolls: [4] })
    );
    expect(grazeRes.type).toBe('ATTACK');
    if (grazeRes.type === 'ATTACK') {
      expect(grazeRes.details.hitOutcome).toBe('GRAZE');
    }
    expect(targetCu.initiativeGauge).toBe(30); // unchanged
    expect(bystanderCu.currentHp).toBe(initialBystanderHp - 1); // unchanged

    // 4. Fallback to self when no Henosis vessel is active:
    vesselCu.activeConditions = [];
    const solidHitNoVessel = executeAbility(
      state,
      'theurge',
      EMPYREAN_PILLAR,
      { targetUnitId: 'target' },
      new MockDiceRoller({ d20Rolls: [12], damageRolls: [2] })
    );
    expect(solidHitNoVessel.type).toBe('ATTACK');
    expect(flankerCu.currentHp).toBe(initialFlankerHp - 1); // Pulsed from Theurge self!
  });
});
