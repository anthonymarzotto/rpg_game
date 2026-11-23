import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../../grid/templates';
import { createRecruit } from '../../units/unitFactory';
import { createCombatState, executeAbility } from '../resolver';
import { applyConditionToUnit } from './conditionHandler';
import { MockDiceRoller } from '../dice';
import { Ability } from '../../types/ability';
import { PassiveTrait } from '../../types/passive';

const TEST_MAGICAL_BEAM: Ability = {
  id: 'test_empyrean_pillar',
  name: 'Test Empyrean Pillar',
  description: 'Calls down a vertical column of celestial light.',
  archetypeTag: 'MAGE',
  apCost: 1,
  range: 3,
  ignoresElevationPenalty: true,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'RESOLVE',
  attackModifierAttribute: 'focus',
  damageType: 'MAGICAL',
  effects: [
    {
      type: 'DAMAGE',
      damageProfile: {
        count: 1,
        sides: 4,
        modifierAttribute: 'focus'
      }
    },
    {
      type: 'CTB_DELAY',
      magnitude: 20,
      shout: null
    }
  ]
};

const TEST_CLEANSE_ABILITY: Ability = {
  id: 'test_absolution',
  name: 'Test Absolution',
  description: 'Purges negative status conditions and boosts CTB.',
  archetypeTag: 'MAGE',
  apCost: 1,
  range: 3,
  targetType: 'ALLY',
  defenseTarget: 'NONE',
  damageType: 'NONE',
  effects: [
    {
      type: 'CLEANSE',
      applyOn: 'ALWAYS'
    },
    {
      type: 'INITIATIVE_BOOST',
      magnitude: 20,
      applyOn: 'ALWAYS'
    }
  ]
};

const TEST_THEURGIC_SYNERGY: PassiveTrait = {
  id: 'theurgic_synergy',
  name: 'Theurgic Synergy',
  description: 'Emits a 1-hex radiant pulse around the active Henosis vessel (or self) on magical Solid Hit or Crit.',
  hook: 'ON_HIT',
  triggerFilter: {
    damageType: 'MAGICAL',
    requireSolidHitOrCrit: true
  },
  conduitPulse: {
    linkedCondition: 'HENOSIS',
    fallbackToSelf: true,
    radius: 1,
    damage: 1,
    damageType: 'MAGICAL',
    label: 'SYNERGY'
  }
};

