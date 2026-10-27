import { CombatUnit } from '../../core/combat/types';
import { TargetPreview } from '../../core/combat/targetPreview';
import {
  getEffectiveArmor,
  getEffectiveWard,
  getEffectiveEvasion,
  getEffectiveResolve,
  getEffectiveMove,
  getEffectiveSpeed
} from '../../core/combat/effectiveVitals';
import { getClassBadgePalette } from './tokenAssets';
import { PassiveTrait } from '../../core/types/passive';
import {
  formatConditionBadge,
  formatModifierBadge,
  FormattedConditionBadge,
  FormattedModifierBadge,
  ConditionTooltipInfo
} from './conditionBadges';

export { formatConditionBadge, formatModifierBadge };

export function getPassiveIcon(passiveId: string): string {
  switch (passiveId) {
    case 'momentum':
      return '⚡';
    case 'unyielding':
      return '🛡️';
    case 'quickstep':
      return '👟';
    case 'arcane_aegis':
      return '🔮';
    case 'tactical_vanguard':
      return '⚔️';
    case 'elusive_stride':
      return '💨';
    case 'feline_grace':
      return '🐾';
    case 'deathbound_fury':
      return '🩸';
    case 'impact_velocity':
      return '🐎';
    case 'highway_toll':
      return '💰';
    case 'wild_surge':
      return '✨';
    case 'misfortune_ward':
      return '🧿';
    case 'soul_carapace':
      return '💀';
    default:
      return '✦';
  }
}

export function PassiveTooltipContent({
  passive,
  isReady,
  testId
}: {
  readonly passive: PassiveTrait;
  readonly isReady?: boolean;
  readonly testId?: string;
}) {
  const icon = getPassiveIcon(passive.id);
  const tagText = passive.id === 'momentum' ? 'ADVANTAGE READY' : 'READY';
  return (
    <div className="passive-hover-tooltip" role="tooltip" data-testid={testId}>
      <div className="tooltip-title-row">
        <span className="tooltip-name">
          {icon} {passive.name}
        </span>
        {isReady && <span className="tooltip-tag ready-tag">{tagText}</span>}
      </div>
      <div className="tooltip-desc">{passive.description}</div>
    </div>
  );
}

export function PassiveBadgeItem({
  passive,
  isReady,
  counterText,
  testId
}: {
  readonly passive: PassiveTrait;
  readonly isReady?: boolean;
  readonly counterText?: string;
  readonly testId?: string;
}) {
  return (
    <span
      className={`passive-chip-badge ${isReady ? 'ready-glow' : ''}`}
      data-testid={testId}
    >
      <span className="passive-badge-label">{passive.name}</span>
      {counterText && (
        <span className="passive-chip-count">{counterText}</span>
      )}
      <PassiveTooltipContent passive={passive} isReady={isReady} />
    </span>
  );
}

export interface UnitStatusCardProps {
  readonly activeCu: CombatUnit | undefined;
  readonly targetPreview: TargetPreview | null;
  readonly hoveredUnitCu?: CombatUnit;
  readonly pinnedUnitCu?: CombatUnit;
  readonly onUnpinUnit?: () => void;
  readonly allUnits?: ReadonlyMap<string, CombatUnit>;
}

export function ConditionTooltipContent({
  tooltip
}: {
  readonly tooltip: ConditionTooltipInfo;
}) {
  return (
    <span className="condition-rich-tooltip" role="tooltip">
      <span className="rich-tooltip-header">
        <span className="rich-tooltip-title">
          {tooltip.icon} {tooltip.name}
        </span>
        <span className="rich-tooltip-duration">{tooltip.durationText}</span>
      </span>
      {tooltip.sourceName && (
        <span className="rich-tooltip-source">{tooltip.sourceName}</span>
      )}
      <span className="rich-tooltip-rule">{tooltip.ruleText}</span>
    </span>
  );
}

