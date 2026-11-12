import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DamageBreakdownComponent } from '../../core/combat/types';

export interface DamageRollTooltipProps {
  readonly breakdown?: readonly DamageBreakdownComponent[];
  readonly totalDamage?: number | string;
  readonly formulaSummary?: string;
  readonly placement?: 'left' | 'top';
  readonly className?: string;
}

export function formatDamageBreakdown(breakdown?: string): string {
  if (!breakdown) return '';
  return breakdown
    .replace(/\s*[+-]\s*0\s+(?:Armor|Ward)\b/gi, '')
    .replace(/(\]|\))\s*[+-]\s*0\b/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export const DamageRollTooltip: React.FC<DamageRollTooltipProps> = ({
  breakdown,
  totalDamage,
  formulaSummary,
  placement = 'top',
  className = ''
}) => {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [pos, setPos] = useState<{
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
    centerHorizontally?: boolean;
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
          const right = window.innerWidth - rect.left + 12;
          const top = Math.max(12, Math.min(window.innerHeight - 240, rect.top + rect.height / 2 - 60));
          setPos({ top, right, centerHorizontally: false });
        } else {
          const left = Math.max(12, Math.min(window.innerWidth - 260, rect.left));
          const top = Math.min(window.innerHeight - 220, rect.bottom + 8);
          setPos({ top, left, centerHorizontally: false });
        }
      } else {
        const logContainer = parent.closest('.combat-log-container');
        const containerRect = logContainer?.getBoundingClientRect();
        const minLeft = containerRect ? containerRect.left + 125 : 140;
        const maxLeft = containerRect
          ? Math.max(minLeft, containerRect.right - 125)
          : window.innerWidth - 140;
        const left = Math.max(minLeft, Math.min(maxLeft, rect.left + rect.width / 2));
        if (rect.top < 160) {
          const top = rect.bottom + 8;
          setPos({ top, left, centerHorizontally: true });
        } else {
          const bottom = window.innerHeight - rect.top + 8;
          setPos({ bottom, left, centerHorizontally: true });
        }
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

  const visibleBreakdown =
    breakdown?.filter((comp) => comp.value !== 0 || Boolean(comp.displayValue)) ?? [];

  if (visibleBreakdown.length === 0) {
    return null;
  }

  const cleanedFormula = formatDamageBreakdown(formulaSummary);

  const tooltipContent = (
    <span
      className={`attack-roll-tooltip damage-roll-tooltip ${className} ${pos ? 'portal-floating' : ''}`}
      role="tooltip"
      data-testid="damage-roll-tooltip"
      style={
        pos
          ? {
              position: 'fixed',
              top: pos.top !== undefined ? `${pos.top}px` : undefined,
              right: pos.right !== undefined ? `${pos.right}px` : undefined,
              bottom: pos.bottom !== undefined ? `${pos.bottom}px` : undefined,
              left: pos.left !== undefined ? `${pos.left}px` : undefined,
              transform: pos.centerHorizontally ? 'translateX(-50%)' : undefined,
              zIndex: 9999,
              pointerEvents: 'none'
            }
          : undefined
      }
    >
      <span className="rich-tooltip-header">
        <span className="rich-tooltip-title">💥 Damage Breakdown</span>
        {totalDamage !== undefined && (
          <span className="rich-tooltip-net damage-net">{totalDamage} DMG</span>
        )}
      </span>

      <span className="attack-roll-components damage-roll-components">
        {visibleBreakdown.map((comp, idx) => {
          const isDice = comp.source === 'DICE' || comp.source === 'BONUS_DICE' || comp.source === 'CRIT_MAX';
          const formattedVal = comp.displayValue
            ? `${comp.displayValue} (${comp.value >= 0 ? `+${comp.value}` : `${comp.value}`})`
            : isDice
            ? `${comp.value}`
            : comp.value >= 0
            ? `+${comp.value}`
            : `${comp.value}`;

          return (
            <span
              key={idx}
              className={`attack-roll-component-row comp-${comp.source.toLowerCase()}`}
              data-testid={`damage-mod-component-${comp.source.toLowerCase()}`}
            >
              <span className="comp-label">{comp.label}</span>
              <span
                className={`comp-val ${
                  comp.source === 'MITIGATION' || comp.value < 0
                    ? 'neg'
                    : comp.source === 'CRIT_MAX'
                    ? 'crit'
                    : 'pos'
                }`}
              >
                {formattedVal}
              </span>
            </span>
          );
        })}
      </span>

      {cleanedFormula && (
        <span className="attack-roll-formula-summary damage-formula-summary">
          {cleanedFormula}
        </span>
      )}
    </span>
  );

  if (!isBrowser) {
    return (
      <span ref={anchorRef} className="damage-roll-tooltip-anchor">
        {tooltipContent}
      </span>
    );
  }

  return (
    <span ref={anchorRef} className="damage-roll-tooltip-anchor" style={{ display: 'contents' }}>
      {isHovered && pos && typeof document !== 'undefined' && document.body
        ? createPortal(tooltipContent, document.body)
        : null}
    </span>
  );
};

