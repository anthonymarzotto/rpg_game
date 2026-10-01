import { CampaignState } from '../campaign/types';
import { UseStore, createStore } from 'idb-keyval';

export const SAVE_VERSION = 1;

export const SAVE_SLOT_IDS = ['slot-1', 'slot-2', 'slot-3'] as const;
export type SaveSlotId = (typeof SAVE_SLOT_IDS)[number];

export const SLOT_LABELS: Record<SaveSlotId, string> = {
  'slot-1': 'Expedition Slot 1',
  'slot-2': 'Expedition Slot 2',
  'slot-3': 'Expedition Slot 3'
};

export const STORAGE_DB_NAME = 'astral_tactics_db';
export const STORAGE_STORE_NAME = 'campaign_saves';

/**
 * Top-level persistence container wrapping a CampaignState with version and metadata.
 */
export interface SaveEnvelope {
  readonly version: number;
  readonly slotId: SaveSlotId;
  readonly savedAt: number;
  readonly campaign: CampaignState;
}

/**
 * Lightweight slot metadata for quick UI rendering without deserializing full rosters.
 */
export interface SlotSummary {
  readonly slotId: SaveSlotId;
  readonly label: string;
  readonly isEmpty: boolean;
  readonly isCorrupted?: boolean;
  readonly campaignName?: string;
  readonly stage?: number;
  readonly rosterCount?: number;
  readonly victories?: number;
  readonly defeats?: number;
  readonly savedAt?: number;
}

/**
 * Result of attempting to import an external save JSON string.
 */
export type ImportSaveResult =
  | { readonly success: true; readonly envelope: SaveEnvelope }
  | { readonly success: false; readonly error: string };

/**
 * Lazy creation of the custom idb-keyval store.
 * Safe in browser and mockable in headless test runners.
 */
let customStorageStore: UseStore | undefined;

export function getStorageStore(): UseStore | undefined {
  if (typeof indexedDB === 'undefined') {
    return undefined;
  }
  if (!customStorageStore) {
    customStorageStore = createStore(STORAGE_DB_NAME, STORAGE_STORE_NAME);
  }
  return customStorageStore;
}
