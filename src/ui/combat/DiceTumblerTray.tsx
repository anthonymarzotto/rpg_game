import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DiceRollBreakdown, DamageDieRoll } from '../../core/combat/types';
import './DiceTumblerTray.css';

export interface DiceTumblerTrayProps {
  readonly attackerName: string;
  readonly targetName: string;
  readonly abilityName: string;
  readonly diceBreakdown: DiceRollBreakdown;
  readonly onComplete: () => void;
  /** Instant completion without animation for unit testing */
  readonly instant?: boolean;
  /** Initial stage override (useful for testing settle states) */
  readonly initialStage?: RollStage;
}

export type RollStage =
  | 'STAGE1_TUMBLE'
  | 'STAGE1_SETTLE'
  | 'STAGE2_TUMBLE'
  | 'STAGE2_SETTLE'
  | 'COMPLETE';

/**
 * Procedural SVG Polyhedral D20 Die with faceted isometric shading.
 */
export const SvgD20: React.FC<{
  value: number;
  isDiscarded?: boolean;
  isCrit?: boolean;
  isMiss?: boolean;
  isTumbling?: boolean;
  displayNumber: number;
}> = ({ isDiscarded, isCrit, isMiss, isTumbling, displayNumber }) => {
  return (
    <div
      className={`dice-wrapper dice-d20 ${isTumbling ? 'tumbling' : 'settled'} ${
        isDiscarded ? 'discarded' : ''
      } ${isCrit ? 'crit' : ''} ${isMiss ? 'fumble' : ''}`}
      data-testid="die-d20"
    >
      <svg viewBox="0 0 100 100" className="polyhedral-svg">
        <defs>
          <linearGradient id="facetGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
          <linearGradient id="facetCyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>
          <linearGradient id="facetDark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>

        {/* Outer Hexagon Shell */}
        <polygon
          points="50,5 90,26 90,74 50,95 10,74 10,26"
          className="d20-outer-hex"
        />

        {/* Inner Facet Triangles creating 2.5D Icosahedral depth */}
        <polygon points="50,5 90,26 50,38" className="d20-facet facet-top-right" />
        <polygon points="50,5 10,26 50,38" className="d20-facet facet-top-left" />
        <polygon points="10,26 10,74 50,65" className="d20-facet facet-mid-left" />
        <polygon points="90,26 90,74 50,65" className="d20-facet facet-mid-right" />
        <polygon points="10,74 50,95 50,65" className="d20-facet facet-bot-left" />
        <polygon points="90,74 50,95 50,65" className="d20-facet facet-bot-right" />

        {/* Central Triangle Facet displaying the face value */}
        <polygon points="50,38 90,26 50,65" className="d20-center-facet" />
        <polygon points="50,38 10,26 50,65" className="d20-center-facet-left" />

        {/* Center Face Number */}
        <text x="50" y="56" className="d20-value-text" textAnchor="middle">
          {displayNumber}
        </text>
      </svg>
      {isDiscarded && <div className="die-discard-slash" title="Discarded Roll" />}
    </div>
  );
};

/**
 * Procedural SVG Polyhedral Damage Die (d4, d6, d8, d10, d12).
 */
