import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { UnitStatusCard } from './UnitStatusCard';
import { createRecruit } from '../../core/units/unitFactory';
import { CombatUnit } from '../../core/combat/types';
import { TargetPreview } from '../../core/combat/targetPreview';

function createMockCombatUnit(overrides: Partial<CombatUnit> = {}): CombatUnit {
  const recruit = overrides.unit ?? createRecruit('hero-1', 'Hero');
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
    facing: 0,
    ...overrides
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

  it('renders EXPOSED condition badge with target icon and debuff styling', () => {
    const activeCu = createMockCombatUnit();
    activeCu.activeConditions.push({
      type: 'EXPOSED',
      durationTurns: 1,
      sourceUnitId: 'knight'
    });

    const html = renderToStaticMarkup(
      <UnitStatusCard activeCu={activeCu} targetPreview={null} />
    );

    expect(html).toContain('🎯 EXPOSED (1t • knight): +Adv');
    expect(html).toContain('condition-exposed');
    expect(html).toContain('debuff');
    expect(html).toContain('condition-rich-tooltip');
    expect(html).toContain('Incoming attacks against this unit gain Advantage.');
    // Browser native title attribute is omitted to avoid conflicting native OS tooltip
    expect(html).not.toContain('title="EXPOSED');
  });

  it('resolves condition source unit name from allUnits map', () => {
    const activeCu = createMockCombatUnit();
    const garrick = createMockCombatUnit({
      unit: createRecruit('garrick-1', 'Garrick the Brave')
    });

    const allUnits = new Map<string, CombatUnit>([
      [activeCu.unit.id, activeCu],
      ['garrick-1', garrick]
    ]);

    activeCu.activeConditions.push({
      type: 'CHALLENGED',
      durationTurns: 2,
      sourceUnitId: 'garrick-1'
    });

    const html = renderToStaticMarkup(
      <UnitStatusCard activeCu={activeCu} targetPreview={null} allUnits={allUnits} />
    );

    expect(html).toContain('⚔️ CHALLENGED (2t • Garrick): Disadv');
    expect(html).toContain('Source: Garrick the Brave');
    expect(html).toContain('Must attack Garrick. Attacks directed at any other target suffer Disadvantage');
  });

  it('renders persistent Pinned Unit card with loadout abilities and unpin control', () => {
    const activeCu = createMockCombatUnit();
    const pinnedCu: CombatUnit = {
      ...createMockCombatUnit(),
      faction: 'ENEMY' as const,
      unit: createRecruit('enemy-boss', 'High Inquisitor', { faction: 'ENEMY' }),
      abilities: [
        {
          id: 'smite',
          name: 'Holy Smite',
          apCost: 2,
          range: 1,
          reach: 1,
          damageType: 'RADIANT',
          description: 'Strikes the target with searing divine light.'
        } as any
      ],
      currentAp: 3,
      initiativeGauge: 85
    };

    const html = renderToStaticMarkup(
      <UnitStatusCard
        activeCu={activeCu}
        targetPreview={null}
        pinnedUnitCu={pinnedCu}
        onUnpinUnit={() => {}}
      />
    );

    // Redundant "PINNED UNIT" pill is omitted in favor of clean unpin controls and loadout
    expect(html).not.toContain('📌 Pinned Unit');
    expect(html).toContain('High Inquisitor');
    expect(html).toContain('AP: 3 • Gauge: 85/100');
    expect(html).toContain('btn-unpin');
    expect(html).toContain('EQUIPPED ABILITIES:');
    expect(html).toContain('Holy Smite');
    expect(html).toContain('2 AP');
    expect(html).toContain('Strikes the target with searing divine light.');
  });

  it('renders transient Inspected Unit card when hoveredUnitCu is provided and not targeting', () => {
    const activeCu = createMockCombatUnit();
    const hoveredCu: CombatUnit = {
      ...createMockCombatUnit(),
      faction: 'ENEMY' as const,
      unit: createRecruit('enemy-goblin', 'Sneaky Goblin', { faction: 'ENEMY' }),
      initiativeGauge: 78
    };

    const html = renderToStaticMarkup(
      <UnitStatusCard
        activeCu={activeCu}
        targetPreview={null}
        hoveredUnitCu={hoveredCu}
      />
    );

    expect(html).toContain('Inspected Unit');
    expect(html).toContain('preview-target-title');
    expect(html).toContain('Sneaky Goblin');
    expect(html).toContain('unit-role-badge');
    expect(html).toContain('Level 0 Novice');
    expect(html).toContain('Gauge: 78/100');
    // Per-unit XP progress bars are removed from in-combat cards in favor of the shared party pool ribbon
    expect(html).not.toContain('hud-xp-tracker');
  });

  describe('HUD Simplification', () => {
    it('omits individual XP trackers from player combat status cards', () => {
      const activeCu = createMockCombatUnit();
      const html = renderToStaticMarkup(
        <UnitStatusCard activeCu={activeCu} targetPreview={null} />
      );

      expect(html).not.toContain('hud-xp-tracker');
      expect(html).not.toContain('XP PROGRESS');
    });

    it('renders secondary splash targets and friendly fire indicators in target preview', () => {
      const activeCu = createMockCombatUnit();
      const targetPreview: TargetPreview = {
        ...createMockTargetPreview('NORMAL'),
        splashUnits: [
          {
            targetUnitId: 'enemy-2',
            targetName: 'Secondary Enemy',
            toHitChance: 65,
            targetDefense: 10,
            defenseType: 'Resolve',
            minDamage: 1,
            maxDamage: 4,
            expectedDamage: 2.5,
            mitigation: 0,
            isAlly: false
          },
          {
            targetUnitId: 'ally-1',
            targetName: 'Friendly Fighter',
            toHitChance: 50,
            targetDefense: 12,
            defenseType: 'Resolve',
            minDamage: 1,
            maxDamage: 4,
            expectedDamage: 2.0,
            mitigation: 0,
            isAlly: true
          }
        ]
      };

      const html = renderToStaticMarkup(
        <UnitStatusCard activeCu={activeCu} targetPreview={targetPreview} />
      );

      expect(html).toContain('Blast Targets (2)');
      expect(html).toContain('Secondary Enemy');
      expect(html).toContain('Friendly Fighter');
      expect(html).toContain('⚠ Friendly Fighter');
      expect(html).toContain('text-danger');
    });

    it('renders passive chips with rich in-engine tooltips and no native browser title attribute', () => {
      const activeCu = createMockCombatUnit({
        passives: [
          {
            id: 'momentum',
            name: 'Momentum',
            description: 'Moving 2 or more hexes in a turn grants Advantage on your next attack.',
            hook: 'ON_MOVE'
          },
          {
            id: 'unyielding',
            name: 'Unyielding',
            description: 'Gain +2 Armor while at or below 50% HP.',
            hook: 'ALWAYS'
          }
        ],
        hexesMovedThisTurn: 2
      });

      const html = renderToStaticMarkup(
        <UnitStatusCard activeCu={activeCu} targetPreview={null} />
      );

      // Verify passive chip and custom tooltip structure
      expect(html).toContain('passive-chip-badge');
      expect(html).toContain('ready-glow');
      expect(html).toContain('passive-hover-tooltip');
      expect(html).toContain('⚡ Momentum');
      expect(html).toContain('ADVANTAGE READY');
      expect(html).toContain('Moving 2 or more hexes in a turn grants Advantage on your next attack.');
      expect(html).toContain('🛡️ Unyielding');
      expect(html).toContain('Gain +2 Armor while at or below 50% HP.');

      // Verify browser native title attributes are omitted to prevent duplicate native OS tooltips
      expect(html).not.toContain('title="Moving 2 or more hexes');
      expect(html).not.toContain('title="Gain +2 Armor');
    });

    it('renders passive chips with rich tooltips on inspected/pinned units without title attributes', () => {
      const activeCu = createMockCombatUnit({ unit: createRecruit('p1', 'Active Hero') });
      const pinnedCu = createMockCombatUnit({
        faction: 'ENEMY',
        unit: createRecruit('e1', 'Shadow Stalker', { faction: 'ENEMY' }),
        passives: [
          {
            id: 'elusive_stride',
            name: 'Elusive Stride',
            description: 'Disengaging or moving through threatened hexes costs 0 additional AP.',
            hook: 'ALWAYS'
          }
        ]
      });

      const html = renderToStaticMarkup(
        <UnitStatusCard activeCu={activeCu} targetPreview={null} pinnedUnitCu={pinnedCu} />
      );

      expect(html).toContain('inspected-passive-chip-elusive_stride');
      expect(html).toContain('passive-hover-tooltip');
      expect(html).toContain('💨 Elusive Stride');
      expect(html).toContain('Disengaging or moving through threatened hexes costs 0 additional AP.');
      expect(html).not.toContain('title="Disengaging or moving through');
    });
  });
});
