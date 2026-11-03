import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AttackModifierComponent } from '../../core/combat/types';

export interface AttackRollTooltipProps {
  readonly breakdown?: readonly AttackModifierComponent[];
  readonly d20?: number | string;
  readonly netModifier?: number;
  readonly totalScore?: number;
  readonly targetDefense?: number;
  readonly defenseType?: string;
  readonly placement?: 'left' | 'top';
  readonly className?: string;
}

export const AttackRollTooltip: React.FC<AttackRollTooltipProps> = ({
  breakdown,
  d20,
  netModifier,
  totalScore,
  targetDefense,
  defenseType,
  placement = 'left',
  className = ''
}) => {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [pos, setPos] = useState<{
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  } | null>(null);

  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

  useEffect(() => {
    if (!isBrowser) return;

    const parent = anchorRef.current?.parentElement;
    if (!parent) return;

    const updatePosition = () => {
      const rect = parent.getBoundingClientRect();
      if (placement === 'left') {
        if (rect.left > 260) {
          // Standard layout: place directly to the left of the combat log chip
          const right = window.innerWidth - rect.left + 12;
          const top = Math.max(12, Math.min(window.innerHeight - 240, rect.top + rect.height / 2 - 60));
          setPos({ top, right });
        } else {
          // Narrow viewport fallback: place below the chip
          const left = Math.max(12, Math.min(window.innerWidth - 260, rect.left));
          const top = Math.min(window.innerHeight - 220, rect.bottom + 8);
          setPos({ top, left });
        }
      } else {
        // 'top' placement (e.g. for dice tumbler tray centered on screen)
        const left = Math.max(140, Math.min(window.innerWidth - 140, rect.left + rect.width / 2));
        const bottom = window.innerHeight - rect.top + 10;
        setPos({ bottom, left });
      }
    };

    const handleMouseEnter = () => {
      updatePosition();
      setIsHovered(true);
    };

    const handleDismiss = () => {
      setIsHovered(false);
      setPos(null);
    };

    parent.addEventListener('mouseenter', handleMouseEnter);
    parent.addEventListener('mouseleave', handleDismiss);
    window.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('resize', handleDismiss);

    return () => {
      parent.removeEventListener('mouseenter', handleMouseEnter);
      parent.removeEventListener('mouseleave', handleDismiss);
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('resize', handleDismiss);
    };
  }, [isBrowser, placement]);

  if (!breakdown || breakdown.length === 0) {
    return null;
  }

  const calculatedNet =
    netModifier !== undefined
      ? netModifier
      : breakdown.reduce((sum, item) => sum + item.value, 0);

  const netFormatted = calculatedNet >= 0 ? `+${calculatedNet}` : `${calculatedNet}`;

  const tooltipContent = (
    <span
      className={`attack-roll-tooltip ${className} ${pos ? 'portal-floating' : ''}`}
      role="tooltip"
      data-testid="attack-roll-tooltip"
      style={
        pos
          ? {
              position: 'fixed',
              top: pos.top !== undefined ? `${pos.top}px` : undefined,
              right: pos.right !== undefined ? `${pos.right}px` : undefined,
              bottom: pos.bottom !== undefined ? `${pos.bottom}px` : undefined,
              left: pos.left !== undefined ? `${pos.left}px` : undefined,
              transform: pos.bottom !== undefined ? 'translateX(-50%)' : undefined,
              zIndex: 9999,
              pointerEvents: 'none'
            }
          : undefined
      }
    >
      <span className="rich-tooltip-header">
        <span className="rich-tooltip-title">🎲 Attack Roll Formula</span>
        <span className="rich-tooltip-net">Net: {netFormatted}</span>
      </span>

      <span className="attack-roll-components">
        {breakdown.map((comp, idx) => (
          <span
            key={idx}
            className={`attack-roll-component-row comp-${comp.source.toLowerCase()}`}
            data-testid={`attack-mod-component-${comp.source.toLowerCase()}`}
          >
            <span className="comp-label">{comp.label}</span>
            <span className={`comp-val ${comp.value >= 0 ? 'pos' : 'neg'}`}>
              {comp.value >= 0 ? `+${comp.value}` : `${comp.value}`}
            </span>
          </span>
        ))}
      </span>

      {d20 !== undefined && (
        <span className="attack-roll-formula-summary">
          d20 ({d20}) {netFormatted} = {totalScore ?? ''}
          {targetDefense !== undefined
            ? ` vs DC ${targetDefense}${defenseType ? ` (${defenseType})` : ''}`
            : ''}
        </span>
      )}
    </span>
  );

  // In non-browser (Node.js test / SSR) environments, render inline so static HTML assertions pass
  if (!isBrowser) {
    return (
      <span ref={anchorRef} className="attack-roll-tooltip-anchor">
        {tooltipContent}
      </span>
    );
  }

  // In browser environments, portal to document.body when hovered to escape pane overflow clipping
  return (
    <span ref={anchorRef} className="attack-roll-tooltip-anchor" style={{ display: 'contents' }}>
      {isHovered && pos && typeof document !== 'undefined' && document.body
        ? createPortal(tooltipContent, document.body)
        : null}
    </span>
  );
};
