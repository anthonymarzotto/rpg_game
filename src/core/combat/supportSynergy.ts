import { HEX_DIRECTIONS, HexDirection } from '../grid/hex';
import { createSimulatedCombatant } from './simulation';
import { buildEncounterState, EncounterDefinition, PlacedUnit } from './encounter';
import { getDeploymentZones, generateArenaTerrain } from '../campaign/encounterGenerator';
import { decideNextActionWithTrace, executeAiAction } from '../ai/decisionEngine';
import { endActiveTurn } from './turnClock';
import { SeededDiceRoller } from './dice';
import { createRng } from '../prng';
import { DEFAULT_CLASS_RESONANT_LOADOUTS } from './squadSimulation';
import { MATCHUP_CLASSES, ClassMatchupProfile } from './crossClassMatchups';

export interface DuoMetrics {
  readonly matches: number;
  readonly wins: number;
  readonly losses: number;
  readonly timeouts: number;
  readonly winRatePercent: number;
  readonly partnerSurvivals: number;
  readonly partnerSurvivalPercent: number;
  readonly supportSurvivals: number;
  readonly supportSurvivalPercent: number;
  readonly partnerAvgDmg: number;
  readonly supportAvgDmg: number;
  readonly teamAvgDmg: number;
}

export interface PartnerSynergyRecord {
  readonly partner: ClassMatchupProfile;
  readonly candidateMetrics: DuoMetrics;
  readonly controlMetrics: DuoMetrics;

  // Deltas (Candidate minus Control)
  readonly deltaWinRate: number;
  readonly deltaPartnerSurvival: number;
  readonly deltaPartnerDamage: number;
  readonly deltaSupportDamage: number;
  readonly deltaTeamDamage: number;
}

export interface SupportSynergyAggregate {
  readonly avgCandidateWinRate: number;
  readonly avgControlWinRate: number;
  readonly avgDeltaWinRate: number;

  readonly avgCandidatePartnerSurvival: number;
  readonly avgControlPartnerSurvival: number;
  readonly avgDeltaPartnerSurvival: number;

  readonly avgCandidatePartnerDmg: number;
  readonly avgControlPartnerDmg: number;
  readonly avgDeltaPartnerDmg: number;

  readonly avgCandidateSupportDmg: number;
  readonly avgControlSupportDmg: number;
  readonly avgDeltaSupportDmg: number;
}

export interface SupportSynergyResult {
  readonly candidateClassId: string;
  readonly candidateName: string;
  readonly controlClassId: string;
  readonly controlName: string;
  readonly trialsPerMatchup: number;
  readonly totalMatches: number;
  readonly gauntlet: readonly (readonly [string, string])[];
  readonly records: readonly PartnerSynergyRecord[];
  readonly aggregate: SupportSynergyAggregate;
}

export interface SupportSynergyOptions {
  readonly candidateClass: string;
  readonly controlClass?: string;
  readonly partnerClasses?: readonly string[];
  readonly gauntlet?: readonly (readonly [string, string])[];
  readonly trialsPerMatchup?: number;
  readonly maxTurnsPerMatch?: number;
  readonly arenaRadius?: number;
  readonly baseSeed?: number;
  readonly enableElevationTopography?: boolean;
}

/**
 * Standard 2v2 enemy gauntlet featuring diverse combat archetypes.
 */
export const DEFAULT_2V2_GAUNTLET: readonly (readonly [string, string])[] = [
  ['warrior', 'wizard'],     // Classic Frontline Bruiser + Ranged Artillery
  ['cavalier', 'sorcerer'],  // High Mobility Charge + Elemental AoE
  ['berserker', 'infiltrator'], // Heavy Melee Pressure + Stealth Assassin
  ['warlock', 'witch'],      // Heavy Occult Ranged Snipers / DoTs
  ['cat-burglar', 'highwayman'], // Agile Skirmishers + Anti-Force Gunner
  ['knight', 'sorcerer']     // Frontline Tank + Magic Blaster
];

interface SingleTrialResult {
  readonly winner: 'TEAM1' | 'TEAM2' | 'TIMEOUT';
  readonly turns: number;
  readonly supportDmg: number;
  readonly partnerDmg: number;
  readonly supportSurvived: boolean;
  readonly partnerSurvived: boolean;
}

