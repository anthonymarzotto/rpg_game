import { describe, it, expect } from 'vitest';
import { ALL_NOVICE_ABILITIES, CLASS_PACKAGES } from './index';
import { formatAbilityDescription } from '../../core/combat/abilityFormatter';
import { Ability } from '../../core/types/ability';

describe('Ability Catalog Flavor & Formatting Guardrails', () => {
  const allAbilities: Ability[] = [...ALL_NOVICE_ABILITIES];
  for (const pkg of Object.values(CLASS_PACKAGES)) {
    allAbilities.push(pkg.signatureAbility, ...pkg.domainAbilities);
  }

  // Deduplicate by id
  const uniqueAbilities = Array.from(new Map(allAbilities.map((a) => [a.id, a])).values());

  it('ensures every registered ability has pure flavor prose without hardcoded dice notation', () => {
    for (const ability of uniqueAbilities) {
      expect(ability.description.trim().length, `${ability.id} description should be non-empty`).toBeGreaterThan(5);
      expect(
        ability.description,
        `${ability.id} description should not hardcode dice notation`
      ).not.toMatch(/\b\d+d\d+\b/i);
    }
  });

  it('ensures every registered ability formats cleanly via formatAbilityDescription', () => {
    for (const ability of uniqueAbilities) {
      const formatted = formatAbilityDescription(ability);
      expect(formatted.statPills.length, `${ability.id} should have statPills`).toBeGreaterThan(0);
      expect(formatted.compactSummary.length, `${ability.id} should have compactSummary`).toBeGreaterThan(0);
      expect(formatted.compactSummary).not.toContain('undefined');
      for (const clause of formatted.effectClauses) {
        expect(clause.text).not.toContain('undefined');
        expect(clause.text).not.toContain('STAT_MODIFIER');
        expect(clause.text).not.toContain('CTB_DELAY');
      }
    }
  });
});
