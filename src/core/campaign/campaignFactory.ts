import { Unit } from '../types/unit';
import { createRecruit } from '../units/unitFactory';
import { CampaignState, CreateCampaignOptions } from './types';
import { createRng } from '../prng';
import { generateStageEncounter } from './encounterGenerator';

import { generateProceduralRecruitName, MALE_FIRST_NAMES } from '../../data/names';

export const FANTASY_MALE_NAMES: readonly string[] = MALE_FIRST_NAMES;

/**
 * Procedurally generates a fresh Level-0 recruit with a random name and rolled starter abilities.
 */
export function generateProceduralRecruit(
  id: string,
  rng: () => number,
  usedNames: Set<string>
): Unit {
  const chosenName = generateProceduralRecruitName(rng, usedNames);
  usedNames.add(chosenName);

  return createRecruit(id, chosenName, {
    faction: 'PLAYER',
    rng
  });
}

/**
 * Creates a brand new campaign run with 3 randomly generated Level-0 Novices,
 * initialized at Stage 1 with empty history.
 */
export function createCampaign(options?: CreateCampaignOptions): CampaignState {
  const seed = options?.seed ?? (options?.rng ? Math.floor(options.rng() * 1_000_000) : Date.now());
  const rng = options?.rng ?? createRng(seed);
  const campaignId = options?.id ?? `campaign-${seed}`;
  const campaignName = options?.name ?? 'Astral Expedition #1';
  const squadSize = options?.initialSquadSize ?? 3;

  const usedNames = new Set<string>();
  const roster: Unit[] = [];
  const activeSquadIds: string[] = [];

  for (let i = 1; i <= squadSize; i++) {
    const unitId = `${campaignId}-unit-${i}`;
    const recruit = generateProceduralRecruit(unitId, rng, usedNames);
    roster.push(recruit);
    activeSquadIds.push(recruit.id);
  }

  const now = Date.now();
  const activeSquad = roster.filter((u) => activeSquadIds.includes(u.id));
  const currentEncounter = generateStageEncounter(1, activeSquad, seed);

  return {
    id: campaignId,
    name: campaignName,
    createdAt: now,
    updatedAt: now,
    stage: 1,
    roster,
    activeSquadIds,
    history: {
      victories: 0,
      defeats: 0,
      records: []
    },
    currentEncounter,
    currentSeed: seed
  };
}
