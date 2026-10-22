import { describe, it, expect } from 'vitest';
import { resolveDamageFloatingText } from './useFloatingCombatText';
import { CombatEvent } from '../../core/combat/types';

describe('useFloatingCombatText: resolveDamageFloatingText', () => {
  it('formats custom BLAST label on secondary damage event', () => {
    const event: Extract<CombatEvent, { type: 'DAMAGE' }> = {
      type: 'DAMAGE',
      targetUnitId: 'dummy',
      amount: 2,
      damageType: 'MAGICAL',
      reason: 'SPLASH',
      label: 'BLAST'
    };

    const result = resolveDamageFloatingText(event, 'SOLID_HIT');
    expect(result.text).toBe('BLAST! -2');
    expect(result.textType).toBe('slam');
  });

  it('formats custom CLEAVE label on secondary damage event', () => {
    const event: Extract<CombatEvent, { type: 'DAMAGE' }> = {
      type: 'DAMAGE',
      targetUnitId: 'dummy',
      amount: 3,
      damageType: 'PHYSICAL',
      reason: 'COLLATERAL',
      label: 'CLEAVE'
    };

    const result = resolveDamageFloatingText(event, 'SOLID_HIT');
    expect(result.text).toBe('CLEAVE! -3');
    expect(result.textType).toBe('slam');
  });

  it('formats custom SURGE label on secondary damage event', () => {
    const event: Extract<CombatEvent, { type: 'DAMAGE' }> = {
      type: 'DAMAGE',
      targetUnitId: 'dummy',
      amount: 2,
      damageType: 'MAGICAL',
      reason: 'COLLATERAL',
      label: 'SURGE'
    };

    const result = resolveDamageFloatingText(event, 'SOLID_HIT');
    expect(result.text).toBe('SURGE! -2');
    expect(result.textType).toBe('slam');
  });

  it('formats custom COLLISION label on bystander collision event', () => {
    const event: Extract<CombatEvent, { type: 'DAMAGE' }> = {
      type: 'DAMAGE',
      targetUnitId: 'dummy',
      amount: 1,
      damageType: 'PHYSICAL',
      reason: 'COLLATERAL',
      label: 'COLLISION'
    };

    const result = resolveDamageFloatingText(event, 'SOLID_HIT');
    expect(result.text).toBe('COLLISION! -1');
    expect(result.textType).toBe('slam');
  });

  it('falls back to SPLASH! when reason is SPLASH and no label is specified', () => {
    const event: Extract<CombatEvent, { type: 'DAMAGE' }> = {
      type: 'DAMAGE',
      targetUnitId: 'dummy',
      amount: 2,
      damageType: 'MAGICAL',
      reason: 'SPLASH'
    };

    const result = resolveDamageFloatingText(event, 'SOLID_HIT');
    expect(result.text).toBe('SPLASH! -2');
    expect(result.textType).toBe('slam');
  });

  it('formats primary attack hits with critical, graze, or standard prefixes', () => {
    const critEvent: Extract<CombatEvent, { type: 'DAMAGE' }> = {
      type: 'DAMAGE',
      targetUnitId: 'dummy',
      amount: 8,
      damageType: 'PHYSICAL',
      reason: 'ATTACK',
      isCrit: true
    };
    expect(resolveDamageFloatingText(critEvent, 'CRITICAL_HIT').text).toBe('CRITICAL! -8');

    const grazeEvent: Extract<CombatEvent, { type: 'DAMAGE' }> = {
      type: 'DAMAGE',
      targetUnitId: 'dummy',
      amount: 2,
      damageType: 'PHYSICAL',
      reason: 'ATTACK'
    };
    expect(resolveDamageFloatingText(grazeEvent, 'GRAZE').text).toBe('GRAZE -2');

    const solidEvent: Extract<CombatEvent, { type: 'DAMAGE' }> = {
      type: 'DAMAGE',
      targetUnitId: 'dummy',
      amount: 4,
      damageType: 'PHYSICAL',
      reason: 'ATTACK'
    };
    expect(resolveDamageFloatingText(solidEvent, 'SOLID_HIT').text).toBe('-4');
  });

  it('formats unlabelled COLLISION damage as SLAM! and FALL damage as FALL!', () => {
    const wallCollisionEvent: Extract<CombatEvent, { type: 'DAMAGE' }> = {
      type: 'DAMAGE',
      targetUnitId: 'dummy',
      amount: 3,
      damageType: 'PHYSICAL',
      reason: 'COLLISION'
    };
    const collisionResult = resolveDamageFloatingText(wallCollisionEvent, 'SOLID_HIT');
    expect(collisionResult.text).toBe('SLAM! -3');
    expect(collisionResult.textType).toBe('slam');

    const fallEvent: Extract<CombatEvent, { type: 'DAMAGE' }> = {
      type: 'DAMAGE',
      targetUnitId: 'dummy',
      amount: 5,
      damageType: 'PHYSICAL',
      reason: 'FALL'
    };
    const fallResult = resolveDamageFloatingText(fallEvent, 'SOLID_HIT');
    expect(fallResult.text).toBe('FALL! -5');
    expect(fallResult.textType).toBe('slam');
  });
});

