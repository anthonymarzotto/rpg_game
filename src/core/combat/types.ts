import { Unit, Faction } from '../types/unit';
import { AbilityEffect, Ability, ConditionType } from '../types/ability';
import { AbilityModifier } from '../types/modifier';
import { PassiveTrait } from '../types/passive';
import { HexCoord, HexDirection } from '../grid/hex';
import { Arena, KnockbackResult, HexTile } from '../grid/arena';
import type { AIDecisionTrace } from '../ai/types';

export type HitOutcome = 'CRITICAL_HIT' | 'SOLID_HIT' | 'GRAZE' | 'MISS';

export type CombatDamageReason =
  | 'ATTACK'
  | 'COLLISION'
  | 'COLLATERAL'
  | 'SPLASH'
  | 'STATUS_TICK'
  | 'ENVIRONMENT'
  | 'FALL'
  | 'PASSIVE';

export type DisplacementKind = 'KNOCKBACK' | 'RETREAT' | 'PULL' | 'TELEPORT' | 'CHARGE' | 'SWAP';

export type CollisionKind = 'WALL' | 'UNIT' | 'CLIFF' | 'VOID';

/**
 * Atomic combat events produced during action resolution.
 */
export type CombatEvent =
  | {
      readonly type: 'DAMAGE';
      readonly targetUnitId: string;
      readonly amount: number;
      readonly damageType: 'PHYSICAL' | 'MAGICAL' | 'TRUE';
      readonly reason: CombatDamageReason;
      readonly sourceUnitId?: string;
      readonly isCrit?: boolean;
      readonly label?: string;
      readonly logged?: boolean;
      readonly coord?: HexCoord;
    }
  | {
      readonly type: 'DISPLACEMENT';
      readonly unitId: string;
      readonly fromCoord: HexCoord;
      readonly toCoord: HexCoord;
      readonly kind: DisplacementKind;
      readonly label?: string | null;
    }
  | {
      readonly type: 'COLLISION';
      readonly unitId: string;
      readonly collisionType: CollisionKind;
      readonly collidingUnitId?: string;
    }
  | {
      readonly type: 'STATUS_APPLIED';
      readonly targetUnitId: string;
      readonly modifier?: ActiveModifier;
      readonly condition?: ActiveCondition;
    }
  | {
      readonly type: 'CONDITION_APPLIED';
      readonly targetUnitId: string;
      readonly condition: ActiveCondition;
    }
  | {
      readonly type: 'CTB_DELAY';
      readonly targetUnitId: string;
      readonly amount: number;
      readonly label?: string | null;
    }
  | {
      readonly type: 'MISS';
      readonly targetUnitId: string;
      readonly reason?: string;
      readonly coord?: HexCoord;
    };

import { RollAdvantage } from './dice';

/**
 * Individual damage die outcome.
 */
export interface DamageDieRoll {
  readonly sides: number;
  readonly roll: number;
}

/**
 * Individual additive component contributing to an attack roll's net modifier.
 */
export interface AttackModifierComponent {
  readonly label: string;
  readonly value: number;
  readonly source: 'ATTRIBUTE' | 'ELEVATION' | 'AURA' | 'CONDITION' | 'MODIFIER';
}

export type DamageComponentSource =
  | 'DICE'
  | 'CRIT_MAX'
  | 'BONUS_DICE'
  | 'ATTRIBUTE'
  | 'ABILITY_FLAT'
  | 'PASSIVE'
  | 'MITIGATION'
  | 'MULTIPLIER'
  | 'MIN_FLOOR';

/**
 * Individual component contributing to an attack's damage calculation.
 */
export interface DamageBreakdownComponent {
  readonly label: string;
  readonly value: number;
  readonly displayValue?: string;
  readonly source: DamageComponentSource;
}

/**
 * Structured breakdown of an attack check and damage roll sequence for visual presentation.
 */
export interface DiceRollBreakdown {
  readonly d20Rolls: readonly number[];
  readonly keptD20: number;
  readonly advantage: RollAdvantage;
  readonly netModifier: number;
  readonly totalScore: number;
  readonly targetDefense: number;
  readonly defenseType: 'Evasion' | 'Resolve';
  readonly hitOutcome: HitOutcome;
  readonly damageDice: readonly DamageDieRoll[];
  readonly damageModifier: number;
  readonly totalDamage: number;
  readonly mitigation?: number;
  readonly mitigationType?: 'Armor' | 'Ward';
  readonly critMaxBonus?: number;
  readonly modifierBreakdown?: readonly AttackModifierComponent[];
  readonly damageBreakdownComponents?: readonly DamageBreakdownComponent[];
}

