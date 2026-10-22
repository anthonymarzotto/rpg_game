import { HexCoord, hexDistance, HEX_DIRECTIONS, getHexesInRange } from '../grid/hex';
import { CLASS_CATALOG } from '../../data/classes';
import { createSimulatedCombatant } from './simulation';
import { buildEncounterState, EncounterDefinition, PlacedUnit } from './encounter';
import { getDeploymentZones, generateArenaTerrain } from '../campaign/encounterGenerator';
import { decideNextActionWithTrace, executeAiAction } from '../ai/decisionEngine';
import { endActiveTurn } from './turnClock';
import { SeededDiceRoller } from './dice';
import { createRng, shuffle } from '../prng';

export const ALL_AUTHORED_CLASS_IDS = [
  'warrior',
  'thief',
  'wizard',
  'knight',
  'infiltrator',
  'sorcerer',
  'cavalier',
  'berserker',
  'highwayman',
  'cat-burglar',
  'warlock',
  'witch'
] as const;

export type AuthoredClassId = typeof ALL_AUTHORED_CLASS_IDS[number];

export interface ClassSquadTelemetry {
  readonly classId: string;
  readonly name: string;
  readonly tier: number;
  matchesPlayed: number;
  matchesWon: number;
  winRatePercent: number;

  // Damage
  totalGrossDamage: number;
  avgGrossDamage: number;
  totalNetDamage: number;
  avgNetDamage: number;
  totalDamageSoaked: number; // mitigated by armor/ward
  avgDamageSoaked: number;
  totalDamageTaken: number; // HP damage sustained
  avgDamageTaken: number;

  // Combat Outcomes
  totalAttacks: number;
  crits: number;
  critPercent: number;
  hits: number;
  hitPercent: number;
  grazes: number;
  grazePercent: number;
  misses: number;
  missPercent: number;

  // Survivability & Kills
  kills: number;
  avgKills: number;
  deaths: number;
  firstDeaths: number; // died first in the battle
  survivedMatches: number;
  survivalPercent: number;

  // Mobility & High Ground
  totalTilesMoved: number;
  avgTilesMoved: number;
  totalTurns: number;
  turnsOnHighGround: number; // h >= 1
  turnsOnPeak: number; // h === 2
  highGroundTurnPercent: number;
  attacksFromHighGround: number; // elevationDelta > 0
  vantageAttackPercent: number;

  // Ability Breakdown & Target Dispersion
  abilityUsages: Record<string, number>;
  controlAbilityTargets: Record<string, number>; // abilityId -> total unique targets caught across matches
  aoeTotalHits: number;
  aoeCasts: number;
  avgAoeTargetsHit: number;
}

export interface SquadSimulationOptions {
  readonly matches?: number;
  readonly maxTurnsPerMatch?: number;
  readonly arenaRadius?: number;
  readonly baseSeed?: number;
  readonly fixedTeamA?: readonly string[];
  readonly fixedTeamB?: readonly string[];
  readonly enableElevationTopography?: boolean;
}

export interface SquadSimulationResult {
  readonly totalMatches: number;
  readonly timeouts: number;
  readonly teamAWins: number;
  readonly teamBWins: number;
  readonly avgTurnsPerMatch: number;
  readonly classTelemetry: Record<string, ClassSquadTelemetry>;
}

function initializeTelemetry(classId: string): ClassSquadTelemetry {
  const classDef = CLASS_CATALOG.find((c) => c.id === classId);
  return {
    classId,
    name: classDef?.name ?? classId,
    tier: classDef?.totalPoints ?? 1,
    matchesPlayed: 0,
    matchesWon: 0,
    winRatePercent: 0,
    totalGrossDamage: 0,
    avgGrossDamage: 0,
    totalNetDamage: 0,
    avgNetDamage: 0,
    totalDamageSoaked: 0,
    avgDamageSoaked: 0,
    totalDamageTaken: 0,
    avgDamageTaken: 0,
    totalAttacks: 0,
    crits: 0,
    critPercent: 0,
    hits: 0,
    hitPercent: 0,
    grazes: 0,
    grazePercent: 0,
    misses: 0,
    missPercent: 0,
    kills: 0,
    avgKills: 0,
    deaths: 0,
    firstDeaths: 0,
    survivedMatches: 0,
    survivalPercent: 0,
    totalTilesMoved: 0,
    avgTilesMoved: 0,
    totalTurns: 0,
    turnsOnHighGround: 0,
    turnsOnPeak: 0,
    highGroundTurnPercent: 0,
    attacksFromHighGround: 0,
    vantageAttackPercent: 0,
    abilityUsages: {},
    controlAbilityTargets: {},
    aoeTotalHits: 0,
    aoeCasts: 0,
    avgAoeTargetsHit: 0
  };
}