export const SvgDamageDie: React.FC<{
  die: DamageDieRoll;
  displayNumber: number | string;
  isTumbling?: boolean;
}> = ({ die, displayNumber, isTumbling }) => {
  const sides = die.sides;

  let content: React.ReactNode;

  if (sides === 4) {
    // D4 Caltrop Tetrahedron (Equilateral Triangle with central isometric ridge)
    content = (
      <g>
        <polygon points="50,14 14,82 50,58" className="d4-facet-left" />
        <polygon points="50,14 86,82 50,58" className="d4-facet-right" />
        <polygon points="14,82 86,82 50,58" className="d4-facet-bottom" />
        <polygon points="50,14 86,82 14,82" className="d4-outer-border" fill="none" />
        <text x="50" y="52" className="damage-value-text" textAnchor="middle">
          {displayNumber}
        </text>
      </g>
    );
  } else if (sides === 6) {
    // D6 Isometric Cube (Top, Left, Right faces)
    content = (
      <g>
        <polygon points="50,12 88,34 50,56 12,34" className="d6-facet-top" />
        <polygon points="12,34 50,56 50,92 12,70" className="d6-facet-left" />
        <polygon points="50,56 88,34 88,70 50,92" className="d6-facet-right" />
        <polygon points="50,12 88,34 88,70 50,92 12,70 12,34" className="d6-outer-border" fill="none" />
        <text x="50" y="58" className="damage-value-text d6-text" textAnchor="middle">
          {displayNumber}
        </text>
      </g>
    );
  } else if (sides === 10) {
    // D10 Kite Pentagonal Trapezohedron
    content = (
      <g>
        <polygon points="50,8 14,36 50,52" className="d10-facet-top-left" />
        <polygon points="50,8 86,36 50,52" className="d10-facet-top-right" />
        <polygon points="14,36 26,82 50,94 50,52" className="d10-facet-bot-left" />
        <polygon points="86,36 74,82 50,94 50,52" className="d10-facet-bot-right" />
        <polygon points="50,8 86,36 74,82 50,94 26,82 14,36" className="d10-outer-border" fill="none" />
        <text x="50" y="58" className="damage-value-text" textAnchor="middle">
          {displayNumber}
        </text>
      </g>
    );
  } else if (sides === 12) {
    // D12 Dodecahedron (Central Pentagon surrounded by 5 facets)
    content = (
      <g>
        <polygon points="50,30 70,44 62,68 38,68 30,44" className="d12-center-pentagon" />
        <polygon points="50,30 30,44 14,26 50,12" className="d12-facet-top-left" />
        <polygon points="50,30 70,44 86,26 50,12" className="d12-facet-top-right" />
        <polygon points="70,44 62,68 88,74 86,26" className="d12-facet-right" />
        <polygon points="62,68 38,68 50,94 88,74" className="d12-facet-bot-right" />
        <polygon points="38,68 30,44 14,26 12,74 50,94" className="d12-facet-left" />
        <polygon points="50,12 86,26 88,74 50,94 12,74 14,26" className="d12-outer-border" fill="none" />
        <text x="50" y="55" className="damage-value-text" textAnchor="middle">
          {displayNumber}
        </text>
      </g>
    );
  } else {
    // D8 Octahedron Diamond (and generic fallback)
    content = (
      <g>
        <polygon points="50,8 90,50 50,92 10,50" className="d8-outer-diamond" />
        <polygon points="50,8 90,50 50,50" className="d8-facet-top-right" />
        <polygon points="50,8 10,50 50,50" className="d8-facet-top-left" />
        <polygon points="50,50 90,50 50,92" className="d8-facet-bot-right" />
        <polygon points="50,50 10,50 50,92" className="d8-facet-bot-left" />
        <text x="50" y="56" className="damage-value-text" textAnchor="middle">
          {displayNumber}
        </text>
      </g>
    );
  }

  return (
    <div
      className={`dice-wrapper dice-damage sides-${sides} ${isTumbling ? 'tumbling' : 'settled'}`}
      data-testid="die-damage"
    >
      <svg viewBox="0 0 100 100" className="polyhedral-svg">
        {content}
      </svg>
      <span className="die-label">d{sides}</span>
    </div>
  );
};

export const DICE_TRAY_TIMINGS = {
  STAGE1_TUMBLE_MS: 800,   // D20 tumble duration (~0.8s)
  STAGE1_SETTLE_MS: 1600,  // Pause on attack check vs defense & hit outcome (~1.6s)
  STAGE1_MISS_MS: 2000,    // Pause on miss before dismissing (~2.0s)
  STAGE2_TUMBLE_MS: 800,   // Damage dice tumble duration (~0.8s)
  STAGE2_SETTLE_MS: 1800,  // Pause on damage dice & total damage before finishing (~1.8s)
  NUMBER_CYCLE_MS: 50      // Dice face number cycling speed during tumble
} as const;

/**
 * Visual Dice Tumbler Tray: Top-center celestial clash banner providing
 * physical 2.5D tumbling dice for player combat actions.
 */