/**
 * Detailed result of an attack roll and damage resolution.
 */
export interface AttackResolution {
  readonly hitOutcome: HitOutcome;
  readonly d20Roll: number;
  readonly modifier: number;
  readonly totalAttackScore: number;
  readonly defenseTargetScore: number;
  readonly rawDamage: number;
  readonly mitigation: number;
  readonly damageDealt: number;
  readonly damageBreakdown?: string;
  readonly effectsApplied: readonly AbilityEffect[];
  readonly knockbackResult?: KnockbackResult;
  readonly wallSlamDamage?: number;
  readonly fallDamage?: number;
  readonly events: readonly CombatEvent[];
  readonly diceBreakdown?: DiceRollBreakdown;
}

/**
 * Archetype XP accumulated by a unit during the current battle.
 */
export interface InBattleXp {
  fighter: number;
  rogue: number;
  mage: number;
}

export type ModifiableCombatStat =
  | 'armor'
  | 'ward'
  | 'speed'
  | 'move'
  | 'evasion'
  | 'resolve'
  | 'attackRoll'
  | 'bastionStance'
  | 'displacementImmunity';

/**
 * Active stat modifier (positive for buffs, negative for penalties)
 * tracking its remaining duration in turns.
 */
export interface ActiveModifier {
  readonly stat: ModifiableCombatStat;
  readonly value: number;
  durationTurns: number;
}

/**
 * Active status condition tracking state, duration, and mandatory source unit attribution.
 */
export interface ActiveCondition {
  readonly type: ConditionType;
  durationTurns: number;
  sourceUnitId: string;
  damagePerTurn?: number;
}

/**
 * Unified validation result for player actions (movement, abilities).
 */
export type ValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly reason: string };

/**
 * Tagged union representing the outcome of an executed ability.
 */
export type AbilityResolution =
  | { readonly type: 'ATTACK'; readonly details: AttackResolution }
  | {
      readonly type: 'BUFF';
      readonly targetUnitId: string;
      readonly modifierApplied: ActiveModifier;
      readonly events?: readonly CombatEvent[];
    }
  | {
      readonly type: 'SUPPORT';
      readonly targetUnitIds: readonly string[];
      readonly events: readonly CombatEvent[];
    };

/**
 * Combat wrapper managing a unit's dynamic in-battle state.
 */
export interface CombatUnit {
  readonly unit: Unit;
  faction?: Faction;
  /** Original pre-charm faction preserved when CHARMED temporarily switches active faction */
  originalFaction?: Faction;
  currentHp: number;
  currentAp: number;
  initiativeGauge: number;
  /** Initial 1d20 initiative roll at battle start */
  initialInitiativeRoll?: number;
  isDefeated: boolean;
  inBattleXp: InBattleXp;
  activeModifiers: ActiveModifier[];
  activeConditions: ActiveCondition[];
  abilityModifiers: AbilityModifier[];
  /** Active combat abilities (Core + Wildcards) resolved from unit loadout */
  readonly abilities: readonly Ability[];
  /** Active passives (Innate + Wildcards) resolved from unit loadout */
  readonly passives: readonly PassiveTrait[];
  /** Current directional facing on the hex grid (0 to 5) */
  facing: HexDirection;
  /** Distance in hexes moved during the current turn (used by Momentum) */
  hexesMovedThisTurn?: number;
  /** IDs of abilities executed during the current turn (used by oncePerTurn) */
  abilitiesUsedThisTurn?: string[];
  /** Virtual elevation bonus (e.g. from Coiled Apex / unspent AP) acting as vantage in combat checks */
  virtualElevation?: number;
  /** Zeroed In stationary calibration stacks (0..3): +1 Range, +1 Attack Roll, -1 Evasion per stack, +1 AoE Radius at 3 stacks */
  zeroedInStacks?: number;
  /** Whether the unit moved, teleported, or was displaced during the current turn */
  movedThisTurn?: boolean;
}


/**
 * Structured semantic outcome emitted by effect handlers, passives, and splash/context resolution.
 */
