import { describe, it, expect } from 'vitest';
import { createCampaign } from '../campaign/campaignFactory';
import { exportCampaignJson, importCampaignJson } from './exportImport';
import { SAVE_VERSION } from './types';

describe('exportImport', () => {
  it('serializes a campaign into valid JSON with envelope metadata', () => {
    const campaign = createCampaign({ name: 'Export Test Run' });
    const json = exportCampaignJson('slot-2', campaign);

    expect(typeof json).toBe('string');
    const parsed = JSON.parse(json);

    expect(parsed.version).toBe(SAVE_VERSION);
    expect(parsed.slotId).toBe('slot-2');
    expect(parsed.savedAt).toBeTypeOf('number');
    expect(parsed.campaign.name).toBe('Export Test Run');
    expect(parsed.campaign.roster).toHaveLength(campaign.roster.length);
  });

  it('successfully imports a valid exported JSON string', () => {
    const campaign = createCampaign({ name: 'Round-Trip Run' });
    const exportedJson = exportCampaignJson('slot-1', campaign);

    const result = importCampaignJson(exportedJson);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.envelope.slotId).toBe('slot-1');
      expect(result.envelope.version).toBe(SAVE_VERSION);
      expect(result.envelope.campaign.name).toBe('Round-Trip Run');
      expect(result.envelope.campaign.stage).toBe(1);
    }
  });

  it('allows overriding target slot during import', () => {
    const campaign = createCampaign({ name: 'Slot Override Run' });
    const exportedJson = exportCampaignJson('slot-1', campaign);

    const result = importCampaignJson(exportedJson, 'slot-3');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.envelope.slotId).toBe('slot-3');
    }
  });

  it('rejects malformed JSON strings', () => {
    const malformed = '{ invalid json : true ';
    const result = importCampaignJson(malformed);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Malformed JSON');
    }
  });

  it('rejects save files with incompatible version', () => {
    const campaign = createCampaign();
    const futureEnvelope = {
      version: 999,
      slotId: 'slot-1',
      savedAt: Date.now(),
      campaign
    };

    const result = importCampaignJson(JSON.stringify(futureEnvelope));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Incompatible save version');
    }
  });

  it('rejects save files missing essential campaign fields', () => {
    const invalidSave = {
      version: SAVE_VERSION,
      slotId: 'slot-1',
      savedAt: Date.now(),
      campaign: {
        name: 'Broken Run'
        // Missing id, stage, roster
      }
    };

    const result = importCampaignJson(JSON.stringify(invalidSave));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Corrupted save file');
    }
  });
});
