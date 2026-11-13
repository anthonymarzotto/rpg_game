import { describe, it, expect, beforeEach } from 'vitest';
import { Arena } from '../../grid/arena';
import { createRadialArena } from '../../grid/templates';
import { createCombatState, executeAbility } from '../resolver';
import { canExecuteAbility } from '../validator';
import { CombatState } from '../types';
import { INTERCEPT_STEP, BASTION_PLANT, CONCUSSIVE_SLAM } from '../../../data/packages/shieldBearer';
import { getEffectiveArmor } from '../effectiveVitals';

import { Unit } from '../../types/unit';

function createMockUnit(
  id: string,
  name: string,
  faction: 'PLAYER' | 'ENEMY',
  options?: Partial<Unit>
): Unit {
  const baseVitals = {
    maxHp: 20,
    maxAp: 3,
    speed: 10,
    move: 3,
    evasion: 10,
    resolve: 10,
    armor: 3,
    ward: 0,
    ...options?.effectiveVitals
  };

  return {
    id,
    name,
    gender: 'male',
    race: 'human',
    faction,
    progression: {
      unlockedClassIds: ['shield-bearer'],
      activeClassId: 'shield-bearer',
      currentLevel: 4,
      archetypePoints: { fighter: 3, rogue: 1, mage: 0 },
      attributePoints: { force: 3, finesse: 1, focus: 0 }
    } as any,
    baseAttributes: { force: 3, finesse: 1, focus: 0 },
    effectiveVitals: baseVitals,
    loadout: {
      activeClassId: 'shield-bearer',
      wildcardAbilityIds: [],
      wildcardPassiveIds: []
    },
    starterAbilityIds: [],
    ...options
  };
}

describe('Shield-bearer Mechanics — Intercept Step', () => {
  let arena: Arena;
  let state: CombatState;
  let shieldBearer: Unit;
  let allyMage: Unit;
  let enemyBrawler: Unit;

  beforeEach(() => {
    arena = createRadialArena(4);
    shieldBearer = createMockUnit('sb-1', 'Shield-bearer', 'PLAYER');
    allyMage = createMockUnit('mage-1', 'Ally Mage', 'PLAYER', {
      effectiveVitals: { maxHp: 12, maxAp: 3, speed: 9, move: 2, evasion: 8, resolve: 12, armor: 0, ward: 3 }
    });
    enemyBrawler = createMockUnit('enemy-1', 'Orc Brawler', 'ENEMY');

    arena.setUnitPosition('sb-1', { q: 0, r: 0 });
    arena.setUnitPosition('mage-1', { q: 2, r: 0 }); // Distance 2
    arena.setUnitPosition('enemy-1', { q: 3, r: 0 });

    state = createCombatState(arena, [shieldBearer, allyMage, enemyBrawler], 'sb-1');
    state.units.get('sb-1')!.currentAp = 3;
  });

  it('swaps hex coordinates with an ally within range 3 and grants +2 Armor to the ally', () => {
    const valid = canExecuteAbility(state, 'sb-1', INTERCEPT_STEP, { targetUnitId: 'mage-1' });
    expect(valid.valid).toBe(true);

    const resolution = executeAbility(state, 'sb-1', INTERCEPT_STEP, { targetUnitId: 'mage-1' });
    expect(resolution).toBeDefined();

    // Verify positions swapped
    expect(arena.getUnitPosition('sb-1')).toEqual({ q: 2, r: 0 });
    expect(arena.getUnitPosition('mage-1')).toEqual({ q: 0, r: 0 });
    expect(arena.getUnitAt({ q: 2, r: 0 })).toBe('sb-1');
    expect(arena.getUnitAt({ q: 0, r: 0 })).toBe('mage-1');

    // Verify AP deducted
    const sbCu = state.units.get('sb-1')!;
    expect(sbCu.currentAp).toBe(2);

    // Verify ally gained +2 Armor
    const mageCu = state.units.get('mage-1')!;
    expect(getEffectiveArmor(mageCu)).toBe(2);
    expect(mageCu.activeModifiers.some((m) => m.stat === 'armor' && m.value === 2)).toBe(true);

    // Verify DISPLACEMENT labels: INTERCEPT! on Shield-bearer only, null on ally
    if (resolution.type === 'BUFF') {
      const displacements = (resolution.events ?? []).filter((e) => e.type === 'DISPLACEMENT');
      expect(displacements).toHaveLength(2);
      expect(displacements[0]).toMatchObject({ unitId: 'sb-1', kind: 'SWAP', label: 'INTERCEPT!' });
      expect(displacements[1]).toMatchObject({ unitId: 'mage-1', kind: 'SWAP', label: null });
    }
  });

  it('rejects swapping with self', () => {
    const valid = canExecuteAbility(state, 'sb-1', INTERCEPT_STEP, { targetUnitId: 'sb-1' });
    expect(valid.valid).toBe(false);
    if (!valid.valid) {
      expect(valid.reason).toContain('Cannot swap positions with self');
    }
  });

  it('rejects swapping with an enemy', () => {
    const valid = canExecuteAbility(state, 'sb-1', INTERCEPT_STEP, { targetUnitId: 'enemy-1' });
    expect(valid.valid).toBe(false);
    if (!valid.valid) {
      expect(valid.reason).toContain('Cannot cast an ally ability on an enemy unit');
    }
  });

  it('rejects swapping with an ally beyond range 3', () => {
    arena.setUnitPosition('mage-1', { q: 4, r: 0 }); // Distance 4 > Range 3
    const valid = canExecuteAbility(state, 'sb-1', INTERCEPT_STEP, { targetUnitId: 'mage-1' });
    expect(valid.valid).toBe(false);
    if (!valid.valid) {
      expect(valid.reason).toContain('out of range');
    }
  });
});