function simulate2v2Trial(options: {
  team1Classes: readonly [string, string];
  team2Classes: readonly [string, string];
  team1IsPlayer: boolean;
  seed: number;
  arenaRadius: number;
  maxTurns: number;
  enableElevation: boolean;
}): SingleTrialResult {
  const { team1Classes, team2Classes, team1IsPlayer, seed, arenaRadius, maxTurns, enableElevation } = options;

  const deployment = getDeploymentZones(arenaRadius);
  const playerSpawns = deployment.playerCoords.slice(0, 2);
  const enemySpawns = deployment.enemyCoords.slice(0, 2);

  const matchRng = createRng(seed);
  const tileOverrides = enableElevation
    ? generateArenaTerrain(arenaRadius, playerSpawns, enemySpawns, matchRng)
    : undefined;

  const instantiate = (
    classId: string,
    unitId: string,
    faction: 'PLAYER' | 'ENEMY',
    coord: { q: number; r: number },
    facing: HexDirection
  ): PlacedUnit => {
    const resConfig = DEFAULT_CLASS_RESONANT_LOADOUTS[classId];
    const unit = createSimulatedCombatant(
      {
        id: unitId,
        classId,
        wildcardAbilityIds: resConfig?.wildcardAbilityIds,
        wildcardPassiveIds: resConfig?.wildcardPassiveIds
      },
      faction
    );
    return { unit, coord, facing };
  };

  const supportUnitId = 't1-support';
  const partnerUnitId = 't1-partner';
  const enemy1UnitId = 't2-unit1';
  const enemy2UnitId = 't2-unit2';

  let units: PlacedUnit[];
  if (team1IsPlayer) {
    units = [
      instantiate(team1Classes[0], supportUnitId, 'PLAYER', playerSpawns[0], HEX_DIRECTIONS.EAST),
      instantiate(team1Classes[1], partnerUnitId, 'PLAYER', playerSpawns[1], HEX_DIRECTIONS.EAST),
      instantiate(team2Classes[0], enemy1UnitId, 'ENEMY', enemySpawns[0], HEX_DIRECTIONS.WEST),
      instantiate(team2Classes[1], enemy2UnitId, 'ENEMY', enemySpawns[1], HEX_DIRECTIONS.WEST)
    ];
  } else {
    units = [
      instantiate(team2Classes[0], enemy1UnitId, 'PLAYER', playerSpawns[0], HEX_DIRECTIONS.EAST),
      instantiate(team2Classes[1], enemy2UnitId, 'PLAYER', playerSpawns[1], HEX_DIRECTIONS.EAST),
      instantiate(team1Classes[0], supportUnitId, 'ENEMY', enemySpawns[0], HEX_DIRECTIONS.WEST),
      instantiate(team1Classes[1], partnerUnitId, 'ENEMY', enemySpawns[1], HEX_DIRECTIONS.WEST)
    ];
  }

  const encounter: EncounterDefinition = {
    id: `support-trial-${seed}`,
    name: '2v2 Support Synergy Trial',
    arenaRadius,
    tileOverrides,
    units,
    objectives: [
      {
        id: 'obj-defeat-opponents',
        description: 'Defeat opposing squad',
        condition: {
          kind: 'FACTION_DEFEATED',
          faction: 'ENEMY'
        }
      }
    ]
  };

  const diceRoller = new SeededDiceRoller(seed + 999);
  const state = buildEncounterState(encounter, diceRoller);

  const damageByUnit: Record<string, number> = {
    [supportUnitId]: 0,
    [partnerUnitId]: 0,
    [enemy1UnitId]: 0,
    [enemy2UnitId]: 0
  };

  let turns = 0;
  while (state.outcome === 'IN_PROGRESS' && turns < maxTurns) {
    turns++;
    const activeId = state.activeUnitId;
    const cu = state.units.get(activeId);
    if (!cu || cu.isDefeated || cu.currentHp <= 0) {
      continue;
    }

    let steps = 0;
    while (steps < 10) {
      steps++;
      if (
        !cu ||
        cu.isDefeated ||
        cu.currentAp <= 0 ||
        state.activeUnitId !== activeId ||
        state.outcome !== 'IN_PROGRESS'
      ) {
        break;
      }

      const { action } = decideNextActionWithTrace(state, activeId, { diceRoller });
      if (action.type === 'CONSERVE_AP') {
        break;
      }

      if (action.type === 'MOVE') {
        executeAiAction(state, activeId, action, diceRoller);
      } else if (action.type === 'ABILITY') {
        const hpsBefore = new Map<string, number>();
        for (const [uid, u] of state.units.entries()) {
          hpsBefore.set(uid, u.currentHp);
        }

        executeAiAction(state, activeId, action, diceRoller);

        for (const [uid, u] of state.units.entries()) {
          const before = hpsBefore.get(uid) ?? u.currentHp;
          const loss = Math.max(0, before - u.currentHp);
          if (loss > 0) {
            damageByUnit[activeId] = (damageByUnit[activeId] ?? 0) + loss;
          }
        }
      }
    }

    endActiveTurn(state);
  }

  // Determine outcome
  let winner: 'TEAM1' | 'TEAM2' | 'TIMEOUT';
  if (state.outcome === 'VICTORY') {
    winner = team1IsPlayer ? 'TEAM1' : 'TEAM2';
  } else if (state.outcome === 'DEFEAT') {
    winner = team1IsPlayer ? 'TEAM2' : 'TEAM1';
  } else {
    // In progress at turn limit: check casualties
    const supp = state.units.get(supportUnitId)!;
    const part = state.units.get(partnerUnitId)!;
    const en1 = state.units.get(enemy1UnitId)!;
    const en2 = state.units.get(enemy2UnitId)!;

    const team1Dead = (supp.isDefeated || supp.currentHp <= 0) && (part.isDefeated || part.currentHp <= 0);
    const team2Dead = (en1.isDefeated || en1.currentHp <= 0) && (en2.isDefeated || en2.currentHp <= 0);

    if (team2Dead && !team1Dead) {
      winner = 'TEAM1';
    } else if (team1Dead && !team2Dead) {
      winner = 'TEAM2';
    } else {
      winner = 'TIMEOUT';
    }
  }

  const suppFinal = state.units.get(supportUnitId)!;
  const partFinal = state.units.get(partnerUnitId)!;

  return {
    winner,
    turns,
    supportDmg: damageByUnit[supportUnitId] ?? 0,
    partnerDmg: damageByUnit[partnerUnitId] ?? 0,
    supportSurvived: !suppFinal.isDefeated && suppFinal.currentHp > 0,
    partnerSurvived: !partFinal.isDefeated && partFinal.currentHp > 0
  };
}

