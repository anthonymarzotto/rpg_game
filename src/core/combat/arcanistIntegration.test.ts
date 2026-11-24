import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { createRecruit } from '../units/unitFactory';
import { createCombatState, executeAbility } from './resolver';
import { MockDiceRoller } from './dice';
import {
  ARCANIST_PACKAGE,
  REFRACTIVE_ARRAY,
  DISTRIBUTIVE_PROOF,
  EXCLUSION_MATRIX
} from '../../data/packages/arcanist';
import { SPELL_SCULPT } from '../../data/packages/sorcerer';
import { getClassPackage, getAbilityById, getPassiveById } from '../../data/packages';
import { resolveUnitLoadout, LoadoutLookupProviders } from '../units/loadout';
import { createEnemyUnit, TIER4_CLASSES } from '../campaign/encounterGenerator';
import { decideNextAction } from '../ai/decisionEngine';
import { resolveDamageFloatingText } from '../../ui/combat/useFloatingCombatText';
import { Unit } from '../types/unit';

const providers: LoadoutLookupProviders = {
  getPackage: getClassPackage,
  getAbility: getAbilityById,
  getPassive: getPassiveById
};

function createArcanistHero(id: string, name: string, faction: 'PLAYER' | 'ENEMY' = 'PLAYER'): Unit {
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

describe('Tier 4 Arcanist Integration', () => {
  it('resolves Arcanist active class package and allows equipping domain abilities and passive as wildcards', () => {
    const hero = createArcanistHero('arc-1', 'Hypatia');
    const resolved = resolveUnitLoadout(hero, providers);
    expect(resolved.combatAbilities.map((a) => a.id)).toEqual([
      'refractive_array',
      'adaptive_formula',
      'distributive_proof'
    ]);
    expect(resolved.activePassives.some((p) => p.id === EXCLUSION_MATRIX.id)).toBe(true);
    expect(ARCANIST_PACKAGE.aiProfile).toBe('SNIPER');

    const wizardWithWildcards: Unit = {
      ...hero,
      loadout: {
        activeClassId: 'wizard',
        wildcardAbilityIds: ['adaptive_formula', 'distributive_proof'],
        wildcardPassiveIds: ['exclusion_matrix']
      }
    };
    const resolvedWildcard = resolveUnitLoadout(wizardWithWildcards, providers);
    expect(resolvedWildcard.combatAbilities.map((a) => a.id)).toContain('adaptive_formula');
    expect(resolvedWildcard.combatAbilities.map((a) => a.id)).toContain('distributive_proof');
    expect(resolvedWildcard.activePassives.map((p) => p.id)).toContain('exclusion_matrix');
  });

  it('cycles multiple spared allies onto a single surviving enemy with Refractive Array and supports Spell Sculpt combo', () => {
    const arena = createRadialArena(4);
    const arcanist = createArcanistHero('arc', 'Hypatia');
    const allyA = createRecruit('allyA', 'Vanguard A', { faction: 'PLAYER' });
    const allyB = createRecruit('allyB', 'Vanguard B', { faction: 'PLAYER' });
    const boss = createRecruit('boss', 'Trial Warden', { faction: 'ENEMY' });
    for (const u of [allyA, allyB, boss]) {
      (u as any).effectiveVitals = { ...u.effectiveVitals, maxHp: 50, resolve: 10, ward: 0 };
    }

    arena.setUnitPosition('arc', { q: 0, r: 0 });
    arena.setUnitPosition('allyA', { q: 2, r: 0 });
    arena.setUnitPosition('allyB', { q: 3, r: -1 });
    arena.setUnitPosition('boss', { q: 3, r: 0 });

    const state = createCombatState(arena, [arcanist, allyA, allyB, boss], 'arc', providers);
    // Prime Spell Sculpt (1 AP) -> Refractive Array (2 AP) expands blast radius to 2!
    executeAbility(state, 'arc', SPELL_SCULPT);
    const dice = new MockDiceRoller({ d20Rolls: [16], damageRolls: [2, 3, 2] });
    const res = executeAbility(state, 'arc', REFRACTIVE_ARRAY, { coord: { q: 2, r: 0 } }, dice);

    expect(res.type).toBe('ATTACK');
    expect(state.units.get('allyA')!.currentHp).toBe(50);
    expect(state.units.get('allyB')!.currentHp).toBe(50);
    // Boss takes base (2+4=6) + refract 1 (3+4=7) + refract 2 (2+4=6) = 19 dmg
    expect(state.units.get('boss')!.currentHp).toBe(31);
  });

  it('inflicts friendly splash when Distributive Proof is used as a wildcard without Exclusion Matrix', () => {
    const arena = createRadialArena(4);
    const wizard = createRecruit('wiz', 'Wizard', {
      faction: 'PLAYER',
      loadout: {
        activeClassId: 'wizard',
        wildcardAbilityIds: ['distributive_proof'],
        wildcardPassiveIds: []
      }
    });
    (wizard as any).baseAttributes = { force: 1, finesse: 1, focus: 4 };
    const ally = createRecruit('ally', 'Ally Fighter', { faction: 'PLAYER' });
    const enemyA = createRecruit('eA', 'Enemy A', { faction: 'ENEMY' });
    const enemyB = createRecruit('eB', 'Enemy B', { faction: 'ENEMY' });
    for (const u of [ally, enemyA, enemyB]) {
      (u as any).effectiveVitals = { ...u.effectiveVitals, maxHp: 30, resolve: 10, ward: 0 };
    }

    arena.setUnitPosition('wiz', { q: 0, r: 0 });
    arena.setUnitPosition('eA', { q: 2, r: 0 });
    arena.setUnitPosition('eB', { q: 3, r: 0 });
    arena.setUnitPosition('ally', { q: 2, r: 1 });

    const state = createCombatState(arena, [wizard, ally, enemyA, enemyB], 'wiz', providers);
    const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [2, 3, 3] });
    executeAbility(state, 'wiz', DISTRIBUTIVE_PROOF, { targetUnitId: 'eA' }, dice);

    expect(state.units.get('eA')!.currentHp).toBe(24);
    expect(state.units.get('eB')!.currentHp).toBe(27);
    // Without Exclusion Matrix, adjacent ally takes 1d4 DISTRIBUTE splash
    expect(state.units.get('ally')!.currentHp).toBe(27);
  });

  it('integrates arcanist in Stage 6+ TIER4_CLASSES, enemy initialization, AI refraction scoring, and floating text labels', () => {
    expect(TIER4_CLASSES).toContain('arcanist');
    const enemyArcanist = createEnemyUnit('enemy-arc', 'arcanist', () => 0.4);
    expect(enemyArcanist.loadout.activeClassId).toBe('arcanist');
    expect(enemyArcanist.progression.archetypePoints).toEqual({ fighter: 0, rogue: 1, mage: 3 });

    // AI decision test: enemy Arcanist chooses Refractive Array centered on ally surrounded by player units
    const arena = createRadialArena(4);
    const aiArc = createArcanistHero('ai-arc', 'Enemy Arcanist', 'ENEMY');
    const aiKnight = createRecruit('ai-knight', 'Enemy Knight', { faction: 'ENEMY' });
    const playerA = createRecruit('pA', 'Hero A', { faction: 'PLAYER' });
    const playerB = createRecruit('pB', 'Hero B', { faction: 'PLAYER' });
    for (const u of [aiKnight, playerA, playerB]) {
      (u as any).effectiveVitals = { ...u.effectiveVitals, maxHp: 20, resolve: 10, evasion: 10, ward: 0 };
    }

    arena.setUnitPosition('ai-arc', { q: 0, r: 0 });
    arena.setUnitPosition('ai-knight', { q: 2, r: 0 });
    arena.setUnitPosition('pA', { q: 3, r: 0 });
    arena.setUnitPosition('pB', { q: 2, r: 1 });

    const state = createCombatState(arena, [aiArc, aiKnight, playerA, playerB], 'ai-arc', providers);
    const action = decideNextAction(state, 'ai-arc');
    expect(action.type).toBe('ABILITY');
    if (action.type === 'ABILITY') {
      expect(action.ability.id).toBe('refractive_array');
    }

    // Floating combat text labels for REFRACT and DISTRIBUTE
    const refractFloat = resolveDamageFloatingText(
      { type: 'DAMAGE', targetUnitId: 'pA', amount: 5, damageType: 'MAGICAL', reason: 'SPLASH', label: 'REFRACT' },
      'SOLID_HIT'
    );
    expect(refractFloat.text).toBe('REFRACT! -5');

    const distFloat = resolveDamageFloatingText(
      { type: 'DAMAGE', targetUnitId: 'pB', amount: 3, damageType: 'MAGICAL', reason: 'SPLASH', label: 'DISTRIBUTE' },
      'SOLID_HIT'
    );
    expect(distFloat.text).toBe('DISTRIBUTE! -3');
  });
});