describe('Shield-bearer Mechanics — Unyielding Stance & Concussive Slam', () => {
  let arena: Arena;
  let state: CombatState;
  let shieldBearer: Unit;
  let allyMage: Unit;
  let enemyBrawler: Unit;

  beforeEach(() => {
    arena = createRadialArena(4);
    shieldBearer = createMockUnit('sb-1', 'Shield-bearer', 'PLAYER');
    allyMage = createMockUnit('mage-1', 'Ally Mage', 'PLAYER');
    enemyBrawler = createMockUnit('enemy-1', 'Orc Brawler', 'ENEMY');

    arena.setUnitPosition('sb-1', { q: 0, r: 0 });
    arena.setUnitPosition('mage-1', { q: 1, r: 0 }); // Distance 1 from shieldBearer
    arena.setUnitPosition('enemy-1', { q: -1, r: 0 }); // Distance 1 from shieldBearer

    state = createCombatState(arena, [shieldBearer, allyMage, enemyBrawler], 'enemy-1');
    state.units.get('enemy-1')!.currentAp = 3;
    state.units.get('sb-1')!.currentAp = 3;
  });

  it('resists knockback displacement completely when attacked by knockback ability', async () => {
    const { SHIELD_BASH } = await import('../../../data/packages/novice');
    // enemy uses SHIELD_BASH on shield-bearer
    const resolution = executeAbility(state, 'enemy-1', SHIELD_BASH, { targetUnitId: 'sb-1' });
    expect(resolution).toBeDefined();

    // Shield-bearer remains in (0, 0) due to immuneToDisplacement
    expect(arena.getUnitPosition('sb-1')).toEqual({ q: 0, r: 0 });
  });

  it('applies Phalanx Aura -2 Attack Roll penalty to hostile attacks targeting adjacent ally', async () => {
    const { evaluateTargetAuras } = await import('../auras');
    const targetCu = state.units.get('mage-1')!;
    const actorCu = state.units.get('enemy-1')!;

    const auraEval = evaluateTargetAuras(targetCu, actorCu, state);
    expect(auraEval.attackRollPenalty).toBe(2);
    expect(auraEval.sourceAuraNames).toContain('Unyielding Stance');
  });

  it('executes Concussive Slam dealing physical damage and applying SLOW without knockback', () => {
    state.activeUnitId = 'sb-1';
    const solidRoller = { rollD20: () => 15, rollDice: (count: number, sides: number) => count * sides };
    const resolution = executeAbility(state, 'sb-1', CONCUSSIVE_SLAM, { targetUnitId: 'enemy-1' }, solidRoller as any);
    expect(resolution).toBeDefined();

    // Target remains in (-1, 0)
    expect(arena.getUnitPosition('enemy-1')).toEqual({ q: -1, r: 0 });

    // Target received SLOW condition
    const enemyCu = state.units.get('enemy-1')!;
    expect(enemyCu.activeModifiers.some((m) => m.stat === 'move' && m.value === -2)).toBe(true);
  });
});

