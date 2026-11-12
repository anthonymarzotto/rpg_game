import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DiceTumblerTray, SvgD20, SvgDamageDie } from './DiceTumblerTray';
import { DiceRollBreakdown } from '../../core/combat/types';
import { createRecruit } from '../../core/units/unitFactory';

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
    totalDamage: 6,
    mitigation: 2,
    mitigationType: 'Armor'
  };

  it('withholds resolved attack score during STAGE1_TUMBLE and reveals it on STAGE1_SETTLE (UX.11)', () => {
    const onComplete = vi.fn();
    const tumbleHtml = renderToStaticMarkup(
      <DiceTumblerTray
        attackerName="Garrick"
        targetName="Ash Infiltrator"
        abilityName="Lance Charge"
        diceBreakdown={baseBreakdown}
        onComplete={onComplete}
        initialStage="STAGE1_TUMBLE"
      />
    );

    expect(tumbleHtml).toContain('Garrick');
    expect(tumbleHtml).toContain('Ash Infiltrator');
    expect(tumbleHtml).toContain('Lance Charge');
    expect(tumbleHtml).toContain('Evasion 12');
    expect(tumbleHtml).toContain('Rolling vs Evasion 12...');
    expect(tumbleHtml).not.toContain('score-val');

    const settleHtml = renderToStaticMarkup(
      <DiceTumblerTray
        attackerName="Garrick"
        targetName="Ash Infiltrator"
        abilityName="Lance Charge"
        diceBreakdown={baseBreakdown}
        onComplete={onComplete}
        initialStage="STAGE1_SETTLE"
      />
    );

    expect(settleHtml).toContain('18');
    expect(settleHtml).toContain('vs 12');
    expect(settleHtml).toContain('SOLID HIT!');
  });

  it('withholds resolved damage equation during STAGE2_TUMBLE and reveals soak math on STAGE2_SETTLE (UX.11, B.14)', () => {
    const stage2TumbleHtml = renderToStaticMarkup(
      <DiceTumblerTray
        attackerName="Warrior"
        targetName="Target"
        abilityName="Strike"
        diceBreakdown={baseBreakdown}
        onComplete={vi.fn()}
        initialStage="STAGE2_TUMBLE"
      />
    );

    expect(stage2TumbleHtml).toContain('Rolling Damage Dice...');
    expect(stage2TumbleHtml).not.toContain('6 DMG');
    expect(stage2TumbleHtml).not.toContain('- 2 Armor');

    const stage2SettleHtml = renderToStaticMarkup(
      <DiceTumblerTray
        attackerName="Warrior"
        targetName="Target"
        abilityName="Strike"
        diceBreakdown={baseBreakdown}
        onComplete={vi.fn()}
        initialStage="STAGE2_SETTLE"
      />
    );

    expect(stage2SettleHtml).toContain('Damage Roll');
    expect(stage2SettleHtml).toContain('d8');
    expect(stage2SettleHtml).toContain('- 2 Armor');
    expect(stage2SettleHtml).toContain('6 DMG');
  });

  it('renders concise MISS stamp on missed attack check settle (UX.6)', () => {
    const missBreakdown: DiceRollBreakdown = {
      ...baseBreakdown,
      d20Rolls: [4],
      keptD20: 4,
      totalScore: 7,
      hitOutcome: 'MISS',
      totalDamage: 0
    };

    const html = renderToStaticMarkup(
      <DiceTumblerTray
        attackerName="Rogue"
        targetName="Target"
        abilityName="Strike"
        diceBreakdown={missBreakdown}
        onComplete={vi.fn()}
        initialStage="STAGE1_SETTLE"
      />
    );

    expect(html).toContain('stamp-miss');
    expect(html).toContain('>MISS<');
    expect(html).not.toContain('EVADED / MISS');
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

  it('renders directional combatant tokens and transitions target HP / DEFEATED state on STAGE2_SETTLE (UX.20)', () => {
    const attacker = createRecruit('att', 'Garrick');
    const target = createRecruit('def', 'Goblin');

    const rollingHtml = renderToStaticMarkup(
      <DiceTumblerTray
        attackerName="Garrick"
        targetName="Goblin"
        abilityName="Strike"
        diceBreakdown={baseBreakdown}
        attackerUnit={attacker}
        targetUnit={target}
        targetHpBefore={6}
        targetHpAfter={0}
        targetMaxHp={14}
        onComplete={vi.fn()}
        initialStage="STAGE2_TUMBLE"
      />
    );

    expect(rollingHtml).toContain('south-east.png');
    expect(rollingHtml).toContain('south-west.png');
    expect(rollingHtml).toContain('6/14');
    expect(rollingHtml).not.toContain('clash-defeated-skull-overlay');

    const settledHtml = renderToStaticMarkup(
      <DiceTumblerTray
        attackerName="Garrick"
        targetName="Goblin"
        abilityName="Strike"
        diceBreakdown={baseBreakdown}
        attackerUnit={attacker}
        targetUnit={target}
        targetHpBefore={6}
        targetHpAfter={0}
        targetMaxHp={14}
        onComplete={vi.fn()}
        initialStage="STAGE2_SETTLE"
      />
    );

    expect(settledHtml).toContain('0/14');
    expect(settledHtml).toContain('clash-defeated-skull-overlay');
    expect(settledHtml).toContain('💀');
    expect(settledHtml).toContain('clash-defeated');
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

  it('renders attack-roll-tooltip inside mod-val when modifierBreakdown is present (B.13)', () => {
    const breakdownWithMods: DiceRollBreakdown = {
      ...baseBreakdown,
      netModifier: 0,
      totalScore: 15,
      modifierBreakdown: [
        { label: 'Finesse', value: 2, source: 'ATTRIBUTE' },
        { label: 'Low Ground', value: -2, source: 'ELEVATION' }
      ]
    };

    const html = renderToStaticMarkup(
      <DiceTumblerTray
        attackerName="Archer"
        targetName="Sentry"
        abilityName="Shoot"
        diceBreakdown={breakdownWithMods}
        onComplete={vi.fn()}
        initialStage="STAGE1_SETTLE"
      />
    );

    expect(html).toContain('has-tooltip');
    expect(html).toContain('attack-roll-tooltip');
    expect(html).toContain('Attack Roll Formula');
    expect(html).toContain('Low Ground');
    expect(html).toContain('-2');
    expect(html).toContain('Finesse');
    expect(html).toContain('+2');
  });

  it('renders damage-roll-tooltip inside Stage 2 equation when damageBreakdownComponents is present (UX.14)', () => {
    const breakdownWithDmgComponents: DiceRollBreakdown = {
      ...baseBreakdown,
      damageBreakdownComponents: [
        { label: 'Base Dice (1d8)', value: 5, source: 'DICE' },
        { label: 'Force Bonus', value: 3, source: 'ATTRIBUTE' },
        { label: 'Target Armor', value: -2, source: 'MITIGATION' }
      ]
    };

    const html = renderToStaticMarkup(
      <DiceTumblerTray
        attackerName="Warrior"
        targetName="Sentry"
        abilityName="Strike"
        diceBreakdown={breakdownWithDmgComponents}
        onComplete={vi.fn()}
        initialStage="STAGE2_SETTLE"
      />
    );

    expect(html).toContain('damage-roll-tooltip');
    expect(html).toContain('Damage Breakdown');
    expect(html).toContain('Base Dice (1d8)');
    expect(html).toContain('Force Bonus');
    expect(html).toContain('Target Armor');
  });

  it('places both unit tokens in the center around versus and applies faction border classes', () => {
    const enemyAttacker = { ...createRecruit('enemy-1', 'Ash Bandit'), faction: 'ENEMY' as const };
    const playerTarget = { ...createRecruit('player-1', 'Garrick'), faction: 'PLAYER' as const };

    const html = renderToStaticMarkup(
      <DiceTumblerTray
        attackerName="Ash Bandit"
        targetName="Garrick"
        abilityName="Slash"
        diceBreakdown={{ ...baseBreakdown, damageModifier: 0, mitigation: 0 }}
        attackerUnit={enemyAttacker}
        targetUnit={playerTarget}
        onComplete={vi.fn()}
        initialStage="STAGE2_SETTLE"
      />
    );

    // Attacker meta appears before attacker token; target token appears before target meta
    expect(html.indexOf('attacker-meta')).toBeLessThan(html.indexOf('attacker-token'));
    expect(html.indexOf('target-token')).toBeLessThan(html.indexOf('target-meta'));

    // Faction border classes match unit factions rather than left/right side
    expect(html).toContain('attacker-token faction-enemy');
    expect(html).toContain('target-token faction-player');

    // Zero damage modifier (+0) is omitted from Stage 2 equation
    expect(html).not.toContain('>+0<');
  });
});
