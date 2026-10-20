import { describe, it, expect } from 'vitest';
import {
  MALE_FIRST_NAMES,
  SURNAMES_AND_HOUSES,
  ASTRAL_EPITHETS,
  ENEMY_ASTRAL_ADJECTIVES,
  getPrimaryFirstName,
  generateProceduralRecruitName,
  assignEnemyTitles
} from './names';
import { createRng } from '../core/prng';

describe('Centralized Name Catalog (src/data/names.ts)', () => {
  it('exports populated, non-empty naming arrays with no empty entries', () => {
    expect(MALE_FIRST_NAMES.length).toBeGreaterThanOrEqual(50);
    expect(SURNAMES_AND_HOUSES.length).toBeGreaterThanOrEqual(30);
    expect(ASTRAL_EPITHETS.length).toBeGreaterThanOrEqual(25);
    expect(ENEMY_ASTRAL_ADJECTIVES.length).toBeGreaterThanOrEqual(25);

    for (const name of MALE_FIRST_NAMES) {
      expect(name.trim().length).toBeGreaterThan(0);
    }
    for (const house of SURNAMES_AND_HOUSES) {
      expect(house.trim().length).toBeGreaterThan(0);
    }
    for (const ep of ASTRAL_EPITHETS) {
      expect(ep.trim().length).toBeGreaterThan(0);
    }
    for (const adj of ENEMY_ASTRAL_ADJECTIVES) {
      expect(adj.trim().length).toBeGreaterThan(0);
    }
  });

  describe('getPrimaryFirstName', () => {
    it('extracts first name from compound names', () => {
      expect(getPrimaryFirstName('Alden Vale')).toBe('Alden');
      expect(getPrimaryFirstName('Lyra Dawnseeker')).toBe('Lyra');
      expect(getPrimaryFirstName('Cassian the Bold')).toBe('Cassian');
    });

    it('handles single-word names and whitespace cleanly', () => {
      expect(getPrimaryFirstName('Alden')).toBe('Alden');
      expect(getPrimaryFirstName('  Kieran  ')).toBe('Kieran');
      expect(getPrimaryFirstName('')).toBe('');
    });
  });

  describe('generateProceduralRecruitName', () => {
    it('generates two-word First + Title compound names deterministically', () => {
      const rng1 = createRng(42);
      const name1 = generateProceduralRecruitName(rng1);
      const rng2 = createRng(42);
      const name2 = generateProceduralRecruitName(rng2);

      expect(name1).toBe(name2);
      expect(name1.split(' ').length).toBeGreaterThanOrEqual(2);
    });

    it('avoids duplicate first names when existing names are provided', () => {
      const rng = createRng(100);
      const existing = new Set(['Alden Vale', 'Boran Frost']);
      const generated = generateProceduralRecruitName(rng, existing);
      const first = getPrimaryFirstName(generated);

      expect(first).not.toBe('Alden');
      expect(first).not.toBe('Boran');
    });
  });

  describe('assignEnemyTitles', () => {
    it('assigns unique astral adjectives without replacement across enemy squad', () => {
      const rng = createRng(999);
      const rawSquad = [
        { id: 'e1', className: 'Novice' },
        { id: 'e2', className: 'Novice' },
        { id: 'e3', className: 'Novice' },
        { id: 'e4', className: 'Warrior' }
      ];

      const titled = assignEnemyTitles(rawSquad, rng);

      expect(titled).toHaveLength(4);
      // Verify names are distinct
      const names = titled.map((u) => u.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(4);

      // Verify each name ends with class and starts with an astral adjective
      for (let i = 0; i < rawSquad.length; i++) {
        expect(titled[i].name).toContain(rawSquad[i].className);
        const prefix = titled[i].name.split(' ')[0];
        expect(ENEMY_ASTRAL_ADJECTIVES).toContain(prefix);
      }
    });
  });
});
