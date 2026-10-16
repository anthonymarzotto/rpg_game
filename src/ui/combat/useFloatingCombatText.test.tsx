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
});
