import { CombatUnit } from '../../core/combat/types';
import { TargetPreview } from '../../core/combat/targetPreview';

export interface UnitStatusCardProps {
  readonly playerCu: CombatUnit | undefined;
  readonly targetPreview: TargetPreview | null;
  readonly hoveredUnitCu?: CombatUnit;
}

export function UnitStatusCard({
  playerCu,
  targetPreview,
  hoveredUnitCu
}: UnitStatusCardProps) {
  if (!playerCu) return null;

  const vitals = playerCu.unit.effectiveVitals;
  const hpPercent = (playerCu.currentHp / vitals.maxHp) * 100;

  return (
    <div className="combat-status-overlay">
      {/* 1. Player Status Card */}
      <div className="unit-hud-card player-hud-card">
        <div className="unit-hud-header">
          <span className="unit-role-badge">Level 0 Recruit</span>
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

        {/* Defense & Stat Matrix */}
        <div className="hud-stats-row">
          <div className="stat-item" title="Physical To-Hit DC">
            <span className="stat-label">EVA</span>
            <span className="stat-val">{vitals.evasion}</span>
          </div>
          <div className="stat-item" title="Magical To-Hit DC">
            <span className="stat-label">RES</span>
            <span className="stat-val">{vitals.resolve}</span>
          </div>
          <div className="stat-item" title="Flat Physical Damage Soak">
            <span className="stat-label">ARM</span>
            <span className="stat-val">{vitals.armor}</span>
          </div>
          <div className="stat-item" title="Flat Magical Damage Soak">
            <span className="stat-label">WRD</span>
            <span className="stat-val">{vitals.ward}</span>
          </div>
          <div className="stat-item" title="Hexes per Move AP">
            <span className="stat-label">MOV</span>
            <span className="stat-val">{vitals.move}</span>
          </div>
          <div className="stat-item" title="CTB Turn Speed">
            <span className="stat-label">SPD</span>
            <span className="stat-val">{vitals.speed}</span>
          </div>
        </div>

        {/* Active Modifiers (if present) */}
        {playerCu.activeModifiers.length > 0 && (
          <div className="active-modifiers-row">
            {playerCu.activeModifiers.map((mod, idx) => (
              <span key={idx} className="mod-badge">
                {mod.value > 0 ? `+${mod.value}` : mod.value} {mod.stat.toUpperCase()} ({mod.durationTurns}t)
              </span>
            ))}
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
              <span className="los-badge clear">✔ Clear LoS</span>
            )}
          </div>
          <div className="preview-target-name">{targetPreview.targetName}</div>

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
          </div>
          <div className="preview-target-name">{hoveredUnitCu.unit.name}</div>
          <div className="preview-details-grid">
            <div>
              HP: <b>{hoveredUnitCu.currentHp} / {hoveredUnitCu.unit.effectiveVitals.maxHp}</b>
            </div>
            <div>
              Armor: <b>{hoveredUnitCu.unit.effectiveVitals.armor}</b>
            </div>
            <div>
              Evasion: <b>{hoveredUnitCu.unit.effectiveVitals.evasion}</b>
            </div>
            <div>
              Ward: <b>{hoveredUnitCu.unit.effectiveVitals.ward}</b>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