describe('useFloatingCombatText: collectResolutionFloatingTexts', () => {
  it('collects floaters for non-attack resolutions with knockback and collision damage', async () => {
    const { collectResolutionFloatingTexts } = await import('./useFloatingCombatText');
    const { createRadialArena } = await import('../../core/grid/templates');
    const { createRecruit } = await import('../../core/units/unitFactory');
    const { createCombatState } = await import('../../core/combat/resolver');
    const { GUST } = await import('../../data/packages/sorcerer');

    const arena = createRadialArena(3);
    const sorcerer = createRecruit('sorcerer', 'Sorcerer');
    const goblin = createRecruit('goblin', 'Goblin');
    arena.setUnitPosition('sorcerer', { q: 0, r: 0 });
    arena.setUnitPosition('goblin', { q: 1, r: 0 });
    const state = createCombatState(arena, [sorcerer, goblin], 'sorcerer');

    const resolution = {
      type: 'BUFF' as const,
      targetUnitId: 'goblin',
      modifierApplied: { stat: 'armor' as const, value: 0, durationTurns: 0 },
      events: [
        {
          type: 'DISPLACEMENT' as const,
          unitId: 'goblin',
          fromCoord: { q: 1, r: 0 },
          toCoord: { q: 2, r: 0 },
          kind: 'KNOCKBACK' as const
        },
        {
          type: 'DAMAGE' as const,
          targetUnitId: 'goblin',
          amount: 2,
          damageType: 'PHYSICAL' as const,
          reason: 'COLLISION' as const
        }
      ]
    };

    const items = collectResolutionFloatingTexts(
      state,
      resolution,
      GUST,
      { q: 1, r: 0 },
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      'goblin'
    );

    const knockbackItem = items.find((i) => i.text === 'KNOCKBACK!');
    expect(knockbackItem).toBeDefined();
    expect(knockbackItem?.coord).toEqual({ q: 2, r: 0 });

    const slamItem = items.find((i) => i.text === 'SLAM! -2');
    expect(slamItem).toBeDefined();
    expect(slamItem?.coord).toEqual({ q: 1, r: 0 });
  });

  it('collects TELEPORT! floater on non-attack teleportation resolution', async () => {
    const { collectResolutionFloatingTexts } = await import('./useFloatingCombatText');
    const { createRadialArena } = await import('../../core/grid/templates');
    const { createRecruit } = await import('../../core/units/unitFactory');
    const { createCombatState } = await import('../../core/combat/resolver');
    const { SHADOW_STEP } = await import('../../data/packages/thief');

    const arena = createRadialArena(3);
    const thief = createRecruit('thief', 'Thief');
    arena.setUnitPosition('thief', { q: 0, r: 0 });
    const state = createCombatState(arena, [thief], 'thief');

    const resolution = {
      type: 'BUFF' as const,
      targetUnitId: 'thief',
      modifierApplied: { stat: 'armor' as const, value: 0, durationTurns: 0 },
      events: [
        {
          type: 'DISPLACEMENT' as const,
          unitId: 'thief',
          fromCoord: { q: 0, r: 0 },
          toCoord: { q: 2, r: 0 },
          kind: 'TELEPORT' as const
        }
      ]
    };

    const items = collectResolutionFloatingTexts(
      state,
      resolution,
      SHADOW_STEP,
      undefined,
      { q: 0, r: 0 },
      { q: 2, r: 0 },
      undefined
    );

    const teleportItem = items.find((i) => i.text === 'TELEPORT!');
    expect(teleportItem).toBeDefined();
    expect(teleportItem?.coord).toEqual({ q: 2, r: 0 });
  });

  it('formats floating XP using Force/Finesse/Focus discipline names and scales by AP cost', async () => {
    const { collectResolutionFloatingTexts } = await import('./useFloatingCombatText');
    const { createRadialArena } = await import('../../core/grid/templates');
    const { createRecruit } = await import('../../core/units/unitFactory');
    const { createCombatState } = await import('../../core/combat/resolver');

    const arena = createRadialArena(3);
    const hero = createRecruit('hero', 'Hero');
    const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });
    arena.setUnitPosition('hero', { q: 0, r: 0 });
    arena.setUnitPosition('enemy', { q: 1, r: 0 });
    const state = createCombatState(arena, [hero, enemy], 'hero');

    const twoApRogueAbility = {
      id: 'test_2ap_rogue',
      name: 'Twin Strike',
      description: 'Test',
      apCost: 2,
      range: 1,
      targetType: 'SINGLE_TARGET' as const,
      defenseTarget: 'EVASION' as const,
      damageType: 'PHYSICAL' as const,
      archetypeTag: 'ROGUE' as const,
      effects: []
    };

    const resolution = {
      type: 'ATTACK' as const,
      details: {
        hitOutcome: 'SOLID_HIT' as const,
        d20Roll: 15,
        modifier: 2,
        totalAttackScore: 17,
        defenseTargetScore: 10,
        rawDamage: 4,
        mitigation: 0,
        damageDealt: 4,
        damageBreakdown: '4 Physical',
        effectsApplied: [],
        events: []
      }
    };

    const items = collectResolutionFloatingTexts(
      state,
      resolution,
      twoApRogueAbility,
      { q: 1, r: 0 },
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      'enemy'
    );

    const xpFloat = items.find((i) => i.type === 'xp');
    expect(xpFloat).toBeDefined();
    expect(xpFloat?.text).toBe('+2 Finesse XP');
    expect(xpFloat?.coord).toEqual({ q: 0, r: 0 });
  });
});

