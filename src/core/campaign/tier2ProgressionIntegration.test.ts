import { describe, it, expect } from 'vitest';
import { createCampaign } from './campaignFactory';
import {
  resolveCampaignVictory,
  allocateCampArchetypePoint,
  updateCampUnitLoadout
} from './transitions';
import { buildEncounterState } from '../combat/encounter';
import { executeAbility, executeMove } from '../combat/resolver';
import {
  LEAD_THE_CHARGE,
  SPELL_SCULPT,
  IGNITE
} from '../../data/packages';
import { getEffectiveEvasion, getEffectiveMove } from '../combat/effectiveVitals';
import { MockDiceRoller } from '../combat/dice';

describe('Task Group 5: Tier 2 Progression & End-to-End Combat Integration Flow', () => {
  it('Task 5.2: Level 0 recruits advance to Level 2 Knight, Infiltrator, and Sorcerer in Camp, equip Tier 2 active/wildcard loadouts, and execute combat trials', () => {
    // 1. Initialize campaign with 3 Level 0 Novice recruits
    let campaign = createCampaign({ seed: 42, name: 'Order of the Radiant Dawn' });
    expect(campaign.roster).toHaveLength(3);
    const [recA, recB, recC] = campaign.roster;

    expect(recA.progression.currentLevel).toBe(0);
    expect(recB.progression.currentLevel).toBe(0);
    expect(recC.progression.currentLevel).toBe(0);

    // 2. Simulate Stage 1 & Stage 2 victories granting sufficient archetype XP:
    // Need 5 XP for Level 1, and 10 XP for Level 2 = 15 total archetype XP per hero
    const victory1 = {
      encounterId: 'stage-1',
      encounterName: 'Trial of the Novice',
      outcome: 'VICTORY' as const,
      unitXpGains: {
        [recA.id]: { fighter: 15, rogue: 0, mage: 0 },
        [recB.id]: { fighter: 0, rogue: 15, mage: 0 },
        [recC.id]: { fighter: 0, rogue: 0, mage: 15 }
      }
    };
    campaign = resolveCampaignVictory(campaign, victory1);

    // 3. Camp Progression Phase: Promote each recruit to Level 1 then Level 2
    // Hero A: Novice -> Warrior (1,0,0) -> Knight (2,0,0)
    campaign = allocateCampArchetypePoint(campaign, recA.id, 'FIGHTER');
    campaign = allocateCampArchetypePoint(campaign, recA.id, 'FIGHTER');

    // Hero B: Novice -> Thief (0,1,0) -> Infiltrator (0,2,0)
    campaign = allocateCampArchetypePoint(campaign, recB.id, 'ROGUE');
    campaign = allocateCampArchetypePoint(campaign, recB.id, 'ROGUE');

    // Hero C: Novice -> Wizard (0,0,1) -> Sorcerer (0,0,2)
    campaign = allocateCampArchetypePoint(campaign, recC.id, 'MAGE');
    campaign = allocateCampArchetypePoint(campaign, recC.id, 'MAGE');

    const knightHero = campaign.roster.find((u) => u.id === recA.id)!;
    const infiltratorHero = campaign.roster.find((u) => u.id === recB.id)!;
    const sorcererHero = campaign.roster.find((u) => u.id === recC.id)!;

    // Verify constellations and levels
    expect(knightHero.progression.currentLevel).toBe(2);
    expect(knightHero.progression.constellation).toContain('knight');
    expect(knightHero.progression.constellation).toContain('warrior');

    expect(infiltratorHero.progression.currentLevel).toBe(2);
    expect(infiltratorHero.progression.constellation).toContain('infiltrator');
    expect(infiltratorHero.progression.constellation).toContain('thief');

    expect(sorcererHero.progression.currentLevel).toBe(2);
    expect(sorcererHero.progression.constellation).toContain('sorcerer');
    expect(sorcererHero.progression.constellation).toContain('wizard');

    // 4. Update Loadouts with Tier 2 Active Classes and cross-discipline wildcards
    // Knight equips Warrior's Cleave as wildcard ability and Momentum as wildcard passive
    campaign = updateCampUnitLoadout(campaign, recA.id, {
      activeClassId: 'knight',
      wildcardAbilityIds: ['cleave'],
      wildcardPassiveIds: ['momentum']
    });

    // Infiltrator equips Thief's Sneak Attack as wildcard ability and Quickstep as wildcard passive
    campaign = updateCampUnitLoadout(campaign, recB.id, {
      activeClassId: 'infiltrator',
      wildcardAbilityIds: ['sneak_attack'],
      wildcardPassiveIds: ['quickstep']
    });

    // Sorcerer equips Wizard's Arcane Blast as wildcard ability and Arcane Aegis as wildcard passive
    campaign = updateCampUnitLoadout(campaign, recC.id, {
      activeClassId: 'sorcerer',
      wildcardAbilityIds: ['arcane_blast'],
      wildcardPassiveIds: ['arcane_aegis']
    });

    const readyKnight = campaign.roster.find((u) => u.id === recA.id)!;
    const readyInf = campaign.roster.find((u) => u.id === recB.id)!;
    const readySorc = campaign.roster.find((u) => u.id === recC.id)!;

    expect(readyKnight.loadout.activeClassId).toBe('knight');
    expect(readyInf.loadout.activeClassId).toBe('infiltrator');
    expect(readySorc.loadout.activeClassId).toBe('sorcerer');

    // 5. Execute Combat Trial: deploy Tier 2 squad into an encounter
    const testEncounter = {
      id: 'trial_tier2_encounter',
      name: 'Trial of the High Ascendants',
      arenaRadius: 3,
      units: [
        { unit: readyKnight, coord: { q: 0, r: 0 } },
        { unit: readyInf, coord: { q: 1, r: 0 } },
        { unit: readySorc, coord: { q: 0, r: 1 } },
        {
          unit: {
            ...readyKnight,
            id: 'training_dummy',
            name: 'Training Colossus',
            faction: 'ENEMY' as const,
            currentHp: 100
          },
          coord: { q: 2, r: 0 }
        }
      ]
    };

    const combatState = buildEncounterState(testEncounter);
    expect(combatState.outcome).toBe('IN_PROGRESS');

    const knightCu = combatState.units.get(recA.id)!;
    const infCu = combatState.units.get(recB.id)!;
    const sorcCu = combatState.units.get(recC.id)!;

    // A. Tactical Vanguard Pre-Encounter Setup: Knight has innate +25 initiative
    expect(knightCu.initiativeGauge).toBeGreaterThanOrEqual(25);

    // B. Elusive Stride on Infiltrator: moving grants +2 Evasion
    combatState.activeUnitId = recB.id;
    infCu.currentAp = 3;
    const prevEvasion = getEffectiveEvasion(infCu);
    executeMove(combatState, recB.id, { q: 1, r: -1 });
    expect(getEffectiveEvasion(infCu)).toBe(prevEvasion + 2);

    // C. Lead the Charge on Knight: friendly AoE aura gives +2 Move and +2 Speed to all allies within 3 hexes
    combatState.activeUnitId = recA.id;
    knightCu.currentAp = 3;
    const prevKnightMove = getEffectiveMove(knightCu);
    const prevSorcMove = getEffectiveMove(sorcCu);
    executeAbility(combatState, recA.id, LEAD_THE_CHARGE, { coord: { q: 0, r: 0 } });
    expect(getEffectiveMove(knightCu)).toBe(prevKnightMove + 2);
    expect(getEffectiveMove(sorcCu)).toBe(prevSorcMove + 2);

    // D. Spell Sculpt & Wild Surge on Sorcerer:
    combatState.activeUnitId = recC.id;
    sorcCu.currentAp = 3;
    // Activate Spell Sculpt
    executeAbility(combatState, recC.id, SPELL_SCULPT);
    expect(sorcCu.pendingAbilityModifier).toBeDefined();
    expect(sorcCu.pendingAbilityModifier?.extraRange).toBe(1);
    expect(sorcCu.pendingAbilityModifier?.extraAoeRadius).toBe(1);

    // Cast Ignite with Spell Sculpt primed:
    // Rolled Crit (20), 4 damage, 1d3 Wild Surge roll 1 (+1 AP refund)
    const dice = new MockDiceRoller({ d20Rolls: [20], damageRolls: [4, 1] });
    executeAbility(combatState, recC.id, IGNITE, { targetUnitId: 'training_dummy' }, dice);

    // Modifier was consumed
    expect(sorcCu.pendingAbilityModifier).toBeUndefined();
    // Wild surge refunded 1 AP (initial 2 AP, cost 1, refunded 1 -> 2 AP)
    expect(sorcCu.currentAp).toBe(2);

    // Dummy has BURN condition applied with Sorcerer as sourceUnitId
    const dummyCu = combatState.units.get('training_dummy')!;
    const burnCondition = dummyCu.activeConditions.find((c) => c.type === 'BURN');
    expect(burnCondition).toBeDefined();
    expect(burnCondition?.sourceUnitId).toBe(recC.id);
  });
});
