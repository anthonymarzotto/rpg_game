import { EffectHandler, EffectContext, EffectExecutionResult } from './types';
import { AbilityEffect, resolveEffectShout } from '../../types/ability';
import { CombatEvent, EffectOutcome } from '../types';
import { resolveCollisionDamage, resolveFallDamage } from '../damageEngine';
import { DISPLACEMENT_CONFIG } from '../../config/balance';
import { hexEquals } from '../../grid/hex';
import { isDisplacementImmune } from '../displacementImmunity';

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

    const isImmune = isDisplacementImmune(targetCu);
    if (isImmune) {
      return {
        events: [],
        effects: [{ kind: 'DISPLACEMENT', displacement: 'KNOCKBACK', resisted: true }]
      };
    }

    const canVault = targetCu.passives?.some((p) => p.canVaultOnKnockback);
    const knockbackResult = state.arena.calculateKnockback(
      actorCoord,
      targetCoord,
      effect.magnitude,
      DISPLACEMENT_CONFIG.minCliffSlamElevationDelta,
      { canVaultOnKnockback: canVault }
    );

    const label = resolveEffectShout(effect.shout, 'target');
    const events: CombatEvent[] = [];
    const effects: EffectOutcome[] = [];
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
          kind: 'KNOCKBACK',
          ...(label !== undefined ? { label } : {})
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

        effects.push({
          kind: 'COLLISION',
          collisionType: 'UNIT',
          damage: wallSlamDamage,
          bystanderName,
          collateralDamage: collateralDmg,
          bystanderHp: bystanderRemainingHp,
          bystanderMaxHp
        });
      } else {
        const collisionType =
          knockbackResult.collisionType === 'WALL'
            ? 'WALL'
            : knockbackResult.collisionType === 'CLIFF'
            ? 'CLIFF'
            : 'BOUNDARY';
        effects.push({
          kind: 'COLLISION',
          collisionType,
          damage: wallSlamDamage ?? 0,
          negated: !(wallSlamDamage && wallSlamDamage > 0)
        });
      }
    } else {
      events.push({
        type: 'DISPLACEMENT',
        unitId: targetCu.unit.id,
        fromCoord: targetCoord,
        toCoord: knockbackResult.finalCoord,
        kind: 'KNOCKBACK',
        ...(label !== undefined ? { label } : {})
      });

      effects.push({
        kind: 'DISPLACEMENT',
        displacement: 'KNOCKBACK',
        toCoord: knockbackResult.finalCoord
      });
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
        effects.push({
          kind: 'FALL',
          damage: fallImpactDamage
        });
      } else {
        effects.push({
          kind: 'FALL',
          damage: 0,
          negated: true
        });
      }
    }

    return {
      events,
      ...(effects.length > 0 ? { effects } : {}),
      knockbackResult,
      wallSlamDamage,
      fallDamage: fallImpactDamage
    };
  }
};
