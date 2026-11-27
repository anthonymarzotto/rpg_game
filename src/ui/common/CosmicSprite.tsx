import { useId } from 'react';
import './CosmicSprite.css';

export type CosmicSpriteSize = 'sm' | 'md' | 'lg';

export interface CosmicSpriteProps {
  readonly size?: CosmicSpriteSize;
  readonly interactive?: boolean;
  readonly pulsing?: boolean;
  readonly onClick?: () => void;
  readonly ariaLabel?: string;
  readonly title?: string;
  readonly className?: string;
  readonly testId?: string;
}

export function CosmicSprite({
  size = 'md',
  interactive = false,
  pulsing = false,
  onClick,
  ariaLabel = 'Cosmic Sprite companion',
  title,
  className = '',
  testId = 'cosmic-sprite'
}: CosmicSpriteProps) {
  const uid = useId().replace(/:/g, '');
  const auraGradId = `sprite-aura-${uid}`;
  const coreGradId = `sprite-core-${uid}`;

  const classes = [
    'cosmic-sprite',
    `cosmic-sprite--${size}`,
    interactive || onClick ? 'cosmic-sprite--interactive' : '',
    pulsing ? 'cosmic-sprite--pulsing' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  const svgGraphic = (
    <span className="cosmic-sprite-float">
      <svg
        className="cosmic-sprite-svg"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={auraGradId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.9" />
            <stop offset="38%" stopColor="#f6c478" stopOpacity="0.42" />
            <stop offset="72%" stopColor="#a78bfa" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={coreGradId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#f59e0b" />
          </radialGradient>
        </defs>

        {/* Soft twilight + warm lantern aura */}
        <circle className="cosmic-sprite-aura" cx="32" cy="32" r="26" fill={`url(#${auraGradId})`} />

        {/* Subtle luminous star rays */}
        <path
          className="cosmic-sprite-star"
          d="M32 10 L35.2 26.8 L52 32 L35.2 37.2 L32 54 L28.8 37.2 L12 32 L28.8 26.8 Z"
          fill={`url(#${coreGradId})`}
        />

        {/* Diagonal secondary glint */}
        <path
          className="cosmic-sprite-glint"
          d="M32 19 L34 29 L44 32 L34 35 L32 45 L30 35 L20 32 L30 29 Z"
          transform="rotate(45 32 32)"
          fill="#fef9c3"
          fillOpacity="0.65"
        />

        {/* Warm glowing center */}
        <circle cx="32" cy="32" r="5.5" fill="#fffbeb" />
      </svg>

      {/* Orbiting stardust motes */}
      <span className="cosmic-sprite-orbit cosmic-sprite-orbit--outer" aria-hidden="true">
        <span className="cosmic-sprite-mote cosmic-sprite-mote--gold" />
      </span>
      <span className="cosmic-sprite-orbit cosmic-sprite-orbit--inner" aria-hidden="true">
        <span className="cosmic-sprite-mote cosmic-sprite-mote--cyan" />
      </span>
    </span>
  );

  if (interactive || onClick) {
    return (
      <button
        type="button"
        className={classes}
        onClick={onClick}
        aria-label={ariaLabel}
        title={title ?? ariaLabel}
        data-testid={testId}
      >
        {svgGraphic}
      </button>
    );
  }

  return (
    <span className={classes} aria-hidden="true" data-testid={testId}>
      {svgGraphic}
    </span>
  );
}
