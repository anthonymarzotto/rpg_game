import { describe, it, expect } from 'vitest';
import { createCampaign } from './campaignFactory';

describe('Campaign Factory', () => {
  it('initializes a fresh campaign at Stage 1 with 3 Level-0 Novices', () => {
    const campaign = createCampaign({ seed: 12345, name: 'Iron Vanguard' });

    expect(campaign.id).toBe('campaign-12345');
    expect(campaign.name).toBe('Iron Vanguard');
    expect(campaign.stage).toBe(1);
    expect(campaign.roster).toHaveLength(3);
    expect(campaign.activeSquadIds).toHaveLength(3);
    expect(campaign.activeSquadIds).toEqual(campaign.roster.map((u) => u.id));

    // History is blank initially
    expect(campaign.history.victories).toBe(0);
    expect(campaign.history.defeats).toBe(0);
    expect(campaign.history.records).toHaveLength(0);

    // Each recruit has valid blank slate stats and zeroed accumulated XP
    for (const unit of campaign.roster) {
      expect(unit.progression.currentLevel).toBe(0);
      expect(unit.progression.constellation).toHaveLength(0);
      expect(unit.progression.accumulatedXp).toEqual({ fighter: 0, rogue: 0, mage: 0 });
      expect(unit.loadout.activeClassId).toBe('novice');
      expect(unit.starterAbilityIds).toHaveLength(3);
      expect(unit.effectiveVitals.maxHp).toBe(12);
      expect(unit.effectiveVitals.armor).toBe(0);
      expect(unit.effectiveVitals.ward).toBe(0);
    }
  });

  it('generates distinct names and unique IDs for all squad members', () => {
    const campaign = createCampaign({ seed: 999 });

    const ids = campaign.roster.map((u) => u.id);
    const names = campaign.roster.map((u) => u.name);

    expect(new Set(ids).size).toBe(3);
    expect(new Set(names).size).toBe(3);
  });

  it('produces identical recruits and state when initialized with the same seed', () => {
    const run1 = createCampaign({ seed: 42 });
    const run2 = createCampaign({ seed: 42 });

    expect(run1.roster.map((u) => u.name)).toEqual(run2.roster.map((u) => u.name));
    expect(run1.roster.map((u) => u.starterAbilityIds)).toEqual(run2.roster.map((u) => u.starterAbilityIds));
    expect(run1.roster.map((u) => u.gender)).toEqual(run2.roster.map((u) => u.gender));
  });

  it('allows customizing initial squad size', () => {
    const campaign = createCampaign({ seed: 777, initialSquadSize: 4 });

    expect(campaign.roster).toHaveLength(4);
    expect(campaign.activeSquadIds).toHaveLength(4);
  });
});
