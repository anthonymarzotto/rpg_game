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
    expect(html).toContain('Sneaky Goblin');
    expect(html).toContain('Gauge: 78/100');
    // Active player card has hud-xp-tracker (1), but inspected hostile unit does NOT add a second tracker
    const trackerMatches = html.match(/data-testid="hud-xp-tracker"/g) || [];
    expect(trackerMatches.length).toBe(1);
  });

  describe('In-Combat Character Card XP Gain Tracker', () => {
    it('renders Force, Finesse, Focus totals, threshold header, and omits (+0) when no battle XP', () => {
      const activeCu = {
        ...createMockCombatUnit(),
        unit: {
          ...createRecruit('hero-1', 'Recruit'),
          progression: {
            unitId: 'hero-1',
            currentLevel: 0,
            archetypePoints: { fighter: 0, rogue: 0, mage: 0 },
            constellation: [],
            accumulatedXp: { fighter: 2, rogue: 1, mage: 0 },
            milestoneSelections: {}
          }
        },
        inBattleXp: { fighter: 0, rogue: 0, mage: 0 }
      };

      const html = renderToStaticMarkup(
        <UnitStatusCard activeCu={activeCu} targetPreview={null} />
      );

      expect(html).toContain('XP PROGRESS');
      expect(html).toContain('Next Level: 5 XP');
      expect(html).toContain('FRC 2');
      expect(html).toContain('FIN 1');
      expect(html).toContain('FOC 0');
      // Tooltips maintain full attribute names
      expect(html).toContain('title="Force: 2/5 XP"');
      expect(html).toContain('title="Finesse: 1/5 XP"');
      expect(html).toContain('title="Focus: 0/5 XP"');
      // Should omit (+0) to avoid visual noise
      expect(html).not.toContain('(+0)');
      expect(html).not.toContain('hud-xp-gain');
      expect(html).not.toContain('hud-xp-ready-glyph');
    });

    it('renders (+N) delta badges and ✦ ready badge when threshold is met', () => {
      const activeCu = {
        ...createMockCombatUnit(),
        unit: {
          ...createRecruit('hero-1', 'Recruit'),
          progression: {
            unitId: 'hero-1',
            currentLevel: 0,
            archetypePoints: { fighter: 0, rogue: 0, mage: 0 },
            constellation: [],
            accumulatedXp: { fighter: 3, rogue: 1, mage: 0 },
            milestoneSelections: {}
          }
        },
        inBattleXp: { fighter: 2, rogue: 1, mage: 0 }
      };

      const html = renderToStaticMarkup(
        <UnitStatusCard activeCu={activeCu} targetPreview={null} />
      );

      // Force: 3 base + 2 battle = 5 (Threshold 5 -> Ready!)
      expect(html).toContain('FRC 5');
      expect(html).toContain('(+2)');
      expect(html).toContain('hud-xp-ready');
      expect(html).toContain('hud-xp-ready-glyph');
      expect(html).toContain('✦');
      expect(html).toContain('title="Force: 5/5 XP — Ascension Ready in Camp!"');

      // Finesse: 1 base + 1 battle = 2
      expect(html).toContain('FIN 2');
      expect(html).toContain('(+1)');

      // Focus: 0 base + 0 battle = 0 (no gain badge)
      expect(html).toContain('FOC 0');
    });

    it('renders XP tracker on inspected allied combatants when hovered', () => {
      const activeCu = createMockCombatUnit();
      const allyHoveredCu = {
        ...createMockCombatUnit(),
        faction: 'PLAYER' as const,
        unit: {
          ...createRecruit('ally-ranger', 'Swift Ranger'),
          progression: {
            unitId: 'ally-ranger',
            currentLevel: 1,
            archetypePoints: { fighter: 0, rogue: 1, mage: 0 },
            constellation: ['thief'],
            accumulatedXp: { fighter: 1, rogue: 7, mage: 0 },
            milestoneSelections: {}
          }
        },
        inBattleXp: { fighter: 0, rogue: 3, mage: 0 }
      };

      const html = renderToStaticMarkup(
        <UnitStatusCard
          activeCu={activeCu}
          targetPreview={null}
          hoveredUnitCu={allyHoveredCu}
        />
      );

      // Both active and inspected ally render XP trackers
      expect(html).toContain('Inspected Unit');
      expect(html).toContain('Swift Ranger');
      // Swift Ranger rogue is 7 + 3 = 10 (Level 1 threshold is 10 -> Ready!)
      expect(html).toContain('FIN 10');
      expect(html).toContain('(+3)');
    });
  });
});