describe('Shield-bearer Mechanics — Bastion Plant (ZOC & Rear Cover)', () => {
  let arena: Arena;
  let state: CombatState;
  let shieldBearer: Unit;
  let allyMage: Unit;
  let enemyArcher: Unit;

  beforeEach(() => {
    arena = createRadialArena(4);
    shieldBearer = createMockUnit('sb-1', 'Shield-bearer', 'PLAYER');
    allyMage = createMockUnit('mage-1', 'Ally Mage', 'PLAYER', {
      effectiveVitals: { maxHp: 20, maxAp: 3, speed: 10, move: 2, evasion: 10, resolve: 10, armor: 0, ward: 0 }
    });
    enemyArcher = createMockUnit('enemy-1', 'Enemy Archer', 'ENEMY', {
      effectiveVitals: { maxHp: 20, maxAp: 3, speed: 10, move: 3, evasion: 10, resolve: 10, armor: 0, ward: 0 }
    });

    arena.setUnitPosition('sb-1', { q: 0, r: 0 });
    arena.setUnitPosition('mage-1', { q: -1, r: 0 }); // Rear hex when sb facing 0
    arena.setUnitPosition('enemy-1', { q: 3, r: 0 });

    state = createCombatState(arena, [shieldBearer, allyMage, enemyArcher], 'sb-1');
    state.units.get('sb-1')!.facing = 0; // Facing East (towards +q: {q:1, r:0})
    state.units.get('sb-1')!.currentAp = 3;
    state.units.get('enemy-1')!.currentAp = 3;
  });

  it('activates Bastion Plant costing 2 AP, granting +3 Armor, locking Move to 0, and activating stance', async () => {
    const { getEffectiveMove } = await import('../effectiveVitals');
    const { isBastionStanceActive } = await import('../bastionStance');

    const sbCu = state.units.get('sb-1')!;
    expect(sbCu.currentAp).toBe(3);
    expect(getEffectiveArmor(sbCu)).toBe(3);

    const res = executeAbility(state, 'sb-1', BASTION_PLANT);
    expect(res).toBeDefined();

    // 2 AP consumed
    expect(sbCu.currentAp).toBe(1);

    // +3 Armor applied (base 3 + 3 = 6)
    expect(getEffectiveArmor(sbCu)).toBe(6);

    // Move locked to 0
    expect(getEffectiveMove(sbCu)).toBe(0);

    // Bastion Stance active
    expect(isBastionStanceActive(sbCu)).toBe(true);
  });

  it('halts enemy movement upon entering the 3 forward hexes (Zone of Control)', async () => {
    const { executeMove } = await import('../resolver');
    const { canMove } = await import('../validator');
    // First activate Bastion Plant
    executeAbility(state, 'sb-1', BASTION_PLANT);
    state.units.get('sb-1')!.facing = 0; // Facing East

    // Enemy is at (3, 0) with Move 3. The front hex is (1, 0).
    state.activeUnitId = 'enemy-1';

    // Hex (1, 0) is reachable (dist 2 from (3, 0))
    const canMoveToFront = canMove(state, 'enemy-1', { q: 1, r: 0 });
    expect(canMoveToFront.valid).toBe(true);

    // But traversing through (1, 0) to flank or rear is blocked by ZOC termination
    // A path through (1, 0) to (1, -1) or (0, 1) or behind the SB is terminated upon entering (1, 0)
    const reachable = arena.getReachableHexes({ q: 3, r: 0 }, 3, {
      terminalHexKeys: new Set(['1,0', '1,-1', '0,1'])
    });
    // Entering (1, 0) is allowed
    expect(reachable.some((h) => h.q === 1 && h.r === 0)).toBe(true);
    // But expanding beyond (1, 0) to (0, 1) or (-1, 0) within 3 moves is blocked
    expect(reachable.some((h) => h.q === -1 && h.r === 0)).toBe(false);

    // Executing move to (1, 0) enters ZOC and completes
    executeMove(state, 'enemy-1', { q: 1, r: 0 });
    expect(arena.getUnitPosition('enemy-1')).toEqual({ q: 1, r: 0 });
    expect(state.combatLog.some((l) => l.actionId === 'zone_of_control_halted')).toBe(true);
  });

  it('reduces incoming ranged attack damage by 50% for an ally in the rear hex', async () => {
    const { resolveDamage } = await import('../damageEngine');
    const { hasBastionRangedCover } = await import('../bastionStance');
    const mockRangedAbility: any = {
      id: 'sniper_shot',
      name: 'Sniper Shot',
      range: 3,
      damageType: 'PHYSICAL',
      effects: [{ type: 'DAMAGE', flatDamage: 10 }]
    };

    // Before Bastion Plant: cover is false
    const mageCu = state.units.get('mage-1')!;
    expect(hasBastionRangedCover(state, mageCu, { q: 3, r: 0 }, mockRangedAbility)).toBe(false);

    // Activate Bastion Plant
    executeAbility(state, 'sb-1', BASTION_PLANT);
    state.units.get('sb-1')!.facing = 0; // Facing East, ally is at (-1, 0) which is REAR

    // Now cover is true
    expect(hasBastionRangedCover(state, mageCu, { q: 3, r: 0 }, mockRangedAbility)).toBe(true);

    // Resolve damage with and without cover
    const diceRoller = { rollIndividualDice: () => [0], rollDice: () => 0 };
    const enemyCu = state.units.get('enemy-1')!;

    const normalDmg = resolveDamage('SOLID_HIT', mockRangedAbility, enemyCu, mageCu, diceRoller as any, undefined, undefined, {
      hasRangedCover: false
    });
    expect(normalDmg.damageDealt).toBe(10); // 10 flat - 0 armor

    const coverDmg = resolveDamage('SOLID_HIT', mockRangedAbility, enemyCu, mageCu, diceRoller as any, undefined, undefined, {
      hasRangedCover: true
    });
    expect(coverDmg.damageDealt).toBe(5); // 50% damage reduction!
    expect(coverDmg.damageBreakdown).toContain('x0.5 Bastion Cover');
  });

  it('does NOT provide cover against melee attacks (range 1) or for allies not in the rear hex', async () => {
    const { hasBastionRangedCover } = await import('../bastionStance');
    executeAbility(state, 'sb-1', BASTION_PLANT);
    state.units.get('sb-1')!.facing = 0;

    const mageCu = state.units.get('mage-1')!;

    // Melee attack (range 1 from adjacent hex)
    const mockMeleeAbility: any = {
      id: 'slash',
      name: 'Slash',
      range: 1,
      damageType: 'PHYSICAL',
      effects: [{ type: 'DAMAGE', flatDamage: 10 }]
    };
    expect(hasBastionRangedCover(state, mageCu, { q: -2, r: 0 }, mockMeleeAbility)).toBe(false);

    // Move ally to flank hex (0, 1)
    arena.setUnitPosition('mage-1', { q: 0, r: 1 });
    const mockRangedAbility: any = {
      id: 'sniper_shot',
      name: 'Sniper Shot',
      range: 3,
      damageType: 'PHYSICAL',
      effects: [{ type: 'DAMAGE', flatDamage: 10 }]
    };
    expect(hasBastionRangedCover(state, mageCu, { q: 3, r: 0 }, mockRangedAbility)).toBe(false);
  });
});

