import { describe, it, expect } from 'vitest';
import {
  EFFECT_METADATA,
  getEffectTiming,
  isSelfScopedEffect,
  isPrimaryTargetRelativeSelfEffect,
  isResolutionEffect,
  resolveApplyOn
} from './metadata';
import { AbilityEffectType } from '../../types/ability';

const ALL_EFFECT_TYPES: readonly AbilityEffectType[] = [
  'DAMAGE',
  'KNOCKBACK',
  'PULL',
  'RETREAT_STEP',
  'ARMOR_BUFF',
  'WARD_BUFF',
  'SLOW',
  'CRIT_BOOST',
  'TELEPORT',
  'CLEAVE',
  'CTB_DELAY',
  'INITIATIVE_BOOST',
  'FORCE_FACING',
  'FORCE_FACING_AWAY',
  'CONDITION',
  'CLEANSE',
  'SPELL_SCULPT',
  'WILD_SURGE',
  'STAT_MODIFIER',
  'RUSH_CHARGE',
  'PENETRATE_STEP',
  'BLOOD_FRENZY',
  'POSITION_SWAP',
  'BASTION_STANCE',
  'AERIAL_VAULT',
  'LINE_PIERCE',
  'DELAYED_BOMBARDMENT',
  'SHRAPNEL_RUBBLE',
  'ALLY_REFRACTION',
  'DISTRIBUTIVE_PROOF'
];

describe('EFFECT_METADATA & lifecycle helpers', () => {
  it('declares valid metadata for every AbilityEffectType', () => {
    expect(Object.keys(EFFECT_METADATA).sort()).toEqual([...ALL_EFFECT_TYPES].sort());
    for (const type of ALL_EFFECT_TYPES) {
      const meta = EFFECT_METADATA[type];
      expect(['PRE_ACTION', 'ON_RESOLVE', 'POST_ACTION']).toContain(meta.defaultTiming);
      expect([
        'PRIMARY_DAMAGE',
        'ROLL_MODIFIER',
        'PRE_ROLL_MOVE',
        'GEOMETRIC_SPECIAL',
        'ZONE_DEPLOY',
        'RESOLUTION'
      ]).toContain(meta.role);
    }
  });

  it('defaults RUSH_CHARGE and AERIAL_VAULT to PRE_ACTION and honors explicit timing overrides', () => {
    expect(getEffectTiming({ type: 'RUSH_CHARGE' })).toBe('PRE_ACTION');
    expect(getEffectTiming({ type: 'AERIAL_VAULT' })).toBe('PRE_ACTION');
    expect(getEffectTiming({ type: 'CONDITION', conditionType: 'BURN' })).toBe('ON_RESOLVE');
    expect(
      getEffectTiming({ type: 'CONDITION', conditionType: 'STEALTH', targetScope: 'SELF', timing: 'POST_ACTION' })
    ).toBe('POST_ACTION');
    expect(getEffectTiming({ type: 'STAT_MODIFIER', timing: 'PRE_ACTION' })).toBe('PRE_ACTION');
  });

  it('distinguishes self-scoped effects from primary-target-relative RETREAT_STEP without special-casing conditions', () => {
    expect(isSelfScopedEffect({ type: 'CONDITION', conditionType: 'STEALTH', targetScope: 'SELF' })).toBe(true);
    expect(isSelfScopedEffect({ type: 'CONDITION', conditionType: 'STEALTH' })).toBe(false);
    expect(isSelfScopedEffect({ type: 'BASTION_STANCE', targetScope: 'SELF' })).toBe(true);
    expect(isSelfScopedEffect({ type: 'RETREAT_STEP', targetScope: 'SELF' })).toBe(false);
    expect(isPrimaryTargetRelativeSelfEffect({ type: 'RETREAT_STEP', targetScope: 'SELF' })).toBe(true);
    expect(isPrimaryTargetRelativeSelfEffect({ type: 'KNOCKBACK' })).toBe(false);
  });

  it('resolves applyOn defaults consistently and classifies resolution vs special roles', () => {
    expect(resolveApplyOn({ type: 'DAMAGE' })).toBe('HIT_OR_CRIT');
    expect(resolveApplyOn({ type: 'CONDITION', conditionType: 'BURN' })).toBe('HIT_OR_CRIT');
    expect(resolveApplyOn({ type: 'ARMOR_BUFF', targetScope: 'SELF' })).toBe('ALWAYS');
    expect(resolveApplyOn({ type: 'ARMOR_BUFF', targetScope: 'SELF', applyOn: 'HIT_OR_CRIT' })).toBe('HIT_OR_CRIT');
    expect(resolveApplyOn({ type: 'RETREAT_STEP', targetScope: 'SELF', applyOn: 'HIT_OR_CRIT' })).toBe('HIT_OR_CRIT');

    expect(isResolutionEffect({ type: 'KNOCKBACK' })).toBe(true);
    expect(isResolutionEffect({ type: 'DAMAGE' })).toBe(false);
    expect(isResolutionEffect({ type: 'CRIT_BOOST' })).toBe(false);
    expect(isResolutionEffect({ type: 'RUSH_CHARGE' })).toBe(false);
    expect(isResolutionEffect({ type: 'DELAYED_BOMBARDMENT' })).toBe(false);
    expect(isResolutionEffect({ type: 'ALLY_REFRACTION' })).toBe(false);
  });
});
