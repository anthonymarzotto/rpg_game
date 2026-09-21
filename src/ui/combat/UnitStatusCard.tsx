import { ActiveModifier, CombatUnit } from '../../core/combat/types';
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
  readonly playerCu: CombatUnit | undefined;
  readonly targetPreview: TargetPreview | null;
  readonly hoveredUnitCu?: CombatUnit;
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
  playerCu,
  targetPreview,
  hoveredUnitCu
}: UnitStatusCardProps) {
  if (!playerCu) return null;

  const vitals = playerCu.unit.effectiveVitals;
  const hpPercent = (playerCu.currentHp / vitals.maxHp) * 100;
  const isMomentumAdvantage =
    (playerCu.hexesMovedThisTurn ?? 0) >= 2 &&
    (playerCu.passives ?? []).some((p) => p.id === 'momentum');

  return (
    <div className="combat-status-overlay">
      {/* 1. Player Status Card */}
      <div className="unit-hud-card player-hud-card">
        <div className="unit-hud-header">
          <span className="unit-role-badge">{formatRoleTitle(playerCu)}</span>
          <span className="unit-ctb-gauge">Gauge: {playerCu.initiativeGauge}/100</span>
        </div>
        <div className="unit-hud-name">{playerCu.unit.name}</div>

        {/* HP Bar */}
        <div className="hud-bar-container">
          <div className="hud-bar-track">
            <div
              className="hud-bar-fill hp-fill"
              style={{ width: `${Math.max(0, hpPercent)}%` }}
            />
          </div>
          <span className="hud-bar-label">
            HP: {playerCu.currentHp} / {vitals.maxHp}
          </span>
        </div>

        {/* Defense & Stat Matrix (Using Effective Vitals) */}
        <div className="hud-stats-row">
          <div className="stat-item" title="Physical To-Hit DC">
            <span className="stat-label">EVA</span>
            <span className="stat-val">{getEffectiveEvasion(playerCu)}</span>
          </div>
          <div className="stat-item" title="Magical To-Hit DC">
            <span className="stat-label">RES</span>
            <span className="stat-val">{getEffectiveResolve(playerCu)}</span>
          </div>
          <div className="stat-item" title="Flat Physical Damage Soak">
            <span className="stat-label">ARM</span>
            <span className="stat-val">{getEffectiveArmor(playerCu)}</span>
          </div>
          <div className="stat-item" title="Flat Magical Damage Soak">
            <span className="stat-label">WRD</span>
            <span className="stat-val">{getEffectiveWard(playerCu)}</span>
          </div>
          <div className="stat-item" title="Hexes per Move AP">
            <span className="stat-label">MOV</span>
            <span className="stat-val">{getEffectiveMove(playerCu)}</span>
          </div>
          <div className="stat-item" title="CTB Turn Speed">
            <span className="stat-label">SPD</span>
            <span className="stat-val">{getEffectiveSpeed(playerCu)}</span>
          </div>
        </div>

        {/* Active Passives Row */}
        {playerCu.passives && playerCu.passives.length > 0 && (
          <div className="hud-passives-row">
            <span className="passives-row-label">PASSIVES:</span>
            {playerCu.passives.map((p) => {
              const isReady = p.id === 'momentum' && (playerCu.hexesMovedThisTurn ?? 0) >= 2;
              return (
                <span
                  key={p.id}
                  className={`passive-chip-badge ${isReady ? 'ready-glow' : ''}`}
                  title={p.description}
                >
                  {p.name}
                  {p.id === 'momentum' && (
                    <span className="passive-chip-count">
                      ({Math.min(playerCu.hexesMovedThisTurn ?? 0, 2)}/2)
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        )}

        {/* Active Modifiers (if present) */}
        {playerCu.activeModifiers.length > 0 && (
          <div className="active-modifiers-row">
            {playerCu.activeModifiers.map((mod, idx) => {
              const { text, isDebuff } = formatModifierBadge(mod);
              return (
                <span
                  key={idx}
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
          <span style={{ color: 'var(--color-fighter, #ef4444)' }}>
            F: {playerCu.inBattleXp.fighter} XP
          </span>
          <span style={{ color: 'var(--color-rogue, #10b981)' }}>
            R: {playerCu.inBattleXp.rogue} XP
          </span>
          <span style={{ color: 'var(--color-mage, #8b5cf6)' }}>
            M: {playerCu.inBattleXp.mage} XP
          </span>
        </div>
      </div>

      {/* 2. Target Hover Preview Card */}
      {targetPreview && (
        <div className={`target-preview-card ${targetPreview.isBlockedLoS ? 'blocked-los' : ''}`}>
          <div className="preview-header">
            <span className="preview-label">Target Preview</span>
            {targetPreview.isBlockedLoS ? (
              <span className="los-badge blocked">✖ Screened</span>
            ) : (
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
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

          {/* Active Modifiers on Target (if present) */}
          {hoveredUnitCu && hoveredUnitCu.activeModifiers.length > 0 && (
            <div className="active-modifiers-row" style={{ marginTop: '0.35rem' }}>
              {hoveredUnitCu.activeModifiers.map((mod, idx) => {
                const { text, isDebuff } = formatModifierBadge(mod);
                return (
                  <span
                    key={idx}
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
                Hit Chance: <b style={{ color: '#fbbf24' }}>{targetPreview.toHitChance}%</b>
              </div>
              <div>
                Target {targetPreview.defenseType}: <b>{targetPreview.targetDefense}</b>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                Damage Profile: <b>{targetPreview.damageRange}</b>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Hovered Unit Details (when not targeting) */}
      {!targetPreview && hoveredUnitCu && hoveredUnitCu.unit.id !== 'player' && (
        <div className="target-preview-card">
          <div className="preview-header">
            <span className="preview-label">Inspected Unit</span>
            <span className="unit-ctb-gauge" style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Gauge: {hoveredUnitCu.initiativeGauge}/100
            </span>
          </div>
          <div className="preview-target-name">
            {hoveredUnitCu.unit.name}{' '}
            <span className="unit-role-badge" style={{ fontSize: '0.65rem', marginLeft: '0.3rem' }}>
              {formatRoleTitle(hoveredUnitCu)}
            </span>
          </div>

          {/* Active Passives on Inspected Unit */}
          {hoveredUnitCu.passives && hoveredUnitCu.passives.length > 0 && (
            <div className="hud-passives-row" style={{ marginTop: '0.35rem' }}>
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

          {/* Active Modifiers on Inspected Unit */}
          {hoveredUnitCu.activeModifiers.length > 0 && (
            <div className="active-modifiers-row" style={{ marginTop: '0.35rem' }}>
              {hoveredUnitCu.activeModifiers.map((mod, idx) => {
                const { text, isDebuff } = formatModifierBadge(mod);
                return (
                  <span
                    key={idx}
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
