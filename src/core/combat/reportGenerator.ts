import { CombatState } from './types';

export interface GenerateTrialReportOptions {
  readonly encounterName?: string;
  readonly stage?: number;
  readonly error?: Error | string;
  readonly maxCombatLogEntries?: number;
  readonly maxAiDecisionTraces?: number;
}

/**
 * Generates an LLM- and human-readable Markdown diagnostic report of a combat trial.
 * Captures encounter vitals, unit positions, detected faults, AI candidate evaluations, and combat logs.
 */
export function generateTrialMarkdownReport(
  state: CombatState,
  options: GenerateTrialReportOptions = {}
): string {
  const lines: string[] = [];

  const encounterTitle = options.encounterName ?? 'Astral Trial';
  const stageInfo = options.stage !== undefined ? ` | **Stage:** ${options.stage}` : '';
  const nowIso = new Date().toISOString();

  lines.push('# Astral Tactics — Trial Diagnostic Report');
  lines.push(`**Encounter:** ${encounterTitle}${stageInfo} | **Turn:** ${state.turnNumber} | **Outcome:** ${state.outcome}`);
  lines.push(`**Exported At:** \`${nowIso}\``);

  const activeCu = state.units.get(state.activeUnitId);
  const activePos = activeCu ? state.arena.getUnitPosition(state.activeUnitId) : undefined;
  const activeElevation = activePos ? state.arena.getElevation(activePos) : 0;

  if (activeCu && activePos) {
    lines.push(
      `**Active Combatant:** ${activeCu.unit.name} (\`${activeCu.unit.id}\`) — [Faction: ${activeCu.faction ?? 'UNKNOWN'}, HP: ${activeCu.currentHp}/${activeCu.unit.effectiveVitals.maxHp}, AP: ${activeCu.currentAp}/${activeCu.unit.effectiveVitals.maxAp}, Pos: (${activePos.q}, ${activePos.r}, h:${activeElevation})]`
    );
  } else {
    lines.push(`**Active Unit ID:** \`${state.activeUnitId}\``);
  }
  lines.push('');

  // 1. Unhandled Runtime Error (if error boundary caught an exception)
  if (options.error) {
    const errorMsg = options.error instanceof Error ? options.error.message : String(options.error);
    const errorStack = options.error instanceof Error ? options.error.stack : undefined;
    lines.push('## 🚨 Runtime Crash / Exception');
    lines.push(`> **Error:** ${errorMsg}`);
    if (errorStack) {
      lines.push('```');
      lines.push(errorStack);
      lines.push('```');
    }
    lines.push('');
  }

  // 2. Detected In-Game Action Faults
  const faultEntries = state.combatLog.filter(
    (e) => e.actionId === 'ai_fault' || e.message.includes('[AI Fault]')
  );
  if (faultEntries.length > 0) {
    lines.push('## ⚠️ Detected AI / Action Faults');
    for (const fault of faultEntries) {
      lines.push(`- **Turn ${fault.turnNumber}:** ${fault.message}`);
    }
    lines.push('');
  }

  // 3. Combatants Overview Table
  lines.push('## Combatants Status Overview');
  lines.push('| Unit | Faction | Class | HP | AP | Pos (q, r, h) | Facing | Status / Buffs |');
  lines.push('| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |');

  for (const cu of state.units.values()) {
    const pos = state.arena.getUnitPosition(cu.unit.id);
    const elevation = pos ? state.arena.getElevation(pos) : 0;
    const posStr = pos ? `(${pos.q}, ${pos.r}, h:${elevation})` : 'Off-Grid';
    const statusBadges: string[] = [];

    if (cu.isDefeated) {
      statusBadges.push('💀 DEFEATED');
    }
    if (cu.activeConditions && cu.activeConditions.length > 0) {
      statusBadges.push(...cu.activeConditions.map((c) => c.type));
    }
    if (cu.activeModifiers && cu.activeModifiers.length > 0) {
      statusBadges.push(
        ...cu.activeModifiers.map((m) => `${m.stat}(${m.value > 0 ? '+' : ''}${m.value})`)
      );
    }

    const statusStr = statusBadges.length > 0 ? statusBadges.join(', ') : 'None';
    const classId = cu.unit.loadout?.activeClassId ?? 'Novice';

    lines.push(
      `| ${cu.unit.name} | ${cu.faction ?? 'NEUTRAL'} | ${classId} | ${cu.currentHp}/${cu.unit.effectiveVitals.maxHp} | ${cu.currentAp}/${cu.unit.effectiveVitals.maxAp} | ${posStr} | ${cu.facing} | ${statusStr} |`
    );
  }
  lines.push('');

  // 4. AI Decision Telemetry
  const decisionLog = state.aiDecisionLog ?? [];
  const maxTraces = options.maxAiDecisionTraces ?? 5;
  const recentTraces = decisionLog.slice(-maxTraces);

  lines.push('## Recent AI Decision Telemetry');
  if (recentTraces.length === 0) {
    lines.push('*No AI decision traces recorded in this trial.*');
  } else {
    for (const trace of recentTraces) {
      lines.push(`### Turn ${trace.turnNumber} — ${trace.actorName} (Profile: ${trace.profile})`);
      lines.push(`- **Current AP:** ${trace.currentAp} | **Conservation Threshold:** ${trace.apConservationThreshold}`);
      lines.push(`- **Winning Action:** \`${trace.chosenAction.type}\` (Score: ${trace.chosenAction.score})`);
      lines.push(`  - *Reason:* ${trace.chosenAction.reason}`);
      if (trace.faultReason) {
        lines.push(`  - ⚠️ *Execution Fault:* ${trace.faultReason}`);
      }

      if (trace.topCandidates.length > 0) {
        lines.push(`- **Top Candidates (${trace.totalCandidatesEvaluated} total evaluated):**`);
        for (const cand of trace.topCandidates) {
          lines.push(`  ${cand.rank}. **[${cand.type}]** Score: ${cand.score} — ${cand.reason}`);
        }
      }
      lines.push('');
    }
  }
  lines.push('');

  // 5. Recent Combat Log Entries
  const maxLogs = options.maxCombatLogEntries ?? 10;
  const recentLogs = state.combatLog.slice(-maxLogs);

  lines.push('## Recent Combat Log Entries');
  if (recentLogs.length === 0) {
    lines.push('*Nothing logged yet.*');
  } else {
    for (const entry of recentLogs) {
      lines.push(`- [Turn ${entry.turnNumber}] ${entry.message}`);
    }
  }
  lines.push('');

  return lines.join('\n');
}
