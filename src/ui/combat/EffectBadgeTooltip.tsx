import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface EffectTooltipRow {
  readonly label: string;
  readonly value: string;
  readonly tone?: 'positive' | 'negative' | 'neutral';
}

export interface EffectBadgeTooltipProps {
  readonly title: string;
  readonly badge?: string;
  readonly rows: readonly EffectTooltipRow[];
  readonly summary?: string;
  readonly placement?: 'left' | 'top';
  readonly className?: string;
}

export const EffectBadgeTooltip: React.FC<EffectBadgeTooltipProps> = ({
  title,
  badge,
  rows,
  summary,
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
          const right = window.innerWidth - rect.left + 12;
          const top = Math.max(12, Math.min(window.innerHeight - 240, rect.top + rect.height / 2 - 48));
          setPos({ top, right });
        } else {
          const left = Math.max(12, Math.min(window.innerWidth - 260, rect.left));
          const top = Math.min(window.innerHeight - 220, rect.bottom + 8);
          setPos({ top, left });
        }
      } else {
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

  if (rows.length === 0 && !summary) {
    return null;
  }

  const tooltipContent = (
    <span
      className={`attack-roll-tooltip effect-badge-tooltip ${className} ${pos ? 'portal-floating' : ''}`}
      role="tooltip"
      data-testid="effect-badge-tooltip"
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
        <span className="rich-tooltip-title">{title}</span>
        {badge && <span className="rich-tooltip-net">{badge}</span>}
      </span>

      {rows.length > 0 && (
        <span className="attack-roll-components">
          {rows.map((row, idx) => (
            <span key={idx} className="attack-roll-component-row">
              <span className="comp-label">{row.label}</span>
              <span
                className={`comp-val ${
                  row.tone === 'positive' ? 'pos' : row.tone === 'negative' ? 'neg' : ''
                }`}
              >
                {row.value}
              </span>
            </span>
          ))}
        </span>
      )}

      {summary && <span className="attack-roll-formula-summary">{summary}</span>}
    </span>
  );

  if (!isBrowser) {
    return (
      <span ref={anchorRef} className="effect-badge-tooltip-anchor">
        {tooltipContent}
      </span>
    );
  }

  return (
    <span ref={anchorRef} className="effect-badge-tooltip-anchor" style={{ display: 'contents' }}>
      {isHovered && pos && typeof document !== 'undefined' && document.body
        ? createPortal(tooltipContent, document.body)
        : null}
    </span>
  );
};
