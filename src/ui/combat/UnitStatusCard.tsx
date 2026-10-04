import { ActiveCondition, ActiveModifier, CombatUnit } from '../../core/combat/types';
import { TargetPreview } from '../../core/combat/targetPreview';
import {
  getEffectiveArmor,
  getEffectiveWard,
  getEffectiveEvasion,
  getEffectiveResolve,
  getEffectiveMove,
  getEffectiveSpeed
} from '../../core/combat/effectiveVitals';

export interface UnitStatusCardProps {
  readonly activeCu: CombatUnit | undefined;
  readonly targetPreview: TargetPreview | null;
  readonly hoveredUnitCu?: CombatUnit;
}

function formatConditionBadge(cond: ActiveCondition): {
  text: string;
  isDebuff: boolean;
  className: string;
  title: string;
} {
  let icon = '';
  let label: string = cond.type;
  let isDebuff = false;
  let className = 'condition-stealth';
  let title = '';

  if (cond.type === 'STEALTH') {
    icon = '👤 ';
    label = 'STEALTH';
    isDebuff = false;
    className = 'condition-stealth';
    title = 'Stealthed: Untargetable by direct attacks. Next attack gains Advantage and breaks stealth.';
  } else if (cond.type === 'POISON') {
    icon = '🧪 ';
    label = `POISON (${cond.damagePerTurn ?? 2} dmg)`;
    isDebuff = true;
    className = 'condition-poison';
    title = `Poisoned: Suffers ${cond.damagePerTurn ?? 2} poison damage at the start of each turn.`;
  } else if (cond.type === 'BURN') {
    icon = '🔥 ';
    label = `BURN (${cond.damagePerTurn ?? 2} dmg)`;
    isDebuff = true;
    className = 'condition-burn';
    title = `Burned: Suffers ${cond.damagePerTurn ?? 2} fire damage at the start of each turn.`;
  } else if (cond.type === 'CHALLENGED') {
    icon = '⚔️ ';
    label = 'CHALLENGED';
    isDebuff = true;
    className = 'condition-challenged';
    title = 'Challenged: Must attack the challenger or suffer Disadvantage on rolls.';
  }

  const text = `${icon}${label} (${cond.durationTurns}t)`;
  return { text, isDebuff, className, title };
}

function formatModifierBadge(mod: ActiveModifier): { text: string; isDebuff: boolean } {
  const isDebuff = mod.value < 0;
  let icon = '';

  if (mod.stat === 'move') {
    icon = isDebuff ? '❄️ ' : '💨 ';
  } else if (mod.stat === 'armor') {
    icon = '🛡️ ';
  } else if (mod.stat === 'ward') {
    icon = '🔮 ';
  } else if (mod.stat === 'speed') {
    icon = '⚡ ';
  }

  const sign = mod.value > 0 ? `+${mod.value}` : `${mod.value}`;
  const text = `${icon}${sign} ${mod.stat.toUpperCase()} (${mod.durationTurns}t)`;
  return { text, isDebuff };
}

function formatRoleTitle(cu: CombatUnit): string {
  const level = cu.unit.progression?.currentLevel ?? 0;
  const classId = cu.unit.loadout?.activeClassId ?? 'novice';
  const className = classId.charAt(0).toUpperCase() + classId.slice(1);
  return `Level ${level} ${className}`;
}

