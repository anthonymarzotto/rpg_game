import { ActiveCondition, ActiveModifier } from '../../core/combat/types';

export interface ConditionTooltipInfo {
  readonly icon: string;
  readonly name: string;
  readonly durationText: string;
  readonly sourceName?: string;
  readonly ruleText: string;
}

export interface FormattedConditionBadge {
  readonly text: string;
  readonly isDebuff: boolean;
  readonly className: string;
  readonly title: string;
  readonly tooltip: ConditionTooltipInfo;
}

export interface FormattedModifierBadge {
  readonly text: string;
  readonly isDebuff: boolean;
  readonly title: string;
  readonly tooltip: ConditionTooltipInfo;
}

/**
 * Formats a unit's display name cleanly for badge inclusion (e.g. "Garrick Vance" -> "Garrick").
 */
export function getShortUnitName(fullName: string): string {
  if (!fullName) return '';
  return fullName.split(' ')[0];
}

/**
 * Produces structured data and formatting for an active status condition badge.
 */
export function formatConditionBadge(
  cond: ActiveCondition,
  getUnitName?: (id: string) => string
): FormattedConditionBadge {
  const rawSource = cond.sourceUnitId ? (getUnitName ? getUnitName(cond.sourceUnitId) : cond.sourceUnitId) : undefined;
  const shortSource = rawSource ? getShortUnitName(rawSource) : undefined;

  let icon = '';
  let label: string = cond.type;
  let isDebuff = false;
  let className = 'condition-stealth';
  let mnemonic = '';
  let ruleText = '';

  if (cond.type === 'STEALTH') {
    icon = '👤 ';
    label = 'STEALTH';
    isDebuff = false;
    className = 'condition-stealth';
    mnemonic = ': +Adv';
    ruleText =
      'Untargetable by direct attacks. Next attack gains Advantage and breaks stealth. Direct attack damage, AoE splash, or Burn damage breaks stealth. Proximity in enemy front arc reveals stealth.';
  } else if (cond.type === 'POISON') {
    icon = '🧪 ';
    const dmg = cond.damagePerTurn ?? 2;
    label = `POISON (${dmg} dmg)`;
    isDebuff = true;
    className = 'condition-poison';
    mnemonic = '';
    ruleText = `Suffers ${dmg} physical poison damage at the start of each turn. Stacks intensity.`;
  } else if (cond.type === 'BURN') {
    icon = '🔥 ';
    const dmg = cond.damagePerTurn ?? 2;
    label = `BURN (${dmg} dmg)`;
    isDebuff = true;
    className = 'condition-burn';
    mnemonic = '';
    ruleText = `Suffers ${dmg} fire damage at the start of each turn. Breaks stealth. Stacks intensity.`;
  } else if (cond.type === 'CHALLENGED') {
    icon = '⚔️ ';
    label = 'CHALLENGED';
    isDebuff = true;
    className = 'condition-challenged';
    mnemonic = ': Disadv';
    const targetDesc = shortSource ? shortSource : 'the challenger';
    ruleText = `Must attack ${targetDesc}. Attacks directed at any other target suffer Disadvantage and inflict EXPOSED for 1 turn after the action.`;
  } else if (cond.type === 'EXPOSED') {
    icon = '🎯 ';
    label = 'EXPOSED';
    isDebuff = true;
    className = 'condition-exposed';
    mnemonic = ': +Adv';
    ruleText = 'Incoming attacks against this unit gain Advantage. Consumed immediately upon being attacked.';
  }

  const durationStr = `${cond.durationTurns}t`;
  const sourceTag = shortSource ? ` • ${shortSource}` : '';
  const text = `${icon}${label} (${durationStr}${sourceTag})${mnemonic}`;

  const tooltip: ConditionTooltipInfo = {
    icon: icon.trim(),
    name: label.split(' ')[0],
    durationText: `${cond.durationTurns} turn${cond.durationTurns === 1 ? '' : 's'} remaining`,
    sourceName: rawSource ? `Source: ${rawSource}` : undefined,
    ruleText
  };

  const title = `${tooltip.name} (${tooltip.durationText})${tooltip.sourceName ? ` • ${tooltip.sourceName}` : ''}: ${ruleText}`;

  return { text, isDebuff, className, title, tooltip };
}

/**
 * Produces structured data and formatting for an active stat modifier badge.
 */
export function formatModifierBadge(mod: ActiveModifier): FormattedModifierBadge {
  const isDebuff = mod.value < 0;
  let icon = '';
  let ruleText = '';

  if (mod.stat === 'move') {
    icon = isDebuff ? '❄️ ' : '💨 ';
    ruleText = `Modifies movement reach by ${mod.value > 0 ? `+${mod.value}` : mod.value} hexes per Move AP.`;
  } else if (mod.stat === 'armor') {
    icon = '🛡️ ';
    ruleText = `Modifies flat physical damage soak by ${mod.value > 0 ? `+${mod.value}` : mod.value}.`;
  } else if (mod.stat === 'ward') {
    icon = '🔮 ';
    ruleText = `Modifies flat magical damage soak by ${mod.value > 0 ? `+${mod.value}` : mod.value}.`;
  } else if (mod.stat === 'speed') {
    icon = '⚡ ';
    ruleText = `Modifies CTB initiative clock accumulation by ${mod.value > 0 ? `+${mod.value}` : mod.value}.`;
  } else if (mod.stat === 'evasion') {
    icon = '💨 ';
    ruleText = `Modifies physical To-Hit DC (EVA) by ${mod.value > 0 ? `+${mod.value}` : mod.value}.`;
  } else if (mod.stat === 'resolve') {
    icon = '🔮 ';
    ruleText = `Modifies magical To-Hit DC (RES) by ${mod.value > 0 ? `+${mod.value}` : mod.value}.`;
  }

  const sign = mod.value > 0 ? `+${mod.value}` : `${mod.value}`;
  const statLabel = mod.stat.toUpperCase();
  const text = `${icon}${sign} ${statLabel} (${mod.durationTurns}t)`;

  const tooltip: ConditionTooltipInfo = {
    icon: icon.trim(),
    name: `${sign} ${statLabel}`,
    durationText: `${mod.durationTurns} turn${mod.durationTurns === 1 ? '' : 's'} remaining`,
    ruleText
  };

  const title = `${tooltip.name} (${tooltip.durationText}): ${ruleText}`;

  return { text, isDebuff, title, tooltip };
}
