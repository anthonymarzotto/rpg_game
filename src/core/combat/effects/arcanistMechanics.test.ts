import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../../grid/templates';
import { createRecruit } from '../../units/unitFactory';
import { createCombatState, executeAbility } from '../resolver';
import { canExecuteAbility } from '../validator';
import { resolveTargetDefense, evaluateAttackRollContext } from '../attackRoll';
import { computeAbilityMetrics } from '../targetPreview';
import { resolvePendingBombardmentsOnTurnStart } from '../battlefieldZones';
import { formatAbilityDescription } from '../abilityFormatter';
import { MockDiceRoller } from '../dice';
import {
  REFRACTIVE_ARRAY,
  ADAPTIVE_FORMULA,
  DISTRIBUTIVE_PROOF,
  EXCLUSION_MATRIX
} from '../../../data/packages/arcanist';
import { ARCANE_BLAST } from '../../../data/packages/wizard';
import { SIEGE_BARRAGE } from '../../../data/packages/ballistician';
import { getClassPackage, getAbilityById, getPassiveById } from '../../../data/packages';
import { LoadoutLookupProviders } from '../../units/loadout';
import { Unit } from '../../types/unit';

const providers: LoadoutLookupProviders = {
  getPackage: getClassPackage,
  getAbility: getAbilityById,
  getPassive: getPassiveById
};

function makeArcanist(id: string, name: string, faction: 'PLAYER' | 'ENEMY' = 'PLAYER'): Unit {
  const u = createRecruit(id, name, {
    faction,
    loadout: {
      activeClassId: 'arcanist',
      wildcardAbilityIds: [],
      wildcardPassiveIds: []
    }
  });
  (u as any).baseAttributes = { force: 1, finesse: 2, focus: 4 };
  (u as any).unlockedNodes = ['wizard', 'sorcerer', 'witch', 'arcanist'];
  return u;
}

