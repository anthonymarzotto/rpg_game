import { describe, it, expect } from 'vitest';
import {
  isOffNodeCoordinate,
  isTriCentroidCoordinate,
  getAvailableAttunements,
  applyWayfarerAttunement,
  WAYFARER_ATTUNEMENTS,
  ASTRAL_AUGMENT_SHARDS,
  getShardById,
  getEligibleDomainUnlocks
} from './harmonization';
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
    it('registers all 17 canonical shards with expected categories and modifiers', () => {
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
        'aether_shard'
      ];
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
  });

  describe('getEligibleDomainUnlocks', () => {
    const mockWarrior: Unit = {
      id: 'warrior-1',
      name: 'Test Warrior',
      faction: 'PLAYER',
      baseAttributes: { force: 10, finesse: 10, focus: 10 },
      effectiveVitals: dummyVitals,
      starterAbilityIds: ['strike', 'defend'],
      progression: {
        unitId: 'warrior-1',
        currentLevel: 2,
        archetypePoints: { fighter: 1, rogue: 1, mage: 0 },
        constellation: ['warrior']
      },
      loadout: {
        unitId: 'warrior-1',
        activeClassId: 'warrior',
        coreAbilityIds: ['lead_the_charge', 'cleave', 'brace'],
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

