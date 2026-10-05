import { describe, it, expect } from 'vitest';
import { createCampaign } from './campaignFactory';
import {
  resolveCampaignVictory,
  resolveCampaignDefeat,
  allocateCampArchetypePoint,
  updateCampUnitLoadout,
  setCampActiveSquad,
  regenerateCurrentStageEncounter,
  recruitNovice
} from './transitions';

describe('Campaign State Transitions & Lifecycle Reducers', () => {
  it('resolves campaign victory: banks XP, advances stage, logs history, pre-generates next battle', () => {
    const initial = createCampaign({ seed: 100 });
    const hero1 = initial.roster[0];

    const battleResult = {
      encounterId: 'stage-1-battle',
      encounterName: 'Trial by Fire',
      outcome: 'VICTORY' as const,
      unitXpGains: {
        [hero1.id]: { fighter: 3, rogue: 2, mage: 0 }
      }
    };

    const nextState = resolveCampaignVictory(initial, battleResult);

    expect(nextState.stage).toBe(2);
    expect(nextState.history.victories).toBe(1);
    expect(nextState.history.defeats).toBe(0);
    expect(nextState.history.records).toHaveLength(1);
    expect(nextState.history.records[0]).toMatchObject({
      stage: 1,
      outcome: 'VICTORY',
      encounterId: 'stage-1-battle'
    });

    const updatedHero1 = nextState.roster.find((u) => u.id === hero1.id)!;
    expect(updatedHero1.progression.accumulatedXp).toEqual({
      fighter: 3,
      rogue: 2,
      mage: 0
    });

    expect(nextState.currentEncounter).toBeDefined();
    expect(nextState.currentEncounter!.id).toContain('stage-2');
  });

  it('resolves campaign defeat: reverts in-battle XP, preserves stage, logs history', () => {
    const initial = createCampaign({ seed: 200 });
    const hero1 = initial.roster[0];

    const battleResult = {
      encounterId: 'stage-1-battle',
      encounterName: 'Trial by Fire',
      outcome: 'DEFEAT' as const,
      unitXpGains: {
        [hero1.id]: { fighter: 4, rogue: 0, mage: 0 }
      }
    };

    const nextState = resolveCampaignDefeat(initial, battleResult);

    expect(nextState.stage).toBe(1);
    expect(nextState.history.victories).toBe(0);
    expect(nextState.history.defeats).toBe(1);
    expect(nextState.history.records).toHaveLength(1);
    expect(nextState.history.records[0].outcome).toBe('DEFEAT');

    // XP gained in the failed fight is discarded
    const updatedHero1 = nextState.roster.find((u) => u.id === hero1.id)!;
    expect(updatedHero1.progression.accumulatedXp).toEqual({
      fighter: 0,
      rogue: 0,
      mage: 0
    });
  });

  it('allocates archetype points in Camp: advances level, unlocks class, preserves excess and cross-archetype XP', () => {
    const initial = createCampaign({ seed: 300 });
    const hero1 = initial.roster[0];

    // Seed hero with 7 Fighter XP and 5 Rogue XP
    const stateWithXp = {
      ...initial,
      roster: initial.roster.map((u) =>
        u.id === hero1.id
          ? {
              ...u,
              progression: {
                ...u.progression,
                accumulatedXp: { fighter: 7, rogue: 5, mage: 1 }
              }
            }
          : u
      )
    };

    // Level up in Fighter (Threshold for Level 0 -> 1 is 5 XP)
    const leveledState = allocateCampArchetypePoint(stateWithXp, hero1.id, 'FIGHTER');
    const leveledHero = leveledState.roster.find((u) => u.id === hero1.id)!;

    expect(leveledHero.progression.currentLevel).toBe(1);
    expect(leveledHero.progression.archetypePoints).toEqual({ fighter: 1, rogue: 0, mage: 0 });
    expect(leveledHero.progression.constellation).toContain('warrior');
    expect(leveledHero.baseAttributes.force).toBe(1);
    expect(leveledHero.effectiveVitals.armor).toBe(1);

    // 7 - 5 = 2 Fighter XP left; Rogue 5 and Mage 1 are completely preserved!
    expect(leveledHero.progression.accumulatedXp).toEqual({
      fighter: 2,
      rogue: 5,
      mage: 1
    });

    // Synchronizes placed unit in pending encounter
    const placedInEncounter = leveledState.currentEncounter?.units.find((p) => p.unit.id === hero1.id);
    expect(placedInEncounter?.unit.progression.currentLevel).toBe(1);
    expect(placedInEncounter?.unit.baseAttributes.force).toBe(leveledHero.baseAttributes.force);
  });

  it('rejects leveling up if accumulated XP does not meet threshold', () => {
    const initial = createCampaign({ seed: 400 });
    const hero1 = initial.roster[0];

    // Hero only has 3 Fighter XP (needs 5)
    const stateWithLowXp = {
      ...initial,
      roster: initial.roster.map((u) =>
        u.id === hero1.id
          ? {
              ...u,
              progression: {
                ...u.progression,
                accumulatedXp: { fighter: 3, rogue: 0, mage: 0 }
              }
            }
          : u
      )
    };

    expect(() => {
      allocateCampArchetypePoint(stateWithLowXp, hero1.id, 'FIGHTER');
    }).toThrow(/does not have enough FIGHTER XP/);
  });

  it('supports updating equipped loadout with unlocked class and valid wildcards in Camp', () => {
    const initial = createCampaign({ seed: 500 });
    const hero1 = initial.roster[0];

    // Give hero warrior unlocked with starter abilities
    const warriorHero = {
      ...hero1,
      starterAbilityIds: ['strike', 'quick_thrust', 'spark'],
      progression: {
        ...hero1.progression,
        currentLevel: 1,
        archetypePoints: { fighter: 1, rogue: 0, mage: 0 },
        constellation: ['warrior']
      }
    };
    const stateWithWarrior = {
      ...initial,
      roster: initial.roster.map((u) => (u.id === hero1.id ? warriorHero : u))
    };

    const newLoadout = {
      activeClassId: 'warrior',
      wildcardAbilityIds: ['quick_thrust', 'spark'],
      wildcardPassiveIds: ['momentum']
    };

    const updatedState = updateCampUnitLoadout(stateWithWarrior, hero1.id, newLoadout);
    const updatedHero = updatedState.roster.find((u) => u.id === hero1.id)!;

    expect(updatedHero.loadout.activeClassId).toBe('warrior');
    expect(updatedHero.loadout.wildcardAbilityIds).toEqual(['quick_thrust', 'spark']);

    const placedInEncounter = updatedState.currentEncounter?.units.find((p) => p.unit.id === hero1.id);
    expect(placedInEncounter?.unit.loadout.activeClassId).toBe('warrior');
    expect(placedInEncounter?.unit.loadout.wildcardAbilityIds).toEqual(['quick_thrust', 'spark']);
  });

  it('re-rolls the encounter for the current stage with a new seed', () => {
    const initial = createCampaign({ seed: 600 });
    const enc1 = initial.currentEncounter;

    const rerolledState = regenerateCurrentStageEncounter(initial, 777);
    const enc2 = rerolledState.currentEncounter;

    expect(rerolledState.currentSeed).toBe(777);
    expect(enc2).toBeDefined();
    expect(enc2!.id).not.toBe(enc1?.id);
  });

  it('configures active combat squad and regenerates pending encounter', () => {
    const initial = createCampaign({ seed: 700, initialSquadSize: 4 });
    expect(initial.roster).toHaveLength(4);

    const squad3 = [initial.roster[0].id, initial.roster[1].id, initial.roster[2].id];
    const stateSquad = setCampActiveSquad(initial, squad3);

    expect(stateSquad.activeSquadIds).toEqual(squad3);
    const playerUnits = stateSquad.currentEncounter!.units.filter((u) => u.unit.faction === 'PLAYER');
    expect(playerUnits).toHaveLength(3);
  });

  it('recruits a fresh Level-0 Novice into the campaign roster', () => {
    const initial = createCampaign({ seed: 800 });
    expect(initial.roster).toHaveLength(3);

    const updated = recruitNovice(initial);
    expect(updated.roster).toHaveLength(4);

    const recruited = updated.roster[3];
    expect(recruited.progression.currentLevel).toBe(0);
    expect(recruited.loadout.activeClassId).toBe('novice');
    expect(recruited.effectiveVitals.maxHp).toBeGreaterThan(0);
    expect(recruited.id).toContain('unit-4');
  });

  it('allocates off-node archetype point with Wayfarer Attunement, unlocked ability, and shard', () => {
    const initial = createCampaign({ seed: 900 });
    const hero1 = initial.roster[0];

    // Give hero 1 Fighter level and enough Rogue XP to reach level 2 (off-node 1,1,0)
    const stateL1 = allocateCampArchetypePoint(
      {
        ...initial,
        roster: initial.roster.map((u) =>
          u.id === hero1.id
            ? {
                ...u,
                progression: {
                  ...u.progression,
                  accumulatedXp: { fighter: 5, rogue: 10, mage: 0 }
                }
              }
            : u
        )
      },
      hero1.id,
      'FIGHTER'
    );

    const heroL1 = stateL1.roster.find((u) => u.id === hero1.id)!;
    expect(heroL1.progression.currentLevel).toBe(1);
    expect(heroL1.progression.archetypePoints).toEqual({ fighter: 1, rogue: 0, mage: 0 });

    // Level up in Rogue to reach (1, 1, 0) - off-node coordinate
    const baseArmorL1 = heroL1.effectiveVitals.armor;
    const baseHpL1 = heroL1.effectiveVitals.maxHp;

    const stateL2 = allocateCampArchetypePoint(stateL1, hero1.id, 'ROGUE', {
      attunementId: 'wayfarer_bastion',
      unlockedAbilityId: 'toxic_shiv',
      earnedShardId: 'starlight_lens'
    });

    const heroL2 = stateL2.roster.find((u) => u.id === hero1.id)!;
    expect(heroL2.progression.currentLevel).toBe(2);
    expect(heroL2.progression.archetypePoints).toEqual({ fighter: 1, rogue: 1, mage: 0 });
    // Off-node milestone recorded
    expect(heroL2.progression.offNodeMilestones).toContain('1,1,0');
    // Constellation did not add an off-node (still just warrior)
    expect(heroL2.progression.constellation).toEqual(['warrior']);
    // Attunement recorded
    expect(heroL2.progression.earnedAttunements).toEqual(['wayfarer_bastion']);
    // Ability unlocked
    expect(heroL2.progression.unlockedAbilityIds).toEqual(['toxic_shiv']);
    // Shard earned
    expect(heroL2.loadout.earnedShards).toEqual(['starlight_lens']);

    // Vitals gained +6 Max HP and +1 Armor from wayfarer_bastion (on top of level 2 base scaling)
    // Level scaling: +5 HP from level 1 -> 2. So total HP increase = 5 + 6 = 11
    expect(heroL2.effectiveVitals.maxHp).toBe(baseHpL1 + 5 + 6);
    expect(heroL2.effectiveVitals.armor).toBe(baseArmorL1 + 1);
  });
});

