import { describe, it, expect, beforeEach } from 'vitest';
import { createCampaign } from '../campaign/campaignFactory';
import {
  saveCampaignSlot,
  loadCampaignSlot,
  deleteCampaignSlot,
  getSlotSummaries,
  getFirstOpenSlot,
  clearMemoryStorage,
  injectRawSave
} from './saveManager';
import { SaveEnvelope } from './types';

describe('saveManager', () => {
  beforeEach(() => {
    clearMemoryStorage();
  });

  it('saves and loads a campaign across discrete slots', async () => {
    const campaign1 = createCampaign({ name: 'Run #1', seed: 101 });
    const campaign2 = createCampaign({ name: 'Run #2', seed: 202 });

    await saveCampaignSlot('slot-1', campaign1);
    await saveCampaignSlot('slot-2', campaign2);

    const loaded1 = await loadCampaignSlot('slot-1');
    const loaded2 = await loadCampaignSlot('slot-2');
    const loaded3 = await loadCampaignSlot('slot-3');

    expect(loaded1).not.toBeNull();
    expect(loaded1?.name).toBe('Run #1');
    expect(loaded1?.roster.length).toBe(campaign1.roster.length);

    expect(loaded2).not.toBeNull();
    expect(loaded2?.name).toBe('Run #2');

    expect(loaded3).toBeNull();
  });

  it('deletes a save slot and restores empty state', async () => {
    const campaign = createCampaign({ name: 'Disposable Run' });
    await saveCampaignSlot('slot-1', campaign);

    expect(await loadCampaignSlot('slot-1')).not.toBeNull();

    await deleteCampaignSlot('slot-1');
    expect(await loadCampaignSlot('slot-1')).toBeNull();

    const summaries = await getSlotSummaries();
    expect(summaries[0].isEmpty).toBe(true);
  });

  it('generates accurate slot summaries for UI rendering', async () => {
    const campaign = createCampaign({ name: 'Alpha Squad' });
    await saveCampaignSlot('slot-2', campaign);

    const summaries = await getSlotSummaries();
    expect(summaries).toHaveLength(3);

    expect(summaries[0].slotId).toBe('slot-1');
    expect(summaries[0].isEmpty).toBe(true);

    expect(summaries[1].slotId).toBe('slot-2');
    expect(summaries[1].isEmpty).toBe(false);
    expect(summaries[1].campaignName).toBe('Alpha Squad');
    expect(summaries[1].stage).toBe(1);
    expect(summaries[1].rosterCount).toBe(campaign.roster.length);
    expect(summaries[1].isCorrupted).toBe(false);

    expect(summaries[2].slotId).toBe('slot-3');
    expect(summaries[2].isEmpty).toBe(true);
  });

  it('identifies the first open slot and detects full slots', async () => {
    expect(await getFirstOpenSlot()).toBe('slot-1');

    await saveCampaignSlot('slot-1', createCampaign());
    expect(await getFirstOpenSlot()).toBe('slot-2');

    await saveCampaignSlot('slot-2', createCampaign());
    expect(await getFirstOpenSlot()).toBe('slot-3');

    await saveCampaignSlot('slot-3', createCampaign());
    expect(await getFirstOpenSlot()).toBeNull();
  });

  it('strictly invalidates saves with incompatible versions', async () => {
    const campaign = createCampaign();
    const invalidEnvelope: SaveEnvelope = {
      version: 999,
      slotId: 'slot-1',
      savedAt: Date.now(),
      campaign
    };

    injectRawSave('slot-1', invalidEnvelope);

    // loadCampaignSlot should refuse to load the incompatible version
    const loaded = await loadCampaignSlot('slot-1');
    expect(loaded).toBeNull();

    // getSlotSummaries should report it as corrupted
    const summaries = await getSlotSummaries();
    expect(summaries[0].isEmpty).toBe(false);
    expect(summaries[0].isCorrupted).toBe(true);
  });
});
