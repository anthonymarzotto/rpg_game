import { get, set, del } from 'idb-keyval';
import { CampaignState } from '../campaign/types';
import {
  SaveSlotId,
  SAVE_SLOT_IDS,
  SLOT_LABELS,
  SAVE_VERSION,
  SaveEnvelope,
  SlotSummary,
  getStorageStore
} from './types';

// In-memory fallback map for non-browser or test environments lacking IndexedDB
const memoryStorage = new Map<string, SaveEnvelope>();

/**
 * Resets the in-memory storage fallback. Intended for test isolation.
 */
export function clearMemoryStorage(): void {
  memoryStorage.clear();
}

/**
 * Injects a raw envelope into in-memory storage. Intended for testing corruption/incompatible versions.
 */
export function injectRawSave(slotId: SaveSlotId, raw: SaveEnvelope): void {
  memoryStorage.set(slotId, raw);
}

/**
 * Saves a campaign state to a specific slot wrapped in a versioned envelope.
 */
export async function saveCampaignSlot(
  slotId: SaveSlotId,
  campaign: CampaignState
): Promise<SaveEnvelope> {
  const envelope: SaveEnvelope = {
    version: SAVE_VERSION,
    slotId,
    savedAt: Date.now(),
    campaign
  };

  const store = getStorageStore();
  if (store) {
    await set(slotId, envelope, store);
  } else {
    memoryStorage.set(slotId, envelope);
  }

  return envelope;
}

/**
 * Loads a campaign state from a specific slot.
 * Returns null if the slot is empty or if the save version is incompatible.
 */
export async function loadCampaignSlot(
  slotId: SaveSlotId
): Promise<CampaignState | null> {
  const store = getStorageStore();
  let raw: unknown;

  if (store) {
    raw = await get(slotId, store);
  } else {
    raw = memoryStorage.get(slotId);
  }

  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const envelope = raw as Partial<SaveEnvelope>;

  // Strict version validation - invalidate and refuse to load incompatible saves
  if (envelope.version !== SAVE_VERSION || !envelope.campaign) {
    return null;
  }

  return envelope.campaign;
}

/**
 * Clears/deletes a save slot completely.
 */
export async function deleteCampaignSlot(
  slotId: SaveSlotId
): Promise<void> {
  const store = getStorageStore();
  if (store) {
    await del(slotId, store);
  }
  memoryStorage.delete(slotId);
}

/**
 * Returns metadata summaries for all 3 slots for lightweight UI rendering.
 */
export async function getSlotSummaries(): Promise<readonly SlotSummary[]> {
  const store = getStorageStore();
  const summaries: SlotSummary[] = [];

  for (const slotId of SAVE_SLOT_IDS) {
    let raw: unknown;
    if (store) {
      raw = await get(slotId, store);
    } else {
      raw = memoryStorage.get(slotId);
    }

    if (!raw || typeof raw !== 'object') {
      summaries.push({
        slotId,
        label: SLOT_LABELS[slotId],
        isEmpty: true
      });
      continue;
    }

    const envelope = raw as Partial<SaveEnvelope>;

    if (envelope.version !== SAVE_VERSION || !envelope.campaign) {
      summaries.push({
        slotId,
        label: SLOT_LABELS[slotId],
        isEmpty: false,
        isCorrupted: true
      });
      continue;
    }

    const campaign = envelope.campaign;
    summaries.push({
      slotId,
      label: SLOT_LABELS[slotId],
      isEmpty: false,
      isCorrupted: false,
      campaignName: campaign.name,
      stage: campaign.stage,
      rosterCount: campaign.roster?.length ?? 0,
      victories: campaign.history?.victories ?? 0,
      defeats: campaign.history?.defeats ?? 0,
      savedAt: envelope.savedAt
    });
  }

  return summaries;
}

/**
 * Finds the first unoccupied save slot, or null if all 3 slots are occupied.
 */
export async function getFirstOpenSlot(): Promise<SaveSlotId | null> {
  const summaries = await getSlotSummaries();
  const openSlot = summaries.find((s) => s.isEmpty);
  return openSlot ? openSlot.slotId : null;
}
