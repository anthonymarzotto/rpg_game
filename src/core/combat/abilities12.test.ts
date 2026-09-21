import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { createRecruit } from '../units/unitFactory';
import { createCombatState, executeAbility, executeMove } from './resolver';
import { getEffectiveSpeed, getEffectiveArmor, getEffectiveWard } from './effectiveVitals';
import { MockDiceRoller } from './dice';
import {
  CLEAVE,
  SHADOW_STEP,
  SPARK,
  STRIKE
} from '../../data/packages';
import { Unit } from '../types/unit';
import { computeDerivedVitals } from '../units/vitals';
import { CombatEvent } from './types';

describe('Phase 1.2: Foundational Abilities & Passive Mechanics', () => {
  describe('Novice Momentum Passive', () => {
    it('grants Advantage on a physical attack (Finesse) after moving 2 hexes', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden'); // Novice with Momentum
      const goblin = createRecruit('goblin', 'Goblin');

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('goblin', { q: 2, r: 0 });

      const state = createCombatState(arena, [hero, goblin], 'hero');

      // Move 1 hex: (0, 0) -> (1, 0)
      executeMove(state, 'hero', { q: 1, r: -1 });
      // Move 2nd hex: (1, -1) -> (1, 0) (adjacent to goblin)
      executeMove(state, 'hero', { q: 1, r: 0 });

      const heroCu = state.units.get('hero')!;
      expect(heroCu.hexesMovedThisTurn).toBe(2);

      // Hero has Momentum. Strike should roll with Advantage.
      // Mock dice roller supplies 2 d20 rolls: 6 and 18. Advantage will pick 18!
      const dice = new MockDiceRoller({ d20Rolls: [6, 18], damageRolls: [4] });
      const result = executeAbility(state, 'hero', STRIKE, { targetUnitId: 'goblin' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.d20Roll).toBe(18); // Picked the higher roll via Advantage
        expect(result.details.hitOutcome).toBe('SOLID_HIT');
      }

      // Momentum is consumed after the attack
      expect(heroCu.hexesMovedThisTurn).toBe(0);
    });

    it('grants Advantage on a magical spell (Focus) after moving 2 hexes', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      const goblin = createRecruit('goblin', 'Goblin');

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('goblin', { q: 2, r: 0 });

      const state = createCombatState(arena, [hero, goblin], 'hero');

      // Move 2 hexes: (0, 0) -> (1, -1) -> (0, -1)
      executeMove(state, 'hero', { q: 1, r: -1 });
      executeMove(state, 'hero', { q: 0, r: -1 });

      // Cast Spark (Focus attack)
      const dice = new MockDiceRoller({ d20Rolls: [4, 16], damageRolls: [5] });
      const result = executeAbility(state, 'hero', SPARK, { targetUnitId: 'goblin' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.d20Roll).toBe(16); // Advantage applied to spell
      }
    });

    it('does NOT grant Advantage when moving only 1 hex', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      const goblin = createRecruit('goblin', 'Goblin');

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('goblin', { q: 1, r: 0 });

      const state = createCombatState(arena, [hero, goblin], 'hero');

      // Move only 1 hex: (0, 0) -> (0, 1)
      executeMove(state, 'hero', { q: 0, r: 1 });

      // Mock dice roller supplies single d20: 8
      const dice = new MockDiceRoller({ d20Rolls: [8], damageRolls: [3] });
      const result = executeAbility(state, 'hero', STRIKE, { targetUnitId: 'goblin' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.d20Roll).toBe(8); // Single roll, no advantage
      }
    });
  });

  describe('Thief Shadow Step (Phase Teleportation)', () => {
    it('phases directly past an intermediate body-blocking unit to an open hex behind them', () => {
      const arena = createRadialArena(3);
      const thiefUnit: Unit = {
        ...createRecruit('thief', 'Rogue'),
        loadout: { activeClassId: 'thief', wildcardAbilityIds: [], wildcardPassiveIds: [] }
      };
      const enemy = createRecruit('enemy', 'Guard');

      // Thief at (0, 0), Guard body-blocking at (1, 0), open hex behind at (2, 0)
      arena.setUnitPosition('thief', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 1, r: 0 });

      const state = createCombatState(arena, [thiefUnit, enemy], 'thief');

      // Distance from (0, 0) to (2, 0) is 2 hexes. Standard LoS is body-blocked by Guard.
      // Shadow Step should succeed and teleport Thief to (2, 0).
      const result = executeAbility(state, 'thief', SHADOW_STEP, { coord: { q: 2, r: 0 } });

      expect(result.type).toBe('BUFF');
      expect(arena.getUnitPosition('thief')).toEqual({ q: 2, r: 0 });
      expect(state.units.get('thief')!.currentAp).toBe(2); // 3 - 1 = 2 AP remaining
      expect(state.combatLog[0].message).toContain('Shadow Step');
    });

    it('rejects Shadow Step if destination hex is already occupied', () => {
      const arena = createRadialArena(3);
      const thiefUnit: Unit = {
        ...createRecruit('thief', 'Rogue'),
        loadout: { activeClassId: 'thief', wildcardAbilityIds: [], wildcardPassiveIds: [] }
      };
      const enemy1 = createRecruit('enemy1', 'Guard 1');
      const enemy2 = createRecruit('enemy2', 'Guard 2');

      arena.setUnitPosition('thief', { q: 0, r: 0 });
      arena.setUnitPosition('enemy1', { q: 1, r: 0 });
      arena.setUnitPosition('enemy2', { q: 2, r: 0 });

      const state = createCombatState(arena, [thiefUnit, enemy1, enemy2], 'thief');

      expect(() => {
        executeAbility(state, 'thief', SHADOW_STEP, { coord: { q: 2, r: 0 } });
      }).toThrow(/already occupied/);
    });

    it('rejects Shadow Step if destination is out of range (> 2 hexes)', () => {
      const arena = createRadialArena(4);
      const thiefUnit: Unit = {
        ...createRecruit('thief', 'Rogue'),
        loadout: { activeClassId: 'thief', wildcardAbilityIds: [], wildcardPassiveIds: [] }
      };

      arena.setUnitPosition('thief', { q: 0, r: 0 });
      const state = createCombatState(arena, [thiefUnit], 'thief');

      expect(() => {
        executeAbility(state, 'thief', SHADOW_STEP, { coord: { q: 3, r: 0 } });
      }).toThrow(/Target out of range/);
    });
  });

  describe('Warrior Cleave (Frontal Sweep)', () => {
    it('hits primary target and sweeps collateral damage to adjacent frontal enemy', () => {
      const arena = createRadialArena(3);
      const warrior: Unit = {
        ...createRecruit('warrior', 'Alden'),
        faction: 'PLAYER',
        loadout: { activeClassId: 'warrior', wildcardAbilityIds: [], wildcardPassiveIds: [] }
      };
      const goblin1 = { ...createRecruit('g1', 'Goblin 1'), faction: 'ENEMY' as const };
      const goblin2 = { ...createRecruit('g2', 'Goblin 2'), faction: 'ENEMY' as const };

      // Warrior at (0, 0)
      // Primary Target at (1, 0)
      // Shared neighbors between (0, 0) and (1, 0) are (1, -1) and (0, 1).
      // Place Goblin 2 at (1, -1) (frontal arc)
      arena.setUnitPosition('warrior', { q: 0, r: 0 });
      arena.setUnitPosition('g1', { q: 1, r: 0 });
      arena.setUnitPosition('g2', { q: 1, r: -1 });

      const state = createCombatState(arena, [warrior, goblin1, goblin2], 'warrior');

      // Primary hit roll: d20 = 12 (Solid Hit), primary damage = 3 (1d4 + Force).
      // Cleave secondary damage roll = 3.
      const dice = new MockDiceRoller({ d20Rolls: [12], damageRolls: [3, 3] });

      const result = executeAbility(state, 'warrior', CLEAVE, { targetUnitId: 'g1' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        // Should have primary DAMAGE event + collateral DAMAGE event
        const damageEvents = result.details.events.filter((e) => e.type === 'DAMAGE');
        expect(damageEvents).toHaveLength(2);

        const primaryEvent = damageEvents.find((e) => e.targetUnitId === 'g1')!;
        expect(primaryEvent.reason).toBe('ATTACK');

        const collateralEvent = damageEvents.find((e) => e.targetUnitId === 'g2')!;
        expect(collateralEvent.reason).toBe('COLLATERAL');

        expect(state.combatLog[0].message).toContain('Cleave hit Goblin 2');
      }

      // Check HP reduction on both goblins
      expect(state.units.get('g1')!.currentHp).toBe(9); // 12 - 3 = 9
      expect(state.units.get('g2')!.currentHp).toBe(9); // 12 - 3 = 9
    });

    it('prioritizes lowest HP enemy when multiple frontal enemies exist', () => {
      const arena = createRadialArena(3);
      const warrior: Unit = {
        ...createRecruit('warrior', 'Alden'),
        faction: 'PLAYER',
        loadout: { activeClassId: 'warrior', wildcardAbilityIds: [], wildcardPassiveIds: [] }
      };
      const goblin1 = { ...createRecruit('g1', 'Goblin 1'), faction: 'ENEMY' as const };
      const goblin2 = { ...createRecruit('g2', 'Goblin 2'), faction: 'ENEMY' as const }; // 12 HP
      const goblin3 = { ...createRecruit('g3', 'Goblin 3'), faction: 'ENEMY' as const }; // 6 HP

      arena.setUnitPosition('warrior', { q: 0, r: 0 });
      arena.setUnitPosition('g1', { q: 1, r: 0 });
      arena.setUnitPosition('g2', { q: 1, r: -1 }); // frontal hex 1
      arena.setUnitPosition('g3', { q: 0, r: 1 });  // frontal hex 2

      const state = createCombatState(arena, [warrior, goblin1, goblin2, goblin3], 'warrior');
      state.units.get('g3')!.currentHp = 6; // Weaken goblin 3

      const dice = new MockDiceRoller({ d20Rolls: [12], damageRolls: [3, 2] });
      const result = executeAbility(state, 'warrior', CLEAVE, { targetUnitId: 'g1' }, dice);

      if (result.type === 'ATTACK') {
        const collateral = result.details.events.find(
          (e): e is Extract<CombatEvent, { type: 'DAMAGE' }> =>
            e.type === 'DAMAGE' && e.reason === 'COLLATERAL'
        );
        expect(collateral?.targetUnitId).toBe('g3'); // Targeted goblin 3 with lowest HP
      }
    });

    it('does NOT deal collateral damage to friendly units in frontal hexes', () => {
      const arena = createRadialArena(3);
      const warrior: Unit = {
        ...createRecruit('warrior', 'Alden'),
        faction: 'PLAYER',
        loadout: { activeClassId: 'warrior', wildcardAbilityIds: [], wildcardPassiveIds: [] }
      };
      const ally = { ...createRecruit('ally', 'Boran'), faction: 'PLAYER' as const };
      const goblin = { ...createRecruit('g1', 'Goblin'), faction: 'ENEMY' as const };

      arena.setUnitPosition('warrior', { q: 0, r: 0 });
      arena.setUnitPosition('g1', { q: 1, r: 0 });
      arena.setUnitPosition('ally', { q: 1, r: -1 }); // Ally in frontal hex

      const state = createCombatState(arena, [warrior, ally, goblin], 'warrior');

      const dice = new MockDiceRoller({ d20Rolls: [12], damageRolls: [3] });
      const result = executeAbility(state, 'warrior', CLEAVE, { targetUnitId: 'g1' }, dice);

      if (result.type === 'ATTACK') {
        const allyHit = result.details.events.some(
          (e) => e.type === 'DAMAGE' && e.targetUnitId === 'ally'
        );
        expect(allyHit).toBe(false); // No friendly fire
      }
      expect(state.units.get('ally')!.currentHp).toBe(12);
    });
  });

  describe('Passives in Combat Simulation', () => {
    it('applies Quickstep (+2 Speed) to Thief, enabling 14 effective speed and tick 8 activation', () => {
      const arena = createRadialArena(3);
      const warrior = createRecruit('warrior', 'Warrior'); // Speed 10
      const thiefAttributes = { force: 0, finesse: 1, focus: 0 };
      const thief: Unit = {
        ...createRecruit('thief', 'Thief'),
        baseAttributes: thiefAttributes,
        effectiveVitals: computeDerivedVitals(thiefAttributes, 1),
        loadout: { activeClassId: 'thief', wildcardAbilityIds: [], wildcardPassiveIds: [] }
      };

      arena.setUnitPosition('warrior', { q: 0, r: 0 });
      arena.setUnitPosition('thief', { q: 1, r: 0 });

      const state = createCombatState(arena, [warrior, thief]);

      const warriorCu = state.units.get('warrior')!;
      const thiefCu = state.units.get('thief')!;

      expect(getEffectiveSpeed(warriorCu)).toBe(10);
      expect(getEffectiveSpeed(thiefCu)).toBe(14); // 10 base + 2 finesse + 2 Quickstep

      // First unit to act should be Thief at tick 8 (112 gauge vs 80 gauge on Warrior)
      expect(state.activeUnitId).toBe('thief');
      expect(thiefCu.initiativeGauge).toBe(112);
      expect(warriorCu.initiativeGauge).toBe(80);
    });

    it('applies Unyielding (+1 Armor) to Warrior, reducing incoming physical damage', () => {
      const arena = createRadialArena(3);
      const warriorAttributes = { force: 1, finesse: 0, focus: 0 };
      const warrior: Unit = {
        ...createRecruit('warrior', 'Warrior'),
        baseAttributes: warriorAttributes,
        effectiveVitals: computeDerivedVitals(warriorAttributes, 1),
        loadout: { activeClassId: 'warrior', wildcardAbilityIds: [], wildcardPassiveIds: [] }
      };
      const enemy = createRecruit('enemy', 'Enemy');

      arena.setUnitPosition('warrior', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 1, r: 0 });

      const state = createCombatState(arena, [enemy, warrior], 'enemy');
      const warriorCu = state.units.get('warrior')!;

      // Armor = 1 (Force) + 1 (Unyielding) = 2
      expect(getEffectiveArmor(warriorCu)).toBe(2);

      // Enemy strikes with 1d6. Roll 4. Against Armor 2, damage is 4 - 2 = 2.
      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [4] });
      const result = executeAbility(state, 'enemy', STRIKE, { targetUnitId: 'warrior' }, dice);

      if (result.type === 'ATTACK') {
        expect(result.details.mitigation).toBe(2);
        expect(result.details.damageDealt).toBe(2);
      }
    });

    it('applies Arcane Aegis (+1 Ward) to Wizard, absorbing incoming magical damage', () => {
      const arena = createRadialArena(3);
      const wizardAttributes = { force: 0, finesse: 0, focus: 1 };
      const wizard: Unit = {
        ...createRecruit('wizard', 'Wizard'),
        baseAttributes: wizardAttributes,
        effectiveVitals: computeDerivedVitals(wizardAttributes, 1),
        loadout: { activeClassId: 'wizard', wildcardAbilityIds: [], wildcardPassiveIds: [] }
      };
      const enemy = createRecruit('enemy', 'Enemy');

      arena.setUnitPosition('wizard', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 2, r: 0 });

      const state = createCombatState(arena, [enemy, wizard], 'enemy');
      const wizardCu = state.units.get('wizard')!;

      // Ward = 1 (Focus) + 1 (Arcane Aegis) = 2
      expect(getEffectiveWard(wizardCu)).toBe(2);

      // Enemy casts Spark (1d6 magical). Roll 5. Against Ward 2, damage is 5 - 2 = 3.
      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [5] });
      const result = executeAbility(state, 'enemy', SPARK, { targetUnitId: 'wizard' }, dice);

      if (result.type === 'ATTACK') {
        expect(result.details.mitigation).toBe(2);
        expect(result.details.damageDealt).toBe(3);
      }
    });
  });
});
