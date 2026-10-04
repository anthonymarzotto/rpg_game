import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { createRecruit } from '../units/unitFactory';
import { createCombatState, executeAbility } from './resolver';
import { canExecuteAbility } from './validator';
import { endActiveTurn } from './turnClock';
import { MockDiceRoller } from './dice';
import { AbilityModifier } from '../types/modifier';
import { getEffectiveAbility } from './modifiers';
import { SPARK, SPELL_SCULPT, CLEAVE } from '../../data/packages';

describe('Ability Pipeline Integration: Primers, Overclocks & Attributions', () => {
  it('integrates in-combat primer (Spell Sculpt): modifies ability, tracks attribution, executes at extended range, and auto-consumes', () => {
    const arena = createRadialArena(5);
    const sorcerer = createRecruit('sorcerer', 'Sorcerer', { faction: 'PLAYER' });
    const enemy = createRecruit('enemy', 'Enemy Target', { faction: 'ENEMY' });

    // Sorcerer at (0, 0), enemy at (4, 0). SPARK default range is 3.
    arena.setUnitPosition('sorcerer', { q: 0, r: 0 });
    arena.setUnitPosition('enemy', { q: 4, r: 0 });

    const state = createCombatState(arena, [sorcerer, enemy], 'sorcerer');
    const sorcCu = state.units.get('sorcerer')!;
    sorcCu.currentAp = 3;

    // 1. Initial State: Spark cannot target at distance 4
    const initialCheck = canExecuteAbility(state, 'sorcerer', SPARK, { targetUnitId: 'enemy' });
    expect(initialCheck.valid).toBe(false);

    // Initial effective ability has no attributions
    const baseEffective = getEffectiveAbility(SPARK, sorcCu.abilityModifiers);
    expect(baseEffective.range).toBe(3);
    expect(baseEffective.attributions).toEqual([]);

    // 2. Cast Spell Sculpt to activate in-combat primer
    const primerResult = executeAbility(state, 'sorcerer', SPELL_SCULPT, {}, new MockDiceRoller());
    expect(primerResult.type).toBe('BUFF');
    expect(sorcCu.abilityModifiers.some((m) => m.id === 'spell_sculpt')).toBe(true);

    // 3. Inspect Effective Ability with active primer
    const modifiedEffective = getEffectiveAbility(SPARK, sorcCu.abilityModifiers);
    expect(modifiedEffective.range).toBe(4);
    expect(modifiedEffective.aoeRadius).toBe(1);
    expect(modifiedEffective.attributions).toHaveLength(2);

    const rangeAttr = modifiedEffective.attributions.find((a) => a.property === 'range');
    expect(rangeAttr).toBeDefined();
    expect(rangeAttr?.sourceName).toBe('Spell Sculpt');
    expect(rangeAttr?.changeLabel).toBe('+1 Range');

    const aoeAttr = modifiedEffective.attributions.find((a) => a.property === 'aoeRadius');
    expect(aoeAttr).toBeDefined();
    expect(aoeAttr?.sourceName).toBe('Spell Sculpt');
    expect(aoeAttr?.changeLabel).toBe('+1 AoE Radius');

    // 4. Validate and Execute Spark at Range 4
    const validCheck = canExecuteAbility(state, 'sorcerer', SPARK, { targetUnitId: 'enemy' });
    expect(validCheck.valid).toBe(true);

    const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [5] });
    const attackResult = executeAbility(state, 'sorcerer', SPARK, { targetUnitId: 'enemy' }, dice);
    expect(attackResult.type).toBe('ATTACK');
    if (attackResult.type === 'ATTACK') {
      expect(attackResult.details.hitOutcome).toBe('SOLID_HIT');
      expect(attackResult.details.damageDealt).toBeGreaterThan(0);
    }

    // 5. Verify primer was consumed on use
    expect(sorcCu.abilityModifiers.some((m) => m.id === 'spell_sculpt')).toBe(false);

    // 6. Next Spark check falls back to base range 3 and fails
    sorcCu.currentAp = 2;
    const postConsumeCheck = canExecuteAbility(state, 'sorcerer', SPARK, { targetUnitId: 'enemy' });
    expect(postConsumeCheck.valid).toBe(false);
  });

  it('integrates permanent overclock (Bear Strength): upgrades die tier and flat damage across multiple combat turns', () => {
    const arena = createRadialArena(3);
    const warrior = createRecruit('warrior', 'Warrior', { faction: 'PLAYER' });
    const enemy = createRecruit('enemy', 'Enemy Brute', { faction: 'ENEMY' });

    arena.setUnitPosition('warrior', { q: 0, r: 0 });
    arena.setUnitPosition('enemy', { q: 1, r: 0 });

    const state = createCombatState(arena, [warrior, enemy], 'warrior');
    const warriorCu = state.units.get('warrior')!;
    warriorCu.currentAp = 3;

    // Attach permanent Overclock: Bear Strength (1d4 -> 1d6, +2 Flat Damage to Cleave)
    const bearStrength: AbilityModifier = {
      id: 'bear_strength',
      name: 'Bear Strength',
      targetAbilityIds: ['cleave'],
      isPermanent: true,
      effectPatches: {
        diceStep: 1,
        flatDamage: 2
      }
    };
    warriorCu.abilityModifiers.push(bearStrength);

    // 1. Inspect Effective Ability
    const effective = getEffectiveAbility(CLEAVE, warriorCu.abilityModifiers);
    const damageEffect = effective.effects.find((e) => e.type === 'DAMAGE')!;
    expect(damageEffect.damageProfile?.sides).toBe(6);
    expect(damageEffect.flatDamage).toBe(2);

    expect(effective.attributions).toHaveLength(1);
    expect(effective.attributions[0].property).toBe('damageProfile');
    expect(effective.attributions[0].sourceName).toBe('Bear Strength');
    expect(effective.attributions[0].changeLabel).toContain('1d4 -> 1d6');
    expect(effective.attributions[0].changeLabel).toContain('+2 Dmg');

    // 2. First Execution: Roll d20: 12 (12 + 10 finesse = 22 vs Evasion 20 -> SOLID_HIT)
    // Damage: 1d6(roll 5) + 10 force + 2 flat = 17 - 10 armor = 7
    const dice1 = new MockDiceRoller({ d20Rolls: [12], damageRolls: [5] });
    const res1 = executeAbility(state, 'warrior', CLEAVE, { targetUnitId: 'enemy' }, dice1);
    expect(res1.type).toBe('ATTACK');
    if (res1.type === 'ATTACK') {
      expect(res1.details.hitOutcome).toBe('SOLID_HIT');
      expect(res1.details.damageDealt).toBe(7);
    }

    // 3. Modifier is permanent, so it remains after use
    expect(warriorCu.abilityModifiers.some((m) => m.id === 'bear_strength')).toBe(true);

    // 4. End Turn and Advance Round
    endActiveTurn(state);
    expect(warriorCu.abilityModifiers.some((m) => m.id === 'bear_strength')).toBe(true);

    // 5. Second Execution: Still utilizes upgraded 1d6 + 2 damage profile
    warriorCu.currentAp = 2;
    // d20: 14 (14 + 10 = 24 vs 20) -> SOLID_HIT, damage roll: 6 + 10 + 2 = 18 - 10 = 8
    const dice2 = new MockDiceRoller({ d20Rolls: [14], damageRolls: [6] });
    const res2 = executeAbility(state, 'warrior', CLEAVE, { targetUnitId: 'enemy' }, dice2);
    expect(res2.type).toBe('ATTACK');
    if (res2.type === 'ATTACK') {
      expect(res2.details.hitOutcome).toBe('SOLID_HIT');
      expect(res2.details.damageDealt).toBe(8);
    }
  });

  it('combines permanent overclock and in-combat primer: resolves both sets of modifications and consumes only the ephemeral primer', () => {
    const arena = createRadialArena(5);
    const mage = createRecruit('mage', 'Battle Mage', { faction: 'PLAYER' });
    const enemy = createRecruit('enemy', 'Target Fiend', { faction: 'ENEMY' });

    arena.setUnitPosition('mage', { q: 0, r: 0 });
    arena.setUnitPosition('enemy', { q: 4, r: 0 });

    const state = createCombatState(arena, [mage, enemy], 'mage');
    const mageCu = state.units.get('mage')!;
    mageCu.currentAp = 3;

    // Permanent Overclock: Arcane Focus (+2 Flat Damage to Spark)
    const arcaneFocus: AbilityModifier = {
      id: 'arcane_focus',
      name: 'Arcane Focus',
      targetAbilityIds: ['spark'],
      isPermanent: true,
      effectPatches: {
        flatDamage: 2
      }
    };

    // Ephemeral Primer: Spell Sculpt (+1 Range, +1 AoE, consumes on use)
    const spellSculptMod: AbilityModifier = {
      id: 'spell_sculpt',
      name: 'Spell Sculpt',
      targetArchetypes: ['MAGE'],
      deltas: {
        range: 1,
        aoeRadius: 1
      },
      consumesOnUse: true
    };

    mageCu.abilityModifiers.push(arcaneFocus, spellSculptMod);

    // Inspect effective ability merging both modifiers
    const effective = getEffectiveAbility(SPARK, mageCu.abilityModifiers);
    expect(effective.range).toBe(4);
    expect(effective.aoeRadius).toBe(1);
    const dmg = effective.effects.find((e) => e.type === 'DAMAGE')!;
    expect(dmg.flatDamage).toBe(2);

    expect(effective.attributions).toHaveLength(3);
    expect(effective.attributions.some((a) => a.sourceName === 'Arcane Focus')).toBe(true);
    expect(effective.attributions.some((a) => a.sourceName === 'Spell Sculpt')).toBe(true);

    // Target is at range 4 (valid due to Spell Sculpt)
    const check = canExecuteAbility(state, 'mage', SPARK, { targetUnitId: 'enemy' });
    expect(check.valid).toBe(true);

    // Execute ability
    const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [4] });
    const result = executeAbility(state, 'mage', SPARK, { targetUnitId: 'enemy' }, dice);
    expect(result.type).toBe('ATTACK');

    // Ephemeral primer is consumed, permanent overclock remains
    expect(mageCu.abilityModifiers.some((m) => m.id === 'spell_sculpt')).toBe(false);
    expect(mageCu.abilityModifiers.some((m) => m.id === 'arcane_focus')).toBe(true);

    // Subsequent effective ability keeps flat damage +2, but range is back to 3
    const nextEffective = getEffectiveAbility(SPARK, mageCu.abilityModifiers);
    expect(nextEffective.range).toBe(3);
    expect(nextEffective.effects.find((e) => e.type === 'DAMAGE')?.flatDamage).toBe(2);
  });
});
