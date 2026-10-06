import { describe, it, expect } from 'vitest';
import {
  WARRIOR_PACKAGE,
  THIEF_PACKAGE,
  WIZARD_PACKAGE,
  KNIGHT_PACKAGE,
  INFILTRATOR_PACKAGE,
  SORCERER_PACKAGE,
  CAVALIER_PACKAGE,
  BERSERKER_PACKAGE,
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

  it('defines complete 3-active + 1-passive packages for Tier 2 classes', () => {
    const packages = [KNIGHT_PACKAGE, INFILTRATOR_PACKAGE, SORCERER_PACKAGE];

    for (const pkg of packages) {
      expect(pkg.signatureAbility).toBeDefined();
      expect(pkg.domainAbilities).toHaveLength(2);
      expect(pkg.passive).toBeDefined();
    }
  });

  it('correctly maps Knight abilities and passive', () => {
    expect(KNIGHT_PACKAGE.classId).toBe('knight');
    expect(KNIGHT_PACKAGE.signatureAbility.id).toBe('lead_the_charge');
    expect(KNIGHT_PACKAGE.domainAbilities.map((a) => a.id)).toEqual(['challenging_shout', 'pommel_strike']);
    expect(KNIGHT_PACKAGE.passive.id).toBe('tactical_vanguard');
    expect(KNIGHT_PACKAGE.passive.hook).toBe('BATTLE_START');
  });

  it('correctly maps Infiltrator abilities and passive', () => {
    expect(INFILTRATOR_PACKAGE.classId).toBe('infiltrator');
    expect(INFILTRATOR_PACKAGE.signatureAbility.id).toBe('expose_weakness');
    expect(INFILTRATOR_PACKAGE.domainAbilities.map((a) => a.id)).toEqual(['smoke_veil', 'toxic_shiv']);
    expect(INFILTRATOR_PACKAGE.passive.id).toBe('elusive_stride');
    expect(INFILTRATOR_PACKAGE.passive.hook).toBe('ON_MOVE');
  });

  it('correctly maps Sorcerer abilities and passive', () => {
    expect(SORCERER_PACKAGE.classId).toBe('sorcerer');
    expect(SORCERER_PACKAGE.signatureAbility.id).toBe('spell_sculpt');
    expect(SORCERER_PACKAGE.domainAbilities.map((a) => a.id)).toEqual(['ignite', 'gust']);
    expect(SORCERER_PACKAGE.passive.id).toBe('wild_surge');
    expect(SORCERER_PACKAGE.passive.hook).toBe('ON_CRIT');
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
    expect(getAbilityById('lead_the_charge')).toBeDefined();
    expect(getAbilityById('challenging_shout')).toBeDefined();
    expect(getAbilityById('pommel_strike')).toBeDefined();
    expect(getAbilityById('expose_weakness')).toBeDefined();
    expect(getAbilityById('smoke_veil')).toBeDefined();
    expect(getAbilityById('toxic_shiv')).toBeDefined();
    expect(getAbilityById('spell_sculpt')).toBeDefined();
    expect(getAbilityById('ignite')).toBeDefined();
    expect(getAbilityById('gust')).toBeDefined();

    // Passives
    expect(getPassiveById('momentum')).toBeDefined();
    expect(getPassiveById('unyielding')).toBeDefined();
    expect(getPassiveById('quickstep')).toBeDefined();
    expect(getPassiveById('arcane_aegis')).toBeDefined();
    expect(getPassiveById('tactical_vanguard')).toBeDefined();
    expect(getPassiveById('elusive_stride')).toBeDefined();
    expect(getPassiveById('wild_surge')).toBeDefined();

    // Package lookup
    expect(getClassPackage('warrior')).toBe(WARRIOR_PACKAGE);
    expect(getClassPackage('thief')).toBe(THIEF_PACKAGE);
    expect(getClassPackage('wizard')).toBe(WIZARD_PACKAGE);
    expect(getClassPackage('knight')).toBe(KNIGHT_PACKAGE);
    expect(getClassPackage('infiltrator')).toBe(INFILTRATOR_PACKAGE);
    expect(getClassPackage('sorcerer')).toBe(SORCERER_PACKAGE);
    expect(getClassPackage('cavalier')).toBe(CAVALIER_PACKAGE);
    expect(getClassPackage('berserker')).toBe(BERSERKER_PACKAGE);
    expect(getClassPackage('unknown')).toBeUndefined();
  });

  it('correctly maps Berserker abilities, passive, and profile', () => {
    expect(BERSERKER_PACKAGE.classId).toBe('berserker');
    expect(BERSERKER_PACKAGE.signatureAbility.id).toBe('blood_frenzy');
    expect(BERSERKER_PACKAGE.signatureAbility.hpCost).toBe(3);
    expect(BERSERKER_PACKAGE.domainAbilities.map((a) => a.id)).toEqual(['reckless_cleave', 'ignite_rage']);
    expect(BERSERKER_PACKAGE.passive.id).toBe('deathbound_fury');
    expect(BERSERKER_PACKAGE.passive.healthThreshold?.maxPercent).toBe(0.5);
    expect(BERSERKER_PACKAGE.passive.healthThreshold?.flatDamageBonus).toBe(2);
    expect(BERSERKER_PACKAGE.passive.healthThreshold?.critThreshold).toBe(19);
    expect(BERSERKER_PACKAGE.aiProfile).toBe('BRAWLER');

    expect(getAbilityById('blood_frenzy')).toBeDefined();
    expect(getAbilityById('reckless_cleave')).toBeDefined();
    expect(getAbilityById('ignite_rage')).toBeDefined();
    expect(getPassiveById('deathbound_fury')).toBeDefined();
  });
});
