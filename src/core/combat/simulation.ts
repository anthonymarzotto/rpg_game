import { Unit, Faction } from '../types/unit';
import { TriadAttributes } from '../types/stats';
import { HexCoord } from '../grid/hex';
import { createRecruit } from '../units/unitFactory';
import { computeDerivedVitals } from '../units/vitals';
import { CLASS_CATALOG } from '../../data/classes';
import { buildEncounterState, EncounterDefinition } from './encounter';
import { executeAiTurn } from '../ai/decisionEngine';
import { SeededDiceRoller } from './dice';

export interface SimulationCombatantConfig {
  readonly id?: string;
  readonly name?: string;
  readonly classId: string;
  readonly level?: number;
  readonly baseAttributes?: Partial<TriadAttributes>;
  readonly wildcardAbilityIds?: readonly string[];
  readonly wildcardPassiveIds?: readonly string[];
}

export interface CombatSimulationOptions {
  readonly combatantA: SimulationCombatantConfig;
  readonly combatantB: SimulationCombatantConfig;
  readonly trials?: number;
  readonly maxTurnsPerTrial?: number;
  readonly arenaRadius?: number;
  readonly startingCoords?: {
    readonly a: HexCoord;
    readonly b: HexCoord;
  };
  readonly alternateFactions?: boolean;
  readonly baseSeed?: number;
}

export interface CombatantMetrics {
  readonly name: string;
  readonly classId: string;
  readonly wins: number;
  readonly winRatePercent: number;
  readonly totalTurns: number;
  readonly avgTurnsPerTrial: number;
  readonly turnSharePercent: number;
  readonly totalDamageDealt: number;
  readonly avgDamageDealt: number;
  readonly totalXpCurrent: number;
  readonly avgXpCurrent: number;
  readonly totalXpDirectionA: number;
  readonly avgXpDirectionA: number;
  readonly abilityUsages: Readonly<Record<string, number>>;
}

export interface SimulationResult {
  readonly trials: number;
  readonly totalTurns: number;
  readonly avgTurnsPerTrial: number;
  readonly timeouts: number;
  readonly timeoutRatePercent: number;
  readonly combatantA: CombatantMetrics;
  readonly combatantB: CombatantMetrics;
}

/**
 * Creates a fully initialized combatant Unit configured for automated simulations.
 * Automatically derives standard base attributes from class requirements if not explicitly specified.
 */
export function createSimulatedCombatant(
  config: SimulationCombatantConfig,
  faction: Faction = 'PLAYER',
  suffix = '1'
): Unit {
  const classDef = CLASS_CATALOG.find((c) => c.id === config.classId);
  const id = config.id ?? `${config.classId}-${suffix}`;
  const name = config.name ?? classDef?.name ?? config.classId;
  const level = config.level ?? (classDef?.totalPoints ?? 3);

  const defaultForce = classDef?.requirements.fighter ?? 1;
  const defaultFinesse = classDef?.requirements.rogue ?? 0;
  const defaultFocus = classDef?.requirements.mage ?? 0;

  const baseAttributes: TriadAttributes = {
    force: config.baseAttributes?.force ?? defaultForce,
    finesse: config.baseAttributes?.finesse ?? defaultFinesse,
    focus: config.baseAttributes?.focus ?? defaultFocus
  };

  const recruit = createRecruit(id, name, {
    faction,
    loadout: {
      activeClassId: config.classId,
      wildcardAbilityIds: config.wildcardAbilityIds ? [...config.wildcardAbilityIds] : [],
      wildcardPassiveIds: config.wildcardPassiveIds ? [...config.wildcardPassiveIds] : [],
      earnedShards: [],
      slotAugments: {}
    }
  });

  return {
    ...recruit,
    baseAttributes,
    effectiveVitals: computeDerivedVitals(baseAttributes, level)
  };
}

/**
 * Executes a batch of automated headless 1v1 combat trials between two combatant definitions.
 * Evaluates win rates, turn economy shares, damage outputs, timeouts, and XP generation under both
 * the current system (1 XP / action) and Direction A (XP = ability.apCost).
 */