describe('Arcanist Core Mechanics (Exclusion Matrix, LOWER_DEFENSE, ALLY_REFRACTION, DISTRIBUTIVE_PROOF)', () => {
  describe('LOWER_DEFENSE & Adaptive Formula', () => {
    it('selects Evasion when Evasion < Resolve, Resolve when Resolve < Evasion, and Resolve on exact tie', () => {
      const arena = createRadialArena(3);
      const arcanist = makeArcanist('arc', 'Euclid');
      const mageEnemy = createRecruit('mage', 'High Resolve Mage', { faction: 'ENEMY' });
      (mageEnemy as any).effectiveVitals = { ...mageEnemy.effectiveVitals, evasion: 10, resolve: 15, ward: 1 };
      const rogueEnemy = createRecruit('rogue', 'High Evasion Rogue', { faction: 'ENEMY' });
      (rogueEnemy as any).effectiveVitals = { ...rogueEnemy.effectiveVitals, evasion: 16, resolve: 11, ward: 1 };
      const tiedEnemy = createRecruit('tied', 'Balanced Guard', { faction: 'ENEMY' });
      (tiedEnemy as any).effectiveVitals = { ...tiedEnemy.effectiveVitals, evasion: 12, resolve: 12, ward: 1 };

      arena.setUnitPosition('arc', { q: 0, r: 0 });
      arena.setUnitPosition('mage', { q: 2, r: 0 });
      arena.setUnitPosition('rogue', { q: 0, r: 2 });
      arena.setUnitPosition('tied', { q: -2, r: 0 });

      const state = createCombatState(arena, [arcanist, mageEnemy, rogueEnemy, tiedEnemy], 'arc', providers);
      const arcCu = state.units.get('arc')!;
      const mageCu = state.units.get('mage')!;
      const rogueCu = state.units.get('rogue')!;
      const tiedCu = state.units.get('tied')!;

      expect(resolveTargetDefense(mageCu, 'LOWER_DEFENSE')).toEqual({ value: 10, label: 'Evasion' });
      expect(resolveTargetDefense(rogueCu, 'LOWER_DEFENSE')).toEqual({ value: 11, label: 'Resolve' });
      expect(resolveTargetDefense(tiedCu, 'LOWER_DEFENSE')).toEqual({ value: 12, label: 'Resolve' });

      const ctxMage = evaluateAttackRollContext(arcCu, mageCu, ADAPTIVE_FORMULA, { state });
      expect(ctxMage.targetDefense).toBe(10);
      expect(ctxMage.defenseType).toBe('Evasion');

      const previewMage = computeAbilityMetrics(state, 'arc', ADAPTIVE_FORMULA, { q: 2, r: 0 });
      expect(previewMage?.targetDefense).toBe(10);
      expect(previewMage?.defenseType).toBe('Evasion');

      const previewRogue = computeAbilityMetrics(state, 'arc', ADAPTIVE_FORMULA, { q: 0, r: 2 });
      expect(previewRogue?.targetDefense).toBe(11);
      expect(previewRogue?.defenseType).toBe('Resolve');

      const previewTied = computeAbilityMetrics(state, 'arc', ADAPTIVE_FORMULA, { q: -2, r: 0 });
      expect(previewTied?.targetDefense).toBe(12);
      expect(previewTied?.defenseType).toBe('Resolve');
    });
  });

  describe('Exclusion Matrix (Ally-Transparent Magical LoS & Zero Friendly Fire)', () => {
    it('allows magical abilities to shoot through intervening allies while still blocking on enemies and RUINS', () => {
      const arena = createRadialArena(4);
      const arcanist = makeArcanist('arc', 'Euclid');
      const ally = createRecruit('ally', 'Knight', { faction: 'PLAYER' });
      const enemyA = createRecruit('enemyA', 'Target A', { faction: 'ENEMY' });
      const enemyB = createRecruit('enemyB', 'Screener B', { faction: 'ENEMY' });
      const enemyC = createRecruit('enemyC', 'Behind B', { faction: 'ENEMY' });

      arena.setUnitPosition('arc', { q: 0, r: 0 });
      arena.setUnitPosition('ally', { q: 1, r: 0 });
      arena.setUnitPosition('enemyA', { q: 2, r: 0 });
      arena.setUnitPosition('enemyB', { q: -1, r: 0 });
      arena.setUnitPosition('enemyC', { q: -2, r: 0 });

      // Put a RUINS obstacle at (0, 1) and an enemy behind it at (0, 2)
      arena.setTile({ coord: { q: 0, r: 1 }, elevation: 0, isWalkable: false, label: 'Ruins', terrainType: 'RUINS' });
      const enemyBehindWall = createRecruit('enemyWall', 'Behind Wall', { faction: 'ENEMY' });
      arena.setUnitPosition('enemyWall', { q: 0, r: 2 });

      const state = createCombatState(
        arena,
        [arcanist, ally, enemyA, enemyB, enemyC, enemyBehindWall],
        'arc',
        providers
      );

      // Shoot through ally -> allowed
      const throughAlly = canExecuteAbility(state, 'arc', ADAPTIVE_FORMULA, { targetUnitId: 'enemyA' });
      expect(throughAlly.valid).toBe(true);
      const previewThroughAlly = computeAbilityMetrics(state, 'arc', ADAPTIVE_FORMULA, { q: 2, r: 0 });
      expect(previewThroughAlly?.hasLoS).toBe(true);

      // Shoot through intervening enemy -> blocked
      const throughEnemy = canExecuteAbility(state, 'arc', ADAPTIVE_FORMULA, { targetUnitId: 'enemyC' });
      expect(throughEnemy.valid).toBe(false);
      if (!throughEnemy.valid) {
        expect(throughEnemy.reason).toContain('Line-of-Sight is blocked');
      }

      // Shoot through RUINS obstacle -> blocked
      const throughWall = canExecuteAbility(state, 'arc', ADAPTIVE_FORMULA, { targetUnitId: 'enemyWall' });
      expect(throughWall.valid).toBe(false);
      if (!throughWall.valid) {
        expect(throughWall.reason).toContain('Line-of-Sight is blocked');
      }
    });

    it('spares allies on center and surrounding hexes of Arcane Blast and Delayed Bombardment when Exclusion Matrix is equipped', () => {
      const arena = createRadialArena(4);
      const arcanist = makeArcanist('arc', 'Euclid');
      const ally = createRecruit('ally', 'Knight', { faction: 'PLAYER' });
      const enemy = createRecruit('enemy', 'Raider', { faction: 'ENEMY' });
      (ally as any).effectiveVitals = { ...ally.effectiveVitals, maxHp: 30, resolve: 10, evasion: 10, ward: 0, armor: 0 };
      (enemy as any).effectiveVitals = { ...enemy.effectiveVitals, maxHp: 30, resolve: 10, evasion: 10, ward: 0, armor: 0 };

      arena.setUnitPosition('arc', { q: 0, r: 0 });
      arena.setUnitPosition('ally', { q: 2, r: 0 });
      arena.setUnitPosition('enemy', { q: 3, r: 0 });

      const state = createCombatState(arena, [arcanist, ally, enemy], 'arc', providers);
      const allyCu = state.units.get('ally')!;
      const enemyCu = state.units.get('enemy')!;

      // Target Arcane Blast directly centered on ally's hex
      const preview = computeAbilityMetrics(state, 'arc', ARCANE_BLAST, { q: 2, r: 0 });
      expect(preview?.splashUnits?.some((s) => s.targetUnitId === 'ally')).toBe(false);
      expect(preview?.splashUnits?.some((s) => s.targetUnitId === 'enemy')).toBe(true);

      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [3] });
      executeAbility(state, 'arc', ARCANE_BLAST, { coord: { q: 2, r: 0 } }, dice);
      expect(allyCu.currentHp).toBe(30);
      expect(enemyCu.currentHp).toBeLessThan(30);

      // Delayed bombardment (Siege Barrage wildcard) with Exclusion Matrix spares ally on detonation
      const arcCu = state.units.get('arc')!;
      arcCu.currentAp = 3;
      const enemyHpBefore = enemyCu.currentHp;
      executeAbility(state, 'arc', SIEGE_BARRAGE, { coord: { q: 2, r: 0 } }, new MockDiceRoller({ d20Rolls: [15], damageRolls: [5, 5] }));
      resolvePendingBombardmentsOnTurnStart(state, 'arc', new MockDiceRoller({ d20Rolls: [18], damageRolls: [4, 4] }));
      expect(allyCu.currentHp).toBe(30);
      expect(enemyCu.currentHp).toBeLessThan(enemyHpBefore);
    });
  });

  describe('ALLY_REFRACTION (Refractive Array)', () => {
    it('spares center ally and redirects extra 1d4+Focus strike onto lowest-HP enemy labeled REFRACT', () => {
      const arena = createRadialArena(4);
      const arcanist = makeArcanist('arc', 'Euclid');
      const knight = createRecruit('knight', 'Knight', { faction: 'PLAYER' });
      const enemyLow = createRecruit('e1', 'Low HP Goblin', { faction: 'ENEMY' });
      const enemyHigh = createRecruit('e2', 'High HP Orc', { faction: 'ENEMY' });
      (knight as any).effectiveVitals = { ...knight.effectiveVitals, maxHp: 30, resolve: 10, ward: 0 };
      (enemyLow as any).effectiveVitals = { ...enemyLow.effectiveVitals, maxHp: 20, resolve: 10, ward: 0 };
      (enemyHigh as any).effectiveVitals = { ...enemyHigh.effectiveVitals, maxHp: 30, resolve: 10, ward: 0 };

      arena.setUnitPosition('arc', { q: 0, r: 0 });
      arena.setUnitPosition('knight', { q: 2, r: 0 });
      arena.setUnitPosition('e1', { q: 3, r: 0 });
      arena.setUnitPosition('e2', { q: 2, r: 1 });

      const state = createCombatState(arena, [arcanist, knight, enemyLow, enemyHigh], 'arc', providers);
      state.units.get('e1')!.currentHp = 12;
      state.units.get('e2')!.currentHp = 25;

      // d20=15 (+4 Focus = 19 vs Resolve 10 -> SOLID_HIT for both + refract)
      // Base rolls: e1=2 (+4=6), e2=2 (+4=6); Refract roll onto e1 (lowest HP): 3 (+4=7)
      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [2, 2, 3] });
      const res = executeAbility(state, 'arc', REFRACTIVE_ARRAY, { coord: { q: 2, r: 0 } }, dice);

      expect(res.type).toBe('ATTACK');
      expect(state.units.get('knight')!.currentHp).toBe(30);
      expect(state.units.get('e1')!.currentHp).toBe(0); // 12 - 6 - 7 = 0
      expect(state.units.get('e2')!.currentHp).toBe(19); // 25 - 6 = 19

      if (res.type === 'ATTACK') {
        const refractEvents = res.details.events.filter(
          (e) => e.type === 'DAMAGE' && e.label === 'REFRACT'
        );
        expect(refractEvents).toHaveLength(1);
        expect(refractEvents[0].type === 'DAMAGE' && refractEvents[0].targetUnitId).toBe('e1');
      }
      const lastLog = state.combatLog[state.combatLog.length - 1];
      const meta = lastLog.metadata;
      expect(meta?.type).toBe('ATTACK');
      if (meta?.type === 'ATTACK') {
        const refractOutcome = meta.effects?.find(
          (eff) => eff.kind === 'COLLATERAL_HIT' && eff.sourceLabel === 'Refract'
        );
        expect(refractOutcome).toBeDefined();
      }
    });

    it('spreads multiple spared allies round-robin across living enemies and cycles if only 1 enemy remains', () => {
      const arena = createRadialArena(4);
      const arcanist = makeArcanist('arc', 'Euclid');
      const ally1 = createRecruit('a1', 'Ally 1', { faction: 'PLAYER' });
      const ally2 = createRecruit('a2', 'Ally 2', { faction: 'PLAYER' });
      const e1 = createRecruit('e1', 'Enemy 1', { faction: 'ENEMY' });
      const e2 = createRecruit('e2', 'Enemy 2', { faction: 'ENEMY' });
      for (const u of [ally1, ally2, e1, e2]) {
        (u as any).effectiveVitals = { ...u.effectiveVitals, maxHp: 40, resolve: 10, ward: 0 };
      }

      arena.setUnitPosition('arc', { q: 0, r: 0 });
      arena.setUnitPosition('a1', { q: 2, r: 0 });
      arena.setUnitPosition('a2', { q: 1, r: 1 });
      arena.setUnitPosition('e1', { q: 3, r: 0 });
      arena.setUnitPosition('e2', { q: 2, r: 1 });

      const state = createCombatState(arena, [arcanist, ally1, ally2, e1, e2], 'arc', providers);
      state.units.get('e1')!.currentHp = 25;
      state.units.get('e2')!.currentHp = 35;

      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [1, 1, 2, 2] });
      const res = executeAbility(state, 'arc', REFRACTIVE_ARRAY, { coord: { q: 2, r: 0 } }, dice);
      expect(res.type).toBe('ATTACK');
      if (res.type === 'ATTACK') {
        const refractTargets = res.details.events
          .filter((e): e is Extract<typeof e, { type: 'DAMAGE' }> => e.type === 'DAMAGE' && e.label === 'REFRACT')
          .map((e) => e.targetUnitId);
        // Round-robin: first hits lowest HP (e1), second spreads to e2
        expect(refractTargets).toEqual(['e1', 'e2']);
      }
    });

    it('does not generate a self-refraction when caster stands inside the blast radius with no other allies', () => {
      const arena = createRadialArena(4);
      const arcanist = makeArcanist('arc', 'Euclid');
      const enemy = createRecruit('e1', 'Enemy 1', { faction: 'ENEMY' });
      (enemy as any).effectiveVitals = { ...enemy.effectiveVitals, maxHp: 30, resolve: 10, ward: 0 };

      arena.setUnitPosition('arc', { q: 0, r: 0 });
      arena.setUnitPosition('e1', { q: 1, r: 0 });

      const state = createCombatState(arena, [arcanist, enemy], 'arc', providers);
      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [2] });
      const res = executeAbility(state, 'arc', REFRACTIVE_ARRAY, { coord: { q: 1, r: 0 } }, dice);

      expect(res.type).toBe('ATTACK');
      if (res.type === 'ATTACK') {
        const refractEvents = res.details.events.filter(
          (e) => e.type === 'DAMAGE' && e.label === 'REFRACT'
        );
        expect(refractEvents).toHaveLength(0);
      }
      expect(state.units.get('arc')!.currentHp).toBe(arcanist.effectiveVitals.maxHp);
    });
  });

  describe('DISTRIBUTIVE_PROOF & Ability Formatter', () => {
    it('applies EXPOSED on isolated enemy Hit/Crit, and splashes 1d4 on clustered enemy', () => {
      const arena = createRadialArena(4);
      const arcanist = makeArcanist('arc', 'Euclid');
      const allyKnight = createRecruit('knight', 'Knight', { faction: 'PLAYER' });
      const isoEnemy = createRecruit('iso', 'Isolated Scout', { faction: 'ENEMY' });
      const cluA = createRecruit('cluA', 'Cluster A', { faction: 'ENEMY' });
      const cluB = createRecruit('cluB', 'Cluster B', { faction: 'ENEMY' });
      for (const u of [allyKnight, isoEnemy, cluA, cluB]) {
        (u as any).effectiveVitals = { ...u.effectiveVitals, maxHp: 30, resolve: 10, ward: 0 };
      }

      arena.setUnitPosition('arc', { q: 0, r: 0 });
      arena.setUnitPosition('iso', { q: -2, r: 0 });
      arena.setUnitPosition('cluA', { q: 2, r: 0 });
      arena.setUnitPosition('cluB', { q: 3, r: 0 });
      arena.setUnitPosition('knight', { q: 2, r: 1 });

      const state = createCombatState(arena, [arcanist, allyKnight, isoEnemy, cluA, cluB], 'arc', providers);

      // Isolated branch: baseline 1d4 (3) + Focus (4) = 7 dmg + EXPOSED
      const isoDice = new MockDiceRoller({ d20Rolls: [14], damageRolls: [3] });
      executeAbility(state, 'arc', DISTRIBUTIVE_PROOF, { targetUnitId: 'iso' }, isoDice);
      expect(state.units.get('iso')!.currentHp).toBe(23);
      expect(state.units.get('iso')!.activeConditions.some((c) => c.type === 'EXPOSED')).toBe(true);

      // Clustered branch: baseline 1d4 (2) + Focus (4) = 6 on cluA; 1d4 (3) DISTRIBUTE splash on cluB; knight spared
      const cluDice = new MockDiceRoller({ d20Rolls: [14], damageRolls: [2, 3] });
      const cluRes = executeAbility(state, 'arc', DISTRIBUTIVE_PROOF, { targetUnitId: 'cluA' }, cluDice);
      expect(state.units.get('cluA')!.currentHp).toBe(24);
      expect(state.units.get('cluA')!.activeConditions.some((c) => c.type === 'EXPOSED')).toBe(false);
      expect(state.units.get('cluB')!.currentHp).toBe(27);
      expect(state.units.get('knight')!.currentHp).toBe(30);
      if (cluRes.type === 'ATTACK') {
        expect(
          cluRes.details.events.some((e) => e.type === 'DAMAGE' && e.targetUnitId === 'cluB' && e.label === 'DISTRIBUTE')
        ).toBe(true);
      }
    });

    it('formats Refractive Array, Adaptive Formula, and Distributive Proof cleanly without raw enums', () => {
      const refFmt = formatAbilityDescription(REFRACTIVE_ARRAY);
      expect(refFmt.effectClauses.some((c) => c.text.includes('redirects'))).toBe(true);
      expect(refFmt.compactSummary).not.toContain('ALLY_REFRACTION');

      const adaFmt = formatAbilityDescription(ADAPTIVE_FORMULA);
      expect(adaFmt.statPills.some((p) => p.label.includes('Lower (EVA/RES)'))).toBe(true);
      expect(adaFmt.compactSummary).not.toContain('LOWER_DEFENSE');

      const disFmt = formatAbilityDescription(DISTRIBUTIVE_PROOF);
      expect(disFmt.effectClauses.some((c) => c.text.includes('Isolated') && c.text.includes('Clustered'))).toBe(true);
      expect(disFmt.compactSummary).not.toContain('DISTRIBUTIVE_PROOF');
      expect(EXCLUSION_MATRIX.excludeFriendlyAoE).toBe(true);
      expect(EXCLUSION_MATRIX.ignoresAllyLoS).toBe(true);
    });
  });
});
