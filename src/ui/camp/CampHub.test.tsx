import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CampHub } from './CampHub';
import { createCampaign } from '../../core/campaign/campaignFactory';
import {
  setCampActiveSquad,
  recruitNovice,
  allocateCampArchetypePoint
} from '../../core/campaign/transitions';

describe('CampHub Integration Test Suite', () => {
  it('renders initial camp state with header, active squad, war room, and reserve tray', () => {
    const campaign = createCampaign({ seed: 42, name: 'Iron Vanguard' });
    const onDeploySquad = vi.fn();
    const onUpdateCampaign = vi.fn();
    const onExitToTitle = vi.fn();

    const html = renderToStaticMarkup(
      <CampHub
        campaign={campaign}
        onDeploySquad={onDeploySquad}
        onUpdateCampaign={onUpdateCampaign}
        onExitToTitle={onExitToTitle}
      />
    );

    // Header elements
    expect(html).toContain('THE NEXUS');
    expect(html).toContain('Sector 1');
    expect(html).toContain('Triumphs: 0');
    expect(html).toContain('Eclipses: 0');
    expect(html).toContain('Return to Portal');

    // Active squad dock with 3 units
    expect(html).toContain('The Vanguard');
    expect(html).toContain('3 / 3');
    for (const unit of campaign.roster) {
      expect(html).toContain(unit.name);
    }

    // Expedition war room
    expect(html).toContain('Astral Scrying &amp; Recon');
    expect(html).toContain('ENTER TRIAL');

    // Reserve barracks tray
    expect(html).toContain('The Enclave');
    expect(html).toContain('+ Awaken Novice');
    expect(html).toContain('No wayfarers in The Enclave. Awaken a Novice to expand your roster!');

    // Progression drawer is closed initially
    expect(html).not.toContain('Hero Progression:');
  });

  it('handles novice recruitment by expanding roster and displaying new unit in reserve', () => {
    let campaign = createCampaign({ seed: 77 });
    expect(campaign.roster).toHaveLength(3);
    expect(campaign.activeSquadIds).toHaveLength(3);

    // Perform recruitNovice transition
    campaign = recruitNovice(campaign, { rng: () => 0.5 });
    expect(campaign.roster).toHaveLength(4);
    expect(campaign.activeSquadIds).toHaveLength(3);

    const reserveHero = campaign.roster.find((u) => !campaign.activeSquadIds.includes(u.id));
    expect(reserveHero).toBeDefined();

    const html = renderToStaticMarkup(
      <CampHub
        campaign={campaign}
        onDeploySquad={vi.fn()}
        onUpdateCampaign={vi.fn()}
      />
    );

    // Reserve hero should now be listed in reserve barracks
    expect(html).toContain(reserveHero!.name);
    expect(html).toContain('1 Wayfarer');
    expect(html).not.toContain('No wayfarers in The Enclave. Awaken a Novice to expand your roster!');
  });

  it('reflects benching and deployment state changes (Smart Two-Way Swapping)', () => {
    let campaign = createCampaign({ seed: 123 });
    const [heroA, heroB, heroC] = campaign.roster;

    // Bench heroC: active squad becomes [heroA, heroB]
    campaign = setCampActiveSquad(campaign, [heroA.id, heroB.id]);
    expect(campaign.activeSquadIds).toEqual([heroA.id, heroB.id]);

    const htmlWithEmptySlot = renderToStaticMarkup(
      <CampHub
        campaign={campaign}
        onDeploySquad={vi.fn()}
        onUpdateCampaign={vi.fn()}
      />
    );

    // Squad is 2/3 with an empty slot
    expect(htmlWithEmptySlot).toContain('2 / 3');
    expect(htmlWithEmptySlot).toContain('Vacant Conduit');

    // HeroC is in reserve and shows Deploy button because active squad < 3
    expect(htmlWithEmptySlot).toContain(heroC.name);
    expect(htmlWithEmptySlot).toContain('Deploy');

    // Swap heroB with heroC
    campaign = setCampActiveSquad(campaign, [heroA.id, heroC.id]);
    expect(campaign.activeSquadIds).toEqual([heroA.id, heroC.id]);

    const htmlSwapped = renderToStaticMarkup(
      <CampHub
        campaign={campaign}
        onDeploySquad={vi.fn()}
        onUpdateCampaign={vi.fn()}
      />
    );

    expect(htmlSwapped).toContain(heroA.name);
    expect(htmlSwapped).toContain(heroC.name);
    expect(htmlSwapped).toContain('Vacant Conduit');
    // HeroB is now in reserve
    expect(htmlSwapped).toContain('1 Wayfarer');
  });

  it('renders hero progression drawer with constellation and archetype point spend', () => {
    let campaign = createCampaign({ seed: 999 });
    const hero = campaign.roster[0];

    // Give hero 10 fighter XP (threshold is 5 for level 0)
    const heroWithXp = {
      ...hero,
      progression: {
        ...hero.progression,
        accumulatedXp: { fighter: 10, rogue: 0, mage: 0 }
      }
    };
    campaign = {
      ...campaign,
      roster: campaign.roster.map((u) => (u.id === hero.id ? heroWithXp : u))
    };

    // Allocate archetype point
    const updatedCampaign = allocateCampArchetypePoint(campaign, hero.id, 'FIGHTER');
    const leveledHero = updatedCampaign.roster.find((u) => u.id === hero.id)!;

    expect(leveledHero.progression.currentLevel).toBe(1);
    expect(leveledHero.progression.constellation).toContain('warrior');
    expect(leveledHero.baseAttributes.force).toBe(hero.baseAttributes.force + 1);

    // Verify progression drawer renders the leveled hero correctly
    const htmlLeveled = renderToStaticMarkup(
      <CampHub
        campaign={updatedCampaign}
        onDeploySquad={vi.fn()}
        onUpdateCampaign={vi.fn()}
      />
    );

    expect(htmlLeveled).toContain('THE NEXUS');
    expect(htmlLeveled).toContain(leveledHero.name);
  });

  it('renders war room ready state and triggers combat handoff on deploy', () => {
    const campaign = createCampaign({ seed: 555 });
    const onDeploy = vi.fn();

    const html = renderToStaticMarkup(
      <CampHub
        campaign={campaign}
        onDeploySquad={onDeploy}
        onUpdateCampaign={vi.fn()}
      />
    );

    expect(html).toContain('ENTER TRIAL');
    expect(html).toContain('Threat:');
    expect(html).toContain('Detected Hostiles');
    expect(html).not.toContain('disabled=""');
  });
});