function runDuoVsGauntlet(
  supportClass: string,
  partnerClass: string,
  gauntlet: readonly (readonly [string, string])[],
  trialsPerMatchup: number,
  baseSeed: number,
  arenaRadius: number,
  maxTurns: number,
  enableElevation: boolean
): DuoMetrics {
  let matches = 0;
  let wins = 0;
  let losses = 0;
  let timeouts = 0;
  let partnerSurvivals = 0;
  let supportSurvivals = 0;
  let totalPartnerDmg = 0;
  let totalSupportDmg = 0;

  let seedCounter = baseSeed;

  for (const enemyTeam of gauntlet) {
    for (let t = 0; t < trialsPerMatchup; t++) {
      matches++;
      seedCounter += 17;
      // Alternate factions: even trials as Player (West), odd trials as Enemy (East)
      const team1IsPlayer = t % 2 === 0;

      const res = simulate2v2Trial({
        team1Classes: [supportClass, partnerClass],
        team2Classes: [enemyTeam[0], enemyTeam[1]],
        team1IsPlayer,
        seed: seedCounter,
        arenaRadius,
        maxTurns,
        enableElevation
      });

      if (res.winner === 'TEAM1') wins++;
      else if (res.winner === 'TEAM2') losses++;
      else timeouts++;

      if (res.supportSurvived) supportSurvivals++;
      if (res.partnerSurvived) partnerSurvivals++;

      totalSupportDmg += res.supportDmg;
      totalPartnerDmg += res.partnerDmg;
    }
  }

  const winRatePercent = matches > 0 ? Math.round((wins / matches) * 1000) / 10 : 0;
  const partnerSurvivalPercent = matches > 0 ? Math.round((partnerSurvivals / matches) * 1000) / 10 : 0;
  const supportSurvivalPercent = matches > 0 ? Math.round((supportSurvivals / matches) * 1000) / 10 : 0;
  const partnerAvgDmg = matches > 0 ? Math.round((totalPartnerDmg / matches) * 10) / 10 : 0;
  const supportAvgDmg = matches > 0 ? Math.round((totalSupportDmg / matches) * 10) / 10 : 0;
  const teamAvgDmg = Math.round((partnerAvgDmg + supportAvgDmg) * 10) / 10;

  return {
    matches,
    wins,
    losses,
    timeouts,
    winRatePercent,
    partnerSurvivals,
    partnerSurvivalPercent,
    supportSurvivals,
    supportSurvivalPercent,
    partnerAvgDmg,
    supportAvgDmg,
    teamAvgDmg
  };
}

