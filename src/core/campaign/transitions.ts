import { Unit } from '../types/unit';
import { Archetype, ArchetypePoints, UnitProgression } from '../types/class';
import { UnitLoadout } from '../types/loadout';
import { InBattleXp } from '../combat/types';
import { LEVEL_XP_THRESHOLDS } from '../config/balance';
import { computeDerivedVitals } from '../units/vitals';
import { validateUnitLoadout } from '../units/loadout';
import { advanceArchetypeLevel, MAX_LEVEL } from '../progression/pyramid';
import { ClassPackage } from '../types/classPackage';
import { ClassRegistry } from '../progression/registry';
import { CLASS_REGISTRY } from '../../data/classes';
import { getClassPackage } from '../../data/packages';
import { CampaignState } from './types';
import { generateStageEncounter } from './encounterGenerator';

export interface CampaignBattleResult {
  readonly encounterId: string;
  readonly encounterName: string;
  readonly outcome: 'VICTORY' | 'DEFEAT';
  readonly unitXpGains: Record<string, InBattleXp>;
}

/**
 * Reconciles campaign state following a victorious battle:
 * - Restores all squad members to full HP
 * - Credits in-battle XP directly into each unit's accumulatedXp
 * - Increments stage index by 1
 * - Records victory in campaign history
 * - Pre-generates the encounter for the next stage
 */
export function resolveCampaignVictory(
  state: CampaignState,
  result: CampaignBattleResult
): CampaignState {
  const updatedRoster = state.roster.map((unit) => {
    const gains = result.unitXpGains[unit.id];
    const currentXp = unit.progression.accumulatedXp;
    const updatedXp: ArchetypePoints = {
      fighter: currentXp.fighter + (gains?.fighter ?? 0),
      rogue: currentXp.rogue + (gains?.rogue ?? 0),
      mage: currentXp.mage + (gains?.mage ?? 0)
    };

    return {
      ...unit,
      progression: {
        ...unit.progression,
        accumulatedXp: updatedXp
      }
    };
  });

  const nextStage = state.stage + 1;
  const nextSeed = state.currentSeed + 1;
  const activeSquad = updatedRoster.filter((u) => state.activeSquadIds.includes(u.id));
  const nextEncounter = generateStageEncounter(nextStage, activeSquad, nextSeed);

  const now = Date.now();

  return {
    ...state,
    stage: nextStage,
    roster: updatedRoster,
    updatedAt: now,
    currentSeed: nextSeed,
    currentEncounter: nextEncounter,
    history: {
      victories: state.history.victories + 1,
      defeats: state.history.defeats,
      records: [
        ...state.history.records,
        {
          stage: state.stage,
          outcome: 'VICTORY',
          encounterId: result.encounterId,
          encounterName: result.encounterName,
          timestamp: now
        }
      ]
    }
  };
}

/**
 * Reconciles campaign state following a battle defeat:
 * - Restores all squad members to full HP
 * - Discards any in-battle XP earned during the failed attempt
 * - Preserves stage index and current encounter for retry or reroll
 * - Records defeat in campaign history
 */
export function resolveCampaignDefeat(
  state: CampaignState,
  result: CampaignBattleResult
): CampaignState {
  const now = Date.now();

  return {
    ...state,
    updatedAt: now,
    history: {
      victories: state.history.victories,
      defeats: state.history.defeats + 1,
      records: [
        ...state.history.records,
        {
          stage: state.stage,
          outcome: 'DEFEAT',
          encounterId: result.encounterId,
          encounterName: result.encounterName,
          timestamp: now
        }
      ]
    }
  };
}

/**
 * Levels up a unit in Camp by spending threshold XP on the chosen archetype:
 * - Deducts threshold cost strictly from the chosen archetype's accumulated XP
 * - Retains all excess XP and non-chosen archetype XP
 * - Increments level, unlocks new class node, and recalculates derived vitals
 */