describe('Astral Augment Shards (Shield-bearer Inspired)', () => {
  let arena: Arena;
  let state: CombatState;

  beforeEach(() => {
    arena = createRadialArena(3);
    const hero = createMockUnit('hero-1', 'Hero', 'PLAYER', {
      progression: { activeClassId: 'novice' } as any,
      loadout: { activeClassId: 'novice', wildcardAbilityIds: [], wildcardPassiveIds: [] }
    });
    const enemy = createMockUnit('enemy-1', 'Enemy', 'ENEMY', {
      progression: { activeClassId: 'novice' } as any,
      loadout: { activeClassId: 'novice', wildcardAbilityIds: [], wildcardPassiveIds: [] }
    });
    const ally = createMockUnit('ally-1', 'Ally', 'PLAYER', {
      progression: { activeClassId: 'novice' } as any,
      loadout: { activeClassId: 'novice', wildcardAbilityIds: [], wildcardPassiveIds: [] }
    });

    arena.setUnitPosition('hero-1', { q: 0, r: 0 });
    arena.setUnitPosition('enemy-1', { q: 1, r: 0 });
    arena.setUnitPosition('ally-1', { q: 0, r: 1 });

    state = createCombatState(arena, [hero, enemy, ally]);
    state.activeUnitId = 'hero-1';
    state.units.get('hero-1')!.currentAp = 3;
  });

  it('Interchange Shard swaps coordinates with target enemy on hit', async () => {
    const { ASTRAL_AUGMENT_SHARDS } = await import('../../progression/harmonization');
    const strikeAbility: any = {
      id: 'test_strike',
      name: 'Test Strike',
      range: 1,
      targetType: 'SINGLE_TARGET',
      defenseTarget: 'EVASION',
      damageType: 'PHYSICAL',
      apCost: 1,
      attackRollBonus: 20,
      effects: [{ type: 'DAMAGE', flatDamage: 5 }]
    };

    const heroCu = state.units.get('hero-1')!;
    heroCu.abilityModifiers.push(ASTRAL_AUGMENT_SHARDS.interchange_shard.modifier);

    const hitRoller: any = {
      rollD20: () => 18,
      rollDice: () => 4
    };

    executeAbility(state, 'hero-1', strikeAbility, { targetUnitId: 'enemy-1' }, hitRoller);

    expect(arena.getUnitPosition('hero-1')).toEqual({ q: 1, r: 0 });
    expect(arena.getUnitPosition('enemy-1')).toEqual({ q: 0, r: 0 });
  });

  it('Interchange Shard does NOT swap if enemy target is displacement immune', async () => {
    const { ASTRAL_AUGMENT_SHARDS } = await import('../../progression/harmonization');
    const strikeAbility: any = {
      id: 'test_strike',
      name: 'Test Strike',
      range: 1,
      targetType: 'SINGLE_TARGET',
      defenseTarget: 'EVASION',
      damageType: 'PHYSICAL',
      apCost: 1,
      effects: [{ type: 'DAMAGE', flatDamage: 5 }]
    };

    const heroCu = state.units.get('hero-1')!;
    heroCu.abilityModifiers.push(ASTRAL_AUGMENT_SHARDS.interchange_shard.modifier);

    const enemyCu = state.units.get('enemy-1')!;
    enemyCu.activeModifiers.push({ stat: 'displacementImmunity', value: 1, durationTurns: 1 });

    const hitRoller: any = {
      rollD20: () => 18,
      rollDice: () => 4
    };

    executeAbility(state, 'hero-1', strikeAbility, { targetUnitId: 'enemy-1' }, hitRoller);

    expect(arena.getUnitPosition('hero-1')).toEqual({ q: 0, r: 0 });
    expect(arena.getUnitPosition('enemy-1')).toEqual({ q: 1, r: 0 });
  });

  it('Concussion Shard applies Move -1 and Speed -2 for 2 turns on hit', async () => {
    const { ASTRAL_AUGMENT_SHARDS } = await import('../../progression/harmonization');
    const { getEffectiveMove, getEffectiveSpeed } = await import('../effectiveVitals');
    const strikeAbility: any = {
      id: 'test_strike',
      name: 'Test Strike',
      range: 1,
      targetType: 'SINGLE_TARGET',
      defenseTarget: 'EVASION',
      damageType: 'PHYSICAL',
      apCost: 1,
      effects: [{ type: 'DAMAGE', flatDamage: 5 }]
    };

    const heroCu = state.units.get('hero-1')!;
    heroCu.abilityModifiers.push(ASTRAL_AUGMENT_SHARDS.concussion_shard.modifier);

    const enemyCu = state.units.get('enemy-1')!;
    const baseMove = getEffectiveMove(enemyCu);
    const baseSpeed = getEffectiveSpeed(enemyCu);

    const hitRoller: any = {
      rollD20: () => 18,
      rollDice: () => 4
    };

    executeAbility(state, 'hero-1', strikeAbility, { targetUnitId: 'enemy-1' }, hitRoller);

    expect(getEffectiveMove(enemyCu)).toBe(baseMove - 1);
    expect(getEffectiveSpeed(enemyCu)).toBe(baseSpeed - 2);
  });

  it('Anchorite Shard grants +1 Armor, +1 Resolve, and displacement immunity', async () => {
    const { ASTRAL_AUGMENT_SHARDS } = await import('../../progression/harmonization');
    const { isDisplacementImmune } = await import('../displacementImmunity');
    const { getEffectiveArmor } = await import('../effectiveVitals');
    const buffAbility: any = {
      id: 'test_buff',
      name: 'Test Buff',
      range: 0,
      targetType: 'SELF',
      defenseTarget: 'NONE',
      damageType: 'NONE',
      apCost: 1,
      effects: []
    };

    const heroCu = state.units.get('hero-1')!;
    heroCu.abilityModifiers.push(ASTRAL_AUGMENT_SHARDS.anchorite_shard.modifier);

    const baseArmor = getEffectiveArmor(heroCu);
    expect(isDisplacementImmune(heroCu)).toBe(false);

    executeAbility(state, 'hero-1', buffAbility, { targetUnitId: 'hero-1' });

    expect(getEffectiveArmor(heroCu)).toBe(baseArmor + 1);
    expect(isDisplacementImmune(heroCu)).toBe(true);
  });

  it('Bastion Shard activates Bastion Stance (+2 Armor, Move locked to 0)', async () => {
    const { ASTRAL_AUGMENT_SHARDS } = await import('../../progression/harmonization');
    const { isBastionStanceActive } = await import('../bastionStance');
    const { getEffectiveArmor, getEffectiveMove } = await import('../effectiveVitals');
    const buffAbility: any = {
      id: 'test_buff',
      name: 'Test Buff',
      range: 0,
      targetType: 'SELF',
      defenseTarget: 'NONE',
      damageType: 'NONE',
      apCost: 1,
      effects: []
    };

    const heroCu = state.units.get('hero-1')!;
    heroCu.abilityModifiers.push(ASTRAL_AUGMENT_SHARDS.bastion_shard.modifier);

    const baseArmor = getEffectiveArmor(heroCu);

    executeAbility(state, 'hero-1', buffAbility, { targetUnitId: 'hero-1' });

    expect(isBastionStanceActive(heroCu)).toBe(true);
    expect(getEffectiveArmor(heroCu)).toBe(baseArmor + 2);
    expect(getEffectiveMove(heroCu)).toBe(0);
  });
});


