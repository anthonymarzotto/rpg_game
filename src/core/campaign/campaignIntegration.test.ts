import { describe, it, expect } from 'vitest';
import { buildEncounterState } from '../combat/encounter';
import { createCampaign } from './campaignFactory';
import {
  resolveCampaignVictory,
  resolveCampaignDefeat,
  allocateCampArchetypePoint,
  updateCampUnitLoadout,
  regenerateCurrentStageEncounter
} from './transitions';

describe('Campaign End-to-End Headless Integration Flow', () => {
  it('executes a multi-stage progression: Stage 1 -> Victory -> Camp Level Up -> Stage 2 -> Defeat -> Retry -> Victory -> Full Class Promotions', () => {
    // 1. Initialize New Campaign
    let campaign = createCampaign({ seed: 1001, name: 'Sovereign Blades' });

    expect(campaign.stage).toBe(1);
    expect(campaign.roster).toHaveLength(3);
    const [recruitA, recruitB, recruitC] = campaign.roster;

    expect(recruitA.progression.currentLevel).toBe(0);
    expect(recruitB.progression.currentLevel).toBe(0);
    expect(recruitC.progression.currentLevel).toBe(0);

    // Initial encounter pre-generated
    expect(campaign.currentEncounter).toBeDefined();
    const stage1CombatState = buildEncounterState(campaign.currentEncounter!);
    expect(stage1CombatState.outcome).toBe('IN_PROGRESS');

    // 2. Stage 1 Battle Victory
    const stage1Result = {
      encounterId: campaign.currentEncounter!.id,
      encounterName: campaign.currentEncounter!.name,
      outcome: 'VICTORY' as const,
      unitXpGains: {
        [recruitA.id]: { fighter: 5, rogue: 0, mage: 0 },
        [recruitB.id]: { fighter: 0, rogue: 5, mage: 0 },
        [recruitC.id]: { fighter: 0, rogue: 0, mage: 3 }
      }
    };

    campaign = resolveCampaignVictory(campaign, stage1Result);
    expect(campaign.stage).toBe(2);
    expect(campaign.history.victories).toBe(1);
    expect(campaign.history.defeats).toBe(0);

    // 3. Camp Progression Phase 1
    // Hero A levels up to Warrior (Fighter 5 XP spent)
    campaign = allocateCampArchetypePoint(campaign, recruitA.id, 'FIGHTER');
    // Hero B levels up to Thief (Rogue 5 XP spent)
    campaign = allocateCampArchetypePoint(campaign, recruitB.id, 'ROGUE');

    // Hero C only has 3/5 Mage XP, attempting level-up fails
    expect(() => {
      allocateCampArchetypePoint(campaign, recruitC.id, 'MAGE');
    }).toThrow(/does not have enough MAGE XP/);

    const updatedA = campaign.roster.find((u) => u.id === recruitA.id)!;
    const updatedB = campaign.roster.find((u) => u.id === recruitB.id)!;
    const updatedC = campaign.roster.find((u) => u.id === recruitC.id)!;

    expect(updatedA.progression.currentLevel).toBe(1);
    expect(updatedA.progression.constellation).toContain('warrior');
    expect(updatedA.effectiveVitals.armor).toBe(1);

    expect(updatedB.progression.currentLevel).toBe(1);
    expect(updatedB.progression.constellation).toContain('thief');

    expect(updatedC.progression.currentLevel).toBe(0);
    expect(updatedC.progression.accumulatedXp!.mage).toBe(3);

    // Hero A equips Warrior active class and valid wildcards
    const starterA = updatedA.starterAbilityIds;
    const wildcardAbilitiesA = starterA.filter((id) => id !== 'strike'); // Exclude core strike
    campaign = updateCampUnitLoadout(campaign, recruitA.id, {
      activeClassId: 'warrior',
      wildcardAbilityIds: wildcardAbilitiesA.slice(0, 2),
      wildcardPassiveIds: ['momentum']
    });

    // 4. Stage 2 Encounter: Battle Defeat Scenario
    const stage2Encounter = campaign.currentEncounter!;
    expect(stage2Encounter.id).toContain('stage-2');

    const stage2DefeatResult = {
      encounterId: stage2Encounter.id,
      encounterName: stage2Encounter.name,
      outcome: 'DEFEAT' as const,
      unitXpGains: {
        [recruitC.id]: { fighter: 0, rogue: 0, mage: 2 } // Earned 2 XP before falling
      }
    };

    campaign = resolveCampaignDefeat(campaign, stage2DefeatResult);
    expect(campaign.stage).toBe(2); // Preserves stage
    expect(campaign.history.victories).toBe(1);
    expect(campaign.history.defeats).toBe(1);

    // XP gained in failed attempt was discarded
    const cAfterDefeat = campaign.roster.find((u) => u.id === recruitC.id)!;
    expect(cAfterDefeat.progression.accumulatedXp!.mage).toBe(3);

    // 5. Retry Stage 2 (or Reroll with New Battle)
    campaign = regenerateCurrentStageEncounter(campaign, 2024);
    expect(campaign.currentEncounter!.id).not.toBe(stage2Encounter.id);

    const stage2VictoryResult = {
      encounterId: campaign.currentEncounter!.id,
      encounterName: campaign.currentEncounter!.name,
      outcome: 'VICTORY' as const,
      unitXpGains: {
        [recruitC.id]: { fighter: 0, rogue: 0, mage: 4 } // Gains 4 Mage XP
      }
    };

    campaign = resolveCampaignVictory(campaign, stage2VictoryResult);
    expect(campaign.stage).toBe(3);
    expect(campaign.history.victories).toBe(2);
    expect(campaign.history.defeats).toBe(1);

    // 6. Camp Progression Phase 2: Hero C Promotes to Wizard!
    const cBeforePromote = campaign.roster.find((u) => u.id === recruitC.id)!;
    // 3 + 4 = 7 Mage XP!
    expect(cBeforePromote.progression.accumulatedXp!.mage).toBe(7);

    campaign = allocateCampArchetypePoint(campaign, recruitC.id, 'MAGE');
    const cPromoted = campaign.roster.find((u) => u.id === recruitC.id)!;

    expect(cPromoted.progression.currentLevel).toBe(1);
    expect(cPromoted.progression.constellation).toContain('wizard');
    // 7 - 5 = 2 Mage XP safely preserved!
    expect(cPromoted.progression.accumulatedXp!.mage).toBe(2);

    // All 3 heroes are now promoted veterans with persistent stats!
    expect(campaign.roster.every((u) => u.progression.currentLevel === 1)).toBe(true);
    expect(campaign.history.records).toHaveLength(3);
  });
});
