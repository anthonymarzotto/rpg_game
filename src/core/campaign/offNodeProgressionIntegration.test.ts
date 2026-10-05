import { describe, it, expect } from 'vitest';
import { createCampaign } from './campaignFactory';
import {
  allocateCampArchetypePoint,
  updateCampUnitLoadout,
  setCampActiveSquad
} from './transitions';
import {
  isOffNodeCoordinate,
  isTriCentroidCoordinate,
  getAvailableAttunements,
  getEligibleDomainUnlocks,
  ASTRAL_AUGMENT_SHARDS
} from '../progression/harmonization';
import { resolveUnitLoadout } from '../units/loadout';
import { getHeroDisplayTitle } from '../../ui/camp/heroUtils';
import { getClassPackage, getAbilityById, getPassiveById } from '../../data/packages';
import { createRadialArena } from '../grid/templates';
import { createRecruit } from '../units/unitFactory';
import { createCombatState, executeAbility } from '../combat/resolver';
import { canExecuteAbility } from '../combat/validator';
import { MockDiceRoller } from '../combat/dice';
import { hexDistance } from '../grid/hex';

describe('Off-Node Progression Integration: Centroid Path & Slot Augments', () => {
  it('advances a recruit along the Bard centroid path (L1 Warrior -> L2 Off-Node -> L3 Off-Node), unlocks domain skills, sockets shards, and executes in combat', () => {
    // -------------------------------------------------------------
    // Step 0: Initial Camp Setup with Level 0 Recruit
    // -------------------------------------------------------------
    let campaign = createCampaign({ seed: 42 });
    let hero = campaign.roster[0];
    expect(hero.progression.currentLevel).toBe(0);
    expect(hero.progression.archetypePoints).toEqual({ fighter: 0, rogue: 0, mage: 0 });
    expect(getHeroDisplayTitle(hero)).toBe('Novice');

    // -------------------------------------------------------------
    // Step 1: Advance to Level 1 — Standard Class Node (1, 0, 0) -> Warrior
    // -------------------------------------------------------------
    // Bank 5 Fighter XP (threshold for Level 1)
    hero = {
      ...hero,
      progression: {
        ...hero.progression,
        accumulatedXp: { fighter: 5, rogue: 0, mage: 0 }
      }
    };
    campaign = {
      ...campaign,
      roster: campaign.roster.map((u) => (u.id === hero.id ? hero : u))
    };

    campaign = allocateCampArchetypePoint(campaign, hero.id, 'FIGHTER');
    hero = campaign.roster.find((u) => u.id === hero.id)!;

    expect(hero.progression.currentLevel).toBe(1);
    expect(hero.progression.archetypePoints).toEqual({ fighter: 1, rogue: 0, mage: 0 });
    expect(hero.progression.constellation).toContain('warrior');
    expect(isOffNodeCoordinate(hero.progression.archetypePoints)).toBe(false);
    expect(hero.progression.offNodeMilestones ?? []).toHaveLength(0);

    // Equip Warrior as active class
    campaign = updateCampUnitLoadout(campaign, hero.id, {
      ...hero.loadout,
      activeClassId: 'warrior'
    });
    hero = campaign.roster.find((u) => u.id === hero.id)!;
    expect(getHeroDisplayTitle(hero)).toBe('Warrior');

    const vitalsL1 = { ...hero.effectiveVitals };

    // -------------------------------------------------------------
    // Step 2: Advance to Level 2 — Off-Node Milestone (1, 1, 0)
    // -------------------------------------------------------------
    // Bank 10 Rogue XP (threshold for Level 2)
    hero = {
      ...hero,
      progression: {
        ...hero.progression,
        accumulatedXp: { fighter: 0, rogue: 10, mage: 0 }
      }
    };
    campaign = {
      ...campaign,
      roster: campaign.roster.map((u) => (u.id === hero.id ? hero : u))
    };

    const targetPointsL2 = { fighter: 1, rogue: 1, mage: 0 };
    expect(isOffNodeCoordinate(targetPointsL2)).toBe(true);
    expect(isTriCentroidCoordinate(targetPointsL2)).toBe(false);

    // Verify eligible Wayfarer Attunements (Fighter & Rogue adjacent)
    const availableAttunementsL2 = getAvailableAttunements(targetPointsL2);
    const attunementIdsL2 = availableAttunementsL2.map((a) => a.id);
    expect(attunementIdsL2).toContain('wayfarer_bastion');
    expect(attunementIdsL2).toContain('wayfarer_stride');
    expect(attunementIdsL2).toContain('wayfarer_ward');
    expect(attunementIdsL2).not.toContain('wayfarer_zenith');

    // Verify eligible domain unlocks at target Level 2
    const eligibleDomainUnlocksL2 = getEligibleDomainUnlocks(hero, 'ROGUE', 2);
    expect(eligibleDomainUnlocksL2.map((a) => a.id)).toContain('toxic_shiv');

    // Player chooses Wayfarer's Stride (+2 Speed, +2 Evasion) and Toxic Shiv domain draft
    campaign = allocateCampArchetypePoint(campaign, hero.id, 'ROGUE', {
      attunementId: 'wayfarer_stride',
      unlockedAbilityId: 'toxic_shiv'
    });
    hero = campaign.roster.find((u) => u.id === hero.id)!;

    expect(hero.progression.currentLevel).toBe(2);
    expect(hero.progression.archetypePoints).toEqual({ fighter: 1, rogue: 1, mage: 0 });
    expect(hero.progression.offNodeMilestones).toContain('1,1,0');
    expect(hero.progression.earnedAttunements).toContain('wayfarer_stride');
    expect(hero.progression.unlockedAbilityIds).toContain('toxic_shiv');

    // Vitals verification: Wayfarer's Stride adds +2 Speed and +2 Evasion
    // Note: Finesse attribute increased by 1 (+2 speed, +1 evasion from scaling), plus Stride (+2 speed, +2 evasion) = +4 speed, +3 evasion total
    expect(hero.effectiveVitals.speed).toBe(vitalsL1.speed + 4);
    expect(hero.effectiveVitals.evasion).toBe(vitalsL1.evasion + 3);
    expect(getHeroDisplayTitle(hero)).toBe('Warrior • Wayfarer I');

    const vitalsL2 = { ...hero.effectiveVitals };

    // -------------------------------------------------------------
    // Step 3: Advance to Level 3 — Tri-Centroid Milestone (1, 1, 1) [Bard Centroid]
    // -------------------------------------------------------------
    // Bank 15 Mage XP (threshold for Level 3)
    hero = {
      ...hero,
      progression: {
        ...hero.progression,
        accumulatedXp: { fighter: 0, rogue: 0, mage: 15 }
      }
    };
    campaign = {
      ...campaign,
      roster: campaign.roster.map((u) => (u.id === hero.id ? hero : u))
    };

    const targetPointsL3 = { fighter: 1, rogue: 1, mage: 1 };
    expect(isOffNodeCoordinate(targetPointsL3)).toBe(true);
    expect(isTriCentroidCoordinate(targetPointsL3)).toBe(true);

    // Tri-Centroid unlocks all 4 Wayfarer Attunements, including Wayfarer's Zenith
    const availableAttunementsL3 = getAvailableAttunements(targetPointsL3);
    expect(availableAttunementsL3.map((a) => a.id)).toEqual([
      'wayfarer_bastion',
      'wayfarer_stride',
      'wayfarer_ward',
      'wayfarer_zenith'
    ]);

    // Player chooses Wayfarer's Zenith (+4 HP, +1 Armor, +1 Ward, +1 Speed, +1 Evasion, +1 Resolve) and Astral Reach shard
    campaign = allocateCampArchetypePoint(campaign, hero.id, 'MAGE', {
      attunementId: 'wayfarer_zenith',
      earnedShardId: 'astral_reach'
    });
    hero = campaign.roster.find((u) => u.id === hero.id)!;

    expect(hero.progression.currentLevel).toBe(3);
    expect(hero.progression.archetypePoints).toEqual({ fighter: 1, rogue: 1, mage: 1 });
    expect(hero.progression.offNodeMilestones).toContain('1,1,1');
    expect(hero.progression.earnedAttunements).toContain('wayfarer_zenith');
    expect(hero.loadout.earnedShards).toContain('astral_reach');

    // Vitals verification: Wayfarer's Zenith adds +4 HP, +1 Armor, +1 Ward, +1 Speed, +1 Evasion, +1 Resolve
    // Base level up adds +5 HP. Mage point adds +1 Focus (+1 Ward, +1 Resolve)
    expect(hero.effectiveVitals.maxHp).toBe(vitalsL2.maxHp + 5 + 4);
    expect(hero.effectiveVitals.armor).toBe(vitalsL2.armor + 1);
    expect(hero.effectiveVitals.ward).toBe(vitalsL2.ward + 2);
    expect(hero.effectiveVitals.speed).toBe(vitalsL2.speed + 1);
    expect(hero.effectiveVitals.evasion).toBe(vitalsL2.evasion + 1);
    expect(hero.effectiveVitals.resolve).toBe(vitalsL2.resolve + 2);
    expect(getHeroDisplayTitle(hero)).toBe('Warrior • Wayfarer II');

    // -------------------------------------------------------------
    // Step 4: Configure Loadout with Unlocked Domain Skill & Slot Augment
    // -------------------------------------------------------------
    // Equip unlocked Toxic Shiv into Resonant Ability I (slot 3)
    // Socket Astral Reach shard (+1 Range) into slot 3
    campaign = updateCampUnitLoadout(campaign, hero.id, {
      ...hero.loadout,
      wildcardAbilityIds: ['toxic_shiv'],
      slotAugments: {
        3: ['astral_reach']
      }
    });
    hero = campaign.roster.find((u) => u.id === hero.id)!;

    // Verify resolved loadout properties
    const resolvedLoadout = resolveUnitLoadout(hero, {
      getPackage: getClassPackage,
      getAbility: getAbilityById,
      getPassive: getPassiveById
    });
    const resolvedShiv = resolvedLoadout.wildcardAbilities[0];
    expect(resolvedShiv).toBeDefined();
    expect(resolvedShiv.name).toBe('Toxic Shiv');
    // Base range of Toxic Shiv is 1, with Astral Reach it becomes 2!
    expect(resolvedShiv.range).toBe(2);
    expect(resolvedShiv.attributions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'range',
          changeLabel: '+1 Range',
          sourceName: 'Astral Reach'
        })
      ])
    );

    // -------------------------------------------------------------
    // Step 5: Combat Execution & In-Battle Modifier Validation
    // -------------------------------------------------------------
    const arena = createRadialArena(4);
    const enemyDummy = createRecruit('dummy_enemy', 'Target Dummy', {
      faction: 'ENEMY'
    });

    // Place Hero at (0, 0) and Enemy Dummy at (2, 0)
    arena.setUnitPosition(hero.id, { q: 0, r: 0 });
    arena.setUnitPosition(enemyDummy.id, { q: 2, r: 0 });

    const dist = hexDistance({ q: 0, r: 0 }, { q: 2, r: 0 });
    expect(dist).toBe(2);

    const combatState = createCombatState(arena, [hero, enemyDummy], hero.id);
    const actorCu = combatState.units.get(hero.id)!;
    actorCu.currentAp = hero.effectiveVitals.maxAp;

    expect(actorCu.currentAp).toBe(3);

    // Locate resolved Toxic Shiv in combat unit abilities
    const combatShiv = actorCu.abilities.find((a) => a.id === 'toxic_shiv')!;
    expect(combatShiv).toBeDefined();
    expect(combatShiv.range).toBe(2);

    // Validate that Toxic Shiv can execute at distance 2
    const validResult = canExecuteAbility(combatState, hero.id, combatShiv, {
      targetUnitId: enemyDummy.id
    });
    expect(validResult.valid).toBe(true);

    // Execute Toxic Shiv attack at distance 2
    const dice = new MockDiceRoller({ d20Rolls: [18], damageRolls: [4] });
    const attackResult = executeAbility(
      combatState,
      hero.id,
      combatShiv,
      { targetUnitId: enemyDummy.id },
      dice
    );

    expect(attackResult.type).toBe('ATTACK');
    if (attackResult.type === 'ATTACK') {
      expect(attackResult.details.hitOutcome).toBe('SOLID_HIT');
      expect(attackResult.details.damageDealt).toBeGreaterThan(0);
    }

    // Verify AP cost deduction: 3 AP - 1 AP = 2 AP remaining
    expect(actorCu.currentAp).toBe(2);

    // Verify condition application: Enemy has POISON condition from Toxic Shiv
    const targetCu = combatState.units.get(enemyDummy.id)!;
    expect(targetCu.activeConditions.some((c) => c.type === 'POISON')).toBe(true);
  });
});
