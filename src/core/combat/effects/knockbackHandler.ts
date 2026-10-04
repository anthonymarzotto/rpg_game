import { EffectHandler, EffectContext, EffectExecutionResult } from './types';
import { AbilityEffect } from '../../types/ability';
import { CombatEvent } from '../types';
import { getEffectiveArmor } from '../effectiveVitals';
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
      const { ability } = ctx;
      const attrKey: 'force' | 'finesse' | 'focus' =
        ability?.attackModifierAttribute ??
        (ability?.archetypeTag === 'MAGE' ? 'focus' : ability?.archetypeTag === 'ROGUE' ? 'finesse' : 'force');
      const attrBonus = actorCu.unit.baseAttributes[attrKey] ?? 0;
      wallSlamDamage = Math.max(
        1,
        DISPLACEMENT_CONFIG.wallSlamBaseDamage + attrBonus - targetArmor
      );

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
