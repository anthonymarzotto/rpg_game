import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../../grid/templates';
import { createRecruit } from '../../units/unitFactory';
import { createCombatState, executeAbility } from '../resolver';
import { canExecuteAbility } from '../validator';
import { MockDiceRoller } from '../dice';
import { Ability } from '../../types/ability';
import { PassiveTrait } from '../../types/passive';
import { endActiveTurn } from '../turnClock';
import { resolveAttackRoll } from '../attackRoll';
import { getForwardConeHexes } from '../../grid/hex';

describe('Tier 4 Dragoon Core Mechanics', () => {
  const DRAGON_DIVE: Ability = {
    id: 'dragon_dive',
    name: 'Dragon Dive',
    description: 'Aerial vault leap dealing 1d6 + Force and 1d4 shockwave splash',
    archetypeTag: 'FIGHTER',
    apCost: 2,
    range: 3,
    aoeRadius: 1,
    splashLabel: 'SHOCKWAVE',
    splashDamageProfile: { count: 1, sides: 4 },
    targetType: 'SINGLE_TARGET',
    defenseTarget: 'EVASION',
    attackModifierAttribute: 'force',
    damageType: 'PHYSICAL',
    effects: [
      {
        type: 'DAMAGE',
        damageProfile: { count: 1, sides: 6, modifierAttribute: 'force' }
      },
      {
        type: 'AERIAL_VAULT'
      }
    ]
  };

  const PIERCING_THRUST: Ability = {
    id: 'piercing_thrust',
    name: 'Piercing Thrust',
    description: 'Reach thrust dealing 1d6 + Force and 1d4 + Force collateral to rear aligned enemy',
    archetypeTag: 'FIGHTER',
    apCost: 1,
    range: 2,
    targetType: 'SINGLE_TARGET',
    defenseTarget: 'EVASION',
    attackModifierAttribute: 'finesse',
    damageType: 'PHYSICAL',
    effects: [
      {
        type: 'DAMAGE',
        damageProfile: { count: 1, sides: 6, modifierAttribute: 'force' }
      },
      {
        type: 'LINE_PIERCE'
      }
    ]
  };

  const WYRMFLAME_BREATH: Ability = {
    id: 'wyrmflame_breath',
    name: 'Wyrmflame Breath',
    description: '4-hex forward cone dealing 1d4 + Focus magical damage and inflicting Burn',
    archetypeTag: 'MAGE',
    apCost: 1,
    range: 2,
    coneTemplate: true,
    targetType: 'HEX',
    defenseTarget: 'RESOLVE',
    attackModifierAttribute: 'focus',
    damageType: 'MAGICAL',
    effects: [
      {
        type: 'DAMAGE',
        damageProfile: { count: 1, sides: 4, modifierAttribute: 'focus' }
      },
      {
        type: 'CONDITION',
        conditionType: 'BURN',
        magnitude: 1,
        durationTurns: 2
      }
    ]
  };

  const COILED_APEX: PassiveTrait = {
    id: 'coiled_apex',
    name: 'Coiled Apex',
    description: 'Apex Strike (+2 flat damage from height) and Coiled Readiness (+1 Virtual Height per unspent AP)',
    hook: 'ALWAYS',
    unspentApVirtualHeight: true,
    lowerElevationDamageBonus: 2
  };

  describe('Dragon Dive Aerial Vault Mechanics', () => {
    it('lands in Far Hex behind target along vector, ignoring intervening obstacles', () => {
      const arena = createRadialArena(3);
      const dragoon = createRecruit('dragoon', 'Dragoon', { faction: 'PLAYER' });
      const target = createRecruit('target', 'Enemy Target', { faction: 'ENEMY' });
      const obstacleUnit = createRecruit('obstacle', 'Obstacle Unit', { faction: 'ENEMY' });

      arena.setUnitPosition('dragoon', { q: 0, r: 0 });
      arena.setUnitPosition('obstacle', { q: 1, r: 0 }); // Intervening unit at dist 1
      arena.setUnitPosition('target', { q: 2, r: 0 });   // Target at dist 2

      const state = createCombatState(arena, [dragoon, target, obstacleUnit], 'dragoon');
      const dragoonCu = state.units.get('dragoon')!;
      dragoonCu.currentAp = 2;

      // Validator should confirm vault is valid despite intervening unit blocking ground LoS
      const check = canExecuteAbility(state, 'dragoon', DRAGON_DIVE, { targetUnitId: 'target' });
      expect(check.valid).toBe(true);

      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [6] });
      const res = executeAbility(state, 'dragoon', DRAGON_DIVE, { targetUnitId: 'target' }, dice);

      expect(res.type).toBe('ATTACK');
      // Dragoon should have vaulted over obstacle and landed in Far Hex (3, 0)
      expect(state.arena.getUnitPosition('dragoon')).toEqual({ q: 3, r: 0 });
      expect(dragoonCu.facing).toBe(3); // Facing West back toward target at (2, 0)
    });

    it('falls back to Near Hex if Far Hex is occupied', () => {
      const arena = createRadialArena(3);
      const dragoon = createRecruit('dragoon', 'Dragoon', { faction: 'PLAYER' });
      const target = createRecruit('target', 'Enemy Target', { faction: 'ENEMY' });
      const wallEnemy = createRecruit('wall', 'Rear Blocker', { faction: 'ENEMY' });

      arena.setUnitPosition('dragoon', { q: 0, r: 0 });
      arena.setUnitPosition('target', { q: 2, r: 0 });
      arena.setUnitPosition('wall', { q: 3, r: 0 }); // Blocks Far Hex

      const state = createCombatState(arena, [dragoon, target, wallEnemy], 'dragoon');
      const dragoonCu = state.units.get('dragoon')!;
      dragoonCu.currentAp = 2;

      const check = canExecuteAbility(state, 'dragoon', DRAGON_DIVE, { targetUnitId: 'target' });
      expect(check.valid).toBe(true);

      const dice = new MockDiceRoller({ d20Rolls: [14], damageRolls: [5] });
      executeAbility(state, 'dragoon', DRAGON_DIVE, { targetUnitId: 'target' }, dice);

      // Lands in Near Hex (1, 0)
      expect(state.arena.getUnitPosition('dragoon')).toEqual({ q: 1, r: 0 });
    });

    it('rejects Dragon Dive when target has no valid landing hexes', () => {
      const arena = createRadialArena(2);
      const dragoon = createRecruit('dragoon', 'Dragoon', { faction: 'PLAYER' });
      const target = createRecruit('target', 'Target', { faction: 'ENEMY' });

      arena.setUnitPosition('dragoon', { q: -2, r: 0 });
      arena.setUnitPosition('target', { q: 0, r: 0 });

      // Surround target with blockers on all 6 neighbors
      const neighbors = [
        { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
        { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
      ];
      const blockers = neighbors.map((coord, i) => {
        const b = createRecruit(`b_${i}`, `Blocker ${i}`, { faction: 'ENEMY' });
        arena.setUnitPosition(b.id, coord);
        return b;
      });

      const state = createCombatState(arena, [dragoon, target, ...blockers], 'dragoon');
      const check = canExecuteAbility(state, 'dragoon', DRAGON_DIVE, { targetUnitId: 'target' });
      expect(check.valid).toBe(false);
      if (!check.valid) {
        expect(check.reason).toContain('Target is surrounded');
      }
    });

    it('emits 1d4 physical shockwave damage around landing hex to hostiles, ignoring target and allies', () => {
      const arena = createRadialArena(3);
      const dragoon = createRecruit('dragoon', 'Dragoon', { faction: 'PLAYER' });
      const target = createRecruit('target', 'Target', { faction: 'ENEMY' });
      const bystanderEnemy = createRecruit('bystander', 'Bystander Enemy', { faction: 'ENEMY' });
      const bystanderAlly = createRecruit('ally', 'Bystander Ally', { faction: 'PLAYER' });

      arena.setUnitPosition('dragoon', { q: 0, r: 0 });
      arena.setUnitPosition('target', { q: 2, r: 0 });
      // Far Hex will be (3, 0). Place bystander enemy adjacent to (3, 0) at (3, -1)
      arena.setUnitPosition('bystander', { q: 3, r: -1 });
      // Place bystander ally adjacent to (3, 0) at (2, 1)
      arena.setUnitPosition('ally', { q: 2, r: 1 });

      const state = createCombatState(arena, [dragoon, target, bystanderEnemy, bystanderAlly], 'dragoon');
      const dragoonCu = state.units.get('dragoon')!;
      dragoonCu.currentAp = 2;

      const dice = new MockDiceRoller({ d20Rolls: [18], damageRolls: [6, 3] });
      const res = executeAbility(state, 'dragoon', DRAGON_DIVE, { targetUnitId: 'target' }, dice);

      expect(res.type).toBe('ATTACK');
      if (res.type === 'ATTACK') {
        const shockwaveDamage = res.details.events.find(
          (e): e is Extract<typeof e, { type: 'DAMAGE' }> =>
            e.type === 'DAMAGE' && e.targetUnitId === 'bystander'
        );
        expect(shockwaveDamage).toBeDefined();
        expect(shockwaveDamage?.label).toBe('SHOCKWAVE');

        // Friendly ally must NOT be damaged
        const allyDamage = res.details.events.find(
          (e) => e.type === 'DAMAGE' && (e as any).targetUnitId === 'ally'
        );
        expect(allyDamage).toBeUndefined();
      }
    });
  });

  describe('Piercing Thrust Line Penetration', () => {
    it('damages front target and pierces through to aligned rear enemy with 1d4 + Force', () => {
      const arena = createRadialArena(3);
      const dragoon = createRecruit('dragoon', 'Dragoon', { faction: 'PLAYER' });
      (dragoon.baseAttributes as any).force = 3;
      const frontEnemy = createRecruit('front', 'Front Enemy', { faction: 'ENEMY' });
      const rearEnemy = createRecruit('rear', 'Rear Enemy', { faction: 'ENEMY' });

      arena.setUnitPosition('dragoon', { q: 0, r: 0 });
      arena.setUnitPosition('front', { q: 1, r: 0 });
      arena.setUnitPosition('rear', { q: 2, r: 0 });

      const state = createCombatState(arena, [dragoon, frontEnemy, rearEnemy], 'dragoon');
      const dragoonCu = state.units.get('dragoon')!;
      dragoonCu.currentAp = 1;

      // Primary damage roll: d6=5. Secondary damage roll: d4=3
      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [5, 3] });
      const res = executeAbility(state, 'dragoon', PIERCING_THRUST, { targetUnitId: 'front' }, dice);

      expect(res.type).toBe('ATTACK');
      if (res.type === 'ATTACK') {
        const primaryDmg = res.details.events.find(
          (e): e is Extract<typeof e, { type: 'DAMAGE' }> =>
            e.type === 'DAMAGE' && e.targetUnitId === 'front'
        );
        expect(primaryDmg).toBeDefined();
        // 5 (roll) + 3 (force) = 8
        expect(primaryDmg?.amount).toBe(8);

        const collateralDmg = res.details.events.find(
          (e): e is Extract<typeof e, { type: 'DAMAGE' }> =>
            e.type === 'DAMAGE' && e.targetUnitId === 'rear'
        );
        expect(collateralDmg).toBeDefined();
        expect(collateralDmg?.reason).toBe('COLLATERAL');
        expect(collateralDmg?.label).toBe('PIERCING_THRUST');
        // 3 (roll) + 3 (force) = 6
        expect(collateralDmg?.amount).toBe(6);
      }
    });

    it('rejects Piercing Thrust at range 2 if not along a straight hex ray', () => {
      const arena = createRadialArena(3);
      const dragoon = createRecruit('dragoon', 'Dragoon', { faction: 'PLAYER' });
      const diagonalEnemy = createRecruit('diag', 'Diagonal Enemy', { faction: 'ENEMY' });

      arena.setUnitPosition('dragoon', { q: 0, r: 0 });
      // (1, 1) is at distance 2, but not a straight axial ray
      arena.setUnitPosition('diag', { q: 1, r: 1 });

      const state = createCombatState(arena, [dragoon, diagonalEnemy], 'dragoon');
      const check = canExecuteAbility(state, 'dragoon', PIERCING_THRUST, { targetUnitId: 'diag' });
      expect(check.valid).toBe(false);
      if (!check.valid) {
        expect(check.reason).toContain('must follow a straight hex ray');
      }
    });
  });

  describe('Wyrmflame Breath 4-Hex Cone AoE', () => {
    it('generates 4 forward cone hexes accurately for facing East', () => {
      const origin = { q: 0, r: 0 };
      const facing = 0; // EAST
      const cone = getForwardConeHexes(origin, facing);

      expect(cone).toHaveLength(4);
      // Apex at (1, 0)
      expect(cone[0]).toEqual({ q: 1, r: 0 });
      // 3 Fan hexes at distance 2
      expect(cone).toContainEqual({ q: 2, r: -1 });
      expect(cone).toContainEqual({ q: 2, r: 0 });
      expect(cone).toContainEqual({ q: 1, r: 1 });
    });

    it('damages enemies in the 4-hex cone and inflicts BURN', () => {
      const arena = createRadialArena(3);
      const dragoon = createRecruit('dragoon', 'Dragoon', { faction: 'PLAYER' });
      (dragoon.baseAttributes as any).focus = 2;
      const enemyA = createRecruit('enemyA', 'Enemy A (Apex)', { faction: 'ENEMY' });
      const enemyB = createRecruit('enemyB', 'Enemy B (Fan)', { faction: 'ENEMY' });
      const enemyC = createRecruit('enemyC', 'Enemy C (Outside)', { faction: 'ENEMY' });

      arena.setUnitPosition('dragoon', { q: 0, r: 0 });
      arena.setUnitPosition('enemyA', { q: 1, r: 0 });  // Apex
      arena.setUnitPosition('enemyB', { q: 2, r: 0 });  // Fan
      arena.setUnitPosition('enemyC', { q: 0, r: 2 });  // Outside cone

      const state = createCombatState(arena, [dragoon, enemyA, enemyB, enemyC], 'dragoon');
      const dragoonCu = state.units.get('dragoon')!;
      dragoonCu.currentAp = 1;

      // Target direction (1, 0)
      const dice = new MockDiceRoller({ d20Rolls: [16, 16], damageRolls: [3, 4] });
      const res = executeAbility(state, 'dragoon', WYRMFLAME_BREATH, { coord: { q: 1, r: 0 } }, dice);

      expect(res.type).toBe('ATTACK');
      const enemyACu = state.units.get('enemyA')!;
      const enemyBCu = state.units.get('enemyB')!;
      const enemyCCu = state.units.get('enemyC')!;

      // Both Enemy A and Enemy B should have taken magical damage
      expect(enemyACu.currentHp).toBeLessThan(enemyA.effectiveVitals.maxHp);
      expect(enemyBCu.currentHp).toBeLessThan(enemyB.effectiveVitals.maxHp);
      // Enemy C outside cone untouched
      expect(enemyCCu.currentHp).toBe(enemyC.effectiveVitals.maxHp);

      // Both in cone should have BURN condition
      expect(enemyACu.activeConditions.some((c) => c.type === 'BURN')).toBe(true);
      expect(enemyBCu.activeConditions.some((c) => c.type === 'BURN')).toBe(true);
    });
  });

  describe('Coiled Apex Passive & Virtual Height', () => {
    it('gains +1 Virtual Height on unspent AP (capped at +1)', () => {
      const arena = createRadialArena(3);
      const dragoon = createRecruit('dragoon', 'Dragoon', { faction: 'PLAYER' });
      const state = createCombatState(arena, [dragoon], 'dragoon');
      const dragoonCu = state.units.get('dragoon')!;
      (dragoonCu as any).passives = [COILED_APEX];

      // End turn with 1 AP remaining
      dragoonCu.currentAp = 1;
      endActiveTurn(state);
      expect(dragoonCu.virtualElevation).toBe(1);

      // End turn with 2 AP remaining (capped at 1)
      dragoonCu.currentAp = 2;
      endActiveTurn(state);
      expect(dragoonCu.virtualElevation).toBe(1);

      // Capped at 1 even if 4 AP unspent
      dragoonCu.currentAp = 4;
      endActiveTurn(state);
      expect(dragoonCu.virtualElevation).toBe(1);
    });

    it('applies defensive penalty to attacker roll when defending with Virtual Height', () => {
      const dragoon = createRecruit('dragoon', 'Dragoon', { faction: 'PLAYER' });
      const enemy = createRecruit('enemy', 'Enemy Attacker', { faction: 'ENEMY' });
      const dummyAbility: Ability = {
        id: 'strike',
        name: 'Strike',
        description: 'Basic strike',
        apCost: 1,
        range: 1,
        targetType: 'SINGLE_TARGET',
        defenseTarget: 'EVASION',
        damageType: 'PHYSICAL',
        effects: []
      };

      const arena = createRadialArena(3);
      arena.setUnitPosition('dragoon', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 1, r: 0 });

      const state = createCombatState(arena, [dragoon, enemy], 'enemy');
      const dragoonCu = state.units.get('dragoon')!;
      const enemyCu = state.units.get('enemy')!;

      // Dragoon has Virtual Height = 1
      dragoonCu.virtualElevation = 1;
      const dice = new MockDiceRoller({ d20Rolls: [15] });
      const roll1 = resolveAttackRoll(enemyCu, dragoonCu, dummyAbility, dice, { state });
      // Elevation delta is enemy(0) - dragoon(1) = -1 -> -2 penalty
      expect(roll1.modifierBreakdown?.some((m) => m.label === 'Low Ground')).toBe(true);
      expect(roll1.modifier).toBeLessThan(0);

      // Dragoon has Virtual Height = 2 -> Low ground disadvantage
      dragoonCu.virtualElevation = 2;
      const roll2 = resolveAttackRoll(enemyCu, dragoonCu, dummyAbility, dice, { state });
      expect(roll2.advantage).toBe('DISADVANTAGE');
    });

    it('consumes Virtual Height upon resolving attack and applies +2 Apex Strike damage bonus', () => {
      const arena = createRadialArena(3);
      const dragoon = createRecruit('dragoon', 'Dragoon', { faction: 'PLAYER' });
      (dragoon.baseAttributes as any).force = 0;
      const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });

      arena.setUnitPosition('dragoon', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 1, r: 0 });

      const state = createCombatState(arena, [dragoon, enemy], 'dragoon');
      const dragoonCu = state.units.get('dragoon')!;
      (dragoonCu as any).passives = [COILED_APEX];
      dragoonCu.virtualElevation = 1;

      const basicStrike: Ability = {
        id: 'strike',
        name: 'Strike',
        description: 'Strike',
        apCost: 1,
        range: 1,
        targetType: 'SINGLE_TARGET',
        defenseTarget: 'EVASION',
        attackModifierAttribute: 'force',
        damageType: 'PHYSICAL',
        effects: [
          {
            type: 'DAMAGE',
            damageProfile: { count: 1, sides: 6, modifierAttribute: 'force' }
          }
        ]
      };

      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [4] });
      const res = executeAbility(state, 'dragoon', basicStrike, { targetUnitId: 'enemy' }, dice);

      expect(res.type).toBe('ATTACK');
      if (res.type === 'ATTACK') {
        const dmgEvent = res.details.events.find((e) => e.type === 'DAMAGE') as any;
        expect(dmgEvent).toBeDefined();
        // Base roll 4 + Apex Strike 2 = 6 damage
        expect(dmgEvent.amount).toBe(6);
      }

      // Virtual elevation should be discharged / consumed
      expect(dragoonCu.virtualElevation).toBeUndefined();
    });
  });
});