/**
 * Runs a generic "Option B" Support vs Control benchmark across partner classes.
 */
export function runSupportSynergyBenchmark(options: SupportSynergyOptions): SupportSynergyResult {
  const candidateClass = options.candidateClass;
  const controlClass = options.controlClass ?? 'warrior';
  const gauntlet = options.gauntlet ?? DEFAULT_2V2_GAUNTLET;
  const trials = options.trialsPerMatchup ?? 6;
  const maxTurns = options.maxTurnsPerMatch ?? 60;
  const arenaRadius = options.arenaRadius ?? 3;
  const baseSeed = options.baseSeed ?? 77700;
  const enableElevation = options.enableElevationTopography ?? true;

  const candidateProfile = MATCHUP_CLASSES.find((c) => c.classId === candidateClass) ?? {
    classId: candidateClass,
    name: candidateClass,
    shortCode: candidateClass.slice(0, 3).toUpperCase(),
    tier: 1
  };
  const controlProfile = MATCHUP_CLASSES.find((c) => c.classId === controlClass) ?? {
    classId: controlClass,
    name: controlClass,
    shortCode: controlClass.slice(0, 3).toUpperCase(),
    tier: 1
  };

  const partnerIds =
    options.partnerClasses ??
    MATCHUP_CLASSES.map((c) => c.classId).filter(
      (cid) => cid !== candidateClass && cid !== controlClass
    );

  const records: PartnerSynergyRecord[] = [];

  let partnerIdx = 0;
  for (const pId of partnerIds) {
    partnerIdx++;
    const partnerProfile = MATCHUP_CLASSES.find((c) => c.classId === pId) ?? {
      classId: pId,
      name: pId,
      shortCode: pId.slice(0, 3).toUpperCase(),
      tier: 1
    };

    const candMetrics = runDuoVsGauntlet(
      candidateClass,
      pId,
      gauntlet,
      trials,
      baseSeed + partnerIdx * 1000,
      arenaRadius,
      maxTurns,
      enableElevation
    );

    const ctrlMetrics = runDuoVsGauntlet(
      controlClass,
      pId,
      gauntlet,
      trials,
      baseSeed + partnerIdx * 1000 + 500,
      arenaRadius,
      maxTurns,
      enableElevation
    );

    records.push({
      partner: partnerProfile,
      candidateMetrics: candMetrics,
      controlMetrics: ctrlMetrics,
      deltaWinRate: Math.round((candMetrics.winRatePercent - ctrlMetrics.winRatePercent) * 10) / 10,
      deltaPartnerSurvival:
        Math.round((candMetrics.partnerSurvivalPercent - ctrlMetrics.partnerSurvivalPercent) * 10) / 10,
      deltaPartnerDamage: Math.round((candMetrics.partnerAvgDmg - ctrlMetrics.partnerAvgDmg) * 10) / 10,
      deltaSupportDamage: Math.round((candMetrics.supportAvgDmg - ctrlMetrics.supportAvgDmg) * 10) / 10,
      deltaTeamDamage: Math.round((candMetrics.teamAvgDmg - ctrlMetrics.teamAvgDmg) * 10) / 10
    });
  }

  // Aggregate averages
  const count = records.length;
  const avg = (fn: (r: PartnerSynergyRecord) => number) =>
    count > 0 ? Math.round((records.reduce((acc, r) => acc + fn(r), 0) / count) * 10) / 10 : 0;

  const aggregate: SupportSynergyAggregate = {
    avgCandidateWinRate: avg((r) => r.candidateMetrics.winRatePercent),
    avgControlWinRate: avg((r) => r.controlMetrics.winRatePercent),
    avgDeltaWinRate: avg((r) => r.deltaWinRate),

    avgCandidatePartnerSurvival: avg((r) => r.candidateMetrics.partnerSurvivalPercent),
    avgControlPartnerSurvival: avg((r) => r.controlMetrics.partnerSurvivalPercent),
    avgDeltaPartnerSurvival: avg((r) => r.deltaPartnerSurvival),

    avgCandidatePartnerDmg: avg((r) => r.candidateMetrics.partnerAvgDmg),
    avgControlPartnerDmg: avg((r) => r.controlMetrics.partnerAvgDmg),
    avgDeltaPartnerDmg: avg((r) => r.deltaPartnerDamage),

    avgCandidateSupportDmg: avg((r) => r.candidateMetrics.supportAvgDmg),
    avgControlSupportDmg: avg((r) => r.controlMetrics.supportAvgDmg),
    avgDeltaSupportDmg: avg((r) => r.deltaSupportDamage)
  };

  const totalMatches = records.reduce(
    (acc, r) => acc + r.candidateMetrics.matches + r.controlMetrics.matches,
    0
  );

  return {
    candidateClassId: candidateClass,
    candidateName: candidateProfile.name,
    controlClassId: controlClass,
    controlName: controlProfile.name,
    trialsPerMatchup: trials,
    totalMatches,
    gauntlet,
    records,
    aggregate
  };
}

