import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HarvestDistributionModal, autoFillPool } from './HarvestDistributionModal';
import { createRecruit } from '../../core/units/unitFactory';

describe('HarvestDistributionModal Component & autoFillPool', () => {
  const heroA = createRecruit('hero-a', 'Alden', { faction: 'PLAYER' });
  const heroB = createRecruit('hero-b', 'Brenna', { faction: 'PLAYER' });
  const heroC = createRecruit('hero-c', 'Cassian', { faction: 'PLAYER' });
  const squad = [heroA, heroB, heroC];

  describe('autoFillPool algorithm', () => {
    it('distributes points evenly with remainders allocated sequentially to vanguard members', () => {
      const retainedPool = { fighter: 4, rogue: 2, mage: 0 };
      const result = autoFillPool(retainedPool, ['hero-a', 'hero-b', 'hero-c']);

      // 4 Fighter across 3 units: base 1 + 1 extra to hero-a -> { hero-a: 2, hero-b: 1, hero-c: 1 }
      expect(result['hero-a'].fighter).toBe(2);
      expect(result['hero-b'].fighter).toBe(1);
      expect(result['hero-c'].fighter).toBe(1);

      // 2 Rogue across 3 units: base 0 + 1 extra to hero-a and hero-b -> { hero-a: 1, hero-b: 1, hero-c: 0 }
      expect(result['hero-a'].rogue).toBe(1);
      expect(result['hero-b'].rogue).toBe(1);
      expect(result['hero-c'].rogue).toBe(0);

      expect(result['hero-a'].mage).toBe(0);
      expect(result['hero-b'].mage).toBe(0);
      expect(result['hero-c'].mage).toBe(0);
    });

    it('handles empty retained pool gracefully', () => {
      const result = autoFillPool({ fighter: 0, rogue: 0, mage: 0 }, ['hero-a', 'hero-b']);
      expect(result['hero-a']).toEqual({ fighter: 0, rogue: 0, mage: 0 });
      expect(result['hero-b']).toEqual({ fighter: 0, rogue: 0, mage: 0 });
    });

    it('handles empty unit list gracefully', () => {
      const result = autoFillPool({ fighter: 5, rogue: 5, mage: 5 }, []);
      expect(result).toEqual({});
    });
  });

  describe('Markup Rendering', () => {
    it('renders VICTORY modal with pool breakdown and disabled proceed button when pool has XP remaining', () => {
      const html = renderToStaticMarkup(
        <HarvestDistributionModal
          isOpen={true}
          outcome="VICTORY"
          squadUnits={squad}
          earnedPool={{ fighter: 3, rogue: 2, mage: 1 }}
          onConfirm={vi.fn()}
        />
      );

      expect(html).toContain('harvest-modal-backdrop');
      expect(html).toContain('Distribute Vanguard XP');
      expect(html).toContain('✦ Harvest Trial Spoils');
      expect(html).toContain('6 XP remaining to allocate');
      expect(html).toContain('hero-a');
      expect(html).toContain('hero-b');
      expect(html).toContain('hero-c');
      expect(html).toContain('disabled="" data-testid="harvest-confirm-btn"');
      expect(html).toContain('✦ Proceed to Camp');
    });

    it('renders DEFEAT modal with 50% retained pool and retreat messaging', () => {
      const html = renderToStaticMarkup(
        <HarvestDistributionModal
          isOpen={true}
          outcome="DEFEAT"
          squadUnits={squad}
          earnedPool={{ fighter: 5, rogue: 4, mage: 1 }} // Retains: fighter 2, rogue 2, mage 0
          onConfirm={vi.fn()}
        />
      );

      expect(html).toContain('⚔️ Trial Retreat &amp; Salvage');
      expect(html).toContain('Salvaged Experience');
      expect(html).toContain('4 XP remaining to allocate'); // 2 + 2 = 4
      expect(html).toContain('↩ Retreat to Camp');
    });

    it('renders immediately ready when earned pool is 0 XP', () => {
      const html = renderToStaticMarkup(
        <HarvestDistributionModal
          isOpen={true}
          outcome="VICTORY"
          squadUnits={squad}
          earnedPool={{ fighter: 0, rogue: 0, mage: 0 }}
          onConfirm={vi.fn()}
        />
      );

      expect(html).toContain('All XP distributed!');
      expect(html).not.toContain('✓ Ready to advance');
      // Confirm button is not disabled
      expect(html).not.toContain('disabled="" data-testid="harvest-confirm-btn"');
    });

    it('returns null when isOpen is false', () => {
      const html = renderToStaticMarkup(
        <HarvestDistributionModal
          isOpen={false}
          outcome="VICTORY"
          squadUnits={squad}
          earnedPool={{ fighter: 2, rogue: 0, mage: 0 }}
          onConfirm={vi.fn()}
        />
      );

      expect(html).toBe('');
    });
  });
});
