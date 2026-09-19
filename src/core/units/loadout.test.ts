import { describe, it, expect } from 'vitest';
import { createRecruit } from './unitFactory';
import {
  resolveUnitLoadout,
  validateUnitLoadout,
  NOVICE_CLASS_ID,
  NOVICE_PASSIVE_ID
} from './loadout';
import {
  getClassPackage,
  getAbilityById,
  getPassiveById,
  POWER_STRIKE,
  SNEAK_ATTACK,
  ARCANE_BLAST
} from '../../data/packages';
import { Unit } from '../types/unit';

const providers = {
  getPackage: getClassPackage,
  getAbility: getAbilityById,
  getPassive: getPassiveById
};

describe('Unit Loadout & Active Class Resolution', () => {
  it('initializes a fresh recruit with Novice loadout and 3 rolled starter abilities', () => {
    const recruit = createRecruit('player', 'Alden');

    expect(recruit.loadout.activeClassId).toBe(NOVICE_CLASS_ID);
    expect(recruit.loadout.wildcardAbilityIds).toHaveLength(0);
    expect(recruit.loadout.wildcardPassiveIds).toHaveLength(0);
    expect(recruit.starterAbilityIds).toHaveLength(3);
  });

  it('resolves Novice loadout returning the 3 starter abilities and placeholder passive', () => {
    const recruit = createRecruit('player', 'Alden', {
      starterAbilityIds: ['shield_bash', 'quick_thrust', 'spark']
    });

    const resolved = resolveUnitLoadout(recruit, providers);

    expect(resolved.coreAbilities).toHaveLength(3);
    expect(resolved.coreAbilities.map((a) => a.id)).toEqual(['shield_bash', 'quick_thrust', 'spark']);
    expect(resolved.wildcardAbilities).toHaveLength(0);
    expect(resolved.combatAbilities).toHaveLength(3);
    expect(resolved.innatePassive.id).toBe(NOVICE_PASSIVE_ID);
    expect(resolved.activePassives).toHaveLength(1);
  });

  it('resolves Warrior active class package with Power Strike signature and warrior domain/passive', () => {
    const warriorUnit: Unit = {
      ...createRecruit('player', 'Alden'),
      progression: {
        unitId: 'player',
        currentLevel: 1,
        archetypePoints: { fighter: 1, rogue: 0, mage: 0 },
        constellation: ['warrior']
      },
      loadout: {
        activeClassId: 'warrior',
        wildcardAbilityIds: [],
        wildcardPassiveIds: []
      }
    };

    const resolved = resolveUnitLoadout(warriorUnit, providers);

    expect(resolved.coreAbilities).toHaveLength(3);
    expect(resolved.coreAbilities[0].id).toBe(POWER_STRIKE.id);
    expect(resolved.coreAbilities[0].name).toBe('Power Strike');
    expect(resolved.coreAbilities[1].name).toBe('TODO: Warrior Domain 1');
    expect(resolved.coreAbilities[2].name).toBe('TODO: Warrior Domain 2');
    expect(resolved.innatePassive.id).toBe('warrior_passive_todo');
    expect(resolved.innatePassive.name).toBe('TODO: Warrior Passive');
  });

  it('resolves Thief active class package with Sneak Attack signature', () => {
    const thiefUnit: Unit = {
      ...createRecruit('player', 'Alden'),
      progression: {
        unitId: 'player',
        currentLevel: 1,
        archetypePoints: { fighter: 0, rogue: 1, mage: 0 },
        constellation: ['thief']
      },
      loadout: {
        activeClassId: 'thief',
        wildcardAbilityIds: [],
        wildcardPassiveIds: []
      }
    };

    const resolved = resolveUnitLoadout(thiefUnit, providers);

    expect(resolved.coreAbilities[0].id).toBe(SNEAK_ATTACK.id);
    expect(resolved.innatePassive.id).toBe('thief_passive_todo');
  });

  it('resolves Wizard active class package with Arcane Blast signature', () => {
    const wizardUnit: Unit = {
      ...createRecruit('player', 'Alden'),
      progression: {
        unitId: 'player',
        currentLevel: 1,
        archetypePoints: { fighter: 0, rogue: 0, mage: 1 },
        constellation: ['wizard']
      },
      loadout: {
        activeClassId: 'wizard',
        wildcardAbilityIds: [],
        wildcardPassiveIds: []
      }
    };

    const resolved = resolveUnitLoadout(wizardUnit, providers);

    expect(resolved.coreAbilities[0].id).toBe(ARCANE_BLAST.id);
    expect(resolved.innatePassive.id).toBe('wizard_passive_todo');
  });

  it('resolves equipped cross-class wildcard abilities alongside active class core kit', () => {
    const veteranWarrior: Unit = {
      ...createRecruit('player', 'Alden', {
        starterAbilityIds: ['shield_bash', 'quick_thrust', 'spark']
      }),
      progression: {
        unitId: 'player',
        currentLevel: 2,
        archetypePoints: { fighter: 1, rogue: 1, mage: 0 },
        constellation: ['warrior', 'thief']
      },
      loadout: {
        activeClassId: 'warrior',
        wildcardAbilityIds: ['sneak_attack', 'spark'],
        wildcardPassiveIds: ['thief_passive_todo']
      }
    };

    const resolved = resolveUnitLoadout(veteranWarrior, providers);

    expect(resolved.coreAbilities).toHaveLength(3);
    expect(resolved.wildcardAbilities).toHaveLength(2);
    expect(resolved.wildcardAbilities.map((a) => a.id)).toEqual(['sneak_attack', 'spark']);
    expect(resolved.combatAbilities).toHaveLength(5);
    expect(resolved.innatePassive.id).toBe('warrior_passive_todo');
    expect(resolved.wildcardPassives).toHaveLength(1);
    expect(resolved.wildcardPassives[0].id).toBe('thief_passive_todo');
    expect(resolved.activePassives).toHaveLength(2);
  });
});

