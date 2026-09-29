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
}