export function allocateCampArchetypePoint(
  state: CampaignState,
  unitId: string,
  archetype: Archetype,
  registry: ClassRegistry = CLASS_REGISTRY
): CampaignState {
  const unit = state.roster.find((u) => u.id === unitId);
  if (!unit) {
    throw new Error(`Unit ${unitId} not found in campaign roster.`);
  }
  const currentLevel = unit.progression.currentLevel;

  if (currentLevel >= MAX_LEVEL) {
    throw new Error(`Unit ${unit.id} has already reached the maximum level cap of ${MAX_LEVEL}.`);
  }

  const threshold = LEVEL_XP_THRESHOLDS[currentLevel] ?? 5;
  const currentXp = unit.progression.accumulatedXp;
  const archKey = archetype.toLowerCase() as keyof ArchetypePoints;

  if (currentXp[archKey] < threshold) {
    throw new Error(
      `Unit ${unit.id} does not have enough ${archetype} XP to level up (${currentXp[archKey]} < ${threshold}).`
    );
  }

  // Advance level and constellation via pyramid
  const advancedProg = advanceArchetypeLevel(unit.progression, archetype, registry);

  // Deduct threshold XP from the chosen archetype while preserving remaining XP
  const updatedAccumulatedXp: ArchetypePoints = {
    ...currentXp,
    [archKey]: currentXp[archKey] - threshold
  };

  const finalProgression: UnitProgression = {
    ...advancedProg,
    accumulatedXp: updatedAccumulatedXp
  };

  // Update base attributes
  const attrKey = archKey === 'fighter' ? 'force' : archKey === 'rogue' ? 'finesse' : 'focus';
  const updatedAttributes = {
    ...unit.baseAttributes,
    [attrKey]: unit.baseAttributes[attrKey] + 1
  };

  // Recalculate derived vitals
  const updatedVitals = computeDerivedVitals(updatedAttributes, finalProgression.currentLevel);

  const updatedUnit: Unit = {
    ...unit,
    progression: finalProgression,
    baseAttributes: updatedAttributes,
    effectiveVitals: updatedVitals
  };

  return {
    ...state,
    roster: state.roster.map((u) => (u.id === unitId ? updatedUnit : u)),
    updatedAt: Date.now()
  };
}

/**
 * Updates a unit's active class and wildcard slots in Camp after validating against constellation.
 */
export function updateCampUnitLoadout(
  state: CampaignState,
  unitId: string,
  loadout: UnitLoadout,
  packageProvider: (classId: string) => ClassPackage | undefined = getClassPackage
): CampaignState {
  const unit = state.roster.find((u) => u.id === unitId);
  if (!unit) {
    throw new Error(`Unit ${unitId} not found in campaign roster.`);
  }

  const validation = validateUnitLoadout(unit, loadout, { getPackage: packageProvider });
  if (!validation.valid) {
    throw new Error(`Invalid loadout for unit ${unitId}: ${validation.reason}`);
  }

  const updatedUnit: Unit = {
    ...unit,
    loadout: { ...loadout }
  };

  return {
    ...state,
    roster: state.roster.map((u) => (u.id === unitId ? updatedUnit : u)),
    updatedAt: Date.now()
  };
}

/**
 * Reconfigures the active squad combat deployment.
 */
export function setCampActiveSquad(
  state: CampaignState,
  squadUnitIds: readonly string[]
): CampaignState {
  if (squadUnitIds.length === 0 || squadUnitIds.length > 3) {
    throw new Error('Active squad must contain between 1 and 3 units.');
  }

  for (const id of squadUnitIds) {
    if (!state.roster.some((u) => u.id === id)) {
      throw new Error(`Unit ${id} does not exist in campaign roster.`);
    }
  }

  const activeSquad = state.roster.filter((u) => squadUnitIds.includes(u.id));
  const updatedEncounter = generateStageEncounter(state.stage, activeSquad, state.currentSeed);

  return {
    ...state,
    activeSquadIds: [...squadUnitIds],
    currentEncounter: updatedEncounter,
    updatedAt: Date.now()
  };
}

/**
 * Re-rolls the encounter for the current stage with a fresh seed.
 */
export function regenerateCurrentStageEncounter(
  state: CampaignState,
  newSeed?: number
): CampaignState {
  const seed = newSeed ?? (state.currentSeed + 101);
  const activeSquad = state.roster.filter((u) => state.activeSquadIds.includes(u.id));
  const encounter = generateStageEncounter(state.stage, activeSquad, seed);

  return {
    ...state,
    currentSeed: seed,
    currentEncounter: encounter,
    updatedAt: Date.now()
  };
}