export function runCombatSimulation(options: CombatSimulationOptions): SimulationResult {
  const trials = options.trials ?? 50;
  const maxTurnsPerTrial = options.maxTurnsPerTrial ?? 100;
  const arenaRadius = options.arenaRadius ?? 3;
  const coordA = options.startingCoords?.a ?? { q: -1, r: 0 };
  const coordB = options.startingCoords?.b ?? { q: 2, r: 0 };
  const alternateFactions = options.alternateFactions ?? true;
  const baseSeed = options.baseSeed ?? 42000;

  let totalTurns = 0;
  let timeouts = 0;
  let winsA = 0;
  let winsB = 0;

  let turnsA = 0;
  let turnsB = 0;
  let totalDmgA = 0;
  let totalDmgB = 0;
  let totalXpCurA = 0;
  let totalXpCurB = 0;
  let totalXpDirAA = 0;
  let totalXpDirAB = 0;

  const usagesA: Record<string, number> = {};
  const usagesB: Record<string, number> = {};

  let resolvedNameA = options.combatantA.name;
  let resolvedNameB = options.combatantB.name;

  for (let i = 0; i < trials; i++) {
    const factionA: Faction = alternateFactions && i % 2 === 1 ? 'ENEMY' : 'PLAYER';
    const factionB: Faction = factionA === 'PLAYER' ? 'ENEMY' : 'PLAYER';

    const unitA = createSimulatedCombatant(options.combatantA, factionA, 'A');
    const unitB = createSimulatedCombatant(options.combatantB, factionB, 'B');

    resolvedNameA = unitA.name;
    resolvedNameB = unitB.name;

    const encounter: EncounterDefinition = {
      id: `sim-trial-${i}`,
      name: `Simulation Duel ${i + 1}`,
      arenaRadius,
      units: [
        { unit: unitA, coord: coordA },
        { unit: unitB, coord: coordB }
      ],
      objectives: [
        {
          id: 'obj-defeat-opponents',
          description: 'Defeat all opponents',
          condition: {
            kind: 'FACTION_DEFEATED',
            faction: factionA === 'PLAYER' ? 'ENEMY' : 'PLAYER'
          }
        }
      ]
    };

    const diceRoller = new SeededDiceRoller(baseSeed + i * 17);
    const state = buildEncounterState(encounter, diceRoller);

    let trialTurns = 0;
    while (state.outcome === 'IN_PROGRESS' && trialTurns < maxTurnsPerTrial) {
      trialTurns++;
      const activeId = state.activeUnitId;
      const isActorA = activeId === unitA.id;
      const isActorB = activeId === unitB.id;

      if (isActorA) turnsA++;
      else if (isActorB) turnsB++;

      const actions = executeAiTurn(state, activeId, { diceRoller });
      for (const act of actions) {
        if (act.type === 'ABILITY') {
          const abId = act.ability.id;
          const apCost = act.ability.apCost ?? 1;
          if (isActorA) {
            usagesA[abId] = (usagesA[abId] ?? 0) + 1;
            totalXpCurA += 1;
            totalXpDirAA += apCost;
          } else if (isActorB) {
            usagesB[abId] = (usagesB[abId] ?? 0) + 1;
            totalXpCurB += 1;
            totalXpDirAB += apCost;
          }
        }
      }
    }

    totalTurns += trialTurns;

    const cuA = state.units.get(unitA.id)!;
    const cuB = state.units.get(unitB.id)!;

    const dmgDealtByA = unitB.effectiveVitals.maxHp - Math.max(0, cuB.currentHp);
    const dmgDealtByB = unitA.effectiveVitals.maxHp - Math.max(0, cuA.currentHp);
    totalDmgA += dmgDealtByA;
    totalDmgB += dmgDealtByB;

    const aDead = cuA.isDefeated || cuA.currentHp <= 0;
    const bDead = cuB.isDefeated || cuB.currentHp <= 0;

    if (bDead && !aDead) {
      winsA++;
    } else if (aDead && !bDead) {
      winsB++;
    } else {
      timeouts++;
    }
  }

  const avgTurnsPerTrial = trials > 0 ? Math.round((totalTurns / trials) * 10) / 10 : 0;
  const timeoutRatePercent = trials > 0 ? Math.round((timeouts / trials) * 1000) / 10 : 0;

  const buildMetrics = (
    name: string,
    classId: string,
    wins: number,
    turns: number,
    dmg: number,
    xpCur: number,
    xpDirA: number,
    usages: Record<string, number>
  ): CombatantMetrics => ({
    name,
    classId,
    wins,
    winRatePercent: trials > 0 ? Math.round((wins / trials) * 1000) / 10 : 0,
    totalTurns: turns,
    avgTurnsPerTrial: trials > 0 ? Math.round((turns / trials) * 10) / 10 : 0,
    turnSharePercent: totalTurns > 0 ? Math.round((turns / totalTurns) * 1000) / 10 : 0,
    totalDamageDealt: dmg,
    avgDamageDealt: trials > 0 ? Math.round((dmg / trials) * 10) / 10 : 0,
    totalXpCurrent: xpCur,
    avgXpCurrent: trials > 0 ? Math.round((xpCur / trials) * 10) / 10 : 0,
    totalXpDirectionA: xpDirA,
    avgXpDirectionA: trials > 0 ? Math.round((xpDirA / trials) * 10) / 10 : 0,
    abilityUsages: usages
  });

  return {
    trials,
    totalTurns,
    avgTurnsPerTrial,
    timeouts,
    timeoutRatePercent,
    combatantA: buildMetrics(
      resolvedNameA ?? options.combatantA.classId,
      options.combatantA.classId,
      winsA,
      turnsA,
      totalDmgA,
      totalXpCurA,
      totalXpDirAA,
      usagesA
    ),
    combatantB: buildMetrics(
      resolvedNameB ?? options.combatantB.classId,
      options.combatantB.classId,
      winsB,
      turnsB,
      totalDmgB,
      totalXpCurB,
      totalXpDirAB,
      usagesB
    )
  };
}

