import { CampaignState } from '../campaign/types';
import {
  SaveSlotId,
  SAVE_SLOT_IDS,
  SAVE_VERSION,
  SaveEnvelope,
  ImportSaveResult
} from './types';

/**
 * Serializes a campaign into a formatted JSON string wrapped in a SaveEnvelope.
 */
export function exportCampaignJson(
  slotId: SaveSlotId,
  campaign: CampaignState
): string {
  const envelope: SaveEnvelope = {
    version: SAVE_VERSION,
    slotId,
    savedAt: Date.now(),
    campaign
  };
  return JSON.stringify(envelope, null, 2);
}

/**
 * Triggers a browser file download of the exported save JSON.
 * Gracefully no-ops in headless environments.
 */
export function triggerSaveDownload(
  slotId: SaveSlotId,
  campaign: CampaignState
): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    return;
  }

  const jsonString = exportCampaignJson(slotId, campaign);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const filename = `astral_tactics_${slotId}_stage${campaign.stage}.json`;
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parses and validates an imported JSON save string.
 * Strictly verifies envelope structure and version compatibility.
 */
export function importCampaignJson(
  jsonString: string,
  targetSlotId?: SaveSlotId
): ImportSaveResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return {
      success: false,
      error: 'Malformed JSON: Unable to parse file.'
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      success: false,
      error: 'Invalid save file format: Expected an object.'
    };
  }

  const envelope = parsed as Partial<SaveEnvelope>;

  if (envelope.version !== SAVE_VERSION) {
    return {
      success: false,
      error: `Incompatible save version: Expected version ${SAVE_VERSION}, received ${String(envelope.version)}.`
    };
  }

  if (!envelope.campaign || typeof envelope.campaign !== 'object') {
    return {
      success: false,
      error: 'Invalid save file: Missing campaign payload.'
    };
  }

  const campaign = envelope.campaign as Partial<CampaignState>;
  if (
    typeof campaign.id !== 'string' ||
    typeof campaign.stage !== 'number' ||
    !Array.isArray(campaign.roster)
  ) {
    return {
      success: false,
      error: 'Corrupted save file: Missing essential campaign properties.'
    };
  }

  // Resolve assigned slot ID (target override, envelope slot, or fallback to first slot)
  let resolvedSlotId: SaveSlotId = 'slot-1';
  if (targetSlotId && SAVE_SLOT_IDS.includes(targetSlotId)) {
    resolvedSlotId = targetSlotId;
  } else if (envelope.slotId && SAVE_SLOT_IDS.includes(envelope.slotId)) {
    resolvedSlotId = envelope.slotId;
  }

  const validatedEnvelope: SaveEnvelope = {
    version: SAVE_VERSION,
    slotId: resolvedSlotId,
    savedAt: typeof envelope.savedAt === 'number' ? envelope.savedAt : Date.now(),
    campaign: envelope.campaign as CampaignState
  };

  return {
    success: true,
    envelope: validatedEnvelope
  };
}
