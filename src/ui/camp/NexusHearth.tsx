import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Unit } from '../../core/types/unit';
import { resolvePixelRotationPath } from '../combat/tokenAssets';
import { CosmicSprite } from '../common/CosmicSprite';
import { checkHeroLevelReady, getHeroDisplayTitle } from './heroUtils';
import {
  CAMPFIRE_POS,
  HearthSimulationState,
  createInitialHearthState,
  finishHearthTransitions,
  stepHearthSimulation,
  syncHearthRoster
} from './hearthSimulation';
import './NexusHearth.css';

const rawBase =
  typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL
    ? import.meta.env.BASE_URL
    : './';
const BASE_URL = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
export const CAMPFIRE_ASSET_URL = `${BASE_URL}assets/objects/campfire/campfire.gif`;

const SPRITE_PATROL_WAYPOINTS = [
  { x: 50, y: 26 },
  { x: 60, y: 33 },
  { x: 50, y: 31 },
  { x: 40, y: 33 }
] as const;

export const COSMIC_SPRITE_WHISPERS: readonly string[] = [
  'The twilight breeze carries cedar smoke and warm starlight.',
  'A gentle golden pulse dances above the hearth.',
  'The constellations watch kindly over your company.',
  'Hovering curiously near the simmering trail kettle.',
  'Calm starlight currents drift along the colonnade.'
];

export interface NexusHearthProps {
  readonly roster: readonly Unit[];
  readonly activeSquadIds: readonly string[];
  readonly hoveredHeroId?: string | null;
  readonly onInspectHero: (unit: Unit) => void;
  readonly onHoverHero?: (unitId: string | null) => void;
}

