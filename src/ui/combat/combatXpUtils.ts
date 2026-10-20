import { CombatUnit } from '../../core/combat/types';
import { LEVEL_XP_THRESHOLDS } from '../../core/config/balance';
import { MAX_LEVEL } from '../../core/progression/pyramid';
import { Archetype } from '../../core/types/class';

/**
 * Maps an internal archetype identifier ('FIGHTER' | 'ROGUE' | 'MAGE') to its canonical
 * user-facing Discipline name ('Force' | 'Finesse' | 'Focus').
 */
export function formatDisciplineName(arch?: Archetype | string | null): string {
  if (!arch) return 'Universal';
  const upper = arch.toUpperCase();
  if (upper === 'FIGHTER') return 'Force';
  if (upper === 'ROGUE') return 'Finesse';
  if (upper === 'MAGE') return 'Focus';
  return arch;
}

/**
 * Maps an internal archetype identifier to its canonical three-letter shorthand ('FRC' | 'FIN' | 'FOC').
 */
export function formatDisciplineShort(arch?: Archetype | string | null): string {
  if (!arch) return 'UNI';
  const upper = arch.toUpperCase();
  if (upper === 'FIGHTER') return 'FRC';
  if (upper === 'ROGUE') return 'FIN';
  if (upper === 'MAGE') return 'FOC';
  return arch;
}

/**
 * Maps an internal archetype identifier to its canonical uppercase badge ('FORCE' | 'FINESSE' | 'FOCUS').
 */
export function formatDisciplineBadge(arch?: Archetype | string | null): string {
  return formatDisciplineName(arch).toUpperCase();
}


export interface AttributeXpProgress {
  readonly attribute: 'Force' | 'Finesse' | 'Focus';
  readonly shortLabel: 'FRC' | 'FIN' | 'FOC';
  readonly icon: string;
  readonly base: number;
  readonly inBattle: number;
  readonly total: number;
  readonly isReady: boolean;
  readonly className: string;
}

export interface CombatUnitXpSummary {
  readonly currentLevel: number;
  readonly isMaxLevel: boolean;
  readonly threshold: number;
  readonly attributes: readonly AttributeXpProgress[];
}

/**
 * Computes projected combat XP totals, current battle gains, threshold, and ascension readiness
 * across Force, Finesse, and Focus attributes for a combatant.
 */
export function getCombatUnitXpSummary(cu: CombatUnit): CombatUnitXpSummary {
  const currentLevel = cu.unit.progression?.currentLevel ?? 0;
  const isMaxLevel = currentLevel >= MAX_LEVEL;
  const threshold = isMaxLevel ? 0 : (LEVEL_XP_THRESHOLDS[currentLevel] ?? 5);

  const accumulated = cu.unit.progression?.accumulatedXp ?? {
    fighter: 0,
    rogue: 0,
    mage: 0
  };
  const inBattle = cu.inBattleXp ?? { fighter: 0, rogue: 0, mage: 0 };

  const configs = [
    {
      attribute: 'Force' as const,
      shortLabel: 'FRC' as const,
      icon: '⚔️',
      archKey: 'fighter' as const,
      className: 'attr-force'
    },
    {
      attribute: 'Finesse' as const,
      shortLabel: 'FIN' as const,
      icon: '🗡️',
      archKey: 'rogue' as const,
      className: 'attr-finesse'
    },
    {
      attribute: 'Focus' as const,
      shortLabel: 'FOC' as const,
      icon: '🔮',
      archKey: 'mage' as const,
      className: 'attr-focus'
    }
  ] as const;

  const attributes: AttributeXpProgress[] = configs.map((cfg) => {
    const base = accumulated[cfg.archKey] ?? 0;
    const battle = inBattle[cfg.archKey] ?? 0;
    const total = base + battle;
    const isReady = !isMaxLevel && threshold > 0 && total >= threshold;

    return {
      attribute: cfg.attribute,
      shortLabel: cfg.shortLabel,
      icon: cfg.icon,
      base,
      inBattle: battle,
      total,
      isReady,
      className: cfg.className
    };
  });

  return {
    currentLevel,
    isMaxLevel,
    threshold,
    attributes
  };
}
