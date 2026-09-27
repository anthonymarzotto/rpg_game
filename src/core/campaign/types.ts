import { Unit } from '../types/unit';
import { EncounterDefinition } from '../combat/encounter';

/**
 * Historical record of an individual combat encounter completed in the campaign.
 */
export interface CampaignHistoryRecord {
  readonly stage: number;
  readonly outcome: 'VICTORY' | 'DEFEAT';
  readonly encounterId: string;
  readonly encounterName: string;
  readonly timestamp: number;
}

/**
 * Aggregated statistics and historical battle outcomes for the campaign run.
 */
export interface CampaignHistory {
  readonly victories: number;
  readonly defeats: number;
  readonly records: readonly CampaignHistoryRecord[];
}

/**
 * Complete immutable campaign state representing persistent heroes,
 * current stage progression, active battle squad, and current pending encounter.
 */
export interface CampaignState {
  /** Unique campaign run identifier */
  readonly id: string;
  /** Display name for the campaign run */
  readonly name: string;
  /** Creation timestamp (epoch ms) */
  readonly createdAt: number;
  /** Last modified timestamp (epoch ms) */
  readonly updatedAt: number;
  /** Current campaign stage index (1-based) */
  readonly stage: number;
  /** Full player roster of owned units */
  readonly roster: readonly Unit[];
  /** IDs of units designated for combat deployment */
  readonly activeSquadIds: readonly string[];
  /** Aggregated victory/defeat record */
  readonly history: CampaignHistory;
  /** Pre-generated encounter for the current stage */
  readonly currentEncounter?: EncounterDefinition;
  /** Active random seed for the current stage encounter */
  readonly currentSeed: number;
}

/**
 * Optional overrides for creating a new campaign.
 */
export interface CreateCampaignOptions {
  readonly id?: string;
  readonly name?: string;
  readonly seed?: number;
  readonly rng?: () => number;
  readonly initialSquadSize?: number;
}
