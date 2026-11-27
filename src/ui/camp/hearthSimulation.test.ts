import { describe, it, expect } from 'vitest';
import { createCampaign } from '../../core/campaign/campaignFactory';
import { recruitNovice } from '../../core/campaign/transitions';
import {
  CAMPFIRE_POS,
  MAX_HEARTH_VISIBLE,
  createInitialHearthState,
  faceTowardCampfire,
  finishHearthTransitions,
  stepHearthSimulation,
  syncHearthRoster,
  vectorToPixelRotation
} from './hearthSimulation';

describe('hearthSimulation', () => {
  it('maps 2D movement vectors cleanly to all 8 pixel rotations', () => {
    expect(vectorToPixelRotation(10, 0)).toBe('east');
    expect(vectorToPixelRotation(10, 10)).toBe('south-east');
    expect(vectorToPixelRotation(0, 10)).toBe('south');
    expect(vectorToPixelRotation(-10, 10)).toBe('south-west');
    expect(vectorToPixelRotation(-10, 0)).toBe('west');
    expect(vectorToPixelRotation(-10, -10)).toBe('north-west');
    expect(vectorToPixelRotation(0, -10)).toBe('north');
    expect(vectorToPixelRotation(10, -10)).toBe('north-east');
  });

  it('places staged Wayfarers on the inner ring facing inward toward the campfire', () => {
    const campaign = createCampaign({ seed: 42 });
    const state = createInitialHearthState(campaign.roster, campaign.activeSquadIds);

    expect(state.actors).toHaveLength(3);
    const spotIds = new Set<string>();

    for (const actor of state.actors) {
      expect(actor.isStaged).toBe(true);
      expect(actor.spotId).toMatch(/^inner-/);
      expect(actor.phase).toBe('resting');
      expect(actor.facing).toBe(faceTowardCampfire(actor.x, actor.y));
      spotIds.add(actor.spotId!);
    }

    // All spots are distinct (zero overlap)
    expect(spotIds.size).toBe(3);
  });

  it('caps visible Wayfarers at MAX_HEARTH_VISIBLE while prioritizing staged and Ascension-ready companions', () => {
    let campaign = createCampaign({ seed: 99 });
    for (let i = 0; i < 10; i++) {
      campaign = recruitNovice(campaign, { rng: () => 0.5 });
    }
    expect(campaign.roster.length).toBe(13);

    // Make the very last reserve unit Ascension-ready so it must be prioritized ahead of other reserves
    const lastUnit = campaign.roster[campaign.roster.length - 1];
    const readyRoster = campaign.roster.map((u) =>
      u.id === lastUnit.id
        ? {
            ...u,
            progression: {
              ...u.progression,
              accumulatedXp: { fighter: 10, rogue: 0, mage: 0 }
            }
          }
        : u
    );

    const state = createInitialHearthState(readyRoster, campaign.activeSquadIds);
    expect(state.actors).toHaveLength(MAX_HEARTH_VISIBLE);

    // Every staged unit and the Ascension-ready reserve must be included
    const actorIds = new Set(state.actors.map((a) => a.unitId));
    for (const stagedId of campaign.activeSquadIds) {
      expect(actorIds.has(stagedId)).toBe(true);
    }
    expect(actorIds.has(lastUnit.id)).toBe(true);
  });

  it('strolls a single Wayfarer to an unoccupied spot with travel-aligned facing, then turns back to the fire', () => {
    const campaign = createCampaign({ seed: 7 });
    const initial = createInitialHearthState(campaign.roster, campaign.activeSquadIds);

    const stepped = stepHearthSimulation(initial, campaign.roster, campaign.activeSquadIds, () => 0);
    const walkers = stepped.actors.filter((a) => a.phase === 'walking');
    expect(walkers).toHaveLength(1);

    const walker = walkers[0];
    const before = initial.actors.find((a) => a.unitId === walker.unitId)!;
    expect(walker.spotId).not.toBe(before.spotId);
    expect(walker.facing).toBe(vectorToPixelRotation(walker.x - before.x, walker.y - before.y));

    // Zero overlapping spots
    const occupied = new Set(stepped.actors.map((a) => a.spotId));
    expect(occupied.size).toBe(stepped.actors.length);

    // Settling turns walker back toward campfire
    const settled = finishHearthTransitions(stepped);
    const settledWalker = settled.actors.find((a) => a.unitId === walker.unitId)!;
    expect(settledWalker.phase).toBe('resting');
    expect(settledWalker.facing).toBe(
      vectorToPixelRotation(CAMPFIRE_POS.x - settledWalker.x, CAMPFIRE_POS.y - settledWalker.y)
    );
  });

  it('allows resting Wayfarers to depart to the plaza edge and off-plaza reserves to wander in', () => {
    let campaign = createCampaign({ seed: 11 });
    for (let i = 0; i < 9; i++) {
      campaign = recruitNovice(campaign, { rng: () => 0.3 });
    }
    // 12 total: 3 staged + 9 resting (10 visible, 2 off-plaza)
    const initial = createInitialHearthState(campaign.roster, campaign.activeSquadIds);
    expect(initial.actors).toHaveLength(MAX_HEARTH_VISIBLE);

    // Choose a resting actor (index 5 of 10 -> rng = 0.5) and trigger departure (second rng = 0.1 < 0.55)
    let call = 0;
    const departRng = () => (call++ === 0 ? 0.5 : 0.1);
    const departingState = stepHearthSimulation(
      initial,
      campaign.roster,
      campaign.activeSquadIds,
      departRng
    );

    const departing = departingState.actors.find((a) => a.phase === 'departing');
    expect(departing).toBeDefined();
    expect(departing!.isStaged).toBe(false);
    expect(departing!.opacity).toBe(0);

    // Next step finishes departure (removing departing actor) and brings an off-plaza reserve in
    const arrivingState = stepHearthSimulation(
      departingState,
      campaign.roster,
      campaign.activeSquadIds,
      () => 0
    );
    const arriving = arrivingState.actors.find((a) => a.phase === 'arriving');
    expect(arriving).toBeDefined();
    expect(arriving!.isStaged).toBe(false);
    expect(arriving!.entryEdge).toMatch(/^(west|east)$/);
    expect(arrivingState.actors).toHaveLength(MAX_HEARTH_VISIBLE);
  });

  it('reconciles newly recruited Novices into the hearth as arriving actors', () => {
    let campaign = createCampaign({ seed: 55 });
    const initial = createInitialHearthState(campaign.roster, campaign.activeSquadIds);
    expect(initial.actors).toHaveLength(3);

    campaign = recruitNovice(campaign, { rng: () => 0.5 });
    const synced = syncHearthRoster(initial, campaign.roster, campaign.activeSquadIds, () => 0);

    expect(synced.actors).toHaveLength(4);
    const newcomer = synced.actors.find((a) => a.phase === 'arriving');
    expect(newcomer).toBeDefined();
    expect(newcomer!.isStaged).toBe(false);
  });
});
