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
  readonly requirements: ArchetypePoints;
  readonly totalPoints: number;
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
}