export type EffectOutcome =
  | {
      readonly kind: 'CONDITION';
      readonly condition: ConditionType;
      readonly durationTurns: number;
      readonly damagePerTurn?: number;
      readonly sourceName?: string;
      readonly targetName?: string;
    }
  | {
      readonly kind: 'FORCED_FACING';
      readonly direction: 'TOWARDS' | 'AWAY';
      readonly originName: string;
    }
  | {
      readonly kind: 'DISPLACEMENT';
      readonly displacement: 'KNOCKBACK' | 'PULL' | 'RETREAT' | 'CHARGE' | 'SWAP' | 'TELEPORT';
      readonly toCoord?: { readonly q: number; readonly r: number };
      readonly targetName?: string;
      readonly resisted?: boolean;
      readonly label?: string;
    }
  | {
      readonly kind: 'COLLISION';
      readonly collisionType: 'WALL' | 'CLIFF' | 'BOUNDARY' | 'UNIT';
      readonly damage: number;
      readonly negated?: boolean;
      readonly bystanderName?: string;
      readonly collateralDamage?: number;
      readonly bystanderHp?: number;
      readonly bystanderMaxHp?: number;
    }
  | {
      readonly kind: 'FALL';
      readonly damage: number;
      readonly negated?: boolean;
    }
  | {
      readonly kind: 'MODIFIER';
      readonly label: string;
      readonly entries: readonly { readonly stat: string; readonly value: number | string }[];
      readonly durationTurns?: number;
      readonly note?: string;
    }
  | {
      readonly kind: 'INITIATIVE';
      readonly direction: 'BOOST' | 'DELAY';
      readonly amount: number;
    }
  | {
      readonly kind: 'COLLATERAL_HIT';
      readonly sourceLabel: string;
      readonly targetName: string;
      readonly damage: number;
      readonly damageType?: 'PHYSICAL' | 'MAGICAL';
      readonly hitOutcome?: HitOutcome;
      readonly defenseTarget?: number;
      readonly targetHp?: number;
      readonly targetMaxHp?: number;
      readonly conditions?: readonly {
        readonly condition: ConditionType;
        readonly durationTurns: number;
        readonly damagePerTurn?: number;
      }[];
    }
  | {
      readonly kind: 'CONTEXT';
      readonly context: 'ELEVATION' | 'AURA_PENALTY' | 'GRAZE_NEGATED' | 'CLEANSED';
      readonly label: string;
      readonly detail?: string;
    };

/**
 * Optional structured metadata for a combat log entry, avoiding UI string regex parsing.
 */
export type CombatLogMetadata =
  | {
      readonly type: 'ATTACK';
      readonly actor: string;
      readonly ability: string;
      readonly target?: string;
      readonly d20?: string;
      readonly defenseTarget?: number;
      readonly hitOutcome: string;
      readonly damageTotal: string;
      readonly damageBreakdown?: string;
      readonly targetHp?: number;
      readonly targetMaxHp?: number;
      readonly effects?: readonly EffectOutcome[];
      readonly isAreaTarget?: boolean;
      readonly totalScore?: number;
      readonly attackRollBreakdown?: readonly AttackModifierComponent[];
      readonly damageBreakdownComponents?: readonly DamageBreakdownComponent[];
    }
  | {
      readonly type: 'MOVE';
      readonly actor: string;
      readonly coord: { readonly q: number; readonly r: number };
      readonly remainingAp: number;
    }
  | {
      readonly type: 'BUFF';
      readonly actor: string;
      readonly ability: string;
      readonly target?: string;
      readonly effects?: readonly EffectOutcome[];
    }
  | {
      readonly type: 'UTILITY';
      readonly actor: string;
      readonly ability: string;
      readonly target?: string;
      readonly damageTotal?: string;
      readonly targetHp?: number;
      readonly targetMaxHp?: number;
      readonly effects?: readonly EffectOutcome[];
    }
  | {
      readonly type: 'INITIATIVE';
      readonly rolls: readonly {
        readonly unitName: string;
        readonly roll: number;
        readonly isPlayer: boolean;
      }[];
    }
  | {
      readonly type: 'PASSIVE';
      readonly actor: string;
      readonly passiveName: string;
      readonly effects?: readonly EffectOutcome[];
    }
  | {
      readonly type: 'DETECTION';
      readonly actor: string;
      readonly target: string;
      readonly targetUnitId?: string;
      readonly isTurnStart?: boolean;
    }
  | {
      readonly type: 'CONDITION_BROKEN';
      readonly actor?: string;
      readonly condition?: string;
      readonly reason?: string;
      readonly text?: string;
    }
  | {
      readonly type: 'DOT_DAMAGE';
      readonly actor?: string;
      readonly condition?: string;
      readonly damage?: number;
      readonly targetHp?: number;
      readonly targetMaxHp?: number;
      readonly text?: string;
    }
  | {
      readonly type: 'ENVIRONMENT';
      readonly actor: string;
      readonly hazardName: string;
      readonly detail?: string;
      readonly damage?: number;
      readonly targetHp?: number;
      readonly targetMaxHp?: number;
      readonly text?: string;
    }
  | {
      readonly type: 'DEFEATED';
      readonly actor: string;
      readonly condition?: string;
      readonly cause: string;
    }
  | {
      readonly type: 'ZONE_OF_CONTROL';
      readonly actor: string;
      readonly guardian: string;
      readonly ability: string;
    }
  | {
      readonly type: 'GENERIC';
      readonly actor?: string;
      readonly text?: string;
    };

