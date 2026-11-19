import { Ability } from '../../core/types/ability';
import { PassiveTrait } from '../../core/types/passive';
import { ClassPackage } from '../../core/types/classPackage';

export const SIEGE_BARRAGE: Ability = {
  id: 'siege_barrage',
  name: 'Siege Barrage',
  description: 'Cranks the heavy siege arc skyward, marking a distant hex cluster for a devastating volley at the start of your next turn.',
  archetypeTag: 'FIGHTER',
  apCost: 2,
  minRange: 2,
  range: 4,
  aoeRadius: 1,
  oncePerTurn: true,
  ignoresElevationPenalty: true,
  targetType: 'HEX',
  defenseTarget: 'EVASION',
  attackModifierAttribute: 'finesse',
  damageType: 'PHYSICAL',
  effects: [
    {
      type: 'DELAYED_BOMBARDMENT',
      damageProfile: {
        count: 2,
        sides: 8,
        modifierAttribute: 'force'
      }
    }
  ],
  aiHint: {
    role: 'FINISHER'
  }
};

export const SHRAPNEL_CANISTER: Ability = {
  id: 'shrapnel_canister',
  name: 'Shrapnel Canister',
  description: 'Lobs a mid-air fragmentation flare that strips enemy concealment and litters the blast zone in jagged rubble.',
  archetypeTag: 'ROGUE',
  apCost: 1,
  minRange: 2,
  range: 4,
  aoeRadius: 1,
  ignoresElevationPenalty: true,
  targetType: 'HEX',
  defenseTarget: 'NONE',
  damageType: 'NONE',
  effects: [
    {
      type: 'SHRAPNEL_RUBBLE',
      magnitude: 2,
      durationTurns: 2
    }
  ],
  aiHint: {
    role: 'DISRUPTION'
  }
};

export const SIGHTING_BOLT: Ability = {
  id: 'sighting_bolt',
  name: 'Sighting Bolt',
  description: 'Fires a calibrated tracer bolt that exposes a target and paints quadrant coordinates for every ranged attacker on your squad.',
  archetypeTag: 'ROGUE',
  apCost: 1,
  minRange: 2,
  range: 4,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'EVASION',
  attackModifierAttribute: 'finesse',
  damageType: 'PHYSICAL',
  effects: [
    {
      type: 'DAMAGE',
      damageProfile: {
        count: 1,
        sides: 4,
        modifierAttribute: 'finesse'
      }
    },
    {
      type: 'CONDITION',
      conditionType: 'EXPOSED',
      durationTurns: 2,
      applyOn: 'HIT_OR_CRIT'
    },
    {
      type: 'CONDITION',
      conditionType: 'TELEMETRY',
      durationTurns: 2,
      applyOn: 'HIT_OR_CRIT'
    }
  ],
  aiHint: {
    role: 'PRIMER',
    primer: {
      requiresFollowUp: 'ANY_ATTACK',
      minTotalAp: 3,
      bonusScore: 22.0,
      reason: 'Paint target with Quadrant Telemetry and Exposed before follow-up fire',
      preferredProfiles: ['SNIPER']
    }
  }
};

export const ZEROED_IN: PassiveTrait = {
  id: 'zeroed_in',
  name: 'Zeroed In',
  description: 'Ending your turn without moving, teleporting, or being displaced builds +1 stack (max 3). Each stack grants +1 Range on ranged abilities, +1 Attack Roll, and -1 Evasion (min 0). At 3 stacks, AoE abilities also gain +1 Blast radius. Moving, teleporting, or displacement clears all stacks.',
  hook: 'ALWAYS',
  stationaryCalibration: true
};

export const BALLISTICIAN_PACKAGE: ClassPackage = {
  classId: 'ballistician',
  className: 'Ballistician',
  signatureAbility: SIEGE_BARRAGE,
  domainAbilities: [SHRAPNEL_CANISTER, SIGHTING_BOLT],
  passive: ZEROED_IN,
  aiProfile: 'SNIPER'
};