export const DiceTumblerTray: React.FC<DiceTumblerTrayProps> = ({
  attackerName,
  targetName,
  abilityName,
  diceBreakdown,
  onComplete,
  instant = false,
  initialStage
}) => {
  const [stage, setStage] = useState<RollStage>(
    instant ? 'COMPLETE' : (initialStage ?? 'STAGE1_TUMBLE')
  );
  const [d20DisplayNumbers, setD20DisplayNumbers] = useState<number[]>(
    initialStage === 'STAGE1_SETTLE' || initialStage === 'STAGE2_TUMBLE' || initialStage === 'STAGE2_SETTLE'
      ? [...diceBreakdown.d20Rolls]
      : diceBreakdown.d20Rolls.map(() => 10)
  );
  const [damageDisplayNumbers, setDamageDisplayNumbers] = useState<number[]>(
    diceBreakdown.damageDice.map((d) => d.roll)
  );

  const isCompletedRef = useRef(false);
  const finish = useCallback(() => {
    if (!isCompletedRef.current) {
      isCompletedRef.current = true;
      setStage('COMPLETE');
      onComplete();
    }
  }, [onComplete]);

  // Handle instant mode (e.g. unit tests or when disabled)
  useEffect(() => {
    if (instant) {
      finish();
    }
  }, [instant, finish]);

  // Stage 1: Attack Check Tumble & Settle
  useEffect(() => {
    if (instant || stage !== 'STAGE1_TUMBLE') return;

    // Cycle random d20 numbers rapidly during tumble
    const interval = setInterval(() => {
      setD20DisplayNumbers(diceBreakdown.d20Rolls.map(() => Math.floor(Math.random() * 20) + 1));
    }, DICE_TRAY_TIMINGS.NUMBER_CYCLE_MS);

    const tumbleTimer = setTimeout(() => {
      clearInterval(interval);
      setD20DisplayNumbers([...diceBreakdown.d20Rolls]);
      setStage('STAGE1_SETTLE');
    }, DICE_TRAY_TIMINGS.STAGE1_TUMBLE_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(tumbleTimer);
    };
  }, [stage, instant, diceBreakdown.d20Rolls]);

  // Stage 1 -> Stage 2 (or Dismiss on Miss)
  useEffect(() => {
    if (instant || stage !== 'STAGE1_SETTLE') return;

    const delay =
      diceBreakdown.hitOutcome === 'MISS' || diceBreakdown.damageDice.length === 0
        ? DICE_TRAY_TIMINGS.STAGE1_MISS_MS
        : DICE_TRAY_TIMINGS.STAGE1_SETTLE_MS;

    const timer = setTimeout(() => {
      if (diceBreakdown.hitOutcome === 'MISS' || diceBreakdown.damageDice.length === 0) {
        finish();
      } else {
        setStage('STAGE2_TUMBLE');
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [stage, instant, diceBreakdown.hitOutcome, diceBreakdown.damageDice.length, finish]);

  // Stage 2: Damage Dice Tumble & Settle
  useEffect(() => {
    if (instant || stage !== 'STAGE2_TUMBLE') return;

    const interval = setInterval(() => {
      setDamageDisplayNumbers(
        diceBreakdown.damageDice.map((d) => Math.floor(Math.random() * d.sides) + 1)
      );
    }, DICE_TRAY_TIMINGS.NUMBER_CYCLE_MS);

    const timer = setTimeout(() => {
      clearInterval(interval);
      setDamageDisplayNumbers(diceBreakdown.damageDice.map((d) => d.roll));
      setStage('STAGE2_SETTLE');
    }, DICE_TRAY_TIMINGS.STAGE2_TUMBLE_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [stage, instant, diceBreakdown.damageDice]);

  // Stage 2 Settle -> Finish
  useEffect(() => {
    if (instant || stage !== 'STAGE2_SETTLE') return;

    const timer = setTimeout(() => {
      finish();
    }, DICE_TRAY_TIMINGS.STAGE2_SETTLE_MS);

    return () => clearTimeout(timer);
  }, [stage, instant, finish]);

  // Global click-to-skip & Spacebar handler
  useEffect(() => {
    if (instant || stage === 'COMPLETE') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        finish();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [instant, stage, finish]);

  if (stage === 'COMPLETE') {
    return null;
  }

  const isAdvantage = diceBreakdown.advantage === 'ADVANTAGE';
  const isDisadvantage = diceBreakdown.advantage === 'DISADVANTAGE';
  const isCrit = diceBreakdown.hitOutcome === 'CRITICAL_HIT';
  const isGraze = diceBreakdown.hitOutcome === 'GRAZE';
  const isMiss = diceBreakdown.hitOutcome === 'MISS';

  const sign = diceBreakdown.netModifier >= 0 ? `+${diceBreakdown.netModifier}` : `${diceBreakdown.netModifier}`;
  const dmgModSign = diceBreakdown.damageModifier >= 0 ? `+${diceBreakdown.damageModifier}` : `${diceBreakdown.damageModifier}`;

  return (
    <div
      className="dice-tumbler-tray-overlay"
      onClick={finish}
      data-testid="dice-tumbler-tray"
    >
      <div
        className="dice-tumbler-tray-card"
        onClick={(e) => {
          e.stopPropagation();
          finish();
        }}
      >
        {/* Header Ribbon: Attacker -> Ability -> Target */}
        <div className="tray-header-ribbon">
          <div className="tray-combatant attacker">
            <span className="unit-name">{attackerName}</span>
            <span className="ability-badge">{abilityName}</span>
          </div>
          <div className="tray-versus">⚔️</div>
          <div className="tray-combatant target">
            <span className="unit-name">{targetName}</span>
            <span className="defense-badge">
              {diceBreakdown.defenseType} {diceBreakdown.targetDefense}
            </span>
          </div>
        </div>

        {/* Roll Stages Grid */}
        <div className="tray-stages-container">
          {/* Stage 1: Attack Check */}
          <div className="tray-stage stage-attack-check">
            <div className="stage-title">
              <span>Attack Check (d20)</span>
              {isAdvantage && <span className="advantage-pill advantage">ADVANTAGE</span>}
              {isDisadvantage && <span className="advantage-pill disadvantage">DISADVANTAGE</span>}
            </div>

            <div className="d20-rolls-row">
              {diceBreakdown.d20Rolls.map((roll, idx) => {
                const isDiscarded =
                  diceBreakdown.d20Rolls.length > 1 &&
                  (isAdvantage
                    ? roll < diceBreakdown.keptD20 || (roll === diceBreakdown.keptD20 && idx > 0 && diceBreakdown.d20Rolls[0] === roll)
                    : roll > diceBreakdown.keptD20 || (roll === diceBreakdown.keptD20 && idx > 0 && diceBreakdown.d20Rolls[0] === roll));

                return (
                  <SvgD20
                    key={idx}
                    value={roll}
                    displayNumber={d20DisplayNumbers[idx] ?? roll}
                    isDiscarded={stage !== 'STAGE1_TUMBLE' && isDiscarded}
                    isCrit={stage !== 'STAGE1_TUMBLE' && !isDiscarded && isCrit}
                    isMiss={stage !== 'STAGE1_TUMBLE' && !isDiscarded && isMiss}
                    isTumbling={stage === 'STAGE1_TUMBLE'}
                  />
                );
              })}
            </div>

            {/* Score Equation */}
            <div className="tray-equation">
              <span className="die-val">{diceBreakdown.keptD20}</span>
              <span className="mod-val">{sign}</span>
              <span className="equals">=</span>
              <span className={`score-val ${isCrit ? 'crit' : ''}`}>
                {diceBreakdown.totalScore}
              </span>
              <span className="vs-label">vs {diceBreakdown.targetDefense}</span>
            </div>

            {/* Hit Outcome Stamp */}
            {stage !== 'STAGE1_TUMBLE' && (
              <div
                className={`hit-outcome-stamp ${
                  isCrit
                    ? 'stamp-crit'
                    : isMiss
                    ? 'stamp-miss'
                    : isGraze
                    ? 'stamp-graze'
                    : 'stamp-solid'
                }`}
              >
                {isCrit
                  ? 'CRITICAL HIT!'
                  : isMiss
                  ? 'EVADED / MISS'
                  : isGraze
                  ? 'GRAZE (50%)'
                  : 'SOLID HIT!'}
              </div>
            )}
          </div>

          {/* Stage 2: Damage Dice (Always visible if ability has damage dice, preserving spoiler-free layout) */}
          {diceBreakdown.damageDice.length > 0 && (
            <div
              className={`tray-stage stage-damage ${
                stage === 'STAGE2_TUMBLE' || stage === 'STAGE2_SETTLE'
                  ? 'active'
                  : isMiss && stage !== 'STAGE1_TUMBLE'
                  ? 'missed'
                  : 'pending'
              }`}
            >
              <div className="stage-title">Damage Roll</div>
              <div className="damage-rolls-row">
                {diceBreakdown.damageDice.map((d, idx) => {
                  const isPending = stage === 'STAGE1_TUMBLE' || (stage === 'STAGE1_SETTLE' && !isMiss);
                  const showMissed = isMiss && stage !== 'STAGE1_TUMBLE';
                  const disp = isPending ? '?' : showMissed ? '-' : (damageDisplayNumbers[idx] ?? d.roll);

                  return (
                    <SvgDamageDie
                      key={idx}
                      die={d}
                      displayNumber={disp}
                      isTumbling={stage === 'STAGE2_TUMBLE'}
                    />
                  );
                })}
              </div>

              {/* Damage Equation */}
              <div className="tray-equation damage-equation">
                {stage === 'STAGE1_TUMBLE' ? (
                  <span className="pending-text">Awaiting Attack Check...</span>
                ) : isMiss ? (
                  <span className="missed-text">0 DMG (Attack Evaded)</span>
                ) : stage === 'STAGE1_SETTLE' ? (
                  <span className="pending-text">Hit Confirmed! Rolling...</span>
                ) : (
                  <>
                    <span className="die-val">
                      {diceBreakdown.damageDice.reduce((sum, d) => sum + d.roll, 0)}
                    </span>
                    <span className="mod-val">{dmgModSign}</span>
                    <span className="equals">=</span>
                    <span className="score-val dmg-val">{diceBreakdown.totalDamage} DMG</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Skip Hint */}
        <div className="tray-skip-hint">Click or press Space to skip</div>
      </div>
    </div>
  );
};
