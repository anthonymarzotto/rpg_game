import { describe, it, expect } from 'vitest';
import {
  WARRIOR_PACKAGE,
  THIEF_PACKAGE,
  WIZARD_PACKAGE,
  MOMENTUM,
  getClassPackage,
  getAbilityById,
  getPassiveById,
  ALL_NOVICE_ABILITIES
} from '../../data/packages';

describe('Class Packages & Catalog Verification', () => {
  it('defines complete 3-active + 1-passive packages for foundational tier 1 classes', () => {
    const packages = [WARRIOR_PACKAGE, THIEF_PACKAGE, WIZARD_PACKAGE];

    for (const pkg of packages) {
      expect(pkg.signatureAbility).toBeDefined();
      expect(pkg.domainAbilities).toHaveLength(2);
      expect(pkg.passive).toBeDefined();
      expect(pkg.passive.hook).toBe('ALWAYS');
    }
  });

  it('correctly maps Warrior abilities and passive', () => {
    expect(WARRIOR_PACKAGE.classId).toBe('warrior');
    expect(WARRIOR_PACKAGE.signatureAbility.id).toBe('power_strike');
    expect(WARRIOR_PACKAGE.domainAbilities.map((a) => a.id)).toEqual(['cleave', 'brace']);
    expect(WARRIOR_PACKAGE.passive.id).toBe('unyielding');
    expect(WARRIOR_PACKAGE.passive.statModifiers?.armor).toBe(1);
  });

  it('correctly maps Thief abilities and passive', () => {
    expect(THIEF_PACKAGE.classId).toBe('thief');
    expect(THIEF_PACKAGE.signatureAbility.id).toBe('sneak_attack');
    expect(THIEF_PACKAGE.domainAbilities.map((a) => a.id)).toEqual(['shadow_step', 'skirmish']);
    expect(THIEF_PACKAGE.passive.id).toBe('quickstep');
    expect(THIEF_PACKAGE.passive.statModifiers?.speed).toBe(2);
  });

  it('correctly maps Wizard abilities and passive', () => {
    expect(WIZARD_PACKAGE.classId).toBe('wizard');
    expect(WIZARD_PACKAGE.signatureAbility.id).toBe('arcane_blast');
    expect(WIZARD_PACKAGE.domainAbilities.map((a) => a.id)).toEqual(['spark', 'frostbite']);
    expect(WIZARD_PACKAGE.passive.id).toBe('arcane_aegis');
    expect(WIZARD_PACKAGE.passive.statModifiers?.ward).toBe(1);
  });

  it('correctly defines Novice Momentum passive', () => {
    expect(MOMENTUM.id).toBe('momentum');
    expect(MOMENTUM.rollModifier?.condition.type).toBe('MOVED_MIN_DISTANCE');
    expect(MOMENTUM.rollModifier?.condition.minHexes).toBe(2);
    expect(MOMENTUM.rollModifier?.effect.grantsAdvantage).toBe(true);
    expect(MOMENTUM.rollModifier?.effect.consumeOnTrigger).toBe(true);
  });

  it('resolves all abilities and passives by ID through global lookup', () => {
    // Novice abilities
    for (const ability of ALL_NOVICE_ABILITIES) {
      expect(getAbilityById(ability.id)).toBeDefined();
    }

    // Class package abilities
    expect(getAbilityById('power_strike')).toBeDefined();
    expect(getAbilityById('cleave')).toBeDefined();
    expect(getAbilityById('shadow_step')).toBeDefined();
    expect(getAbilityById('arcane_blast')).toBeDefined();

    // Passives
    expect(getPassiveById('momentum')).toBeDefined();
    expect(getPassiveById('unyielding')).toBeDefined();
    expect(getPassiveById('quickstep')).toBeDefined();
    expect(getPassiveById('arcane_aegis')).toBeDefined();

    // Package lookup
    expect(getClassPackage('warrior')).toBe(WARRIOR_PACKAGE);
    expect(getClassPackage('thief')).toBe(THIEF_PACKAGE);
    expect(getClassPackage('wizard')).toBe(WIZARD_PACKAGE);
    expect(getClassPackage('unknown')).toBeUndefined();
  });
});
