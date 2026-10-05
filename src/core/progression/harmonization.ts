import { Archetype, ArchetypePoints } from '../types/class';
import { DerivedCombatVitals } from '../types/stats';
import { AbilityModifier } from '../types/modifier';
import { Unit } from '../types/unit';
import { Ability } from '../types/ability';
import { ClassPackage } from '../types/classPackage';
import { ClassRegistry } from './registry';
import { CLASS_REGISTRY, CLASS_CATALOG } from '../../data/classes';
import { getClassPackage } from '../../data/packages';

export type WayfarerAttunementId =
  | 'wayfarer_bastion'
  | 'wayfarer_stride'
  | 'wayfarer_ward'
  | 'wayfarer_zenith';

export interface WayfarerAttunement {
  readonly id: WayfarerAttunementId;
  readonly name: string;
  readonly archetype: Archetype | 'TRI_HYBRID';
  readonly description: string;
  readonly icon: string;
  readonly statDeltas: Partial<DerivedCombatVitals>;
}

export const WAYFARER_ATTUNEMENTS: Record<WayfarerAttunementId, WayfarerAttunement> = {
  wayfarer_bastion: {
    id: 'wayfarer_bastion',
    name: "Wayfarer's Bastion",
    archetype: 'FIGHTER',
    description: '+6 Max HP, +1 Armor',
    icon: '🛡️',
    statDeltas: { maxHp: 6, armor: 1 }
  },
  wayfarer_stride: {
    id: 'wayfarer_stride',
    name: "Wayfarer's Stride",
    archetype: 'ROGUE',
    description: '+2 Evasion, +2 Speed',
    icon: '🗡️',
    statDeltas: { evasion: 2, speed: 2 }
  },
  wayfarer_ward: {
    id: 'wayfarer_ward',
    name: "Wayfarer's Ward",
    archetype: 'MAGE',
    description: '+2 Resolve, +1 Ward',
    icon: '🔮',
    statDeltas: { resolve: 2, ward: 1 }
  },
  wayfarer_zenith: {
    id: 'wayfarer_zenith',
    name: "Wayfarer's Zenith",
    archetype: 'TRI_HYBRID',
    description: '+4 Max HP, +1 Armor, +1 Ward, +1 Speed, +1 Evasion, +1 Resolve',
    icon: '✦',
    statDeltas: { maxHp: 4, armor: 1, ward: 1, speed: 1, evasion: 1, resolve: 1 }
  }
};

/**
 * Checks whether a given archetype point coordinate is an off-node
 * (has allocated points but no corresponding catalog class).
 */
export function isOffNodeCoordinate(
  points: ArchetypePoints,
  registry: ClassRegistry = CLASS_REGISTRY
): boolean {
  const totalPoints = points.fighter + points.rogue + points.mage;
  if (totalPoints === 0) {
    return false;
  }
  return registry.getClassAtCoord(points) === null;
}

/**
 * Checks whether an off-node coordinate is a tri-centroid position
 * (points invested across all three archetypes: Fighter, Rogue, and Mage).
 */
export function isTriCentroidCoordinate(points: ArchetypePoints): boolean {
  return points.fighter > 0 && points.rogue > 0 && points.mage > 0;
}

/**
 * Returns available Wayfarer Attunements for a given coordinate.
 * Tri-centroids include Wayfarer's Zenith alongside the three standard triad attunements.
 */
export function getAvailableAttunements(points: ArchetypePoints): readonly WayfarerAttunement[] {
  const standard: readonly WayfarerAttunement[] = [
    WAYFARER_ATTUNEMENTS.wayfarer_bastion,
    WAYFARER_ATTUNEMENTS.wayfarer_stride,
    WAYFARER_ATTUNEMENTS.wayfarer_ward
  ];
  if (isTriCentroidCoordinate(points)) {
    return [...standard, WAYFARER_ATTUNEMENTS.wayfarer_zenith];
  }
  return standard;
}

/**
 * Applies a chosen Wayfarer Attunement's stat deltas to derived combat vitals.
 */
