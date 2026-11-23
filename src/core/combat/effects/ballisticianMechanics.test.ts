import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../../grid/templates';
import { getDirectionBetween } from '../../grid/hex';
import { createRecruit } from '../../units/unitFactory';
import { createCombatState, executeMove, executeAbility } from '../resolver';
import { endActiveTurn } from '../turnClock';
import { canExecuteAbility, getAbilityRangeCoords } from '../validator';
import { getEffectiveAbility } from '../modifiers';
import { getEffectiveEvasion } from '../effectiveVitals';
import { evaluateAttackRollContext } from '../attackRoll';
import { hasBastionRangedCover } from '../bastionStance';
import { getRoughTerrainHexKeys, resolvePendingBombardmentsOnTurnStart } from '../battlefieldZones';
import { MockDiceRoller } from '../dice';
import { canMove } from '../validator';
import { Ability } from '../../types/ability';
import { PassiveTrait } from '../../types/passive';
import { SPARK } from '../../../data/packages/novice';
import { SHADOW_STEP } from '../../../data/packages/thief';
import { GUST } from '../../../data/packages/sorcerer';
import { BASTION_PLANT } from '../../../data/packages/shieldBearer';

const ZEROED_IN_TEST: PassiveTrait = {
  id: 'zeroed_in',
  name: 'Zeroed In',
  description: 'Stationary calibration.',
  hook: 'ALWAYS',
  stationaryCalibration: true
};

const TEST_RANGED_AOE: Ability = {
  id: 'test_ranged_aoe',
  name: 'Test Ranged AoE',
  description: 'Artillery blast.',
  archetypeTag: 'FIGHTER',
  apCost: 1,
  minRange: 2,
  range: 4,
  aoeRadius: 1,
  targetType: 'HEX',
  defenseTarget: 'EVASION',
  attackModifierAttribute: 'finesse',
  damageType: 'PHYSICAL',
  effects: [{ type: 'DAMAGE', damageProfile: { count: 1, sides: 6, modifierAttribute: 'force' } }]
};

const TEST_MELEE: Ability = {
  id: 'test_melee',
  name: 'Test Melee',
  description: 'Adjacent strike.',
  archetypeTag: 'ROGUE',
  apCost: 1,
  range: 1,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'EVASION',
  attackModifierAttribute: 'finesse',
  damageType: 'PHYSICAL',
  effects: [{ type: 'DAMAGE', damageProfile: { count: 1, sides: 4, modifierAttribute: 'force' } }]
};