export function UnitStatusCard({
  activeCu,
  targetPreview,
  hoveredUnitCu
}: UnitStatusCardProps) {
  if (!activeCu) return null;

  const vitals = activeCu.unit.effectiveVitals;
  const hpPercent = (activeCu.currentHp / vitals.maxHp) * 100;
  const isMomentumAdvantage =
    (activeCu.hexesMovedThisTurn ?? 0) >= 2 &&
    (activeCu.passives ?? []).some((p) => p.id === 'momentum');

  return (
    <div className="combat-status-overlay">
      {/* 1. Active Unit Status Card */}
      <div className="unit-hud-card player-hud-card">
        <div className="unit-hud-header">
          <span className="unit-role-badge">{formatRoleTitle(activeCu)}</span>
          <span className="unit-ctb-gauge">Gauge: {activeCu.initiativeGauge}/100</span>
        </div>
        <div className="unit-hud-name">{activeCu.unit.name}</div>

        {/* HP Bar */}
        <div className="hud-bar-container">
          <div className="hud-bar-track">
            <div
              className="hud-bar-fill hp-fill"
              style={{ width: `${Math.max(0, hpPercent)}%` }}
            />
          </div>
          <span className="hud-bar-label">
            HP: {activeCu.currentHp} / {vitals.maxHp}
          </span>
        </div>

        {/* Defense & Stat Matrix (Using Effective Vitals) */}
        <div className="hud-stats-row">
          <div className="stat-item" title="Physical To-Hit DC">
            <span className="stat-label">EVA</span>
            <span className="stat-val">{getEffectiveEvasion(activeCu)}</span>
          </div>
          <div className="stat-item" title="Magical To-Hit DC">
            <span className="stat-label">RES</span>
            <span className="stat-val">{getEffectiveResolve(activeCu)}</span>
          </div>
          <div className="stat-item" title="Flat Physical Damage Soak">
            <span className="stat-label">ARM</span>
            <span className="stat-val">{getEffectiveArmor(activeCu)}</span>
          </div>
          <div className="stat-item" title="Flat Magical Damage Soak">
            <span className="stat-label">WRD</span>
            <span className="stat-val">{getEffectiveWard(activeCu)}</span>
          </div>
          <div className="stat-item" title="Hexes per Move AP">
            <span className="stat-label">MOV</span>
            <span className="stat-val">{getEffectiveMove(activeCu)}</span>
          </div>
          <div className="stat-item" title="CTB Turn Speed">
            <span className="stat-label">SPD</span>
            <span className="stat-val">{getEffectiveSpeed(activeCu)}</span>
          </div>
        </div>

        {/* Active Passives Row */}
        {activeCu.passives && activeCu.passives.length > 0 && (
          <div className="hud-passives-row">
            <span className="passives-row-label">PASSIVES:</span>
            {activeCu.passives.map((p) => {
              const isReady = p.id === 'momentum' && (activeCu.hexesMovedThisTurn ?? 0) >= 2;
              return (
                <span
                  key={p.id}
                  className={`passive-chip-badge ${isReady ? 'ready-glow' : ''}`}
                  title={p.description}
                >
                  {p.name}
                  {p.id === 'momentum' && (
                    <span className="passive-chip-count">
                      ({Math.min(activeCu.hexesMovedThisTurn ?? 0, 2)}/2)
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        )}

        {/* Active Conditions & Modifiers (if present) */}
        {((activeCu.activeConditions && activeCu.activeConditions.length > 0) ||
          activeCu.activeModifiers.length > 0) && (
          <div className="active-modifiers-row">
            {activeCu.activeConditions?.map((cond, idx) => {
              const { text, isDebuff, className, title } = formatConditionBadge(cond);
              return (
                <span
                  key={`cond-${idx}`}
                  className={`mod-badge ${className} ${isDebuff ? 'debuff' : 'buff'}`}
                  title={title}
                >
                  {text}
                </span>
              );
            })}
            {activeCu.activeModifiers.map((mod, idx) => {
              const { text, isDebuff } = formatModifierBadge(mod);
              return (
                <span
                  key={`mod-${idx}`}
                  className={`mod-badge ${isDebuff ? 'debuff' : 'buff'}`}
                >
                  {text}
                </span>
              );
            })}
          </div>
        )}

        {/* In-Battle Archetype XP Accumulator */}
        <div className="hud-xp-tally">
          <span className="text-fighter">
            F: {activeCu.inBattleXp.fighter} XP
          </span>
          <span className="text-rogue">
            R: {activeCu.inBattleXp.rogue} XP
          </span>
          <span className="text-mage">
            M: {activeCu.inBattleXp.mage} XP
          </span>
        </div>
      </div>

      {/* 2. Target Hover Preview Card */}
      {targetPreview && (
        <div className={`target-preview-card ${targetPreview.isBlockedLoS ? 'blocked-los' : ''}`}>
          <div className="preview-header">
            <span className="preview-label">Target Preview</span>
            {targetPreview.isBlockedLoS ? (
              <span className="los-badge blocked">✖ Obstructed</span>
            ) : (
              <div className="preview-badges-row">
                {targetPreview.isFlankAdvantage && (
                  <span className="advantage-indicator-badge">
                    ✦ {targetPreview.combatArc === 'REAR' ? 'Rear' : 'Flank'} (+1d6)
                  </span>
                )}
                {isMomentumAdvantage && (
                  <span className="advantage-indicator-badge">✦ Advantage (Momentum)</span>
                )}
                <span className="los-badge clear">✔ Clear LoS</span>
              </div>
            )}
          </div>
          <div className="preview-target-name">{targetPreview.targetName}</div>

          {/* Active Conditions & Modifiers on Target (if present) */}
          {hoveredUnitCu &&
            ((hoveredUnitCu.activeConditions && hoveredUnitCu.activeConditions.length > 0) ||
              hoveredUnitCu.activeModifiers.length > 0) && (
            <div className="active-modifiers-row">
              {hoveredUnitCu.activeConditions?.map((cond, idx) => {
                const { text, isDebuff, className, title } = formatConditionBadge(cond);
                return (
                  <span
                    key={`targ-cond-${idx}`}
                    className={`mod-badge ${className} ${isDebuff ? 'debuff' : 'buff'}`}
                    title={title}
                  >
                    {text}
                  </span>
                );
              })}
              {hoveredUnitCu.activeModifiers.map((mod, idx) => {
                const { text, isDebuff } = formatModifierBadge(mod);
                return (
                  <span
                    key={`targ-mod-${idx}`}
                    className={`mod-badge ${isDebuff ? 'debuff' : 'buff'}`}
                  >
                    {text}
                  </span>
                );
              })}
            </div>
          )}

          {targetPreview.isBlockedLoS ? (
            <div className="preview-blocked-msg">{targetPreview.blockReason}</div>
          ) : (
            <div className="preview-details-grid">
              <div>
                Hit Chance: <b className="text-gold">{targetPreview.toHitChance}%</b>
              </div>
              <div>
                Target {targetPreview.defenseType}: <b>{targetPreview.targetDefense}</b>
              </div>
              <div className="preview-damage-row">
                Damage Profile: <b>{targetPreview.damageRange}</b>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Hovered Unit Details (when not targeting) */}
      {!targetPreview && hoveredUnitCu && hoveredUnitCu.unit.id !== activeCu.unit.id && (
        <div className="target-preview-card">
          <div className="preview-header">
            <span className="preview-label">Inspected Unit</span>
            <span className="unit-ctb-gauge text-muted">
              Gauge: {hoveredUnitCu.initiativeGauge}/100
            </span>
          </div>
          <div className="preview-target-name">
            {hoveredUnitCu.unit.name}{' '}
            <span className="unit-role-badge">
              {formatRoleTitle(hoveredUnitCu)}
            </span>
          </div>

          {/* Active Passives on Inspected Unit */}
          {hoveredUnitCu.passives && hoveredUnitCu.passives.length > 0 && (
            <div className="hud-passives-row">
              <span className="passives-row-label">PASSIVES:</span>
              {hoveredUnitCu.passives.map((p) => (
                <span
                  key={p.id}
                  className="passive-chip-badge"
                  title={p.description}
                >
                  {p.name}
                </span>
              ))}
            </div>
          )}

          {/* Active Conditions & Modifiers on Inspected Unit */}
          {((hoveredUnitCu.activeConditions && hoveredUnitCu.activeConditions.length > 0) ||
            hoveredUnitCu.activeModifiers.length > 0) && (
            <div className="active-modifiers-row">
              {hoveredUnitCu.activeConditions?.map((cond, idx) => {
                const { text, isDebuff, className, title } = formatConditionBadge(cond);
                return (
                  <span
                    key={`insp-cond-${idx}`}
                    className={`mod-badge ${className} ${isDebuff ? 'debuff' : 'buff'}`}
                    title={title}
                  >
                    {text}
                  </span>
                );
              })}
              {hoveredUnitCu.activeModifiers.map((mod, idx) => {
                const { text, isDebuff } = formatModifierBadge(mod);
                return (
                  <span
                    key={`insp-mod-${idx}`}
                    className={`mod-badge ${isDebuff ? 'debuff' : 'buff'}`}
                  >
                    {text}
                  </span>
                );
              })}
            </div>
          )}

          <div className="preview-details-grid">
            <div>
              HP: <b>{hoveredUnitCu.currentHp} / {hoveredUnitCu.unit.effectiveVitals.maxHp}</b>
            </div>
            <div>
              MOV: <b>{getEffectiveMove(hoveredUnitCu)}</b>
            </div>
            <div>
              EVA: <b>{getEffectiveEvasion(hoveredUnitCu)}</b>
            </div>
            <div>
              RES: <b>{getEffectiveResolve(hoveredUnitCu)}</b>
            </div>
            <div>
              ARM: <b>{getEffectiveArmor(hoveredUnitCu)}</b>
            </div>
            <div>
              WRD: <b>{getEffectiveWard(hoveredUnitCu)}</b>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
