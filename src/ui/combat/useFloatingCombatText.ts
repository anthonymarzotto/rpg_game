import { useState, useCallback } from 'react';
import { HexCoord } from '../../core/grid/hex';
import { CombatState, AbilityResolution } from '../../core/combat/types';
import { Ability } from '../../core/types/ability';

export interface FloatingText {
  readonly id: string;
  readonly text: string;
  readonly type: 'damage' | 'crit' | 'graze' | 'miss' | 'xp' | 'buff' | 'slam';
  readonly coord: HexCoord;
}

/**
 * Manages floating combat text lifecycle, animation queue, and event dispatch.
 */
export function useFloatingCombatText() {
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  const addFloatingText = useCallback(
    (text: string, type: FloatingText['type'], coord: HexCoord) => {
      const id = `${Date.now()}-${Math.random()}`;
      setFloatingTexts((prev) => [...prev, { id, text, type, coord }]);
      setTimeout(() => {
        setFloatingTexts((prev) => prev.filter((item) => item.id !== id));
      }, 1400);
    },
    []
  );

  const clearFloatingTexts = useCallback(() => {
    setFloatingTexts([]);
  }, []);

  const dispatchResolutionFeedback = useCallback(
    (
      state: CombatState,
      resolution: AbilityResolution,
      selectedAbility: Ability,
      targetCoordBefore: HexCoord | undefined,
      playerCoord: HexCoord | undefined,
      clickedCoord: HexCoord,
      targetUnitId?: string
    ) => {
      if (resolution.type === 'ATTACK') {
        const hit = resolution.details.hitOutcome;
        if (hit === 'MISS' && targetCoordBefore) {
          addFloatingText('MISS', 'miss', targetCoordBefore);
        }

        for (const event of resolution.details.events) {
          if (event.type === 'DAMAGE') {
            const unitPos =
              event.targetUnitId === targetUnitId && targetCoordBefore
                ? targetCoordBefore
                : state.arena.getUnitPosition(event.targetUnitId);
            if (unitPos) {
              const delay = event.reason === 'ATTACK' ? 0 : 350;
              const textType =
                event.reason === 'COLLISION' || event.reason === 'COLLATERAL'
                  ? 'slam'
                  : event.isCrit
                  ? 'crit'
                  : hit === 'GRAZE'
                  ? 'graze'
                  : 'damage';
              const prefix =
                event.reason === 'COLLISION'
                  ? 'SLAM! '
                  : event.reason === 'COLLATERAL'
                  ? 'COLLISION! '
                  : event.isCrit
                  ? 'CRITICAL! '
                  : hit === 'GRAZE'
                  ? 'GRAZE '
                  : '';
              setTimeout(() => {
                addFloatingText(`${prefix}-${event.amount}`, textType, unitPos);
              }, delay);
            }
          } else if (event.type === 'DISPLACEMENT' && event.kind === 'KNOCKBACK') {
            setTimeout(() => {
              addFloatingText('KNOCKBACK!', 'buff', event.toCoord);
            }, 250);
          } else if (event.type === 'STATUS_APPLIED') {
            const unitPos = state.arena.getUnitPosition(event.targetUnitId) ?? clickedCoord;
            setTimeout(() => {
              addFloatingText(
                `+${event.modifier.value} ${event.modifier.stat.toUpperCase()}`,
                'buff',
                unitPos
              );
            }, 200);
          }
        }
      } else if (resolution.type === 'BUFF') {
        addFloatingText(
          `+${resolution.modifierApplied.value} ${resolution.modifierApplied.stat.toUpperCase()}`,
          'buff',
          clickedCoord
        );
      }

      // XP Gain Float
      if (selectedAbility.archetypeTag && playerCoord) {
        setTimeout(() => {
          addFloatingText(
            `+1 ${selectedAbility.archetypeTag} XP`,
            'xp',
            playerCoord
          );
        }, 600);
      }
    },
    [addFloatingText]
  );

  return {
    floatingTexts,
    addFloatingText,
    clearFloatingTexts,
    dispatchResolutionFeedback
  };
}