/**
 * Formats support synergy benchmark results into a terminal-friendly ASCII table.
 */
export function formatSupportSynergyReport(result: SupportSynergyResult): string {
  const lines: string[] = [];
  const cand = result.candidateName;
  const ctrl = result.controlName;

  lines.push('========================================================================================================================');
  lines.push(`SUPPORT SYNERGY BENCHMARK: ${cand.toUpperCase()} vs ${ctrl.toUpperCase()} (CONTROL)`);
  lines.push(`Partners Tested: ${result.records.length} | Gauntlet Teams: ${result.gauntlet.length} | Trials/Pair: ${result.trialsPerMatchup} | Total 2v2 Duels: ${result.totalMatches}`);
  lines.push('========================================================================================================================');
  lines.push('');
  lines.push(`Columns compare performance of each Partner Class when paired with [${cand}] vs paired with [${ctrl}].`);
  lines.push('Delta = Candidate ([Cand]) minus Control ([Ctrl]). Positive delta means Candidate improved performance.');
  lines.push('------------------------------------------------------------------------------------------------------------------------');
  lines.push(
    ` Partner Class | Tier |   Team Win% (Cand vs Ctrl)  | Partner Surv% (Cand vs Ctrl) | Partner Dmg (Cand vs Ctrl) | Support Dmg (Cand vs Ctrl)`
  );
  lines.push('------------------------------------------------------------------------------------------------------------------------');

  for (const r of result.records) {
    const pName = r.partner.name.padEnd(13, ' ');
    const tier = `T${r.partner.tier}`;
    const winStr = `${r.candidateMetrics.winRatePercent.toFixed(1)}% vs ${r.controlMetrics.winRatePercent.toFixed(1)}% (${fmtDelta(r.deltaWinRate)}%)`.padStart(27, ' ');
    const survStr = `${r.candidateMetrics.partnerSurvivalPercent.toFixed(1)}% vs ${r.controlMetrics.partnerSurvivalPercent.toFixed(1)}% (${fmtDelta(r.deltaPartnerSurvival)}%)`.padStart(28, ' ');
    const partDmgStr = `${r.candidateMetrics.partnerAvgDmg.toFixed(1)} vs ${r.controlMetrics.partnerAvgDmg.toFixed(1)} (${fmtDelta(r.deltaPartnerDamage)})`.padStart(26, ' ');
    const suppDmgStr = `${r.candidateMetrics.supportAvgDmg.toFixed(1)} vs ${r.controlMetrics.supportAvgDmg.toFixed(1)} (${fmtDelta(r.deltaSupportDamage)})`.padStart(25, ' ');

    lines.push(` ${pName} |  ${tier} |${winStr} |${survStr} |${partDmgStr} |${suppDmgStr}`);
  }

  lines.push('------------------------------------------------------------------------------------------------------------------------');
  const agg = result.aggregate;
  const aggWin = `${agg.avgCandidateWinRate.toFixed(1)}% vs ${agg.avgControlWinRate.toFixed(1)}% (${fmtDelta(agg.avgDeltaWinRate)}%)`.padStart(27, ' ');
  const aggSurv = `${agg.avgCandidatePartnerSurvival.toFixed(1)}% vs ${agg.avgControlPartnerSurvival.toFixed(1)}% (${fmtDelta(agg.avgDeltaPartnerSurvival)}%)`.padStart(28, ' ');
  const aggPartDmg = `${agg.avgCandidatePartnerDmg.toFixed(1)} vs ${agg.avgControlPartnerDmg.toFixed(1)} (${fmtDelta(agg.avgDeltaPartnerDmg)})`.padStart(26, ' ');
  const aggSuppDmg = `${agg.avgCandidateSupportDmg.toFixed(1)} vs ${agg.avgControlSupportDmg.toFixed(1)} (${fmtDelta(agg.avgDeltaSupportDmg)})`.padStart(25, ' ');
  lines.push(` AVERAGE / NET |  --  |${aggWin} |${aggSurv} |${aggPartDmg} |${aggSuppDmg}`);
  lines.push('========================================================================================================================');

  return lines.join('\n');
}

