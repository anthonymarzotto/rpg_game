import { describe, it, expect } from 'vitest';
import {
  isOffNodeCoordinate,
  isTriCentroidCoordinate,
  getAvailableAttunements,
  applyWayfarerAttunement,
  ASTRAL_AUGMENT_SHARDS,
  ALL_ASTRAL_SHARDS,
  evaluateShardCompatibility,
  getShardById,
  getEligibleDomainUnlocks,
  AstralShardId
} from './harmonization';
import { getEffectiveAbility } from '../combat/modifiers';
import {
  STRIKE,
  SNEAK_ATTACK,
  SHADOW_STEP,
  MINOR_WARD,
  ARCANE_BLAST,
  SMOKE_VEIL,
  EXPOSE_WEAKNESS,
  LEAD_THE_CHARGE,
  WYRMFLAME_BREATH,
  SIEGE_BARRAGE,
  SHRAPNEL_CANISTER,
  SIGHTING_BOLT,
  FLASH_POWDER
} from '../../data/packages';
import { RECRUIT_BASE_VITALS } from '../config/balance';
import { DerivedCombatVitals } from '../types/stats';
import { Unit } from '../types/unit';

describe('harmonization domain engine', () => {
  const dummyVitals: DerivedCombatVitals = {
    maxHp: RECRUIT_BASE_VITALS.hp,
    maxAp: 3,
    speed: RECRUIT_BASE_VITALS.speed,
    move: RECRUIT_BASE_VITALS.move,
    evasion: RECRUIT_BASE_VITALS.evasion,
    resolve: RECRUIT_BASE_VITALS.resolve,
    armor: 0,
    ward: 0
  };

  describe('isOffNodeCoordinate', () => {
    it('returns false for Level 0 Novice', () => {
      expect(isOffNodeCoordinate({ fighter: 0, rogue: 0, mage: 0 })).toBe(false);
    });

    it('returns false for canonical Tier 1 and Tier 2 class coordinates', () => {
      expect(isOffNodeCoordinate({ fighter: 1, rogue: 0, mage: 0 })).toBe(false); // Warrior
      expect(isOffNodeCoordinate({ fighter: 0, rogue: 1, mage: 0 })).toBe(false); // Thief
      expect(isOffNodeCoordinate({ fighter: 0, rogue: 0, mage: 1 })).toBe(false); // Wizard
      expect(isOffNodeCoordinate({ fighter: 2, rogue: 0, mage: 0 })).toBe(false); // Knight
      expect(isOffNodeCoordinate({ fighter: 0, rogue: 2, mage: 0 })).toBe(false); // Infiltrator
      expect(isOffNodeCoordinate({ fighter: 0, rogue: 0, mage: 2 })).toBe(false); // Sorcerer
    });

    it('returns true for off-node coordinates without catalog classes', () => {
      expect(isOffNodeCoordinate({ fighter: 1, rogue: 1, mage: 0 })).toBe(true);
      expect(isOffNodeCoordinate({ fighter: 1, rogue: 0, mage: 1 })).toBe(true);
      expect(isOffNodeCoordinate({ fighter: 0, rogue: 1, mage: 1 })).toBe(true);
      expect(isOffNodeCoordinate({ fighter: 1, rogue: 1, mage: 1 })).toBe(true);
    });
  });

  describe('isTriCentroidCoordinate', () => {
    it('returns false when any archetype is 0', () => {
      expect(isTriCentroidCoordinate({ fighter: 1, rogue: 1, mage: 0 })).toBe(false);
      expect(isTriCentroidCoordinate({ fighter: 2, rogue: 0, mage: 1 })).toBe(false);
    });

    it('returns true when all three archetypes are positive', () => {
      expect(isTriCentroidCoordinate({ fighter: 1, rogue: 1, mage: 1 })).toBe(true);
      expect(isTriCentroidCoordinate({ fighter: 2, rogue: 2, mage: 2 })).toBe(true);
    });
  });

  describe('getAvailableAttunements', () => {
    it('returns 3 standard triad attunements for standard hybrid off-nodes', () => {
      const attunements = getAvailableAttunements({ fighter: 1, rogue: 1, mage: 0 });
      expect(attunements).toHaveLength(3);
      expect(attunements.map((a) => a.id)).toEqual([
        'wayfarer_bastion',
        'wayfarer_stride',
        'wayfarer_ward'
      ]);
    });

    it('includes Wayfarer Zenith for tri-centroid off-nodes', () => {
      const attunements = getAvailableAttunements({ fighter: 1, rogue: 1, mage: 1 });
      expect(attunements).toHaveLength(4);
      expect(attunements.map((a) => a.id)).toContain('wayfarer_zenith');
    });
  });

  describe('applyWayfarerAttunement', () => {
    it('applies Wayfarer Bastion (+6 Max HP, +1 Armor)', () => {
      const updated = applyWayfarerAttunement(dummyVitals, 'wayfarer_bastion');
      expect(updated.maxHp).toBe(dummyVitals.maxHp + 6);
      expect(updated.armor).toBe(dummyVitals.armor + 1);
      expect(updated.evasion).toBe(dummyVitals.evasion);
      expect(updated.speed).toBe(dummyVitals.speed);
    });

    it('applies Wayfarer Stride (+2 Evasion, +2 Speed)', () => {
      const updated = applyWayfarerAttunement(dummyVitals, 'wayfarer_stride');
      expect(updated.evasion).toBe(dummyVitals.evasion + 2);
      expect(updated.speed).toBe(dummyVitals.speed + 2);
      expect(updated.armor).toBe(dummyVitals.armor);
      expect(updated.maxHp).toBe(dummyVitals.maxHp);
    });

    it('applies Wayfarer Ward (+2 Resolve, +1 Ward)', () => {
      const updated = applyWayfarerAttunement(dummyVitals, 'wayfarer_ward');
      expect(updated.resolve).toBe(dummyVitals.resolve + 2);
      expect(updated.ward).toBe(dummyVitals.ward + 1);
      expect(updated.armor).toBe(dummyVitals.armor);
      expect(updated.speed).toBe(dummyVitals.speed);
    });

    it('applies Wayfarer Zenith (+4 Max HP, +1 to all secondary defenses)', () => {
      const updated = applyWayfarerAttunement(dummyVitals, 'wayfarer_zenith');
      expect(updated.maxHp).toBe(dummyVitals.maxHp + 4);
      expect(updated.armor).toBe(dummyVitals.armor + 1);
      expect(updated.ward).toBe(dummyVitals.ward + 1);
      expect(updated.speed).toBe(dummyVitals.speed + 1);
      expect(updated.evasion).toBe(dummyVitals.evasion + 1);
      expect(updated.resolve).toBe(dummyVitals.resolve + 1);
    });
  });

  describe('ASTRAL_AUGMENT_SHARDS', () => {
    it('registers all 33 canonical shards with expected categories and modifiers', () => {
      const shardIds: AstralShardId[] = [
        'starlight_lens',
        'force_shard',
        'keen_shard',
        'astral_reach',
        'supernova_flare',
        'recoil_shard',
        'impact_shard',
        'venom_shard',
        'pyre_shard',
        'static_shard',
        'mire_shard',
        'vanguard_shard',
        'shadow_shard',
        'confrontation_shard',
        'aegis_shard',
        'warding_shard',
        'aether_shard',
        // Cavalier shards
        'trample_shard',
        'flourish_shard',
        'momentum_shard',
        // Berserker shards
        'cleave_shard',
        'bloodbound_shard',
        'fury_shard',
        // Warlock shards
        'carapace_shard',
        'repelling_shard',
        'hex_shard',
        // Highwayman shards
        'toll_shard',
        'buckshot_shard',
        'holdup_shard',
        // Shield-bearer shards
        'bastion_shard',
        'interchange_shard',
        'concussion_shard',
        'anchorite_shard'
      ];
      expect(shardIds).toHaveLength(33);
      for (const id of shardIds) {
        const shard = getShardById(id);
        expect(shard).toBeDefined();
        expect(shard?.modifier.isPermanent).toBe(true);
      }
    });

    it('verifies Starlight Lens has diceStep patch', () => {
      const shard = ASTRAL_AUGMENT_SHARDS.starlight_lens;
      expect(shard.modifier.effectPatches?.diceStep).toBe(1);
    });

    it('verifies Force Shard has flatDamage patch', () => {
      const shard = ASTRAL_AUGMENT_SHARDS.force_shard;
      expect(shard.modifier.effectPatches?.flatDamage).toBe(2);
    });

    it('verifies Keen Shard has CRIT_BOOST effect', () => {
      const shard = ASTRAL_AUGMENT_SHARDS.keen_shard;
      expect(shard.modifier.appendEffects?.[0].type).toBe('CRIT_BOOST');
    });

    it('verifies Astral Reach has +1 range delta', () => {
      const shard = ASTRAL_AUGMENT_SHARDS.astral_reach;
      expect(shard.modifier.deltas?.range).toBe(1);
    });

    it('verifies Impact Shard has knockback appended effect', () => {
      const shard = ASTRAL_AUGMENT_SHARDS.impact_shard;
      expect(shard.modifier.appendEffects?.[0].type).toBe('KNOCKBACK');
    });

    it('verifies Pyre Shard has BURN condition', () => {
      const shard = ASTRAL_AUGMENT_SHARDS.pyre_shard;
      expect(shard.modifier.appendEffects?.[0].conditionType).toBe('BURN');
      expect(shard.modifier.appendEffects?.[0].durationTurns).toBe(2);
    });

    it('verifies Aether Shard overrides damageType to MAGICAL and defenseTarget to RESOLVE', () => {
      const shard = ASTRAL_AUGMENT_SHARDS.aether_shard;
      expect(shard.modifier.overrides?.damageType).toBe('MAGICAL');
      expect(shard.modifier.overrides?.defenseTarget).toBe('RESOLVE');
    });

    it('verifies Trample Shard (Cavalier) has PENETRATE_STEP effect', () => {
      const shard = ASTRAL_AUGMENT_SHARDS.trample_shard;
      expect(shard.category).toBe('GEOMETRY');
      expect(shard.modifier.appendEffects?.[0].type).toBe('PENETRATE_STEP');
      expect(shard.modifier.appendEffects?.[0].applyOn).toBe('HIT_OR_CRIT');
    });

    it('verifies Flourish Shard (Cavalier) has self Evasion buff', () => {
      const shard = ASTRAL_AUGMENT_SHARDS.flourish_shard;
      expect(shard.category).toBe('INFUSION');
      expect(shard.modifier.appendEffects?.[0].type).toBe('STAT_MODIFIER');
      expect(shard.modifier.appendEffects?.[0].targetScope).toBe('SELF');
      expect(shard.modifier.appendEffects?.[0].statModifiers?.evasion).toBe(2);
      expect(shard.modifier.appendEffects?.[0].durationTurns).toBe(1);
    });

    it('verifies Momentum Shard (Cavalier) has attackRoll delta and flatDamage patch', () => {
      const shard = ASTRAL_AUGMENT_SHARDS.momentum_shard;
      expect(shard.category).toBe('POWER');
      expect(shard.modifier.deltas?.attackRoll).toBe(2);
      expect(shard.modifier.effectPatches?.flatDamage).toBe(1);
    });

    it('verifies Cleave Shard (Berserker) has CLEAVE effect', () => {
      const shard = ASTRAL_AUGMENT_SHARDS.cleave_shard;
      expect(shard.category).toBe('GEOMETRY');
      expect(shard.modifier.appendEffects?.[0].type).toBe('CLEAVE');
      expect(shard.modifier.appendEffects?.[0].magnitude).toBe(1);
    });

    it('verifies Bloodbound Shard (Berserker) has hpCost delta, diceStep, and flatDamage patches', () => {
      const shard = ASTRAL_AUGMENT_SHARDS.bloodbound_shard;
      expect(shard.category).toBe('POWER');
      expect(shard.modifier.deltas?.hpCost).toBe(2);
      expect(shard.modifier.effectPatches?.diceStep).toBe(1);
      expect(shard.modifier.effectPatches?.flatDamage).toBe(2);
    });

    it('verifies Fury Shard (Berserker) has diceCount patch and self Evasion penalty', () => {
      const shard = ASTRAL_AUGMENT_SHARDS.fury_shard;
      expect(shard.category).toBe('POWER');
      expect(shard.modifier.effectPatches?.diceCount).toBe(1);
      expect(shard.modifier.appendEffects?.[0].type).toBe('STAT_MODIFIER');
      expect(shard.modifier.appendEffects?.[0].targetScope).toBe('SELF');
      expect(shard.modifier.appendEffects?.[0].statModifiers?.evasion).toBe(-2);
    });

    it('verifies Carapace Shard (Warlock) has self Armor and Ward buffs', () => {
      const shard = ASTRAL_AUGMENT_SHARDS.carapace_shard;
      expect(shard.category).toBe('INFUSION');
      expect(shard.modifier.appendEffects?.[0].type).toBe('STAT_MODIFIER');
      expect(shard.modifier.appendEffects?.[0].targetScope).toBe('SELF');
      expect(shard.modifier.appendEffects?.[0].statModifiers?.armor).toBe(1);
      expect(shard.modifier.appendEffects?.[0].statModifiers?.ward).toBe(1);
    });

    it('verifies Repelling Shard (Warlock) has KNOCKBACK and CTB_DELAY effects', () => {
      const shard = ASTRAL_AUGMENT_SHARDS.repelling_shard;
      expect(shard.category).toBe('INFUSION');
      expect(shard.modifier.appendEffects?.[0].type).toBe('KNOCKBACK');
      expect(shard.modifier.appendEffects?.[1].type).toBe('CTB_DELAY');
      expect(shard.modifier.appendEffects?.[1].magnitude).toBe(15);
    });

    it('verifies Hex Shard (Warlock) has target Ward and Resolve debuff', () => {
      const shard = ASTRAL_AUGMENT_SHARDS.hex_shard;
      expect(shard.category).toBe('INFUSION');
      expect(shard.modifier.appendEffects?.[0].type).toBe('STAT_MODIFIER');
      expect(shard.modifier.appendEffects?.[0].statModifiers?.ward).toBe(-2);
      expect(shard.modifier.appendEffects?.[0].statModifiers?.resolve).toBe(-1);
      expect(shard.modifier.appendEffects?.[0].durationTurns).toBe(2);
    });

    it('verifies socketing Bloodbound Shard and Momentum Shard modifies ability vitals correctly', () => {
      const effective = getEffectiveAbility(STRIKE, [
        ASTRAL_AUGMENT_SHARDS.bloodbound_shard.modifier,
        ASTRAL_AUGMENT_SHARDS.momentum_shard.modifier
      ]);
      expect(effective.hpCost).toBe(2);
      expect(effective.attackRollBonus).toBe(2);
      const dmgEffect = effective.effects.find((e) => e.type === 'DAMAGE');
      expect(dmgEffect).toBeDefined();
      expect(dmgEffect?.damageProfile?.sides).toBe(8);
      expect(dmgEffect?.flatDamage).toBe(3);
    });

    it('verifies Toll Shard (Highwayman) has target Armor debuff', () => {
      const shard = ASTRAL_AUGMENT_SHARDS.toll_shard;
      expect(shard.category).toBe('INFUSION');
      expect(shard.modifier.appendEffects?.[0].type).toBe('STAT_MODIFIER');
      expect(shard.modifier.appendEffects?.[0].statModifiers?.armor).toBe(-2);
      expect(shard.modifier.appendEffects?.[0].durationTurns).toBe(2);
    });

    it('verifies Buckshot Shard (Highwayman) has KNOCKBACK and RETREAT_STEP recoil effects', () => {
      const shard = ASTRAL_AUGMENT_SHARDS.buckshot_shard;
      expect(shard.category).toBe('GEOMETRY');
      expect(shard.modifier.appendEffects?.[0].type).toBe('KNOCKBACK');
      expect(shard.modifier.appendEffects?.[0].magnitude).toBe(1);
      expect(shard.modifier.appendEffects?.[1].type).toBe('RETREAT_STEP');
    });

    it('verifies Hold-Up Shard (Highwayman) has target CTB_DELAY and self INITIATIVE_BOOST tempo theft effects', () => {
      const shard = ASTRAL_AUGMENT_SHARDS.holdup_shard;
      expect(shard.category).toBe('INFUSION');
      expect(shard.modifier.appendEffects?.[0].type).toBe('CTB_DELAY');
      expect(shard.modifier.appendEffects?.[0].magnitude).toBe(15);
      expect(shard.modifier.appendEffects?.[1].type).toBe('INITIATIVE_BOOST');
      expect(shard.modifier.appendEffects?.[1].magnitude).toBe(10);
      expect(shard.modifier.appendEffects?.[1].targetScope).toBe('SELF');
    });

    it('verifies Bastion Shard (Shield-bearer) has ARMOR_BUFF and BASTION_STANCE effects', () => {
      const shard = ASTRAL_AUGMENT_SHARDS.bastion_shard;
      expect(shard.category).toBe('INFUSION');
      expect(shard.modifier.appendEffects?.[0].type).toBe('ARMOR_BUFF');
      expect(shard.modifier.appendEffects?.[0].magnitude).toBe(2);
      expect(shard.modifier.appendEffects?.[0].targetScope).toBe('SELF');
      expect(shard.modifier.appendEffects?.[1].type).toBe('BASTION_STANCE');
      expect(shard.modifier.appendEffects?.[1].targetScope).toBe('SELF');
    });

    it('verifies Interchange Shard (Shield-bearer) has POSITION_SWAP geometry effect', () => {
      const shard = ASTRAL_AUGMENT_SHARDS.interchange_shard;
      expect(shard.category).toBe('GEOMETRY');
      expect(shard.modifier.appendEffects?.[0].type).toBe('POSITION_SWAP');
      expect(shard.modifier.appendEffects?.[0].applyOn).toBe('HIT_OR_CRIT');
    });

    it('verifies Concussion Shard (Shield-bearer) inflicts Move -1 and Speed -2 statModifiers', () => {
      const shard = ASTRAL_AUGMENT_SHARDS.concussion_shard;
      expect(shard.category).toBe('INFUSION');
      expect(shard.modifier.appendEffects?.[0].type).toBe('STAT_MODIFIER');
      expect(shard.modifier.appendEffects?.[0].durationTurns).toBe(2);
      expect(shard.modifier.appendEffects?.[0].statModifiers?.move).toBe(-1);
      expect(shard.modifier.appendEffects?.[0].statModifiers?.speed).toBe(-2);
    });

    it('verifies Anchorite Shard (Shield-bearer) has displacementImmunity, armor, and resolve statModifiers', () => {
      const shard = ASTRAL_AUGMENT_SHARDS.anchorite_shard;
      expect(shard.category).toBe('POWER');
      expect(shard.modifier.appendEffects?.[0].type).toBe('STAT_MODIFIER');
      expect(shard.modifier.appendEffects?.[0].statModifiers?.displacementImmunity).toBe(1);
      expect(shard.modifier.appendEffects?.[0].statModifiers?.armor).toBe(1);
      expect(shard.modifier.appendEffects?.[0].statModifiers?.resolve).toBe(1);
      expect(shard.modifier.appendEffects?.[0].targetScope).toBe('SELF');
    });

    it('verifies Shadow Shard uses POST_ACTION timing on its self Stealth effect', () => {
      const shard = ASTRAL_AUGMENT_SHARDS.shadow_shard;
      expect(shard.compatibility).toBe('ANY');
      expect(shard.modifier.appendEffects?.[0].conditionType).toBe('STEALTH');
      expect(shard.modifier.appendEffects?.[0].targetScope).toBe('SELF');
      expect(shard.modifier.appendEffects?.[0].timing).toBe('POST_ACTION');
    });

    it('evaluates compatibility accurately across all 33 shards and representative ability families', () => {
      // Every registered shard has an explicit compatibility preset
      expect(ALL_ASTRAL_SHARDS).toHaveLength(33);
      for (const shard of ALL_ASTRAL_SHARDS) {
        expect(shard.compatibility).toBeDefined();
      }

      // 1. Damage scaling & hit self-buffs require damaging attacks
      for (const id of [
        'starlight_lens',
        'force_shard',
        'keen_shard',
        'momentum_shard',
        'bloodbound_shard',
        'fury_shard',
        'aegis_shard',
        'warding_shard',
        'flourish_shard',
        'carapace_shard'
      ] as const) {
        const shard = ASTRAL_AUGMENT_SHARDS[id];
        expect(evaluateShardCompatibility(shard, SNEAK_ATTACK).compatible).toBe(true);
        expect(evaluateShardCompatibility(shard, ARCANE_BLAST).compatible).toBe(true);
        expect(evaluateShardCompatibility(shard, SIEGE_BARRAGE).compatible).toBe(true);
        expect(evaluateShardCompatibility(shard, WYRMFLAME_BREATH).compatible).toBe(true);
        expect(evaluateShardCompatibility(shard, MINOR_WARD).compatible).toBe(false);
        expect(evaluateShardCompatibility(shard, SMOKE_VEIL).compatible).toBe(false);
        expect(evaluateShardCompatibility(shard, SHADOW_STEP).compatible).toBe(false);
        expect(evaluateShardCompatibility(shard, EXPOSE_WEAKNESS).compatible).toBe(false);
        expect(evaluateShardCompatibility(shard, SHRAPNEL_CANISTER).compatible).toBe(false);
      }

      // 2. Aether Shard requires physical damaging attack
      expect(evaluateShardCompatibility(ASTRAL_AUGMENT_SHARDS.aether_shard, SNEAK_ATTACK).compatible).toBe(true);
      expect(evaluateShardCompatibility(ASTRAL_AUGMENT_SHARDS.aether_shard, SIEGE_BARRAGE).compatible).toBe(true);
      expect(evaluateShardCompatibility(ASTRAL_AUGMENT_SHARDS.aether_shard, ARCANE_BLAST).compatible).toBe(false);
      expect(evaluateShardCompatibility(ASTRAL_AUGMENT_SHARDS.aether_shard, MINOR_WARD).compatible).toBe(false);

      // 3. Astral Reach requires range >= 1 and non-cone
      expect(evaluateShardCompatibility(ASTRAL_AUGMENT_SHARDS.astral_reach, SNEAK_ATTACK).compatible).toBe(true);
      expect(evaluateShardCompatibility(ASTRAL_AUGMENT_SHARDS.astral_reach, SHADOW_STEP).compatible).toBe(true);
      expect(evaluateShardCompatibility(ASTRAL_AUGMENT_SHARDS.astral_reach, MINOR_WARD).compatible).toBe(true);
      expect(evaluateShardCompatibility(ASTRAL_AUGMENT_SHARDS.astral_reach, SMOKE_VEIL).compatible).toBe(false);
      expect(evaluateShardCompatibility(ASTRAL_AUGMENT_SHARDS.astral_reach, WYRMFLAME_BREATH).compatible).toBe(false);

      // 4. Supernova Flare requires hostile AoE (damaging AoE attacks + hostile utility AoEs, excluding cones & friendly auras)
      expect(evaluateShardCompatibility(ASTRAL_AUGMENT_SHARDS.supernova_flare, ARCANE_BLAST).compatible).toBe(true);
      expect(evaluateShardCompatibility(ASTRAL_AUGMENT_SHARDS.supernova_flare, SIEGE_BARRAGE).compatible).toBe(true);
      expect(evaluateShardCompatibility(ASTRAL_AUGMENT_SHARDS.supernova_flare, FLASH_POWDER).compatible).toBe(true);
      expect(evaluateShardCompatibility(ASTRAL_AUGMENT_SHARDS.supernova_flare, SHRAPNEL_CANISTER).compatible).toBe(true);
      expect(evaluateShardCompatibility(ASTRAL_AUGMENT_SHARDS.supernova_flare, SNEAK_ATTACK).compatible).toBe(false);
      expect(evaluateShardCompatibility(ASTRAL_AUGMENT_SHARDS.supernova_flare, SHADOW_STEP).compatible).toBe(false);
      expect(evaluateShardCompatibility(ASTRAL_AUGMENT_SHARDS.supernova_flare, WYRMFLAME_BREATH).compatible).toBe(false);
      expect(evaluateShardCompatibility(ASTRAL_AUGMENT_SHARDS.supernova_flare, LEAD_THE_CHARGE).compatible).toBe(false);

      // 5. Hostile infusions require hostile target ability (blocking SELF, ALLY, TELEPORT, SHRAPNEL_RUBBLE)
      for (const id of [
        'impact_shard',
        'venom_shard',
        'pyre_shard',
        'static_shard',
        'mire_shard',
        'vanguard_shard',
        'confrontation_shard',
        'hex_shard',
        'toll_shard',
        'repelling_shard',
        'concussion_shard',
        'holdup_shard'
      ] as const) {
        const shard = ASTRAL_AUGMENT_SHARDS[id];
        expect(evaluateShardCompatibility(shard, SNEAK_ATTACK).compatible).toBe(true);
        expect(evaluateShardCompatibility(shard, ARCANE_BLAST).compatible).toBe(true);
        expect(evaluateShardCompatibility(shard, WYRMFLAME_BREATH).compatible).toBe(true);
        expect(evaluateShardCompatibility(shard, SIEGE_BARRAGE).compatible).toBe(true);
        expect(evaluateShardCompatibility(shard, EXPOSE_WEAKNESS).compatible).toBe(true);
        expect(evaluateShardCompatibility(shard, FLASH_POWDER).compatible).toBe(true);
        expect(evaluateShardCompatibility(shard, SMOKE_VEIL).compatible).toBe(false);
        expect(evaluateShardCompatibility(shard, MINOR_WARD).compatible).toBe(false);
        expect(evaluateShardCompatibility(shard, SHADOW_STEP).compatible).toBe(false);
        expect(evaluateShardCompatibility(shard, SHRAPNEL_CANISTER).compatible).toBe(false);
      }

      // 6. Melee geometry (Cleave, Trample) strictly melee single-target damaging attacks
      for (const id of ['cleave_shard', 'trample_shard'] as const) {
        const shard = ASTRAL_AUGMENT_SHARDS[id];
        expect(evaluateShardCompatibility(shard, SNEAK_ATTACK).compatible).toBe(true);
        expect(evaluateShardCompatibility(shard, SIGHTING_BOLT).compatible).toBe(false);
        expect(evaluateShardCompatibility(shard, ARCANE_BLAST).compatible).toBe(false);
        expect(evaluateShardCompatibility(shard, EXPOSE_WEAKNESS).compatible).toBe(false);
      }

      // 7. Recoil & Buckshot allow both melee and ranged single-target damaging attacks
      for (const id of ['recoil_shard', 'buckshot_shard'] as const) {
        const shard = ASTRAL_AUGMENT_SHARDS[id];
        expect(evaluateShardCompatibility(shard, SNEAK_ATTACK).compatible).toBe(true);
        expect(evaluateShardCompatibility(shard, SIGHTING_BOLT).compatible).toBe(true);
        expect(evaluateShardCompatibility(shard, ARCANE_BLAST).compatible).toBe(false);
        expect(evaluateShardCompatibility(shard, MINOR_WARD).compatible).toBe(false);
      }

      // 8. Interchange requires single-unit ability (SINGLE_TARGET or ALLY, non-AoE, non-Cone)
      expect(evaluateShardCompatibility(ASTRAL_AUGMENT_SHARDS.interchange_shard, SNEAK_ATTACK).compatible).toBe(true);
      expect(evaluateShardCompatibility(ASTRAL_AUGMENT_SHARDS.interchange_shard, MINOR_WARD).compatible).toBe(true);
      expect(evaluateShardCompatibility(ASTRAL_AUGMENT_SHARDS.interchange_shard, EXPOSE_WEAKNESS).compatible).toBe(true);
      expect(evaluateShardCompatibility(ASTRAL_AUGMENT_SHARDS.interchange_shard, SMOKE_VEIL).compatible).toBe(false);
      expect(evaluateShardCompatibility(ASTRAL_AUGMENT_SHARDS.interchange_shard, ARCANE_BLAST).compatible).toBe(false);
      expect(evaluateShardCompatibility(ASTRAL_AUGMENT_SHARDS.interchange_shard, SHADOW_STEP).compatible).toBe(false);

      // 9. Universal self-buffs work on every ability family
      for (const id of ['shadow_shard', 'bastion_shard', 'anchorite_shard'] as const) {
        const shard = ASTRAL_AUGMENT_SHARDS[id];
        for (const ab of [SNEAK_ATTACK, SMOKE_VEIL, MINOR_WARD, SHADOW_STEP, ARCANE_BLAST, SIEGE_BARRAGE, SHRAPNEL_CANISTER]) {
          expect(evaluateShardCompatibility(shard, ab).compatible).toBe(true);
        }
      }
    });

    it('rejects hostile infusions and Supernova Flare on friendly or unannotated ground-targeted HEX AoEs', () => {
      const friendlyGroundAoe = {
        id: 'sanctuary_circle',
        name: 'Sanctuary Circle',
        description: 'Blesses allies in a target area.',
        apCost: 1,
        range: 3,
        aoeRadius: 1,
        targetType: 'HEX' as const,
        intent: 'FRIENDLY' as const,
        defenseTarget: 'NONE' as const,
        damageType: 'NONE' as const,
        effects: [{ type: 'ARMOR_BUFF' as const, magnitude: 2, durationTurns: 1 }]
      };
      const unannotatedGroundAoe = {
        ...friendlyGroundAoe,
        id: 'unannotated_circle',
        intent: undefined
      };

      for (const ab of [friendlyGroundAoe, unannotatedGroundAoe]) {
        expect(evaluateShardCompatibility(ASTRAL_AUGMENT_SHARDS.venom_shard, ab).compatible).toBe(false);
        expect(evaluateShardCompatibility(ASTRAL_AUGMENT_SHARDS.supernova_flare, ab).compatible).toBe(false);
        expect(evaluateShardCompatibility(ASTRAL_AUGMENT_SHARDS.shadow_shard, ab).compatible).toBe(true);
      }
    });
  });

  describe('getEligibleDomainUnlocks', () => {
    const mockWarrior: Unit = {
      id: 'warrior-1',
      name: 'Test Warrior',
      gender: 'male',
      race: 'human',
      faction: 'PLAYER',
      baseAttributes: { force: 10, finesse: 10, focus: 10 },
      effectiveVitals: dummyVitals,
      starterAbilityIds: ['strike', 'defend'],
      progression: {
        unitId: 'warrior-1',
        currentLevel: 2,
        archetypePoints: { fighter: 1, rogue: 1, mage: 0 },
        constellation: ['warrior'],
        milestoneSelections: {}
      },
      loadout: {
        activeClassId: 'warrior',
        wildcardAbilityIds: [],
        wildcardPassiveIds: []
      }
    };

    it('returns unlearned Rogue domain abilities of Tier <= currentLevel (Tier 1 & Tier 2)', () => {
      const unlocks = getEligibleDomainUnlocks(mockWarrior, 'ROGUE');
      const unlockIds = unlocks.map((a) => a.id);

      // Thief (Tier 1): shadow_step, skirmish
      expect(unlockIds).toContain('shadow_step');
      expect(unlockIds).toContain('skirmish');

      // Infiltrator (Tier 2): smoke_veil, toxic_shiv
      expect(unlockIds).toContain('smoke_veil');
      expect(unlockIds).toContain('toxic_shiv');

      // Should NOT include signature abilities
      expect(unlockIds).not.toContain('pickpocket');
      expect(unlockIds).not.toContain('shadow_strike');
    });

    it('filters out domain abilities higher than specified targetLevel', () => {
      // At level 1, only Tier 1 abilities are available, not Tier 2 (smoke_veil, toxic_shiv)
      const unlocks = getEligibleDomainUnlocks(mockWarrior, 'ROGUE', 1);
      const unlockIds = unlocks.map((a) => a.id);

      expect(unlockIds).toContain('shadow_step');
      expect(unlockIds).toContain('skirmish');
      expect(unlockIds).not.toContain('smoke_veil');
      expect(unlockIds).not.toContain('toxic_shiv');
    });

    it('excludes abilities already unlocked in progression.unlockedAbilityIds', () => {
      const heroWithUnlock: Unit = {
        ...mockWarrior,
        progression: {
          ...mockWarrior.progression,
          unlockedAbilityIds: ['toxic_shiv']
        }
      };

      const unlocks = getEligibleDomainUnlocks(heroWithUnlock, 'ROGUE');
      const unlockIds = unlocks.map((a) => a.id);

      expect(unlockIds).toContain('smoke_veil');
      expect(unlockIds).not.toContain('toxic_shiv');
    });

    it('excludes domain abilities of classes already in constellation', () => {
      // For Fighter, Warrior is in constellation (cleave, brace already known). Knight is Tier 2.
      const unlocks = getEligibleDomainUnlocks(mockWarrior, 'FIGHTER');
      const unlockIds = unlocks.map((a) => a.id);

      expect(unlockIds).not.toContain('cleave');
      expect(unlockIds).not.toContain('brace');
      expect(unlockIds).toContain('challenging_shout');
      expect(unlockIds).toContain('pommel_strike');
    });
  });
});

