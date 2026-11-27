import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createCampaign } from '../../core/campaign/campaignFactory';
import { recruitNovice } from '../../core/campaign/transitions';
import { CAMPFIRE_ASSET_URL, NexusHearth } from './NexusHearth';

describe('NexusHearth', () => {
  it('renders campfire centerpiece, Cosmic Sprite, and all 3 initial staged Wayfarers on Trial 1', () => {
    const campaign = createCampaign({ seed: 42 });
    const html = renderToStaticMarkup(
      <NexusHearth
        roster={campaign.roster}
        activeSquadIds={campaign.activeSquadIds}
        onInspectHero={vi.fn()}
      />
    );

    expect(html).toContain('data-testid="nexus-hearth"');
    expect(html).toContain('The Nexus Hearth');
    expect(html).toContain('3 Wayfarers in Company');
    expect(html).toContain('data-testid="nexus-hearth-campfire"');
    expect(html).toContain(CAMPFIRE_ASSET_URL);
    expect(html).toContain('data-testid="hearth-cosmic-sprite"');

    for (const unit of campaign.roster) {
      expect(html).toContain(`data-testid="hearth-wayfarer-${unit.id}"`);
      expect(html).toContain(unit.name);
      expect(html).toContain('data-staged="true"');
    }
  });

  it('distinguishes staged vs resting Wayfarers and displays Ascension Ready sparkles', () => {
    let campaign = createCampaign({ seed: 77 });
    campaign = recruitNovice(campaign, { rng: () => 0.5 });

    const readyHero = campaign.roster[0];
    const roster = campaign.roster.map((u) =>
      u.id === readyHero.id
        ? {
            ...u,
            progression: {
              ...u.progression,
              accumulatedXp: { fighter: 10, rogue: 0, mage: 0 }
            }
          }
        : u
    );
    const restingHero = roster.find((u) => !campaign.activeSquadIds.includes(u.id))!;

    const html = renderToStaticMarkup(
      <NexusHearth
        roster={roster}
        activeSquadIds={campaign.activeSquadIds}
        hoveredHeroId={readyHero.id}
        onInspectHero={vi.fn()}
      />
    );

    expect(html).toContain('4 Wayfarers in Company');
    expect(html).toContain(`data-testid="hearth-ascension-spark-${readyHero.id}"`);
    expect(html).toContain(`data-testid="hearth-wayfarer-${restingHero.id}"`);
    expect(html).toContain('data-staged="false"');
    expect(html).toContain('hearth-wayfarer--hovered');
  });
});