describe('Ballistician Mechanics: Zeroed In & TELEMETRY', () => {
  describe('Zeroed In passive', () => {
    it('accumulates up to 3 stacks on stationary turn ends, granting +1 Range, +1 Attack Roll, -1 Evasion per stack, and +1 AoE Radius at 3 stacks', () => {
      const arena = createRadialArena(5);
      const ball = createRecruit('ball', 'Ballistician', { faction: 'PLAYER' });
      const enemy = createRecruit('enemy', 'Target', { faction: 'ENEMY' });
      arena.setUnitPosition('ball', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 4, r: 0 });

      const state = createCombatState(arena, [ball, enemy], 'ball');
      const ballCu = state.units.get('ball')!;
      const enemyCu = state.units.get('enemy')!;
      (ballCu as any).passives = [ZEROED_IN_TEST];

      const baseEvasion = getEffectiveEvasion(ballCu);
      expect(ballCu.zeroedInStacks ?? 0).toBe(0);

      // End Turn 1 without moving -> 1 stack
      endActiveTurn(state, 0);
      expect(ballCu.zeroedInStacks).toBe(1);
      expect(getEffectiveEvasion(ballCu)).toBe(Math.max(0, baseEvasion - 1));
      expect(getEffectiveAbility(TEST_RANGED_AOE, ballCu.abilityModifiers).range).toBe(5);
      expect(getEffectiveAbility(TEST_RANGED_AOE, ballCu.abilityModifiers).aoeRadius).toBe(1);
      // Melee ability (base range 1) does NOT get +Range
      expect(getEffectiveAbility(TEST_MELEE, ballCu.abilityModifiers).range).toBe(1);
      const ctx1 = evaluateAttackRollContext(ballCu, enemyCu, TEST_RANGED_AOE, { state });
      expect(ctx1.modifierBreakdown?.some((m) => m.label.includes('Zeroed In (1x)') && m.value === 1)).toBe(true);

      // End Turn 2 without moving -> 2 stacks
      state.activeUnitId = 'ball';
      ballCu.currentAp = 3;
      endActiveTurn(state, 0);
      expect(ballCu.zeroedInStacks).toBe(2);
      expect(getEffectiveAbility(TEST_RANGED_AOE, ballCu.abilityModifiers).range).toBe(6);
      expect(getEffectiveAbility(TEST_RANGED_AOE, ballCu.abilityModifiers).aoeRadius).toBe(1);

      // End Turn 3 without moving -> 3 stacks (+1 AoE Radius capstone!)
      state.activeUnitId = 'ball';
      ballCu.currentAp = 3;
      endActiveTurn(state, 0);
      expect(ballCu.zeroedInStacks).toBe(3);
      expect(getEffectiveEvasion(ballCu)).toBe(Math.max(0, baseEvasion - 3));
      expect(getEffectiveAbility(TEST_RANGED_AOE, ballCu.abilityModifiers).range).toBe(7);
      expect(getEffectiveAbility(TEST_RANGED_AOE, ballCu.abilityModifiers).aoeRadius).toBe(2);
      const ctx3 = evaluateAttackRollContext(ballCu, enemyCu, TEST_RANGED_AOE, { state });
      expect(ctx3.modifierBreakdown?.some((m) => m.label.includes('Zeroed In (3x)') && m.value === 3)).toBe(true);

      // End Turn 4 without moving -> capped at 3 stacks
      state.activeUnitId = 'ball';
      ballCu.currentAp = 3;
      endActiveTurn(state, 0);
      expect(ballCu.zeroedInStacks).toBe(3);
    });

    it('clears all Zeroed In stacks on voluntary Move, Teleport, or Forced Displacement', () => {
      const arena = createRadialArena(4);
      const ball = createRecruit('ball', 'Ballistician', { faction: 'PLAYER' });
      const enemy = createRecruit('enemy', 'Sorcerer', { faction: 'ENEMY' });
      arena.setUnitPosition('ball', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 2, r: 0 });

      const state = createCombatState(arena, [ball, enemy], 'ball');
      const ballCu = state.units.get('ball')!;
      const enemyCu = state.units.get('enemy')!;
      (ballCu as any).passives = [ZEROED_IN_TEST];
      (ballCu as any).abilities = [TEST_RANGED_AOE, SHADOW_STEP];
      (enemyCu as any).abilities = [GUST];

      // Build 2 stacks
      endActiveTurn(state, 0);
      state.activeUnitId = 'ball';
      ballCu.currentAp = 3;
      endActiveTurn(state, 0);
      expect(ballCu.zeroedInStacks).toBe(2);

      // 1. Voluntary Move clears stacks AND prevents gaining a stack at end of that turn
      state.activeUnitId = 'ball';
      ballCu.currentAp = 3;
      executeMove(state, 'ball', { q: -1, r: 0 });
      expect(ballCu.zeroedInStacks).toBe(0);
      expect(getEffectiveAbility(TEST_RANGED_AOE, ballCu.abilityModifiers).range).toBe(4);
      endActiveTurn(state, 0);
      expect(ballCu.zeroedInStacks).toBe(0);

      // Rebuild 1 stack
      state.activeUnitId = 'ball';
      ballCu.currentAp = 3;
      endActiveTurn(state, 0);
      expect(ballCu.zeroedInStacks).toBe(1);

      // 2. Teleport (Shadow Step) clears stacks
      state.activeUnitId = 'ball';
      ballCu.currentAp = 3;
      executeAbility(state, 'ball', SHADOW_STEP, { coord: { q: 0, r: 0 } });
      expect(ballCu.zeroedInStacks).toBe(0);

      // Rebuild 1 stack
      endActiveTurn(state, 0); // movedThisTurn was true, so still 0
      state.activeUnitId = 'ball';
      ballCu.currentAp = 3;
      endActiveTurn(state, 0);
      expect(ballCu.zeroedInStacks).toBe(1);

      // 3. Forced Displacement (Gust Knockback) clears stacks
      state.activeUnitId = 'enemy';
      enemyCu.currentAp = 3;
      executeAbility(state, 'enemy', GUST, { targetUnitId: 'ball' });
      expect(ballCu.zeroedInStacks).toBe(0);
    });
  });

  describe('TELEMETRY condition', () => {
    it('grants +2 Range and bypasses low-ground elevation penalty & Bastion ranged cover for opposing ranged/spell attackers', () => {
      const arena = createRadialArena(6);
      // Place target on high ground (+2 elevation) at distance 5 from Wizard (Spark base range = 3)
      (arena.getTile({ q: 5, r: 0 }) as any).elevation = 2;
      (arena.getTile({ q: 5, r: -1 }) as any).elevation = 2;

      const wizard = createRecruit('wizard', 'Allied Wizard', { faction: 'PLAYER' });
      const target = createRecruit('target', 'Marked Enemy', { faction: 'ENEMY' });
      const sb = createRecruit('sb', 'Enemy Shield-bearer', { faction: 'ENEMY' });

      arena.setUnitPosition('wizard', { q: 0, r: 0 });
      arena.setUnitPosition('target', { q: 5, r: 0 }); // dist 5
      arena.setUnitPosition('sb', { q: 5, r: -1 }); // adjacent to target, off the LoS ray

      const state = createCombatState(arena, [wizard, target, sb], 'wizard');
      const wizardCu = state.units.get('wizard')!;
      const targetCu = state.units.get('target')!;
      const sbCu = state.units.get('sb')!;
      (wizardCu as any).abilities = [SPARK];
      (sbCu as any).abilities = [BASTION_PLANT];

      // Put enemy Shield-bearer in Bastion Stance facing directly away from target so target is in rear arc
      sbCu.facing = getDirectionBetween({ q: 5, r: 0 }, { q: 5, r: -1 });
      sbCu.activeModifiers.push({ stat: 'bastionStance', value: 1, durationTurns: 2 });

      // Without TELEMETRY: Spark (range 3) cannot reach dist 5, suffers low-ground Disadvantage, and target has Bastion ranged cover
      expect(canExecuteAbility(state, 'wizard', SPARK, { targetUnitId: 'target' }).valid).toBe(false);
      expect(hasBastionRangedCover(state, targetCu, { q: 0, r: 0 }, SPARK)).toBe(true);
      const ctxBefore = evaluateAttackRollContext(wizardCu, targetCu, SPARK, { state });
      expect(ctxBefore.disadvantageSources.some((s) => s.toLowerCase().includes('elevation') || s.toLowerCase().includes('low'))).toBe(true);

      // Apply TELEMETRY to target
      targetCu.activeConditions.push({
        type: 'TELEMETRY',
        durationTurns: 2,
        sourceUnitId: 'ball'
      });

      // With TELEMETRY: Spark (range 3 -> 5) CAN reach dist 5, ignores Bastion cover, and ignores low-ground penalty!
      expect(canExecuteAbility(state, 'wizard', SPARK, { targetUnitId: 'target' }).valid).toBe(true);
      const rangeCoords = getAbilityRangeCoords(arena, { q: 0, r: 0 }, SPARK, wizardCu, state);
      expect(rangeCoords.some((c) => c.q === 5 && c.r === 0)).toBe(true);
      expect(hasBastionRangedCover(state, targetCu, { q: 0, r: 0 }, SPARK)).toBe(false);
      const ctxAfter = evaluateAttackRollContext(wizardCu, targetCu, SPARK, { state });
      expect(ctxAfter.disadvantageSources).toHaveLength(0);
      expect(ctxAfter.modifierBreakdown?.some((m) => m.source === 'ELEVATION' && m.value < 0)).toBe(false);
    });
  });

  describe('Shrapnel Canister (Stealth Reveal & Rough Terrain Rubble)', () => {
    const SHRAPNEL_CANISTER_TEST: Ability = {
      id: 'shrapnel_canister',
      name: 'Shrapnel Canister',
      description: 'Reveals stealthed foes and litters the zone in rough terrain.',
      archetypeTag: 'ROGUE',
      apCost: 1,
      minRange: 2,
      range: 4,
      aoeRadius: 1,
      ignoresElevationPenalty: true,
      targetType: 'HEX',
      defenseTarget: 'NONE',
      damageType: 'NONE',
      effects: [{ type: 'SHRAPNEL_RUBBLE', magnitude: 2, durationTurns: 2 }]
    };

    it('strips STEALTH from hidden units in the blast zone, deals 0 damage, and spawns 2-turn Shrapnel Rubble trapping Move-3 units', () => {
      const arena = createRadialArena(5);
      const ball = createRecruit('ball', 'Ballistician', { faction: 'PLAYER' });
      const rogue = createRecruit('rogue', 'Stealthed Rogue', { faction: 'ENEMY' });
      arena.setUnitPosition('ball', { q: -3, r: 0 });
      arena.setUnitPosition('rogue', { q: 0, r: 0 }); // dist 3

      const state = createCombatState(arena, [ball, rogue], 'ball');
      const ballCu = state.units.get('ball')!;
      const rogueCu = state.units.get('rogue')!;
      (ballCu as any).abilities = [SHRAPNEL_CANISTER_TEST];

      rogueCu.activeConditions.push({
        type: 'STEALTH',
        durationTurns: 2,
        sourceUnitId: 'rogue'
      });
      const hpBefore = rogueCu.currentHp;

      executeAbility(state, 'ball', SHRAPNEL_CANISTER_TEST, { coord: { q: 0, r: 0 } });

      // 0 damage, STEALTH stripped, 7-hex rubble created for 2 turns
      expect(rogueCu.currentHp).toBe(hpBefore);
      expect(rogueCu.activeConditions.some((c) => c.type === 'STEALTH')).toBe(false);
      expect(state.hexHazards).toHaveLength(1);
      expect(state.hexHazards![0].hexCoords).toHaveLength(7);
      expect(getRoughTerrainHexKeys(state).size).toBe(7);

      // Rogue (Move 3) at center (0,0) can step 1 hex onto (1,0) (3 MP) but CANNOT reach (2,0) (4 MP)
      state.activeUnitId = 'rogue';
      rogueCu.currentAp = 3;
      expect(canMove(state, 'rogue', { q: 1, r: 0 }).valid).toBe(true);
      expect(canMove(state, 'rogue', { q: 2, r: 0 }).valid).toBe(false);

      // Subsequent cast produces a new hexHazards array reference so React useMemo hooks invalidate immediately
      state.activeUnitId = 'ball';
      ballCu.currentAp = 3;
      const prevHazardsRef = state.hexHazards;
      executeAbility(state, 'ball', SHRAPNEL_CANISTER_TEST, { coord: { q: -1, r: 0 } });
      expect(state.hexHazards).not.toBe(prevHazardsRef);
      expect(state.hexHazards).toHaveLength(2);
    });
  });

  describe('Siege Barrage (Delayed Zone Bombardment)', () => {
    const SIEGE_BARRAGE_TEST: Ability = {
      id: 'siege_barrage',
      name: 'Siege Barrage',
      description: 'Marks a hex cluster for delayed artillery impact.',
      archetypeTag: 'FIGHTER',
      apCost: 2,
      minRange: 2,
      range: 4,
      aoeRadius: 1,
      oncePerTurn: true,
      ignoresElevationPenalty: true,
      targetType: 'HEX',
      defenseTarget: 'EVASION',
      attackModifierAttribute: 'finesse',
      damageType: 'PHYSICAL',
      effects: [
        {
          type: 'DELAYED_BOMBARDMENT',
          damageProfile: { count: 2, sides: 8, modifierAttribute: 'force' }
        }
      ]
    };

    it('marks the blast zone with no immediate damage, then detonates at next turn start dealing 2d8 + Force', () => {
      const arena = createRadialArena(5);
      const ball = createRecruit('ball', 'Ballistician', { faction: 'PLAYER' });
      (ball as any).baseAttributes = { force: 2, finesse: 4, focus: 0 };
      const enemy = createRecruit('enemy', 'Target', { faction: 'ENEMY' });
      (enemy as any).effectiveVitals = { ...enemy.effectiveVitals, maxHp: 40, evasion: 10, armor: 0 };
      arena.setUnitPosition('ball', { q: -3, r: 0 });
      arena.setUnitPosition('enemy', { q: 0, r: 0 });

      const state = createCombatState(arena, [ball, enemy], 'ball');
      const ballCu = state.units.get('ball')!;
      const enemyCu = state.units.get('enemy')!;
      (ballCu as any).abilities = [SIEGE_BARRAGE_TEST];
      enemyCu.currentHp = 40;

      executeAbility(state, 'ball', SIEGE_BARRAGE_TEST, { coord: { q: 0, r: 0 } });

      // No immediate damage; 7 hexes marked
      expect(enemyCu.currentHp).toBe(40);
      expect(state.pendingBombardments).toHaveLength(1);
      expect(state.pendingBombardments![0].hexCoords).toHaveLength(7);

      // Detonate on Ballistician's next turn start with deterministic dice: d20=15 (Solid Hit), 2d8=13 -> 13 + 2 Force = 15 dmg
      const roller = new MockDiceRoller({ d20Rolls: [15], damageRolls: [13] });
      const events = resolvePendingBombardmentsOnTurnStart(state, 'ball', roller);
      expect(state.pendingBombardments).toHaveLength(0);
      expect(events.some((e) => e.type === 'DAMAGE' && e.targetUnitId === 'enemy' && e.amount === 15 && e.coord?.q === 0 && e.coord?.r === 0)).toBe(true);
      expect(enemyCu.currentHp).toBe(25);

      const hitLog = state.combatLog[state.combatLog.length - 1];
      expect(hitLog.metadata).toMatchObject({
        type: 'UTILITY',
        ability: 'Siege Barrage',
        target: 'hex (0, 0)',
        damageTotal: '15',
        effects: [
          expect.objectContaining({
            kind: 'COLLATERAL_HIT',
            sourceLabel: 'Barrage',
            targetName: 'Target',
            damage: 15,
            hitOutcome: 'SOLID_HIT'
          })
        ]
      });

      // Subsequent cast on a later turn produces a new pendingBombardments array reference
      ballCu.currentAp = 3;
      ballCu.abilitiesUsedThisTurn = [];
      const prevBombardmentsRef = state.pendingBombardments;
      executeAbility(state, 'ball', SIEGE_BARRAGE_TEST, { coord: { q: 0, r: 0 } });
      expect(state.pendingBombardments).not.toBe(prevBombardmentsRef);
      expect(state.pendingBombardments).toHaveLength(1);

      // Miss on target in blast zone logs a COLLATERAL_HIT with hitOutcome: 'MISS'
      const missRoller = new MockDiceRoller({ d20Rolls: [1], damageRolls: [10] });
      const missEvents = resolvePendingBombardmentsOnTurnStart(state, 'ball', missRoller);
      expect(missEvents.some((e) => e.type === 'MISS' && e.targetUnitId === 'enemy' && e.coord?.q === 0 && e.coord?.r === 0)).toBe(true);
      const missLog = state.combatLog[state.combatLog.length - 1];
      expect(missLog.metadata).toMatchObject({
        type: 'UTILITY',
        ability: 'Siege Barrage',
        target: 'hex (0, 0)',
        effects: [
          expect.objectContaining({
            kind: 'COLLATERAL_HIT',
            sourceLabel: 'Barrage',
            targetName: 'Target',
            damage: 0,
            hitOutcome: 'MISS'
          })
        ]
      });

      // Empty blast zone logs an 'Empty Blast Zone' CONTEXT pill so the log card is never blank
      ballCu.currentAp = 3;
      ballCu.abilitiesUsedThisTurn = [];
      executeAbility(state, 'ball', SIEGE_BARRAGE_TEST, { coord: { q: 0, r: -3 } });
      resolvePendingBombardmentsOnTurnStart(state, 'ball', roller);
      const emptyLog = state.combatLog[state.combatLog.length - 1];
      expect(emptyLog.metadata).toMatchObject({
        type: 'UTILITY',
        ability: 'Siege Barrage',
        target: 'hex (0, -3)',
        effects: [
          expect.objectContaining({
            kind: 'CONTEXT',
            label: 'Empty Blast Zone'
          })
        ]
      });
    });

    it('persists and detonates even if the Ballistician is defeated while the volley is airborne', () => {
      const arena = createRadialArena(5);
      const ball = createRecruit('ball', 'Ballistician', { faction: 'PLAYER' });
      (ball as any).baseAttributes = { force: 1, finesse: 3, focus: 0 };
      const enemy = createRecruit('enemy', 'Target', { faction: 'ENEMY' });
      (enemy as any).effectiveVitals = { ...enemy.effectiveVitals, maxHp: 30, evasion: 10, armor: 0 };
      arena.setUnitPosition('ball', { q: -3, r: 0 });
      arena.setUnitPosition('enemy', { q: 0, r: 0 });

      const state = createCombatState(arena, [ball, enemy], 'ball');
      const ballCu = state.units.get('ball')!;
      const enemyCu = state.units.get('enemy')!;
      (ballCu as any).abilities = [SIEGE_BARRAGE_TEST];
      enemyCu.currentHp = 30;

      executeAbility(state, 'ball', SIEGE_BARRAGE_TEST, { coord: { q: 0, r: 0 } });
      expect(state.pendingBombardments).toHaveLength(1);

      // Simulate Ballistician defeated while shells are airborne
      ballCu.isDefeated = true;
      ballCu.currentHp = 0;
      state.arena.removeUnit('ball');

      // When enemy's turn starts (only 1 living unit left), fallback countdown hits 0 and shells detonate!
      const roller = new MockDiceRoller({ d20Rolls: [14], damageRolls: [10] }); // 10 + 1 Force = 11 dmg
      resolvePendingBombardmentsOnTurnStart(state, 'enemy', roller);
      expect(state.pendingBombardments).toHaveLength(0);
      expect(enemyCu.currentHp).toBe(19);
    });
  });
});