export function NexusHearth({
  roster,
  activeSquadIds,
  hoveredHeroId = null,
  onInspectHero,
  onHoverHero
}: NexusHearthProps) {
  const [hearthState, setHearthState] = useState<HearthSimulationState>(() =>
    createInitialHearthState(roster, activeSquadIds)
  );
  const [patrolIndex, setPatrolIndex] = useState(0);
  const [spritePulsing, setSpritePulsing] = useState(false);
  const [whisperText, setWhisperText] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  const whisperIndexRef = useRef(0);
  const whisperTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect prefers-reduced-motion cleanly in browser environments
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
    return undefined;
  }, []);

  // Reconcile roster / active squad changes smoothly
  useEffect(() => {
    setHearthState((prev) => {
      const synced = syncHearthRoster(prev, roster, activeSquadIds);
      return reducedMotion ? finishHearthTransitions(synced) : synced;
    });

    if (reducedMotion) return;
    if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
    settleTimeoutRef.current = setTimeout(() => {
      setHearthState((prev) => finishHearthTransitions(prev));
    }, 2200);
  }, [roster, activeSquadIds, reducedMotion]);

  // Cozy staggered milling & edge-cycling interval
  useEffect(() => {
    if (reducedMotion) return;

    const interval = setInterval(() => {
      setHearthState((prev) => stepHearthSimulation(prev, roster, activeSquadIds));
      if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
      settleTimeoutRef.current = setTimeout(() => {
        setHearthState((prev) => finishHearthTransitions(prev));
      }, 2200);
    }, 4200);

    return () => {
      clearInterval(interval);
      if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
    };
  }, [roster, activeSquadIds, reducedMotion]);

  // Gentle Cosmic Sprite ambient patrol around the fire when no Wayfarer is hovered
  useEffect(() => {
    if (reducedMotion) return;
    const patrolTimer = setInterval(() => {
      setPatrolIndex((idx) => (idx + 1) % SPRITE_PATROL_WAYPOINTS.length);
    }, 4800);
    return () => clearInterval(patrolTimer);
  }, [reducedMotion]);

  // Cleanup click timers on unmount
  useEffect(() => {
    return () => {
      if (whisperTimeoutRef.current) clearTimeout(whisperTimeoutRef.current);
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
      if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
    };
  }, []);

  const unitById = useMemo(() => {
    const map = new Map<string, Unit>();
    for (const unit of roster) {
      map.set(unit.id, unit);
    }
    return map;
  }, [roster]);

  // Compute Cosmic Sprite target coordinates (drifts toward hovered Wayfarer, else patrols hearth)
  const spritePosition = useMemo(() => {
    if (hoveredHeroId) {
      const hoveredActor = hearthState.actors.find(
        (a) => a.unitId === hoveredHeroId && a.phase !== 'departing'
      );
      if (hoveredActor) {
        return {
          x: Math.min(90, Math.max(10, hoveredActor.x + (hoveredActor.x >= 50 ? -5 : 5))),
          y: Math.max(15, hoveredActor.y - 16)
        };
      }
    }
    return SPRITE_PATROL_WAYPOINTS[patrolIndex];
  }, [hoveredHeroId, hearthState.actors, patrolIndex]);

  const handleSpriteClick = useCallback(() => {
    const nextWhisper =
      COSMIC_SPRITE_WHISPERS[whisperIndexRef.current % COSMIC_SPRITE_WHISPERS.length];
    whisperIndexRef.current += 1;

    setSpritePulsing(true);
    setWhisperText(nextWhisper);

    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    pulseTimeoutRef.current = setTimeout(() => setSpritePulsing(false), 800);

    if (whisperTimeoutRef.current) clearTimeout(whisperTimeoutRef.current);
    whisperTimeoutRef.current = setTimeout(() => setWhisperText(null), 3600);
  }, []);

  return (
    <section
      className={`nexus-hearth ${reducedMotion ? 'nexus-hearth--reduced-motion' : ''}`}
      aria-label="The Nexus Hearth"
      data-testid="nexus-hearth"
    >
      {/* Subtle ambient labels */}
      <div className="nexus-hearth-overlay-bar">
        <span className="nexus-hearth-label font-display">✦ The Nexus Hearth</span>
        <span className="nexus-hearth-count font-mono">
          {roster.length} {roster.length === 1 ? 'Wayfarer' : 'Wayfarers'} in Company
        </span>
      </div>

      {/* Twilight stone plaza backdrop */}
      <div className="nexus-hearth-stage">
        <div className="nexus-hearth-stars" aria-hidden="true" />
        <div className="nexus-hearth-plaza" aria-hidden="true" />

        {/* Warm flickering firelight pool */}
        <div
          className="nexus-hearth-firelight"
          style={{ left: `${CAMPFIRE_POS.x}%`, top: `${CAMPFIRE_POS.y}%` }}
          aria-hidden="true"
        />

        {/* Animated Pixel Campfire Centerpiece */}
        <div
          className="nexus-hearth-campfire"
          style={{
            left: `${CAMPFIRE_POS.x}%`,
            top: `${CAMPFIRE_POS.y}%`,
            zIndex: Math.round(CAMPFIRE_POS.y)
          }}
          data-testid="nexus-hearth-campfire"
        >
          <img
            src={CAMPFIRE_ASSET_URL}
            alt="Crackling Nexus campfire"
            className="nexus-hearth-campfire-img pixel-art"
          />
        </div>

        {/* Gathered Company Wayfarers */}
        {hearthState.actors.map((actor) => {
          const unit = unitById.get(actor.unitId);
          if (!unit) return null;

          const spriteSrc = resolvePixelRotationPath(unit, actor.facing);
          const isReady = checkHeroLevelReady(unit).isReady;
          const isHovered = hoveredHeroId === unit.id;
          const displayTitle = getHeroDisplayTitle(unit);

          const actorClasses = [
            'hearth-wayfarer',
            actor.isStaged ? 'hearth-wayfarer--staged' : 'hearth-wayfarer--resting',
            actor.phase === 'walking' ? 'hearth-wayfarer--walking' : '',
            actor.phase === 'departing' ? 'hearth-wayfarer--departing' : '',
            actor.phase === 'arriving' && actor.entryEdge
              ? `hearth-wayfarer--arriving-${actor.entryEdge}`
              : '',
            isHovered ? 'hearth-wayfarer--hovered' : ''
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={unit.id}
              type="button"
              className={actorClasses}
              style={{
                left: `${actor.x}%`,
                top: `${actor.y}%`,
                zIndex: isHovered ? 88 : Math.round(actor.y),
                opacity: actor.opacity
              }}
              onClick={() => onInspectHero(unit)}
              onMouseEnter={() => onHoverHero?.(unit.id)}
              onMouseLeave={() => onHoverHero?.(null)}
              onFocus={() => onHoverHero?.(unit.id)}
              onBlur={() => onHoverHero?.(null)}
              aria-label={`Inspect ${unit.name}, Lv ${unit.progression.currentLevel} ${displayTitle}${isReady ? ', Ascension Ready' : ''}`}
              data-testid={`hearth-wayfarer-${unit.id}`}
              data-staged={actor.isStaged ? 'true' : 'false'}
              data-facing={actor.facing}
            >
              {isReady && (
                <span
                  className="hearth-ascension-spark"
                  title="Ascension Ready"
                  data-testid={`hearth-ascension-spark-${unit.id}`}
                  aria-hidden="true"
                >
                  ✦
                </span>
              )}

              <span className="hearth-wayfarer-nameplate font-ui">
                <span className="hearth-nameplate-name">{unit.name}</span>
                <span className="hearth-nameplate-role font-mono">{displayTitle}</span>
              </span>

              <span className="hearth-wayfarer-body">
                {spriteSrc ? (
                  <img
                    src={spriteSrc}
                    alt=""
                    className="hearth-wayfarer-sprite pixel-art"
                  />
                ) : (
                  <span className="hearth-wayfarer-fallback font-display">
                    {unit.name.charAt(0)}
                  </span>
                )}
              </span>

              <span className="hearth-wayfarer-shadow" aria-hidden="true" />
            </button>
          );
        })}

        {/* Floating Cosmic Sprite Companion */}
        <div
          className="hearth-cosmic-sprite-anchor"
          style={{
            left: `${spritePosition.x}%`,
            top: `${spritePosition.y}%`,
            zIndex: 92
          }}
        >
          {whisperText && (
            <div
              className="hearth-sprite-whisper font-ui"
              role="status"
              data-testid="hearth-sprite-whisper"
            >
              {whisperText}
            </div>
          )}
          <CosmicSprite
            size="md"
            interactive={true}
            pulsing={spritePulsing}
            onClick={handleSpriteClick}
            ariaLabel="Cosmic Sprite companion — click for a gentle starlight whisper"
            title="Your Cosmic Sprite companion"
            testId="hearth-cosmic-sprite"
          />
        </div>
      </div>
    </section>
  );
}