describe('useFloatingCombatText: collectInitiativeFloatingTexts', () => {
  it('collects initiative floating text for units with initialInitiativeRoll', async () => {
    const { collectInitiativeFloatingTexts } = await import('./useFloatingCombatText');
    const { createRadialArena } = await import('../../core/grid/templates');
    const { createRecruit } = await import('../../core/units/unitFactory');
    const { createCombatState } = await import('../../core/combat/resolver');
    const { MockDiceRoller } = await import('../../core/combat/dice');

    const arena = createRadialArena(3);
    const hero = createRecruit('hero-1', 'Hero');
    const goblin = createRecruit('goblin-1', 'Goblin');
    arena.setUnitPosition('hero-1', { q: 0, r: 0 });
    arena.setUnitPosition('goblin-1', { q: 1, r: 0 });

    const roller = new MockDiceRoller({ d20Rolls: [17, 8] });
    const state = createCombatState(arena, [hero, goblin], undefined, undefined, undefined, roller);

    const items = collectInitiativeFloatingTexts(state);
    expect(items).toHaveLength(2);

    const heroFloat = items.find((i) => i.coord.q === 0 && i.coord.r === 0);
    const goblinFloat = items.find((i) => i.coord.q === 1 && i.coord.r === 0);

    expect(heroFloat?.text).toBe('🎲 17');
    expect(heroFloat?.type).toBe('initiative');
    expect(heroFloat?.delay).toBe(0);
    expect(goblinFloat?.text).toBe('🎲 8');
    expect(goblinFloat?.type).toBe('initiative');
    expect(goblinFloat?.delay).toBe(250);
  });
});

