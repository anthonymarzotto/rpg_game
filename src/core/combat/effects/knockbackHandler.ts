import { EffectHandler, EffectContext, EffectExecutionResult } from './types';
import { AbilityEffect } from '../../types/ability';
import { CombatEvent, getEffectiveArmor } from '../types';
import { DISPLACEMENT_CONFIG } from '../../config/balance';

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

    const knockbackResult = state.arena.calculateKnockback(
      actorCoord,
      targetCoord,
      effect.magnitude
    );

    const events: CombatEvent[] = [];
    let logDetail = '';
    let wallSlamDamage: number | undefined;

    if (knockbackResult.isCollided) {
      const targetArmor = getEffectiveArmor(targetCu);
      wallSlamDamage = Math.max(
        1,
        DISPLACEMENT_CONFIG.wallSlamBaseDamage + actorCu.unit.baseAttributes.force - targetArmor
      );

      events.push({
        type: 'COLLISION',
        unitId: targetCu.unit.id,
        collisionType: knockbackResult.collisionType ?? 'WALL',
        collidingUnitId: knockbackResult.collidingUnitId
      });

      events.push({
        type: 'DAMAGE',
        targetUnitId: targetCu.unit.id,
        amount: wallSlamDamage,
        damageType: 'PHYSICAL',
        reason: 'COLLISION',
        sourceUnitId: actorCu.unit.id
      });

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
        logDetail = ` 💥 [Knockback Collision: Slammed into ${obsType}! Took +${wallSlamDamage} collision damage.]`;
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

    return {
      events,
      logDetail,
      knockbackResult,
      wallSlamDamage
    };
  }
};
