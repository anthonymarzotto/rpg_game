export type Archetype = 'FIGHTER' | 'ROGUE' | 'MAGE';

export interface ArchetypePoints {
  readonly fighter: number;
  readonly rogue: number;
  readonly mage: number;
}

export interface ClassDefinition {
  readonly no: string;
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly requirements: ArchetypePoints;
  readonly totalPoints: number;
}

export type WayfarerAttunementId =
  | 'wayfarer_bastion'
  | 'wayfarer_stride'
  | 'wayfarer_ward'
  | 'wayfarer_zenith';

export type MilestoneReward =
  | { readonly type: 'ABILITY'; readonly abilityId: string }
  | { readonly type: 'SHARD'; readonly shardId: string };

export interface MilestoneSelection {
  readonly coordKey: string;
  readonly attunementId: WayfarerAttunementId;
  readonly reward: MilestoneReward;
  readonly levelAwarded?: number;
}

export interface UnitProgression {
  readonly unitId: string;
  readonly currentLevel: number;
  readonly archetypePoints: ArchetypePoints;
  readonly constellation: readonly string[];
  /** Accumulated unspent archetype XP carried between encounters */
  readonly accumulatedXp?: ArchetypePoints;
  /** Off-node coordinate milestone keys visited (e.g. ['1,1,0', '1,1,1']) */
  readonly offNodeMilestones?: readonly string[];
  /** Individually unlocked domain abilities from off-node milestones */
  readonly unlockedAbilityIds?: readonly string[];
  /** Wayfarer Attunement IDs chosen at off-node milestones */
  readonly earnedAttunements?: readonly string[];
  /** First-class provenance ledger of choices made at each off-node milestone */
  readonly milestoneSelections: Readonly<Record<string, MilestoneSelection>>;
}