describe('Theurge Conduit Pulse & Cleanse Mechanics', () => {
  it('emits 1 magical damage pulse from the active HENOSIS vessel on a magical Solid Hit', () => {
    const arena = createRadialArena(4);
    const theurge = createRecruit('theurge', 'Theurge', { faction: 'PLAYER' });
    const vessel = createRecruit('vessel', 'Frontline Vessel', { faction: 'PLAYER' });
    const distantTarget = createRecruit('target', 'Distant Target', { faction: 'ENEMY' });
    const adjacentToVessel = createRecruit('bystander', 'Adjacent Enemy', { faction: 'ENEMY' });

    arena.setUnitPosition('theurge', { q: 0, r: 0 });
    arena.setUnitPosition('target', { q: 0, r: -2 });
    // Vessel is across the map at (2, 0) with an enemy adjacent at (3, 0)
    arena.setUnitPosition('vessel', { q: 2, r: 0 });
    arena.setUnitPosition('bystander', { q: 3, r: 0 });

    const state = createCombatState(arena, [theurge, vessel, distantTarget, adjacentToVessel], 'theurge');
    const theurgeCu = state.units.get('theurge')!;
    const vesselCu = state.units.get('vessel')!;
    const bystanderCu = state.units.get('bystander')!;
    (theurgeCu as { passives: readonly PassiveTrait[] }).passives = [TEST_THEURGIC_SYNERGY];

    applyConditionToUnit(vesselCu, 'HENOSIS', 2, 'theurge');
    const initialBystanderHp = bystanderCu.currentHp;

    const dice = new MockDiceRoller({ d20Rolls: [16], damageRolls: [3] });
    executeAbility(state, 'theurge', TEST_MAGICAL_BEAM, { targetUnitId: 'target' }, dice);

    expect(bystanderCu.currentHp).toBe(initialBystanderHp - 1);
  });

  it('falls back to pulsing from self when no HENOSIS vessel is active', () => {
    const arena = createRadialArena(3);
    const theurge = createRecruit('theurge', 'Theurge', { faction: 'PLAYER' });
    const target = createRecruit('target', 'Ranged Enemy', { faction: 'ENEMY' });
    const adjacentEnemy = createRecruit('adj', 'Adjacent Flanker', { faction: 'ENEMY' });

    arena.setUnitPosition('theurge', { q: 0, r: 0 });
    arena.setUnitPosition('target', { q: 0, r: -2 });
    arena.setUnitPosition('adj', { q: 1, r: 0 });

    const state = createCombatState(arena, [theurge, target, adjacentEnemy], 'theurge');
    const theurgeCu = state.units.get('theurge')!;
    const adjCu = state.units.get('adj')!;
    (theurgeCu as { passives: readonly PassiveTrait[] }).passives = [TEST_THEURGIC_SYNERGY];

    const initialAdjHp = adjCu.currentHp;
    const dice = new MockDiceRoller({ d20Rolls: [18], damageRolls: [4] });
    executeAbility(state, 'theurge', TEST_MAGICAL_BEAM, { targetUnitId: 'target' }, dice);

    expect(adjCu.currentHp).toBe(initialAdjHp - 1);
  });

  it('does NOT trigger conduitPulse on a Graze or Miss', () => {
    const arena = createRadialArena(3);
    const theurge = createRecruit('theurge', 'Theurge', { faction: 'PLAYER' });
    const target = createRecruit('target', 'Ranged Enemy', { faction: 'ENEMY' });
    const adjacentEnemy = createRecruit('adj', 'Adjacent Flanker', { faction: 'ENEMY' });

    arena.setUnitPosition('theurge', { q: 0, r: 0 });
    arena.setUnitPosition('target', { q: 0, r: -2 });
    arena.setUnitPosition('adj', { q: 1, r: 0 });

    const state = createCombatState(arena, [theurge, target, adjacentEnemy], 'theurge');
    const theurgeCu = state.units.get('theurge')!;
    const targetCu = state.units.get('target')!;
    const adjCu = state.units.get('adj')!;
    (theurgeCu as { passives: readonly PassiveTrait[] }).passives = [TEST_THEURGIC_SYNERGY];

    const initialAdjHp = adjCu.currentHp;
    const resolveDc = targetCu.unit.effectiveVitals.resolve; // 10 for recruit
    // Roll 8 -> Graze against DC 10
    const grazeDice = new MockDiceRoller({ d20Rolls: [resolveDc - 2], damageRolls: [4] });
    const res = executeAbility(state, 'theurge', TEST_MAGICAL_BEAM, { targetUnitId: 'target' }, grazeDice);
    expect(res.type).toBe('ATTACK');
    if (res.type === 'ATTACK') {
      expect(res.details.hitOutcome).toBe('GRAZE');
    }
    expect(adjCu.currentHp).toBe(initialAdjHp);
  });

  it('CLEANSE purges negative conditions while preserving MORTAL_EBB and HENOSIS', () => {
    const arena = createRadialArena(3);
    const theurge = createRecruit('theurge', 'Theurge', { faction: 'PLAYER' });
    const ally = createRecruit('ally', 'Ally', { faction: 'PLAYER' });

    arena.setUnitPosition('theurge', { q: 0, r: 0 });
    arena.setUnitPosition('ally', { q: 1, r: 0 });

    const state = createCombatState(arena, [theurge, ally], 'theurge');
    const allyCu = state.units.get('ally')!;
    const startGauge = allyCu.initiativeGauge;

    applyConditionToUnit(allyCu, 'POISON', 2, 'enemy');
    applyConditionToUnit(allyCu, 'BLINDED', 1, 'enemy');
    applyConditionToUnit(allyCu, 'EXPOSED', 1, 'enemy');
    applyConditionToUnit(allyCu, 'MORTAL_EBB', 1, 'theurge');

    executeAbility(state, 'theurge', TEST_CLEANSE_ABILITY, { targetUnitId: 'ally' });

    expect(allyCu.activeConditions.some((c) => c.type === 'POISON')).toBe(false);
    expect(allyCu.activeConditions.some((c) => c.type === 'BLINDED')).toBe(false);
    expect(allyCu.activeConditions.some((c) => c.type === 'EXPOSED')).toBe(false);
    expect(allyCu.activeConditions.some((c) => c.type === 'MORTAL_EBB')).toBe(true);
    expect(allyCu.initiativeGauge).toBe(startGauge + 20);
  });
});
