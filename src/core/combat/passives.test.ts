import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { createRecruit } from '../units/unitFactory';
import { createCombatState, executeAbility, executeMove } from './resolver';
import { advanceTurnClock, endActiveTurn } from './turnClock';
import { getEffectiveSpeed, getEffectiveArmor, getEffectiveWard } from './effectiveVitals';
import { MockDiceRoller } from './dice';
import { resolveDamage } from './damageEngine';
import {
  MOMENTUM,
  UNYIELDING,
  QUICKSTEP,
  ARCANE_AEGIS,
  STRIKE
} from '../../data/packages';
import {
  getPassiveStatModifier,
  evaluateRollPassives,
  onTurnStartPassives
} from './passives';
import { CombatUnit } from './types';
import { Unit } from '../types/unit';

function createTestCombatUnit(passives: CombatUnit['passives'] = []): CombatUnit {
  const recruit = createRecruit('hero', 'Hero');
  return {
    unit: recruit,
    faction: recruit.faction,
    currentHp: recruit.effectiveVitals.maxHp,
    currentAp: recruit.effectiveVitals.maxAp,
    initiativeGauge: 0,
    isDefeated: false,
    inBattleXp: { fighter: 0, rogue: 0, mage: 0 },
    activeModifiers: [],
    activeConditions: [],
    abilityModifiers: [],
    abilities: [],
    passives,
    facing: 0
  };
}