export function applyWayfarerAttunement(
  vitals: DerivedCombatVitals,
  attunementId: WayfarerAttunementId
): DerivedCombatVitals {
  const attunement = WAYFARER_ATTUNEMENTS[attunementId];
  if (!attunement) {
    return vitals;
  }
  const deltas = attunement.statDeltas;
  return {
    ...vitals,
    maxHp: vitals.maxHp + (deltas.maxHp ?? 0),
    maxAp: vitals.maxAp + (deltas.maxAp ?? 0),
    speed: vitals.speed + (deltas.speed ?? 0),
    move: vitals.move + (deltas.move ?? 0),
    evasion: vitals.evasion + (deltas.evasion ?? 0),
    resolve: vitals.resolve + (deltas.resolve ?? 0),
    armor: vitals.armor + (deltas.armor ?? 0),
    ward: vitals.ward + (deltas.ward ?? 0)
  };
}

export type AstralShardId =
  | 'starlight_lens'
  | 'astral_reach'
  | 'supernova_flare'
  | 'impact_shard'
  | 'venom_shard'
  | 'static_shard'
  | 'pyre_shard'
  | 'vanguard_shard'
  | 'shadow_shard'
  | 'keen_shard'
  | 'force_shard'
  | 'aether_shard'
  | 'recoil_shard'
  | 'mire_shard'
  | 'confrontation_shard'
  | 'aegis_shard'
  | 'warding_shard';

export interface AstralAugmentShard {
  readonly id: AstralShardId;
  readonly name: string;
  readonly category: 'POWER' | 'GEOMETRY' | 'INFUSION';
  readonly description: string;
  readonly icon: string;
  readonly modifier: AbilityModifier;
}

