import { EffectHandler, EffectContext, EffectExecutionResult } from './types';
import { AbilityEffect } from '../../types/ability';
import { CombatEvent } from '../types';
import { resolveCollisionDamage, resolveFallDamage } from '../damageEngine';
import { DISPLACEMENT_CONFIG } from '../../config/balance';
import { hexEquals } from '../../grid/hex';

export const knockbackHandler: EffectHandler = {
  apply(effect: AbilityEffect, ctx: EffectContext): EffectExecutionResult {
    const { state, actorCu, targetCu } = ctx;
    if (!targetCu) {
      return { events: [] };
    }

    const actorCoord = state.arena.getUnitPosition(actorCu.unit.id);
    const targetCoord = state.arena.getUnitPosition(targetCu.unit.id);
    if (!actorCoord || !targetCoord) {
      return { events: [] };
    }

    const canVault = targetCu.passives?.some((p) => p.canVaultOnKnockback);
    const knockbackResult = state.arena.calculateKnockback(
      actorCoord,
      targetCoord,
      effect.magnitude,
      DISPLACEMENT_CONFIG.minCliffSlamElevationDelta,
      { canVaultOnKnockback: canVault }
    );

    const events: CombatEvent[] = [];
    let logDetail = '';
    let wallSlamDamage: number | undefined;

    if (knockbackResult.isCollided) {
      wallSlamDamage = resolveCollisionDamage(actorCu, targetCu, ctx.ability);

      // If unit displaced at all before colliding, record displacement
      if (!hexEquals(targetCoord, knockbackResult.finalCoord)) {
        events.push({
          type: 'DISPLACEMENT',
          unitId: targetCu.unit.id,
          fromCoord: targetCoord,
          toCoord: knockbackResult.finalCoord,
          kind: 'KNOCKBACK'
        });
      }

      events.push({
        type: 'COLLISION',
        unitId: targetCu.unit.id,
        collisionType: knockbackResult.collisionType ?? 'WALL',
        collidingUnitId: knockbackResult.collidingUnitId
      });

      if (wallSlamDamage > 0) {
        events.push({
          type: 'DAMAGE',
          targetUnitId: targetCu.unit.id,
          amount: wallSlamDamage,
          damageType: 'PHYSICAL',
          reason: 'COLLISION',
          sourceUnitId: actorCu.unit.id
        });
      }

      if (knockbackResult.collidingUnitId) {
        const bystander = state.units.get(knockbackResult.collidingUnitId);
        const bystanderName = bystander ? bystander.unit.name : 'another unit';
        const collateralDmg = DISPLACEMENT_CONFIG.unitCollisionSecondaryDamage;

        events.push({
          type: 'DAMAGE',
          targetUnitId: knockbackResult.collidingUnitId,
          amount: collateralDmg,
          damageType: 'PHYSICAL',
          reason: 'COLLATERAL',
          label: 'COLLISION',
          sourceUnitId: actorCu.unit.id
        });

        // Compute simulated HP after collateral for log preview
        const bystanderRemainingHp = bystander
          ? Math.max(0, bystander.currentHp - collateralDmg)
          : 0;
        const bystanderMaxHp = bystander?.unit.effectiveVitals.maxHp ?? 0;

        logDetail = ` 💥 [Knockback Collision: Slammed into ${bystanderName}! Target took +${wallSlamDamage} collision damage. ${bystanderName} took +${collateralDmg} collateral damage (HP: ${bystanderRemainingHp}/${bystanderMaxHp}).]`;
      } else {
        const obsType =
          knockbackResult.collisionType === 'WALL'
            ? 'Obstacle'
            : knockbackResult.collisionType === 'CLIFF'
            ? 'Cliff'
            : 'Map Boundary';
        logDetail =
          wallSlamDamage && wallSlamDamage > 0
            ? ` 💥 [Knockback Collision: Slammed into ${obsType}! Took +${wallSlamDamage} collision damage.]`
            : ` 🐾 [Knockback Collision: Stopped against ${obsType}! Collision Damage Negated.]`;
      }
    } else {
      events.push({
        type: 'DISPLACEMENT',
        unitId: targetCu.unit.id,
        fromCoord: targetCoord,
        toCoord: knockbackResult.finalCoord,
        kind: 'KNOCKBACK'
      });

      logDetail = ` 💨 [Knockback: Pushed to (${knockbackResult.finalCoord.q}, ${knockbackResult.finalCoord.r})]`;
    }

    // Process plunging fall impact damage if knockback plunged down a ledge (dh <= -2)
    let fallImpactDamage: number | undefined;
    if (knockbackResult.fallDamage && knockbackResult.fallDamage > 0) {
      fallImpactDamage = resolveFallDamage(targetCu, knockbackResult.fallDamage);
      if (fallImpactDamage > 0) {
        events.push({
          type: 'DAMAGE',
          targetUnitId: targetCu.unit.id,
          amount: fallImpactDamage,
          damageType: 'PHYSICAL',
          reason: 'FALL',
          sourceUnitId: actorCu.unit.id
        });
        logDetail += ` 💥 [Plunged from ledge: Took +${fallImpactDamage} Fall Impact Damage!]`;
      } else {
        logDetail += ` 🐾 [Plunged from ledge: Fall Damage Negated!]`;
      }
    }

    return {
      events,
      logDetail,
      knockbackResult,
      wallSlamDamage,
      fallDamage: fallImpactDamage
    };
  }
};