describe('Phase 1.3: Passive Trait Evaluation Pipeline', () => {
  describe('Headless Passive Evaluator Functions', () => {
    it('getPassiveStatModifier returns 0 when passives array is empty or undefined', () => {
      expect(getPassiveStatModifier(undefined, 'armor')).toBe(0);
      expect(getPassiveStatModifier([], 'speed')).toBe(0);
    });

    it('getPassiveStatModifier sums modifiers across multiple passives', () => {
      const passives = [UNYIELDING, QUICKSTEP, ARCANE_AEGIS];
      expect(getPassiveStatModifier(passives, 'armor')).toBe(1);
      expect(getPassiveStatModifier(passives, 'speed')).toBe(2);
      expect(getPassiveStatModifier(passives, 'ward')).toBe(1);
      expect(getPassiveStatModifier(passives, 'evasion')).toBe(0);
    });

    it('evaluateRollPassives checks distance threshold and consumes trigger', () => {
      const cu = createTestCombatUnit([MOMENTUM]);
      cu.hexesMovedThisTurn = 1;

      // 1 hex < 2 minHexes -> no advantage
      const res1 = evaluateRollPassives(cu);
      expect(res1.grantsAdvantage).toBe(false);
      expect(cu.hexesMovedThisTurn).toBe(1);

      // 2 hexes >= 2 minHexes -> grants advantage and consumes
      cu.hexesMovedThisTurn = 2;
      const res2 = evaluateRollPassives(cu);
      expect(res2.grantsAdvantage).toBe(true);
      expect(cu.hexesMovedThisTurn).toBe(0);
    });

    it('onTurnStartPassives resets turn-scoped counters', () => {
      const cu = createTestCombatUnit();
      cu.hexesMovedThisTurn = 3;
      onTurnStartPassives(cu);
      expect(cu.hexesMovedThisTurn).toBe(0);
    });
  });

  describe('Cross-Class Wildcard Passives Integration', () => {
    it('Warrior with innate Unyielding (+1 Armor) + wildcard Momentum gets both benefits', () => {
      const heroUnit: Unit = {
        ...createRecruit('warrior_hero', 'Alden'),
        progression: {
          unitId: 'warrior_hero',
          currentLevel: 1,
          archetypePoints: { fighter: 1, rogue: 0, mage: 0 },
          constellation: ['warrior']
        },
        loadout: {
          activeClassId: 'warrior',
          wildcardAbilityIds: [],
          wildcardPassiveIds: ['momentum']
        }
      };

      const goblin = createRecruit('goblin', 'Goblin');
      const arena = createRadialArena(3);
      arena.setUnitPosition('warrior_hero', { q: 0, r: 0 });
      arena.setUnitPosition('goblin', { q: 2, r: 0 });

      const state = createCombatState(arena, [heroUnit, goblin], 'warrior_hero');
      const heroCu = state.units.get('warrior_hero')!;

      // 1. Check Unyielding passive gives +1 Armor
      expect(heroCu.passives.some((p) => p.id === 'unyielding')).toBe(true);
      expect(heroCu.passives.some((p) => p.id === 'momentum')).toBe(true);
      expect(getEffectiveArmor(heroCu)).toBe(heroUnit.effectiveVitals.armor + 1);

      // 2. Move 2 hexes towards goblin
      executeMove(state, 'warrior_hero', { q: 1, r: -1 });
      executeMove(state, 'warrior_hero', { q: 1, r: 0 });
      expect(heroCu.hexesMovedThisTurn).toBe(2);

      // 3. Attack with Strike (Warrior core ability) -> Momentum triggers Advantage
      const dice = new MockDiceRoller({ d20Rolls: [4, 17], damageRolls: [5] });
      const result = executeAbility(state, 'warrior_hero', STRIKE, { targetUnitId: 'goblin' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.d20Roll).toBe(17); // Picked higher d20 roll from Advantage
        expect(result.details.hitOutcome).toBe('SOLID_HIT');
      }

      // 4. Momentum consumed
      expect(heroCu.hexesMovedThisTurn).toBe(0);
    });

    it('Thief with innate Quickstep (+2 Speed) + wildcard Unyielding (+1 Armor) stacks properly', () => {
      const thiefUnit: Unit = {
        ...createRecruit('thief_hero', 'Lyra'),
        progression: {
          unitId: 'thief_hero',
          currentLevel: 1,
          archetypePoints: { fighter: 0, rogue: 1, mage: 0 },
          constellation: ['thief', 'warrior']
        },
        loadout: {
          activeClassId: 'thief',
          wildcardAbilityIds: [],
          wildcardPassiveIds: ['unyielding']
        }
      };

      const arena = createRadialArena(3);
      arena.setUnitPosition('thief_hero', { q: 0, r: 0 });
      const state = createCombatState(arena, [thiefUnit]);
      const thiefCu = state.units.get('thief_hero')!;

      // Base Speed 12 + 2 = 14
      expect(getEffectiveSpeed(thiefCu)).toBe(thiefUnit.effectiveVitals.speed + 2);
      // Base Armor 0 + 1 = 1
      expect(getEffectiveArmor(thiefCu)).toBe(thiefUnit.effectiveVitals.armor + 1);
    });

    it('Wizard with innate Arcane Aegis (+1 Ward) + wildcard Quickstep (+2 Speed) stacks properly', () => {
      const wizardUnit: Unit = {
        ...createRecruit('wizard_hero', 'Vael'),
        progression: {
          unitId: 'wizard_hero',
          currentLevel: 1,
          archetypePoints: { fighter: 0, rogue: 0, mage: 1 },
          constellation: ['wizard', 'thief']
        },
        loadout: {
          activeClassId: 'wizard',
          wildcardAbilityIds: [],
          wildcardPassiveIds: ['quickstep']
        }
      };

      const arena = createRadialArena(3);
      arena.setUnitPosition('wizard_hero', { q: 0, r: 0 });
      const state = createCombatState(arena, [wizardUnit]);
      const wizardCu = state.units.get('wizard_hero')!;

      // Base Ward 0 + 1 = 1
      expect(getEffectiveWard(wizardCu)).toBe(wizardUnit.effectiveVitals.ward + 1);
      // Base Speed 10 + 2 = 12
      expect(getEffectiveSpeed(wizardCu)).toBe(wizardUnit.effectiveVitals.speed + 2);
    });
  });

  describe('Turn Clock Integration', () => {
    it('resets hexesMovedThisTurn when a unit ends their turn or starts their turn via turnClock', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      const enemy = createRecruit('enemy', 'Goblin');

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 2, r: 0 });

      const state = createCombatState(arena, [hero, enemy], 'hero');
      const heroCu = state.units.get('hero')!;

      // Move 1 hex
      executeMove(state, 'hero', { q: 1, r: -1 });
      expect(heroCu.hexesMovedThisTurn).toBe(1);

      // End hero's turn - dismissed immediately at turn end
      endActiveTurn(state);
      expect(heroCu.hexesMovedThisTurn).toBe(0);

      // Now enemy or hero will be active. Set hero to have moved hexes and simulate advanceTurnClock activating hero.
      heroCu.hexesMovedThisTurn = 4;
      heroCu.initiativeGauge = 100; // Force hero to be selected next
      const nextActiveId = advanceTurnClock(state);

      if (nextActiveId === 'hero') {
        expect(heroCu.hexesMovedThisTurn).toBe(0);
      }
    });

    it('only applies Momentum Advantage to the first attack after moving, and dismisses on turn end', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden'); // Novice with Momentum
      const enemy = createRecruit('enemy', 'Goblin');

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 1, r: 0 });

      const state = createCombatState(arena, [hero, enemy], 'hero');
      const heroCu = state.units.get('hero')!;
      heroCu.currentAp = 10;

      // 1. Move 2 hexes to prime Momentum
      executeMove(state, 'hero', { q: 0, r: 1 });
      executeMove(state, 'hero', { q: 0, r: 0 });
      expect(heroCu.hexesMovedThisTurn).toBe(2);

      // 2. First attack gets Advantage from Momentum
      const firstDice = new MockDiceRoller({ d20Rolls: [5, 18], damageRolls: [3] });
      const firstResult = executeAbility(state, 'hero', STRIKE, { targetUnitId: 'enemy' }, firstDice);
      expect(firstResult.type).toBe('ATTACK');
      if (firstResult.type === 'ATTACK') {
        expect(firstResult.details.d20Roll).toBe(18); // Higher roll chosen via Advantage
      }

      // 3. Momentum is consumed after the first attack
      expect(heroCu.hexesMovedThisTurn).toBe(0);

      // 4. Second attack without moving does NOT get Advantage
      const secondDice = new MockDiceRoller({ d20Rolls: [14, 2], damageRolls: [3] });
      const secondResult = executeAbility(state, 'hero', STRIKE, { targetUnitId: 'enemy' }, secondDice);
      expect(secondResult.type).toBe('ATTACK');
      if (secondResult.type === 'ATTACK') {
        expect(secondResult.details.d20Roll).toBe(14); // Normal roll: first d20 taken, not 2
      }

      // 5. Move 2 hexes again to prime Momentum once more
      executeMove(state, 'hero', { q: 0, r: 1 });
      executeMove(state, 'hero', { q: 0, r: 0 });
      expect(heroCu.hexesMovedThisTurn).toBe(2);

      // 6. Ending turn dismisses Momentum
      endActiveTurn(state);
      expect(heroCu.hexesMovedThisTurn).toBe(0);
    });
  });

  describe('Target Armor Passive Evaluation', () => {
    const HIGHWAY_TOLL_MOCK = {
      id: 'highway_toll_mock',
      name: 'Highway Toll Mock',
      description: '+2 flat physical damage vs targets with Armor >= 1',
      hook: 'ALWAYS' as const,
      targetArmorBonus: {
        minArmor: 1,
        flatDamageBonus: 2,
        damageTypeFilter: 'PHYSICAL' as const
      }
    };

    it('adds flat damage bonus when target effective armor is at or above minArmor', () => {
      const actorCu = createTestCombatUnit([HIGHWAY_TOLL_MOCK]);
      const targetCu = createTestCombatUnit();
      // Give target 1 Armor
      targetCu.activeModifiers.push({ stat: 'armor', value: 1, durationTurns: 2 });

      const mockDice = new MockDiceRoller({ damageRolls: [4] });
      // STRIKE: 1d6 + Force (0 Force). Rolled 4 + 2 (Highway Toll) = 6 raw.
      // Mitigation: 1 Armor. Damage dealt: 6 - 1 = 5.
      const result = resolveDamage('SOLID_HIT', STRIKE, actorCu, targetCu, mockDice);

      expect(result.rawDamage).toBe(6);
      expect(result.mitigation).toBe(1);
      expect(result.damageDealt).toBe(5);
      expect(result.damageBreakdown).toContain('+2');
    });

    it('does not add bonus damage when target effective armor is below minArmor', () => {
      const actorCu = createTestCombatUnit([HIGHWAY_TOLL_MOCK]);
      const targetCu = createTestCombatUnit(); // 0 Armor

      const mockDice = new MockDiceRoller({ damageRolls: [4] });
      // STRIKE: 1d6 + Force (0 Force). Rolled 4. 0 Armor.
      // Damage dealt: 4.
      const result = resolveDamage('SOLID_HIT', STRIKE, actorCu, targetCu, mockDice);

      expect(result.rawDamage).toBe(4);
      expect(result.mitigation).toBe(0);
      expect(result.damageDealt).toBe(4);
    });

    it('respects damageTypeFilter when specified', () => {
      const actorCu = createTestCombatUnit([HIGHWAY_TOLL_MOCK]);
      const targetCu = createTestCombatUnit();
      targetCu.activeModifiers.push({ stat: 'armor', value: 2, durationTurns: 2 });

      const magicalAbility = {
        ...STRIKE,
        id: 'magic_test',
        damageType: 'MAGICAL' as const
      };

      const mockDice = new MockDiceRoller({ damageRolls: [4] });
      const result = resolveDamage('SOLID_HIT', magicalAbility, actorCu, targetCu, mockDice);

      // HIGHWAY_TOLL_MOCK filters to PHYSICAL, so magical ability should not gain bonus
      expect(result.rawDamage).toBe(4);
    });
  });
});