export const ASTRAL_AUGMENT_SHARDS: Record<AstralShardId, AstralAugmentShard> = {
  starlight_lens: {
    id: 'starlight_lens',
    name: 'Starlight Lens',
    category: 'POWER',
    description: 'Upgrades damage die tier by 1 step (e.g. 1d6 -> 1d8, 1d8 -> 1d10)',
    icon: '💥',
    modifier: {
      id: 'shard_starlight_lens',
      name: 'Starlight Lens',
      isPermanent: true,
      effectPatches: {
        diceStep: 1
      }
    }
  },
  force_shard: {
    id: 'force_shard',
    name: 'Force Shard',
    category: 'POWER',
    description: 'Infuses raw physical force (+2 flat bonus damage to damage effects)',
    icon: '💪',
    modifier: {
      id: 'shard_force_shard',
      name: 'Force Shard',
      isPermanent: true,
      effectPatches: {
        flatDamage: 2
      }
    }
  },
  keen_shard: {
    id: 'keen_shard',
    name: 'Keen Shard',
    category: 'POWER',
    description: 'Sharpens critical edge (scores critical hits on natural 19-20)',
    icon: '✨',
    modifier: {
      id: 'shard_keen_shard',
      name: 'Keen Shard',
      isPermanent: true,
      appendEffects: [
        {
          type: 'CRIT_BOOST'
        }
      ]
    }
  },
  astral_reach: {
    id: 'astral_reach',
    name: 'Astral Reach',
    category: 'GEOMETRY',
    description: 'Extends target range by +1 hex',
    icon: '🎯',
    modifier: {
      id: 'shard_astral_reach',
      name: 'Astral Reach',
      isPermanent: true,
      deltas: {
        range: 1
      }
    }
  },
  supernova_flare: {
    id: 'supernova_flare',
    name: 'Supernova Flare',
    category: 'GEOMETRY',
    description: 'Expands area-of-effect radius by +1 hex',
    icon: '🌀',
    modifier: {
      id: 'shard_supernova_flare',
      name: 'Supernova Flare',
      isPermanent: true,
      deltas: {
        aoeRadius: 1
      }
    }
  },
  recoil_shard: {
    id: 'recoil_shard',
    name: 'Recoil Shard',
    category: 'GEOMETRY',
    description: 'Grants evasive recoil (user steps back 1 hex freely on hit/crit)',
    icon: '👟',
    modifier: {
      id: 'shard_recoil_shard',
      name: 'Recoil Shard',
      isPermanent: true,
      appendEffects: [
        {
          type: 'RETREAT_STEP',
          applyOn: 'HIT_OR_CRIT'
        }
      ]
    }
  },
  impact_shard: {
    id: 'impact_shard',
    name: 'Impact Shard',
    category: 'INFUSION',
    description: 'Infuses kinetic knockback (pushes target 1 hex on hit/crit)',
    icon: '🔨',
    modifier: {
      id: 'shard_impact_shard',
      name: 'Impact Shard',
      isPermanent: true,
      appendEffects: [
        {
          type: 'KNOCKBACK',
          magnitude: 1,
          applyOn: 'HIT_OR_CRIT'
        }
      ]
    }
  },
  venom_shard: {
    id: 'venom_shard',
    name: 'Venom Shard',
    category: 'INFUSION',
    description: 'Infuses deadly venom (inflicts Poison condition for 2 turns on hit/crit)',
    icon: '🧪',
    modifier: {
      id: 'shard_venom_shard',
      name: 'Venom Shard',
      isPermanent: true,
      appendEffects: [
        {
          type: 'CONDITION',
          conditionType: 'POISON',
          durationTurns: 2,
          applyOn: 'HIT_OR_CRIT'
        }
      ]
    }
  },
  pyre_shard: {
    id: 'pyre_shard',
    name: 'Pyre Shard',
    category: 'INFUSION',
    description: 'Infuses searing flames (inflicts Burn condition for 2 turns on hit/crit)',
    icon: '🔥',
    modifier: {
      id: 'shard_pyre_shard',
      name: 'Pyre Shard',
      isPermanent: true,
      appendEffects: [
        {
          type: 'CONDITION',
          conditionType: 'BURN',
          magnitude: 2,
          durationTurns: 2,
          applyOn: 'HIT_OR_CRIT'
        }
      ]
    }
  },
  static_shard: {
    id: 'static_shard',
    name: 'Static Shard',
    category: 'INFUSION',
    description: 'Infuses temporal static (delays target CTB clock by 15 ticks on hit/crit)',
    icon: '⏳',
    modifier: {
      id: 'shard_static_shard',
      name: 'Static Shard',
      isPermanent: true,
      appendEffects: [
        {
          type: 'CTB_DELAY',
          magnitude: 15,
          applyOn: 'HIT_OR_CRIT'
        }
      ]
    }
  },
  mire_shard: {
    id: 'mire_shard',
    name: 'Mire Shard',
    category: 'INFUSION',
    description: 'Infuses chilling frost (slows target movement by 1 hex for 1 turn on hit/crit)',
    icon: '❄️',
    modifier: {
      id: 'shard_mire_shard',
      name: 'Mire Shard',
      isPermanent: true,
      appendEffects: [
        {
          type: 'SLOW',
          magnitude: 1,
          durationTurns: 1,
          applyOn: 'HIT_OR_CRIT'
        }
      ]
    }
  },
  vanguard_shard: {
    id: 'vanguard_shard',
    name: 'Vanguard Shard',
    category: 'INFUSION',
    description: 'Infuses taunting challenge (inflicts Challenged condition for 1 turn on hit/crit)',
    icon: '⚔️',
    modifier: {
      id: 'shard_vanguard_shard',
      name: 'Vanguard Shard',
      isPermanent: true,
      appendEffects: [
        {
          type: 'CONDITION',
          conditionType: 'CHALLENGED',
          durationTurns: 1,
          applyOn: 'HIT_OR_CRIT'
        }
      ]
    }
  },
  shadow_shard: {
    id: 'shadow_shard',
    name: 'Shadow Shard',
    category: 'INFUSION',
    description: 'Infuses elusive cloaking (grants Stealth to self for 1 turn upon executing ability)',
    icon: '🌫️',
    modifier: {
      id: 'shard_shadow_shard',
      name: 'Shadow Shard',
      isPermanent: true,
      appendEffects: [
        {
          type: 'CONDITION',
          conditionType: 'STEALTH',
          durationTurns: 1,
          targetScope: 'SELF',
          applyOn: 'ALWAYS'
        }
      ]
    }
  },
  confrontation_shard: {
    id: 'confrontation_shard',
    name: 'Confrontation Shard',
    category: 'INFUSION',
    description: 'Forces target to face actor on hit/crit (denying flank/rear advantage)',
    icon: '🔄',
    modifier: {
      id: 'shard_confrontation_shard',
      name: 'Confrontation Shard',
      isPermanent: true,
      appendEffects: [
        {
          type: 'FORCE_FACING',
          applyOn: 'HIT_OR_CRIT'
        }
      ]
    }
  },
  aegis_shard: {
    id: 'aegis_shard',
    name: 'Aegis Shard',
    category: 'INFUSION',
    description: 'Reinforces personal defenses (+1 Armor to self for 1 turn on hit/crit)',
    icon: '🛡️',
    modifier: {
      id: 'shard_aegis_shard',
      name: 'Aegis Shard',
      isPermanent: true,
      appendEffects: [
        {
          type: 'ARMOR_BUFF',
          magnitude: 1,
          durationTurns: 1,
          targetScope: 'SELF',
          applyOn: 'HIT_OR_CRIT'
        }
      ]
    }
  },
  warding_shard: {
    id: 'warding_shard',
    name: 'Warding Shard',
    category: 'INFUSION',
    description: 'Conjures arcane shielding (+1 Ward to self for 1 turn on hit/crit)',
    icon: '💠',
    modifier: {
      id: 'shard_warding_shard',
      name: 'Warding Shard',
      isPermanent: true,
      appendEffects: [
        {
          type: 'WARD_BUFF',
          magnitude: 1,
          durationTurns: 1,
          targetScope: 'SELF',
          applyOn: 'HIT_OR_CRIT'
        }
      ]
    }
  },
  aether_shard: {
    id: 'aether_shard',
    name: 'Aether Shard',
    category: 'INFUSION',
    description: 'Infuses arcane essence (converts damage type to Magical, targeting Resolve)',
    icon: '🔮',
    modifier: {
      id: 'shard_aether_shard',
      name: 'Aether Shard',
      isPermanent: true,
      overrides: {
        damageType: 'MAGICAL',
        defenseTarget: 'RESOLVE'
      }
    }
  }
};