/**
 * Runs a batch of automated 3v3 squad combat trials with random mixed-tier drafting
 * or fixed team compositions, collecting granular per-class telemetry.
 */
export function runSquadSimulation(options?: SquadSimulationOptions): SquadSimulationResult {
  const matches = options?.matches ?? 100;
  const maxTurnsPerMatch = options?.maxTurnsPerMatch ?? 80;
  const arenaRadius = options?.arenaRadius ?? 3;
  const baseSeed = options?.baseSeed ?? 88888;
  const enableElevation = options?.enableElevationTopography ?? true;

  const telemetry: Record<string, ClassSquadTelemetry> = {};
  for (const cid of ALL_AUTHORED_CLASS_IDS) {
    telemetry[cid] = initializeTelemetry(cid);
  }

  let teamAWins = 0;
  let teamBWins = 0;
  let timeouts = 0;
  let totalTurns = 0;

  const deployment = getDeploymentZones(arenaRadius);
  const playerSpawns = deployment.playerCoords.slice(0, 3);
  const enemySpawns = deployment.enemyCoords.slice(0, 3);

  const draftRng = createRng(baseSeed);

  for (let m = 0; m < matches; m++) {
    // 1. Determine Team Compositions (Shuffled 12 classes or Fixed)
    let teamAClasses: readonly string[];
    let teamBClasses: readonly string[];

    if (options?.fixedTeamA && options?.fixedTeamB) {
      teamAClasses = options.fixedTeamA;
      teamBClasses = options.fixedTeamB;
    } else {
      const shuffled = shuffle(ALL_AUTHORED_CLASS_IDS, draftRng);
      // Alternate which half of the draft gets PLAYER (West) vs ENEMY (East)
      if (m % 2 === 0) {
        teamAClasses = shuffled.slice(0, 3);
        teamBClasses = shuffled.slice(3, 6);
      } else {
        teamAClasses = shuffled.slice(3, 6);
        teamBClasses = shuffled.slice(0, 3);
      }
    }

    // 2. Generate Arena Topography & Obstacles
    const matchRng = createRng(baseSeed + m * 37);
    const tileOverrides = enableElevation
      ? generateArenaTerrain(arenaRadius, playerSpawns, enemySpawns, matchRng)
      : undefined;

    // 3. Instantiate Units
    const teamAUnits: PlacedUnit[] = teamAClasses.map((classId, idx) => {
      const unit = createSimulatedCombatant({ classId }, 'PLAYER', `A${idx + 1}`);
      return {
        unit,
        coord: playerSpawns[idx],
        facing: HEX_DIRECTIONS.EAST
      };
    });

    const teamBUnits: PlacedUnit[] = teamBClasses.map((classId, idx) => {
      const unit = createSimulatedCombatant({ classId }, 'ENEMY', `B${idx + 1}`);
      return {
        unit,
        coord: enemySpawns[idx],
        facing: HEX_DIRECTIONS.WEST
      };
    });

    const encounter: EncounterDefinition = {
      id: `squad-sim-${m}`,
      name: `Squad Trial ${m + 1}`,
      arenaRadius,
      tileOverrides,
      units: [...teamAUnits, ...teamBUnits],
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

    const diceRoller = new SeededDiceRoller(baseSeed + m * 101);
    const state = buildEncounterState(encounter, diceRoller);

    // Track unit participation
    const matchUnits = [...teamAUnits, ...teamBUnits];
    for (const p of matchUnits) {
      const cid = p.unit.loadout?.activeClassId ?? p.unit.id;
      if (telemetry[cid]) {
        telemetry[cid].matchesPlayed++;
      }
    }

    // Per-match tracking for target diversity
    const matchControlTargets: Record<string, Record<string, Set<string>>> = {};
    for (const p of matchUnits) {
      const cid = p.unit.loadout?.activeClassId ?? p.unit.id;
      matchControlTargets[cid] = matchControlTargets[cid] ?? {};
    }

    let matchTurns = 0;
    let firstDeathOccurred = false;

    // 4. Combat Turn Loop
    while (state.outcome === 'IN_PROGRESS' && matchTurns < maxTurnsPerMatch) {
      matchTurns++;
      const activeId = state.activeUnitId;
      const cu = state.units.get(activeId);
      if (!cu || cu.isDefeated || cu.currentHp <= 0) {
        continue;
      }

      const activeClass = cu.unit.loadout?.activeClassId;
      const tActor = activeClass ? telemetry[activeClass] : undefined;

      // Telemetry: Elevation at Turn Start
      const startCoord = state.arena.getUnitPosition(activeId);
      const startElev = startCoord ? state.arena.getElevation(startCoord) : 0;
      if (tActor) {
        tActor.totalTurns++;
        if (startElev >= 1) tActor.turnsOnHighGround++;
        if (startElev === 2) tActor.turnsOnPeak++;
      }

      let steps = 0;
      const maxSteps = 10;

      while (steps < maxSteps) {
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

        const currCoord = state.arena.getUnitPosition(activeId);
        const { action } = decideNextActionWithTrace(state, activeId, { diceRoller });

        if (action.type === 'CONSERVE_AP') {
          break;
        }

        if (action.type === 'MOVE') {
          if (currCoord) {
            const tiles = hexDistance(currCoord, action.destination);
            if (tActor) tActor.totalTilesMoved += tiles;
          }
          executeAiAction(state, activeId, action, diceRoller);
        } else if (action.type === 'ABILITY') {
          const abId = action.ability.id;
          if (tActor) {
            tActor.abilityUsages[abId] = (tActor.abilityUsages[abId] ?? 0) + 1;
          }

          // Evaluate attack elevation delta
          const actorElev = currCoord ? state.arena.getElevation(currCoord) : 0;
          let targetElev = 0;
          let targetUnitId: string | undefined;

          if (action.target?.targetUnitId) {
            targetUnitId = action.target.targetUnitId;
            const targetPos = state.arena.getUnitPosition(targetUnitId);
            if (targetPos) targetElev = state.arena.getElevation(targetPos);
          } else if (action.target?.coord) {
            targetElev = state.arena.getElevation(action.target.coord);
            targetUnitId = state.arena.getUnitAt(action.target.coord);
          }

          // Track control target dispersion
          if (targetUnitId && activeClass) {
            matchControlTargets[activeClass][abId] =
              matchControlTargets[activeClass][abId] ?? new Set<string>();
            matchControlTargets[activeClass][abId].add(targetUnitId);
          }

          // Snapshot living HPs to accurately measure actual damage dealt & casualties
          const hpsBefore = new Map<string, number>();
          for (const [uid, u] of state.units.entries()) {
            hpsBefore.set(uid, u.currentHp);
          }

          const execResult = executeAiAction(state, activeId, action, diceRoller);

          if (execResult.type === 'ABILITY' && execResult.resolution) {
            const res = execResult.resolution;
            if (tActor && res.type === 'ATTACK' && res.details) {
              tActor.totalAttacks++;
              const outcome = res.details.hitOutcome;
              if (outcome === 'CRITICAL_HIT') tActor.crits++;
              else if (outcome === 'SOLID_HIT') tActor.hits++;
              else if (outcome === 'GRAZE') tActor.grazes++;
              else if (outcome === 'MISS') tActor.misses++;

              tActor.totalGrossDamage += res.details.rawDamage ?? 0;
              if (actorElev > targetElev) {
                tActor.attacksFromHighGround++;
              }
            }

            // Damage soaked by primary target
            if (targetUnitId && res.type === 'ATTACK' && res.details) {
              const targetCu = state.units.get(targetUnitId);
              const targetCid = targetCu?.unit.loadout?.activeClassId;
              if (targetCid && telemetry[targetCid]) {
                telemetry[targetCid].totalDamageSoaked += res.details.mitigation ?? 0;
              }
            }

            // Track actual net damage dealt across all units (including AoE/Cleave)
            let damagedCount = 0;
            for (const [uid, u] of state.units.entries()) {
              const before = hpsBefore.get(uid) ?? u.currentHp;
              const loss = Math.max(0, before - u.currentHp);
              if (loss > 0) {
                damagedCount++;
                if (tActor) {
                  tActor.totalNetDamage += loss;
                }
                const victimCid = u.unit.loadout?.activeClassId;
                if (victimCid && telemetry[victimCid]) {
                  telemetry[victimCid].totalDamageTaken += loss;
                }

                // Check fatal casualties
                if (before > 0 && (u.currentHp <= 0 || u.isDefeated)) {
                  if (tActor) tActor.kills++;
                  if (victimCid && telemetry[victimCid]) {
                    telemetry[victimCid].deaths++;
                    if (!firstDeathOccurred) {
                      firstDeathOccurred = true;
                      telemetry[victimCid].firstDeaths++;
                    }
                  }
                }
              }
            }

            if (action.ability.aoeRadius && action.ability.aoeRadius > 0 && tActor) {
              tActor.aoeCasts++;
              const centerCoord =
                action.target?.coord ??
                (action.target?.targetUnitId ? state.arena.getUnitPosition(action.target.targetUnitId) : currCoord);
              if (centerCoord) {
                const aoeHexes = getHexesInRange(centerCoord, action.ability.aoeRadius);
                let targetsInAoe = 0;
                for (const hex of aoeHexes) {
                  const uId = state.arena.getUnitAt(hex);
                  if (uId && uId !== activeId) {
                    const targetUnit = state.units.get(uId);
                    if (targetUnit && !targetUnit.isDefeated) {
                      targetsInAoe++;
                    }
                  }
                }
                tActor.aoeTotalHits += Math.max(damagedCount, targetsInAoe);
              } else {
                tActor.aoeTotalHits += damagedCount;
              }
            }
          }
        }
      }

      // End active turn cleanly
      if (state.activeUnitId === activeId && state.outcome === 'IN_PROGRESS') {
        endActiveTurn(state);
      }
    }

    totalTurns += matchTurns;

    // 5. Match Outcome & Survival
    const aWon = state.outcome === 'VICTORY';
    const bWon = state.outcome === 'DEFEAT';

    if (aWon) {
      teamAWins++;
      for (const p of teamAUnits) {
        const cid = p.unit.loadout?.activeClassId;
        if (cid && telemetry[cid]) telemetry[cid].matchesWon++;
      }
    } else if (bWon) {
      teamBWins++;
      for (const p of teamBUnits) {
        const cid = p.unit.loadout?.activeClassId;
        if (cid && telemetry[cid]) telemetry[cid].matchesWon++;
      }
    } else {
      timeouts++;
    }

    // Accumulate target dispersion
    for (const [cid, abMap] of Object.entries(matchControlTargets)) {
      if (!telemetry[cid]) continue;
      for (const [abId, set] of Object.entries(abMap)) {
        telemetry[cid].controlAbilityTargets[abId] =
          (telemetry[cid].controlAbilityTargets[abId] ?? 0) + set.size;
      }
    }

    // Track surviving units
    for (const p of matchUnits) {
      const cu = state.units.get(p.unit.id);
      const cid = p.unit.loadout?.activeClassId;
      if (cu && !cu.isDefeated && cu.currentHp > 0 && cid && telemetry[cid]) {
        telemetry[cid].survivedMatches++;
      }
    }
  }

  // 6. Compute Final Percentages & Averages
  for (const t of Object.values(telemetry)) {
    const p = t.matchesPlayed;
    t.winRatePercent = p > 0 ? Math.round((t.matchesWon / p) * 1000) / 10 : 0;
    t.avgGrossDamage = p > 0 ? Math.round((t.totalGrossDamage / p) * 10) / 10 : 0;
    t.avgNetDamage = p > 0 ? Math.round((t.totalNetDamage / p) * 10) / 10 : 0;
    t.avgDamageSoaked = p > 0 ? Math.round((t.totalDamageSoaked / p) * 10) / 10 : 0;
    t.avgDamageTaken = p > 0 ? Math.round((t.totalDamageTaken / p) * 10) / 10 : 0;
    t.avgKills = p > 0 ? Math.round((t.kills / p) * 10) / 10 : 0;
    t.survivalPercent = p > 0 ? Math.round((t.survivedMatches / p) * 1000) / 10 : 0;
    t.avgTilesMoved = p > 0 ? Math.round((t.totalTilesMoved / p) * 10) / 10 : 0;

    const atk = t.totalAttacks;
    t.critPercent = atk > 0 ? Math.round((t.crits / atk) * 1000) / 10 : 0;
    t.hitPercent = atk > 0 ? Math.round((t.hits / atk) * 1000) / 10 : 0;
    t.grazePercent = atk > 0 ? Math.round((t.grazes / atk) * 1000) / 10 : 0;
    t.missPercent = atk > 0 ? Math.round((t.misses / atk) * 1000) / 10 : 0;
    t.vantageAttackPercent = atk > 0 ? Math.round((t.attacksFromHighGround / atk) * 1000) / 10 : 0;

    const turns = t.totalTurns;
    t.highGroundTurnPercent = turns > 0 ? Math.round((t.turnsOnHighGround / turns) * 1000) / 10 : 0;
    t.avgAoeTargetsHit = t.aoeCasts > 0 ? Math.round((t.aoeTotalHits / t.aoeCasts) * 10) / 10 : 0;
  }

  return {
    totalMatches: matches,
    timeouts,
    teamAWins,
    teamBWins,
    avgTurnsPerMatch: matches > 0 ? Math.round((totalTurns / matches) * 10) / 10 : 0,
    classTelemetry: telemetry
  };
}

/**
 * Formats full squad simulation telemetry into an informative ASCII / Markdown dashboard.
 */
export function formatSquadSimulationReport(result: SquadSimulationResult): string {
  const ranked = Object.values(result.classTelemetry).sort(
    (a, b) => b.winRatePercent - a.winRatePercent
  );

  const lines: string[] = [
    '=========================================================================================================',
    `SQUAD COMBAT SIMULATION REPORT (3v3 Mixed Tiers)`,
    `Matches: ${result.totalMatches} | Team A Wins: ${result.teamAWins} | Team B Wins: ${result.teamBWins} | Timeouts: ${result.timeouts} | Avg Turns: ${result.avgTurnsPerMatch}`,
    '=========================================================================================================',
    'CLASS LEADERBOARD (Sorted by Win Contribution)',
    '---------------------------------------------------------------------------------------------------------',
    'Class        | Tier | Win Rate | Net Dmg | Gross Dmg | Soaked | Dmg Taken | Kills | Survival | Moves | HighGrd%',
    '---------------------------------------------------------------------------------------------------------'
  ];

  for (const c of ranked) {
    const pad = (str: string | number, len: number) => String(str).padEnd(len);
    lines.push(
      `${pad(c.name, 12)} |  T${c.tier}  | ${pad(c.winRatePercent.toFixed(1) + '%', 8)} | ${pad(c.avgNetDamage.toFixed(1), 7)} | ${pad(c.avgGrossDamage.toFixed(1), 9)} | ${pad(c.avgDamageSoaked.toFixed(1), 6)} | ${pad(c.avgDamageTaken.toFixed(1), 9)} | ${pad(c.avgKills.toFixed(1), 5)} | ${pad(c.survivalPercent.toFixed(1) + '%', 8)} | ${pad(c.avgTilesMoved.toFixed(1), 5)} | ${pad(c.highGroundTurnPercent.toFixed(1) + '%', 8)}`
    );
  }

  lines.push('---------------------------------------------------------------------------------------------------------');
  lines.push('\nATTACK ROLL QUALITY & ELEVATION VANTAGE');
  lines.push('---------------------------------------------------------------------------------------------------------');
  lines.push('Class        | Total Atks | Crit % | Hit %  | Graze % | Miss % | Vantage Atk % | AoE Hits / Cast');
  lines.push('---------------------------------------------------------------------------------------------------------');

  for (const c of ranked) {
    const pad = (str: string | number, len: number) => String(str).padEnd(len);
    const aoeStr = c.aoeCasts > 0 ? `${c.avgAoeTargetsHit.toFixed(1)} (${c.aoeCasts} casts)` : 'N/A';
    lines.push(
      `${pad(c.name, 12)} | ${pad(c.totalAttacks, 10)} | ${pad(c.critPercent.toFixed(1) + '%', 6)} | ${pad(c.hitPercent.toFixed(1) + '%', 6)} | ${pad(c.grazePercent.toFixed(1) + '%', 7)} | ${pad(c.missPercent.toFixed(1) + '%', 6)} | ${pad(c.vantageAttackPercent.toFixed(1) + '%', 13)} | ${aoeStr}`
    );
  }

  lines.push('---------------------------------------------------------------------------------------------------------');
  lines.push('\nCONTROL & DEBUFF TARGET DISPERSION (Unique Targets Struck in Squad Battles)');
  lines.push('---------------------------------------------------------------------------------------------------------');

  for (const c of ranked) {
    const controlEntries = Object.entries(c.controlAbilityTargets);
    if (controlEntries.length > 0) {
      const summary = controlEntries.map(([abId, count]) => `${abId}: ${count} targets`).join(', ');
      lines.push(`${c.name.padEnd(12)} -> ${summary}`);
    }
  }

  lines.push('=========================================================================================================');
  return lines.join('\n');
}