/**
 * Formats support synergy benchmark results into a Markdown document.
 */
export function formatSupportSynergyMarkdown(result: SupportSynergyResult): string {
  const lines: string[] = [];
  const cand = result.candidateName;
  const ctrl = result.controlName;

  lines.push(`# 2v2 Support Synergy Benchmark: ${cand} vs ${ctrl} (Control)`);
  lines.push(`\n**Candidate:** ${cand} | **Control:** ${ctrl} | **Gauntlet Comps:** ${result.gauntlet.length} | **Trials/Pair:** ${result.trialsPerMatchup} | **Total Matches:** ${result.totalMatches}\n`);

  lines.push('## Benchmark Overview\n');
  lines.push(`This benchmark evaluates whether bringing **${cand}** as a partner enables other classes to survive longer and win more battles compared to bringing a baseline martial control unit (**${ctrl}**).\n`);

  lines.push('## Results Table\n');
  lines.push(`| Partner Class | Tier | ${cand} Win% | ${ctrl} Win% | **Δ Win%** | Partner Surv (${cand}) | Partner Surv (${ctrl}) | **Δ Surv%** | Partner Dmg (${cand}) | Partner Dmg (${ctrl}) | **Δ Partner Dmg** | Support Dmg (${cand} vs ${ctrl}) |`);
  lines.push('| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |');

  for (const r of result.records) {
    lines.push(
      `| **${r.partner.name}** | T${r.partner.tier} | ${r.candidateMetrics.winRatePercent.toFixed(1)}% | ${r.controlMetrics.winRatePercent.toFixed(1)}% | **${fmtDelta(r.deltaWinRate)}%** | ${r.candidateMetrics.partnerSurvivalPercent.toFixed(1)}% | ${r.controlMetrics.partnerSurvivalPercent.toFixed(1)}% | **${fmtDelta(r.deltaPartnerSurvival)}%** | ${r.candidateMetrics.partnerAvgDmg.toFixed(1)} | ${r.controlMetrics.partnerAvgDmg.toFixed(1)} | **${fmtDelta(r.deltaPartnerDamage)}** | ${r.candidateMetrics.supportAvgDmg.toFixed(1)} vs ${r.controlMetrics.supportAvgDmg.toFixed(1)} (${fmtDelta(r.deltaSupportDamage)}) |`
    );
  }

  const agg = result.aggregate;
  lines.push(
    `| **NET AVERAGE** | **--** | **${agg.avgCandidateWinRate.toFixed(1)}%** | **${agg.avgControlWinRate.toFixed(1)}%** | **${fmtDelta(agg.avgDeltaWinRate)}%** | **${agg.avgCandidatePartnerSurvival.toFixed(1)}%** | **${agg.avgControlPartnerSurvival.toFixed(1)}%** | **${fmtDelta(agg.avgDeltaPartnerSurvival)}%** | **${agg.avgCandidatePartnerDmg.toFixed(1)}** | **${agg.avgControlPartnerDmg.toFixed(1)}** | **${fmtDelta(agg.avgDeltaPartnerDmg)}** | **${agg.avgCandidateSupportDmg.toFixed(1)} vs ${agg.avgControlSupportDmg.toFixed(1)} (${fmtDelta(agg.avgDeltaSupportDmg)})** |`
  );

  lines.push('\n## Gauntlet Compositions\n');
  result.gauntlet.forEach((g, idx) => {
    lines.push(`${idx + 1}. \`[${g[0]}, ${g[1]}]\``);
  });

  return lines.join('\n');
}

function fmtDelta(delta: number): string {
  if (delta > 0) return `+${delta.toFixed(1)}`;
  return delta.toFixed(1);
}
