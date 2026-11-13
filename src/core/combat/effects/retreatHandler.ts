import { EffectHandler, EffectContext, EffectExecutionResult } from './types';
import { AbilityEffect, resolveEffectShout } from '../../types/ability';
import { hexSubtract, hexAdd } from '../../grid/hex';
import { CombatEvent } from '../types';
import { calculateRawFallDamage } from '../../grid/arena';
import { resolveFallDamage } from '../damageEngine';
import { DISPLACEMENT_CONFIG } from '../../config/balance';

export const retreatHandler: EffectHandler = {
  apply(effect: AbilityEffect, ctx: EffectContext): EffectExecutionResult {
    const { state, actorCu, targetCu } = ctx;
    const actorCoord = state.arena.getUnitPosition(actorCu.unit.id);
    const targetCoord = targetCu ? state.arena.getUnitPosition(targetCu.unit.id) : ctx.targetCoord;

    if (!actorCoord || !targetCoord) {
      return { events: [] };
    }

    const actorTile = state.arena.getTile(actorCoord);
    if (!actorTile) {
      return { events: [] };
    }

    const retreatDir = hexSubtract(actorCoord, targetCoord);
    let retreatDest = hexAdd(actorCoord, retreatDir);
    let destTile = state.arena.getTile(retreatDest);

    const canVault = actorCu.passives?.some((p) => p.canVaultOnRetreat);

    // Vaulting over 1-hex obstacles if actor has canVaultOnRetreat
    if (destTile && !destTile.isWalkable) {
      if (canVault) {
        const vaultDest = hexAdd(retreatDest, retreatDir);
        const vaultTile = state.arena.getTile(vaultDest);
        if (vaultTile && vaultTile.isWalkable && !vaultTile.occupiedByUnitId) {
          retreatDest = vaultDest;
          destTile = vaultTile;
        }
      }
    }

    if (!destTile || !destTile.isWalkable || destTile.occupiedByUnitId) {
      return { events: [] };
    }

    // Elevation climb barrier check
    const dh = destTile.elevation - actorTile.elevation;
    if (dh > DISPLACEMENT_CONFIG.maxClimbElevation && !canVault) {
      return { events: [] };
    }

    const label = resolveEffectShout(effect.shout, 'actor');
    const events: CombatEvent[] = [
      {
        type: 'DISPLACEMENT',
        unitId: actorCu.unit.id,
        fromCoord: actorCoord,
        toCoord: retreatDest,
        kind: 'RETREAT',
        ...(label !== undefined ? { label } : {})
      }
    ];

    let logDetail = ` 🏃 [Retreat Step to (${retreatDest.q}, ${retreatDest.r})]`;

    // Process plunging fall impact damage if retreat stepped off a ledge (dh <= -2)
    let fallDamage: number | undefined;
    const rawFallDamage = calculateRawFallDamage(dh);
    if (rawFallDamage > 0) {
      fallDamage = resolveFallDamage(actorCu, rawFallDamage);
      if (fallDamage > 0) {
        events.push({
          type: 'DAMAGE',
          targetUnitId: actorCu.unit.id,
          amount: fallDamage,
          damageType: 'PHYSICAL',
          reason: 'FALL',
          sourceUnitId: actorCu.unit.id
        });
        logDetail += ` 💥 [Plunged from ledge: Took +${fallDamage} Fall Impact Damage!]`;
      } else {
        logDetail += ` 🐾 [Plunged from ledge: Fall Damage Negated!]`;
      }
    }

    return {
      events,
      logDetail,
      fallDamage
    };
  }
};

