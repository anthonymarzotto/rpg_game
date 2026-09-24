import { HexCoord } from '../grid/hex';
import { Ability } from '../types/ability';
import { DiceRoller } from '../combat/dice';

/**
 * High-level behavioral archetype governing tactical priorities.
 */
export type AIProfile = 'BRAWLER' | 'SKIRMISHER' | 'SNIPER' | 'SUPPORT';

/**
 * Tunable heuristic scoring weights for AI decision evaluation.
 */
export interface AIArchetypeWeights {
  /** Massive bonus added when expected damage is sufficient to defeat the target */
  readonly killBonus: number;
  /** Multiplier applied to projected expected damage */
  readonly expectedDamageWeight: number;
  /** Bonus awarded for exploiting low Evasion or low Resolve */
  readonly vulnerabilityWeight: number;
  /** Bonus awarded for positioning in or striking from the target's Flank or Rear arc */
  readonly flankWeight: number;
  /** Bonus/penalty per tile of distance deviation from preferred standoff range */
  readonly standoffWeight: number;
  /** Ideal engagement distance in hexes for ranged / caster units */
  readonly preferredStandoffRange: number;
  /** Bonus awarded for focusing down lower-HP targets to eliminate them faster */
  readonly focusFireWeight: number;
  /** Utility score threshold; actions scoring below this will trigger AP conservation */
  readonly apConservationThreshold: number;
}

/**
 * Move action decided by the AI engine.
 */
export interface MoveAIAction {
  readonly type: 'MOVE';
  readonly destination: HexCoord;
  readonly score: number;
  readonly reason: string;
}

/**
 * Ability execution action decided by the AI engine.
 */
export interface AbilityAIAction {
  readonly type: 'ABILITY';
  readonly ability: Ability;
  readonly target: {
    readonly coord?: HexCoord;
    readonly targetUnitId?: string;
  };
  readonly score: number;
  readonly reason: string;
}

/**
 * AP conservation action decided by the AI engine.
 */
export interface ConserveApAIAction {
  readonly type: 'CONSERVE_AP';
  readonly unspentAp: number;
  readonly score: number;
  readonly reason: string;
}

/**
 * Discriminated union of all possible AI action decisions.
 */
export type AIAction = MoveAIAction | AbilityAIAction | ConserveApAIAction;

/**
 * Execution and tuning options passed into AI decision functions.
 */
export interface AIDecisionOptions {
  readonly diceRoller?: DiceRoller;
  readonly profileOverride?: AIProfile;
  readonly weightsOverride?: Partial<AIArchetypeWeights>;
}