/**
 * Formats a SimulationResult into an ASCII report suitable for developer logs or console display.
 */
export function formatSimulationReport(result: SimulationResult): string {
  const formatAbilities = (usages: Readonly<Record<string, number>>): string => {
    const entries = Object.entries(usages).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return 'None';
    return entries.map(([id, count]) => `${id} (${count})`).join(', ');
  };

  const cA = result.combatantA;
  const cB = result.combatantB;

  return [
    '================================================================================',
    'COMBAT BALANCE SIMULATION REPORT',
    `Trials: ${result.trials} | Total Turns: ${result.totalTurns} | Avg Turns/Trial: ${result.avgTurnsPerTrial} | Timeouts: ${result.timeouts} (${result.timeoutRatePercent}%)`,
    '--------------------------------------------------------------------------------',
    `Combatant A: ${cA.name} (${cA.classId})`,
    `  - Wins:          ${cA.wins} / ${result.trials} (${cA.winRatePercent}%)`,
    `  - Turn Share:    ${cA.totalTurns} turns (${cA.avgTurnsPerTrial} avg / duel — ${cA.turnSharePercent}%)`,
    `  - Damage Dealt:  ${cA.totalDamageDealt} total (${cA.avgDamageDealt} avg / duel)`,
    `  - XP (Current):  ${cA.avgXpCurrent} avg / duel (${cA.totalXpCurrent} total)`,
    `  - XP (Dir A):    ${cA.avgXpDirectionA} avg / duel (${cA.totalXpDirectionA} total)`,
    `  - Top Abilities: ${formatAbilities(cA.abilityUsages)}`,
    '--------------------------------------------------------------------------------',
    `Combatant B: ${cB.name} (${cB.classId})`,
    `  - Wins:          ${cB.wins} / ${result.trials} (${cB.winRatePercent}%)`,
    `  - Turn Share:    ${cB.totalTurns} turns (${cB.avgTurnsPerTrial} avg / duel — ${cB.turnSharePercent}%)`,
    `  - Damage Dealt:  ${cB.totalDamageDealt} total (${cB.avgDamageDealt} avg / duel)`,
    `  - XP (Current):  ${cB.avgXpCurrent} avg / duel (${cB.totalXpCurrent} total)`,
    `  - XP (Dir A):    ${cB.avgXpDirectionA} avg / duel (${cB.totalXpDirectionA} total)`,
    `  - Top Abilities: ${formatAbilities(cB.abilityUsages)}`,
    '================================================================================'
  ].join('\n');
}