describe('Unit Loadout Validation Rules', () => {
  const baseWarrior: Unit = {
    ...createRecruit('player', 'Alden', {
      starterAbilityIds: ['shield_bash', 'quick_thrust', 'spark']
    }),
    progression: {
      unitId: 'player',
      currentLevel: 1,
      archetypePoints: { fighter: 1, rogue: 0, mage: 0 },
      constellation: ['warrior']
    },
    loadout: {
      activeClassId: 'warrior',
      wildcardAbilityIds: [],
      wildcardPassiveIds: []
    }
  };

  it('validates a legal loadout with unlocked starter abilities as wildcards', () => {
    const result = validateUnitLoadout(
      baseWarrior,
      {
        activeClassId: 'warrior',
        wildcardAbilityIds: ['quick_thrust', 'spark'],
        wildcardPassiveIds: []
      },
      providers
    );

    expect(result.valid).toBe(true);
  });

  it('rejects an active class that has not been unlocked in the constellation', () => {
    const result = validateUnitLoadout(
      baseWarrior,
      {
        activeClassId: 'wizard',
        wildcardAbilityIds: [],
        wildcardPassiveIds: []
      },
      providers
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('has not been unlocked');
  });

  it('rejects equipping more than 2 wildcard abilities', () => {
    const result = validateUnitLoadout(
      baseWarrior,
      {
        activeClassId: 'warrior',
        wildcardAbilityIds: ['shield_bash', 'quick_thrust', 'spark'],
        wildcardPassiveIds: []
      },
      providers
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Cannot equip more than 2 wildcard abilities');
  });

  it('rejects equipping more than 1 wildcard passive', () => {
    const result = validateUnitLoadout(
      baseWarrior,
      {
        activeClassId: 'warrior',
        wildcardAbilityIds: [],
        wildcardPassiveIds: ['novice_passive_placeholder', 'warrior_passive_todo']
      },
      providers
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Cannot equip more than 1 wildcard passive');
  });

  it('rejects duplicate wildcard abilities', () => {
    const result = validateUnitLoadout(
      baseWarrior,
      {
        activeClassId: 'warrior',
        wildcardAbilityIds: ['spark', 'spark'],
        wildcardPassiveIds: []
      },
      providers
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Cannot equip duplicate wildcard abilities');
  });

  it('rejects equipping the active class core abilities as wildcards', () => {
    const result = validateUnitLoadout(
      baseWarrior,
      {
        activeClassId: 'warrior',
        wildcardAbilityIds: ['power_strike'],
        wildcardPassiveIds: []
      },
      providers
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('core ability');
  });

  it('rejects abilities from unearned classes', () => {
    const result = validateUnitLoadout(
      baseWarrior,
      {
        activeClassId: 'warrior',
        wildcardAbilityIds: ['sneak_attack'], // Thief not unlocked!
        wildcardPassiveIds: []
      },
      providers
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('has not been unlocked by this unit');
  });
});