/**
 * Structured entry in the transparent combat log.
 */
export interface CombatLogEntry {
  readonly turnNumber: number;
  readonly actorUnitId: string;
  readonly actionId: string;
  readonly message: string;
  readonly metadata: CombatLogMetadata;
  readonly faction?: Faction;
  readonly affectedUnitIds?: readonly string[];
}

/**
 * Atomic conditions evaluated against a combat state.
 */
export type AtomicObjective =
  | { readonly kind: 'FACTION_DEFEATED'; readonly faction: Faction };

/**
 * Composable condition tree supporting allOf and anyOf boolean logic.
 */
export type ObjectiveCondition =
  | AtomicObjective
  | { readonly allOf: readonly ObjectiveCondition[] }
  | { readonly anyOf: readonly ObjectiveCondition[] };

/**
 * Declarative encounter victory objective.
 */
export interface EncounterObjective {
  readonly id: string;
  readonly description: string;
  readonly condition: ObjectiveCondition;
}

/**
 * High-level lifecycle status of a combat encounter.
 */
export type CombatOutcome = 'IN_PROGRESS' | 'VICTORY' | 'DEFEAT';

/**
 * Temporary terrain hazard occupying a set of arena hexes (e.g. Shrapnel Rubble).
 */
export interface HexHazard {
  readonly id: string;
  readonly type: 'SHRAPNEL_RUBBLE';
  readonly sourceUnitId: string;
  readonly sourceFaction?: Faction;
  readonly hexCoords: readonly HexCoord[];
  durationTurns: number;
  readonly extraMoveCost: number;
}

/**
 * Airborne delayed area bombardment waiting to detonate at the launcher's next turn start.
 */
export interface PendingBombardment {
  readonly id: string;
  readonly sourceUnitId: string;
  readonly sourceUnitName: string;
  readonly sourceFaction?: Faction;
  readonly abilityId: string;
  readonly abilityName: string;
  readonly centerCoord: HexCoord;
  readonly hexCoords: readonly HexCoord[];
  readonly damageProfile: {
    readonly count: number;
    readonly sides: number;
    readonly modifierAttribute?: 'force' | 'finesse' | 'focus';
  };
  readonly attackModifierAttribute: 'force' | 'finesse' | 'focus';
  readonly snapshotFinesse: number;
  readonly snapshotForce: number;
  readonly snapshotFocus: number;
  readonly snapshotZeroedInStacks: number;
  /** Fallback countdown used if sourceUnitId is defeated while the shells are airborne */
  defeatedFallbackTurns?: number;
}

/**
 * Complete state container for an active combat encounter.
 */
export interface CombatState {
  readonly arena: Arena;
  readonly units: Map<string, CombatUnit>;
  activeUnitId: string;
  turnNumber: number;
  readonly combatLog: CombatLogEntry[];
  outcome: CombatOutcome;
  readonly objectives?: readonly EncounterObjective[];
  aiDecisionLog?: AIDecisionTrace[];
  partyXpPool: InBattleXp;
  readonly seed?: number;
  /** Active delayed area bombardments (e.g. Siege Barrage) */
  pendingBombardments?: PendingBombardment[];
  /** Active temporary terrain hazards (e.g. Shrapnel Rubble) */
  hexHazards?: HexHazard[];
  /** Turn-start combat events (e.g. delayed bombardment impacts) awaiting UI floating text dispatch */
  lastTurnStartEvents?: CombatEvent[];
}

/**
 * Unpacked plain-object serialization format for the Hex Arena.
 */
export interface SerializedArena {
  readonly tiles: readonly HexTile[];
  readonly unitPositions: readonly (readonly [string, HexCoord])[];
}

/**
 * Portable, JSON-serializable snapshot of an active or concluded combat trial.
 */
export interface SerializedCombatState {
  readonly version: number;
  readonly arena: SerializedArena;
  readonly units: Record<string, CombatUnit>;
  readonly activeUnitId: string;
  readonly turnNumber: number;
  readonly combatLog: readonly CombatLogEntry[];
  readonly outcome: CombatOutcome;
  readonly objectives?: readonly EncounterObjective[];
  readonly aiDecisionLog?: readonly AIDecisionTrace[];
  readonly partyXpPool?: InBattleXp;
  readonly seed?: number;
  readonly pendingBombardments?: readonly PendingBombardment[];
  readonly hexHazards?: readonly HexHazard[];
  readonly exportedAt?: number;
}


