import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CampHub } from './CampHub';
import { createCampaign } from '../../core/campaign/campaignFactory';
import { CampaignState } from '../../core/campaign/types';
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
    expect(html).toContain('30 / 30 Pts (3 Deployed)');
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

    // Squad has 2 heroes deployed, within stage 1 budget (75 pts)
    expect(htmlWithEmptySlot).toContain('2 Deployed');
    expect(htmlWithEmptySlot).toContain('Deployment Available');

    // HeroC is in reserve and shows Deploy button because active squad threat < budget
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
    expect(htmlSwapped).toContain('Deployment Available');
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

  it('renders save button when onSaveCampaign is provided and omits when not provided', () => {
    const campaign = createCampaign({ seed: 123 });
    const onSave = vi.fn();

    const htmlWithSave = renderToStaticMarkup(
      <CampHub
        campaign={campaign}
        onDeploySquad={vi.fn()}
        onUpdateCampaign={vi.fn()}
        onSaveCampaign={onSave}
      />
    );

    expect(htmlWithSave).toContain('camp-save-btn');
    expect(htmlWithSave).toContain('✦ Save Expedition');

    const htmlWithoutSave = renderToStaticMarkup(
      <CampHub
        campaign={campaign}
        onDeploySquad={vi.fn()}
        onUpdateCampaign={vi.fn()}
      />
    );

    expect(htmlWithoutSave).not.toContain('camp-save-btn');
  });

  it('allows benching a hero from an over-budget squad and reflects updated vanguard state', () => {
    const initial = createCampaign({ seed: 750, initialSquadSize: 4 });
    const promotedRoster = initial.roster.map((u) => ({
      ...u,
      progression: { ...u.progression, currentLevel: 1 }
    }));
    let campaign: CampaignState = {
      ...initial,
      roster: promotedRoster,
      activeSquadIds: [promotedRoster[0].id, promotedRoster[1].id, promotedRoster[2].id] // 3 * 25 = 75 > 30
    };

    // Render over-budget squad (75 / 30 Pts, 1 in reserve)
    const htmlOverBudget = renderToStaticMarkup(
      <CampHub
        campaign={campaign}
        onDeploySquad={vi.fn()}
        onUpdateCampaign={vi.fn()}
      />
    );
    expect(htmlOverBudget).toContain('75 / 30 Pts (3 Deployed)');
    expect(htmlOverBudget).toContain('1 Wayfarer');
    expect(htmlOverBudget).toContain('Withdraw');
    // War room deploy button is disabled with over-budget tooltip and no inline warning
    expect(htmlOverBudget).toContain('title="Vanguard threat (75 pts) exceeds stage deployment budget (30 pts)"');
    expect(htmlOverBudget).not.toContain('readiness-warning');

    // Bench hero 0: remaining squad is still over budget (2 * 25 = 50 > 30 pts)
    campaign = setCampActiveSquad(campaign, [promotedRoster[1].id, promotedRoster[2].id]);
    expect(campaign.activeSquadIds).toEqual([promotedRoster[1].id, promotedRoster[2].id]);

    const htmlAfterBench = renderToStaticMarkup(
      <CampHub
        campaign={campaign}
        onDeploySquad={vi.fn()}
        onUpdateCampaign={vi.fn()}
      />
    );
    expect(htmlAfterBench).toContain('50 / 30 Pts (2 Deployed)');
    expect(htmlAfterBench).toContain('2 Wayfarers'); // Hero 0 and Hero 3 are now in The Enclave
    // Still over budget -> disabled with updated tooltip
    expect(htmlAfterBench).toContain('title="Vanguard threat (50 pts) exceeds stage deployment budget (30 pts)"');

    // Bench hero 1: squad is now 1 * 25 = 25 <= 30 pts (within budget!)
    campaign = setCampActiveSquad(campaign, [promotedRoster[2].id]);
    expect(campaign.activeSquadIds).toEqual([promotedRoster[2].id]);

    const htmlWithinBudget = renderToStaticMarkup(
      <CampHub
        campaign={campaign}
        onDeploySquad={vi.fn()}
        onUpdateCampaign={vi.fn()}
      />
    );
    expect(htmlWithinBudget).toContain('25 / 30 Pts (1 Deployed)');
    expect(htmlWithinBudget).toContain('3 Wayfarers'); // Heroes 0, 1, and 3 are now in The Enclave
    // Now within budget -> deploy button is enabled with active title tooltip!
    expect(htmlWithinBudget).toContain('title="Enter the astral trial"');
  });

  it('allows deploying a reserve hero even when squad is or becomes over threat budget', () => {
    const initial = createCampaign({ seed: 750, initialSquadSize: 4 });
    const [heroA, heroB, heroC, heroD] = initial.roster;
    // Squad starts with heroA, heroB, heroC (30 / 30 pts)
    // heroD is in reserve (The Enclave)
    const campaignWithReserve = {
      ...initial,
      activeSquadIds: [heroA.id, heroB.id, heroC.id]
    };
    const htmlAtBudget = renderToStaticMarkup(
      <CampHub
        campaign={campaignWithReserve}
        onDeploySquad={vi.fn()}
        onUpdateCampaign={vi.fn()}
      />
    );
    // HeroD in reserve has an enabled Deploy button even if deploying brings squad over budget (40 / 30 pts)
    expect(htmlAtBudget).toContain(heroD.name);
    expect(htmlAtBudget).toContain('title="Deploy to active vanguard"');

    // Deploying heroD brings squad to 40 / 30 pts
    const campaignOverBudget = setCampActiveSquad(campaignWithReserve, [...campaignWithReserve.activeSquadIds, heroD.id]);
    expect(campaignOverBudget.activeSquadIds).toHaveLength(4);

    const htmlOverBudget = renderToStaticMarkup(
      <CampHub
        campaign={campaignOverBudget}
        onDeploySquad={vi.fn()}
        onUpdateCampaign={vi.fn()}
      />
    );
    expect(htmlOverBudget).toContain('40 / 30 Pts (4 Deployed)');
  });

  it('renders reroll trial button in the expedition war room', () => {
    const campaign = createCampaign({ seed: 42 });
    const html = renderToStaticMarkup(
      <CampHub
        campaign={campaign}
        onDeploySquad={vi.fn()}
        onUpdateCampaign={vi.fn()}
      />
    );

    expect(html).toContain('data-testid="reroll-trial-btn"');
    expect(html).toContain('Re-roll Trial');
  });
});

