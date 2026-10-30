import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DiceTumblerTray, SvgD20, SvgDamageDie } from './DiceTumblerTray';
import { DiceRollBreakdown } from '../../core/combat/types';

describe('DiceTumblerTray Component', () => {
  const baseBreakdown: DiceRollBreakdown = {
    d20Rolls: [15],
    keptD20: 15,
    advantage: 'NORMAL',
    netModifier: 3,
    totalScore: 18,
    targetDefense: 12,
    defenseType: 'Evasion',
    hitOutcome: 'SOLID_HIT',
    damageDice: [{ sides: 8, roll: 5 }],
    damageModifier: 3,
    totalDamage: 8
  };

  it('renders attacker, target, ability name, and defense target', () => {
    const onComplete = vi.fn();
    const html = renderToStaticMarkup(
      <DiceTumblerTray
        attackerName="Garrick"
        targetName="Ash Infiltrator"
        abilityName="Lance Charge"
        diceBreakdown={baseBreakdown}
        onComplete={onComplete}
      />
    );

    expect(html).toContain('Garrick');
    expect(html).toContain('Ash Infiltrator');
    expect(html).toContain('Lance Charge');
    expect(html).toContain('Evasion 12');
    expect(html).toContain('18');
    expect(html).toContain('vs 12');
  });

  it('renders dual dice and advantage pill under ADVANTAGE', () => {
    const advantageBreakdown: DiceRollBreakdown = {
      ...baseBreakdown,
      advantage: 'ADVANTAGE',
      d20Rolls: [7, 16],
      keptD20: 16,
      totalScore: 19
    };

    const html = renderToStaticMarkup(
      <DiceTumblerTray
        attackerName="Rogue"
        targetName="Target"
        abilityName="Quick Thrust"
        diceBreakdown={advantageBreakdown}
        onComplete={vi.fn()}
      />
    );

    expect(html).toContain('ADVANTAGE');
    expect(html).toContain('Quick Thrust');
    expect(html).toContain('die-d20');
  });

  it('renders dual dice and disadvantage pill under DISADVANTAGE with spoiler-free layout', () => {
    const disadvantageBreakdown: DiceRollBreakdown = {
      ...baseBreakdown,
      advantage: 'DISADVANTAGE',
      d20Rolls: [18, 5],
      keptD20: 5,
      totalScore: 8,
      hitOutcome: 'MISS',
      totalDamage: 0
    };

    const html = renderToStaticMarkup(
      <DiceTumblerTray
        attackerName="Rogue"
        targetName="Target"
        abilityName="Strike"
        diceBreakdown={disadvantageBreakdown}
        onComplete={vi.fn()}
      />
    );

    expect(html).toContain('DISADVANTAGE');
    // Spoiler-free layout preserves the two-stage layout while pending
    expect(html).toContain('stage-damage');
    expect(html).toContain('Awaiting Attack Check...');
    expect(html).toContain('die-d20');
  });

  it('omits stage-damage only when ability has no damage dice at all', () => {
    const noDamageBreakdown: DiceRollBreakdown = {
      ...baseBreakdown,
      damageDice: [],
      totalDamage: 0
    };

    const html = renderToStaticMarkup(
      <DiceTumblerTray
        attackerName="Cleric"
        targetName="Target"
        abilityName="Bless"
        diceBreakdown={noDamageBreakdown}
        onComplete={vi.fn()}
      />
    );

    expect(html).not.toContain('stage-damage');
  });

  it('renders critical hit stamp and flare on CRITICAL_HIT', () => {
    const critBreakdown: DiceRollBreakdown = {
      ...baseBreakdown,
      d20Rolls: [20],
      keptD20: 20,
      totalScore: 23,
      hitOutcome: 'CRITICAL_HIT'
    };

    const html = renderToStaticMarkup(
      <DiceTumblerTray
        attackerName="Warrior"
        targetName="Target"
        abilityName="Power Strike"
        diceBreakdown={critBreakdown}
        onComplete={vi.fn()}
        initialStage="STAGE1_SETTLE"
      />
    );

    expect(html).toContain('Power Strike');
    expect(html).toContain('score-val crit');
    expect(html).toContain('CRITICAL HIT!');
  });

  it('renders damage dice and damage equation on successful hit', () => {
    const html = renderToStaticMarkup(
      <DiceTumblerTray
        attackerName="Warrior"
        targetName="Target"
        abilityName="Strike"
        diceBreakdown={baseBreakdown}
        onComplete={vi.fn()}
        initialStage="STAGE2_SETTLE"
      />
    );

    expect(html).toContain('Damage Roll');
    expect(html).toContain('d8');
    expect(html).toContain('8 DMG');
  });

  it('renders SvgD20 component correctly', () => {
    const html = renderToStaticMarkup(
      <SvgD20 value={18} displayNumber={18} isCrit={true} />
    );

    expect(html).toContain('dice-d20');
    expect(html).toContain('18');
  });

  it('renders SvgDamageDie component for d4, d6, d8, d10, and d12 correctly', () => {
    const htmlD4 = renderToStaticMarkup(<SvgDamageDie die={{ sides: 4, roll: 3 }} displayNumber={3} />);
    expect(htmlD4).toContain('sides-4');
    expect(htmlD4).toContain('d4-outer-border');

    const htmlD6 = renderToStaticMarkup(<SvgDamageDie die={{ sides: 6, roll: 4 }} displayNumber={4} />);
    expect(htmlD6).toContain('sides-6');
    expect(htmlD6).toContain('d6-outer-border');

    const htmlD8 = renderToStaticMarkup(<SvgDamageDie die={{ sides: 8, roll: 6 }} displayNumber={6} />);
    expect(htmlD8).toContain('sides-8');
    expect(htmlD8).toContain('d8-outer-diamond');

    const htmlD10 = renderToStaticMarkup(<SvgDamageDie die={{ sides: 10, roll: 9 }} displayNumber={9} />);
    expect(htmlD10).toContain('sides-10');
    expect(htmlD10).toContain('d10-outer-border');

    const htmlD12 = renderToStaticMarkup(<SvgDamageDie die={{ sides: 12, roll: 11 }} displayNumber={11} />);
    expect(htmlD12).toContain('sides-12');
    expect(htmlD12).toContain('d12-center-pentagon');
  });
});