export function ConditionBadgeItem({
  badge,
  testId
}: {
  readonly badge: FormattedConditionBadge | FormattedModifierBadge;
  readonly testId?: string;
}) {
  const className = 'className' in badge ? badge.className : '';
  const isDebuff = badge.isDebuff;
  return (
    <span
      className={`mod-badge ${className} ${isDebuff ? 'debuff' : 'buff'}`}
      data-testid={testId}
    >
      <span className="mod-badge-text">{badge.text}</span>
      <ConditionTooltipContent tooltip={badge.tooltip} />
    </span>
  );
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
  hoveredUnitCu,
  pinnedUnitCu,
  onUnpinUnit,
  allUnits
}: UnitStatusCardProps) {
  if (!activeCu) return null;

  const vitals = activeCu.unit.effectiveVitals;
  const hpPercent = (activeCu.currentHp / vitals.maxHp) * 100;
  const isMomentumAdvantage =
    (activeCu.hexesMovedThisTurn ?? 0) >= 2 &&
    (activeCu.passives ?? []).some((p) => p.id === 'momentum');

  const activeBadgePalette = getClassBadgePalette(activeCu.unit.loadout?.activeClassId);

  const inspectedCu = !targetPreview
    ? (hoveredUnitCu && hoveredUnitCu.unit.id !== activeCu.unit.id
        ? hoveredUnitCu
        : pinnedUnitCu && pinnedUnitCu.unit.id !== activeCu.unit.id
          ? pinnedUnitCu
          : undefined)
    : undefined;

  const isPinned = !hoveredUnitCu && Boolean(pinnedUnitCu && inspectedCu && inspectedCu.unit.id === pinnedUnitCu.unit.id);
  const inspectedBadgePalette = getClassBadgePalette(inspectedCu?.unit.loadout?.activeClassId);

  const getUnitName = (id: string) => allUnits?.get(id)?.unit.name ?? id;

  return (
    <div className="combat-status-overlay">
      {/* 1. Active Unit Status Card */}
      <div className="unit-hud-card player-hud-card">
        <div className="unit-hud-header">
          <span
            className="unit-role-badge"
            style={{
              color: activeBadgePalette.border,
              backgroundColor: `${activeBadgePalette.primary}26`,
              borderColor: `${activeBadgePalette.border}66`
            }}
          >
            {formatRoleTitle(activeCu)}
          </span>
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
              const counterText =
                p.id === 'momentum'
                  ? `(${Math.min(activeCu.hexesMovedThisTurn ?? 0, 2)}/2)`
                  : undefined;
              return (
                <PassiveBadgeItem
                  key={p.id}
                  passive={p}
                  isReady={isReady}
                  counterText={counterText}
                  testId={`passive-chip-${p.id}`}
                />
              );
            })}
          </div>
        )}

        {/* Active Conditions & Modifiers (if present) */}
        {((activeCu.activeConditions && activeCu.activeConditions.length > 0) ||
          activeCu.activeModifiers.length > 0) && (
          <div className="active-modifiers-row">
            {activeCu.activeConditions?.map((cond, idx) => {
              const badge = formatConditionBadge(cond, getUnitName);
              return <ConditionBadgeItem key={`cond-${idx}`} badge={badge} testId={`cond-${idx}`} />;
            })}
            {activeCu.activeModifiers.map((mod, idx) => {
              const badge = formatModifierBadge(mod);
              return <ConditionBadgeItem key={`mod-${idx}`} badge={badge} testId={`mod-${idx}`} />;
            })}
          </div>
        )}
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
                {targetPreview.elevationVantageRange !== undefined && targetPreview.elevationVantageRange > 0 && (
                  <span className="advantage-indicator-badge vantage" title={`High Ground Vantage extends ability reach by +${targetPreview.elevationVantageRange} hexes`}>
                    ✦ Vantage (+{targetPreview.elevationVantageRange} Range)
                  </span>
                )}
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
                const badge = formatConditionBadge(cond, getUnitName);
                return <ConditionBadgeItem key={`targ-cond-${idx}`} badge={badge} testId={`targ-cond-${idx}`} />;
              })}
              {hoveredUnitCu.activeModifiers.map((mod, idx) => {
                const badge = formatModifierBadge(mod);
                return <ConditionBadgeItem key={`targ-mod-${idx}`} badge={badge} testId={`targ-mod-${idx}`} />;
              })}
            </div>
          )}

          {targetPreview.isBlockedLoS ? (
            <div className="preview-blocked-msg">{targetPreview.blockReason}</div>
          ) : (
            <div className="preview-details-grid">
              <div>
                <span>Hit Chance:</span>{' '}
                <b className="text-gold preview-hit-percent">{targetPreview.toHitChance}%</b>
                {targetPreview.rollAdvantage === 'ADVANTAGE' && (
                  <span className="roll-advantage-badge adv" title="Rolling with Advantage (higher of 2d20)">
                    (Adv)
                  </span>
                )}
                {targetPreview.rollAdvantage === 'DISADVANTAGE' && (
                  <span className="roll-advantage-badge disadv" title="Rolling with Disadvantage (lower of 2d20)">
                    (Disadv)
                  </span>
                )}
              </div>
              <div>
                Target {targetPreview.defenseType}: <b>{targetPreview.targetDefense}</b>
              </div>
              <div className="preview-damage-row">
                Damage Profile: <b>{targetPreview.damageRange}</b>
              </div>
              {targetPreview.splashUnits && targetPreview.splashUnits.length > 0 && (
                <div className="preview-splash-list">
                  <div className="splash-list-title text-muted">Blast Targets ({targetPreview.splashUnits.length}):</div>
                  {targetPreview.splashUnits.map((sp) => (
                    <div key={sp.targetUnitId} className={`splash-target-item ${sp.isAlly ? 'text-danger' : ''}`}>
                      <span className="splash-target-name">{sp.isAlly ? '⚠ ' : '💥 '}{sp.targetName}</span>
                      <span className="splash-target-hit">{sp.toHitChance}% to hit</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. Inspected or Pinned Unit Details (when not targeting) */}
      {!targetPreview && inspectedCu && inspectedCu.unit.id !== activeCu.unit.id && (
        <div className="target-preview-card" data-testid={isPinned ? 'pinned-unit-card' : 'inspected-unit-card'}>
          <div className="preview-header">
            {!isPinned && <span className="preview-label">Inspected Unit</span>}
            <div className={`pinned-header-controls ${isPinned ? 'is-pinned' : ''}`}>
              <span className="unit-ctb-gauge text-muted">
                {isPinned && `AP: ${inspectedCu.currentAp} • `}Gauge: {inspectedCu.initiativeGauge}/100
              </span>
              {isPinned && onUnpinUnit && (
                <button
                  type="button"
                  className="btn-unpin"
                  onClick={onUnpinUnit}
                  title="Unpin unit (Esc or click ground)"
                  data-testid="btn-unpin-unit"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          <div className="preview-target-name">
            <span className="preview-target-title">{inspectedCu.unit.name}</span>
            <span
              className="unit-role-badge"
              style={{
                color: inspectedBadgePalette.border,
                backgroundColor: `${inspectedBadgePalette.primary}26`,
                borderColor: `${inspectedBadgePalette.border}66`
              }}
            >
              {formatRoleTitle(inspectedCu)}
            </span>
          </div>

          {/* Active Passives on Inspected Unit */}
          {inspectedCu.passives && inspectedCu.passives.length > 0 && (
            <div className="hud-passives-row">
              <span className="passives-row-label">PASSIVES:</span>
              {inspectedCu.passives.map((p) => {
                const isReady = p.id === 'momentum' && (inspectedCu.hexesMovedThisTurn ?? 0) >= 2;
                const counterText =
                  p.id === 'momentum'
                    ? `(${Math.min(inspectedCu.hexesMovedThisTurn ?? 0, 2)}/2)`
                    : undefined;
                return (
                  <PassiveBadgeItem
                    key={p.id}
                    passive={p}
                    isReady={isReady}
                    counterText={counterText}
                    testId={`inspected-passive-chip-${p.id}`}
                  />
                );
              })}
            </div>
          )}

          {/* Active Conditions & Modifiers on Inspected Unit */}
          {((inspectedCu.activeConditions && inspectedCu.activeConditions.length > 0) ||
            inspectedCu.activeModifiers.length > 0) && (
            <div className="active-modifiers-row">
              {inspectedCu.activeConditions?.map((cond, idx) => {
                const badge = formatConditionBadge(cond, getUnitName);
                return <ConditionBadgeItem key={`insp-cond-${idx}`} badge={badge} testId={`insp-cond-${idx}`} />;
              })}
              {inspectedCu.activeModifiers.map((mod, idx) => {
                const badge = formatModifierBadge(mod);
                return <ConditionBadgeItem key={`insp-mod-${idx}`} badge={badge} testId={`insp-mod-${idx}`} />;
              })}
            </div>
          )}

          <div className="preview-details-grid">
            <div>
              HP: <b>{inspectedCu.currentHp} / {inspectedCu.unit.effectiveVitals.maxHp}</b>
            </div>
            <div>
              MOV: <b>{getEffectiveMove(inspectedCu)}</b>
            </div>
            <div>
              EVA: <b>{getEffectiveEvasion(inspectedCu)}</b>
            </div>
            <div>
              RES: <b>{getEffectiveResolve(inspectedCu)}</b>
            </div>
            <div>
              ARM: <b>{getEffectiveArmor(inspectedCu)}</b>
            </div>
            <div>
              WRD: <b>{getEffectiveWard(inspectedCu)}</b>
            </div>
          </div>

          {/* Equipped Abilities on Pinned Unit */}
          {isPinned && inspectedCu.abilities && inspectedCu.abilities.length > 0 && (
            <div className="pinned-loadout-section" data-testid="pinned-loadout-section">
              <div className="pinned-loadout-title">EQUIPPED ABILITIES:</div>
              <div className="pinned-abilities-list">
                {inspectedCu.abilities.map((ability) => (
                  <div key={ability.id} className="pinned-ability-item">
                    <div className="pinned-ability-row">
                      <span className="pinned-ability-name">{ability.name}</span>
                      <span className="pinned-ability-ap">{ability.apCost} AP</span>
                    </div>
                    <div className="pinned-ability-details">
                      <span>Range: {ability.range}</span>
                      <span>•</span>
                      <span className="text-capitalize">{ability.damageType.toLowerCase()}</span>
                    </div>
                    <div className="pinned-ability-desc">{ability.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