export const ALL_ASTRAL_SHARDS: readonly AstralAugmentShard[] = Object.values(ASTRAL_AUGMENT_SHARDS);

export function getShardById(id: string): AstralAugmentShard | undefined {
  return (ASTRAL_AUGMENT_SHARDS as Record<string, AstralAugmentShard>)[id];
}

/**
 * Queries available uncollected domain abilities from the advancing archetype's pool,
 * strictly filtered by Tier <= hero.progression.currentLevel (or targetLevel override).
 * Excludes starter abilities, previously unlocked abilities, and domain abilities from
 * classes the hero already possesses in their constellation.
 */
export function getEligibleDomainUnlocks(
  hero: Unit,
  archetype: Archetype,
  targetLevel?: number,
  packageProvider: (classId: string) => ClassPackage | undefined = getClassPackage
): readonly Ability[] {
  const maxTier = targetLevel ?? hero.progression.currentLevel;
  const archKey = archetype.toLowerCase() as 'fighter' | 'rogue' | 'mage';

  // Gather all ability IDs already unlocked or known by the hero
  const knownAbilityIds = new Set<string>(hero.starterAbilityIds ?? []);
  if (hero.progression.unlockedAbilityIds) {
    for (const id of hero.progression.unlockedAbilityIds) {
      knownAbilityIds.add(id);
    }
  }
  for (const classId of hero.progression.constellation) {
    const pkg = packageProvider(classId);
    if (pkg) {
      knownAbilityIds.add(pkg.signatureAbility.id);
      for (const dom of pkg.domainAbilities) {
        knownAbilityIds.add(dom.id);
      }
    }
  }

  const eligibleAbilities: Ability[] = [];
  const addedIds = new Set<string>();

  for (const cls of CLASS_CATALOG) {
    // Must be tier <= maxTier
    if (cls.totalPoints > maxTier) {
      continue;
    }
    const pointsInArch = cls.requirements[archKey];
    if (pointsInArch <= 0) {
      continue;
    }
    // Check if archetype is dominant in this class
    const maxReq = Math.max(cls.requirements.fighter, cls.requirements.rogue, cls.requirements.mage);
    if (pointsInArch < maxReq) {
      continue;
    }

    const pkg = packageProvider(cls.id);
    if (!pkg) {
      continue;
    }

    // Only domain abilities can be unlocked via off-nodes (signature abilities are exclusive to class nodes)
    for (const ability of pkg.domainAbilities) {
      if (!knownAbilityIds.has(ability.id) && !addedIds.has(ability.id)) {
        addedIds.add(ability.id);
        eligibleAbilities.push(ability);
      }
    }
  }

  return eligibleAbilities;
}

