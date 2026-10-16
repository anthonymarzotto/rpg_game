import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { UnitStatusCard } from './UnitStatusCard';
import { createRecruit } from '../../core/units/unitFactory';
import { CombatUnit } from '../../core/combat/types';
import { TargetPreview } from '../../core/combat/targetPreview';

function createMockCombatUnit(): CombatUnit {
  const recruit = createRecruit('hero-1', 'Hero');
  return {
    unit: recruit,
    faction: 'PLAYER',
    currentHp: 20,
    currentAp: 4,
    initiativeGauge: 50,
    isDefeated: false,
    inBattleXp: { fighter: 0, rogue: 0, mage: 0 },
    activeModifiers: [],
    activeConditions: [],
    abilityModifiers: [],
    abilities: [],
    passives: [],
    facing: 0
  };
}

function createMockTargetPreview(rollAdvantage?: 'ADVANTAGE' | 'DISADVANTAGE' | 'NORMAL'): TargetPreview {
  return {
    targetUnitId: 'enemy-1',
    targetName: 'Enemy Goblin',
    toHitChance: 55,
    targetDefense: 14,
    defenseType: 'Evasion',
    diceDescription: '1d6 + force',
    damageRange: '3 – 8 (Soak: 1)',
    isBlockedLoS: false,
    expectedDamage: 4.5,
    combatArc: 'FRONT',
    isFlankAdvantage: false,
    hasLoS: true,
    mitigation: 1,
    rollAdvantage
  };
}

describe('UnitStatusCard Component', () => {
  it('renders (Adv) badge when target preview has Advantage', () => {
    const activeCu = createMockCombatUnit();
    const targetPreview = createMockTargetPreview('ADVANTAGE');

    const html = renderToStaticMarkup(
      <UnitStatusCard activeCu={activeCu} targetPreview={targetPreview} />
    );

    expect(html).toContain('Hit Chance:');
    expect(html).toContain('(Adv)');
    expect(html).toContain('roll-advantage-badge adv');
    expect(html).not.toContain('(Disadv)');
  });

  it('renders (Disadv) badge when target preview has Disadvantage', () => {
    const activeCu = createMockCombatUnit();
    const targetPreview = createMockTargetPreview('DISADVANTAGE');

    const html = renderToStaticMarkup(
      <UnitStatusCard activeCu={activeCu} targetPreview={targetPreview} />
    );

    expect(html).toContain('Hit Chance:');
    expect(html).toContain('(Disadv)');
    expect(html).toContain('roll-advantage-badge disadv');
    expect(html).not.toContain('(Adv)');
  });

  it('omits roll advantage badge when rollAdvantage is NORMAL', () => {
    const activeCu = createMockCombatUnit();
    const targetPreview = createMockTargetPreview('NORMAL');

    const html = renderToStaticMarkup(
      <UnitStatusCard activeCu={activeCu} targetPreview={targetPreview} />
    );

    expect(html).toContain('Hit Chance:');
    expect(html).not.toContain('(Adv)');
    expect(html).not.toContain('(Disadv)');
    expect(html).not.toContain('roll-advantage-badge');
  });

  it('renders Vantage badge when target preview includes elevationVantageRange', () => {
    const activeCu = createMockCombatUnit();
    const targetPreview = {
      ...createMockTargetPreview('ADVANTAGE'),
      elevationVantageRange: 2
    };

    const html = renderToStaticMarkup(
      <UnitStatusCard activeCu={activeCu} targetPreview={targetPreview} />
    );

    expect(html).toContain('✦ Vantage (+2 Range)');
    expect(html).toContain('advantage-indicator-badge vantage');
  });
});
