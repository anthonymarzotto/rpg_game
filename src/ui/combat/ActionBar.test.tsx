import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ActionBar } from './ActionBar';
import { Ability } from '../../core/types/ability';
import { CombatUnit } from '../../core/combat/types';
import { AbilityModifier } from '../../core/types/modifier';
import { createRecruit } from '../../core/units/unitFactory';

function createMockCombatUnit(overrides: Partial<CombatUnit> = {}): CombatUnit {
  const baseAbility: Ability = {
    id: 'ignite',
    name: 'Ignite',
    description: 'Launch astral embers at a target.',
    archetypeTag: 'MAGE',
    apCost: 2,
    range: 3,
    targetType: 'SINGLE_TARGET',
    defenseTarget: 'EVASION',
    attackModifierAttribute: 'focus',
    damageType: 'MAGICAL',
    effects: [
      {
        type: 'DAMAGE',
        damageProfile: {
          count: 1,
          sides: 6,
          modifierAttribute: 'focus'
        },
        targetScope: 'TARGET',
        applyOn: 'HIT_OR_CRIT'
      }
    ]
  };

  const recruit = createRecruit('unit-1', 'Vael');

  const defaultUnit: CombatUnit = {
    unit: recruit,
    faction: 'PLAYER',
    currentHp: 20,
    currentAp: 3,
    initiativeGauge: 0,
    isDefeated: false,
    inBattleXp: { fighter: 0, rogue: 0, mage: 0 },
    activeModifiers: [],
    activeConditions: [],
    facing: 0,
    passives: [],
    abilities: [baseAbility],
    abilityModifiers: []
  };

  return { ...defaultUnit, ...overrides };
}

describe('ActionBar Augment Indicators & Attributions', () => {
  it('renders standard unmodified ability button and tooltip without augment indicators', () => {
    const activeCu = createMockCombatUnit({ abilityModifiers: [] });

    const html = renderToStaticMarkup(
      <ActionBar
        activeCu={activeCu}
        actionMode="IDLE"
        selectedAbility={null}
        onSelectAction={() => {}}
        onEndTurn={() => {}}
      />
    );

    // Standard button checks
    expect(html).toContain('Ignite');
    expect(html).toContain('2 AP');
    expect(html).not.toContain('cost-discounted');
    expect(html).not.toContain('augment-indicator');
    expect(html).not.toContain('augmented');
    expect(html).not.toContain('inline-attribution-badge');
    expect(html).not.toContain('Active Augments');
  });

  it('renders celestial augment indicator and discounted emerald AP when modified', () => {
    const spellSculptModifier: AbilityModifier = {
      id: 'spell_sculpt_buff',
      name: 'Spell Sculpt',
      targetArchetypes: ['MAGE'],
      deltas: {
        apCost: -1,
        range: 1,
        aoeRadius: 1
      },
      consumesOnUse: true
    };

    const activeCu = createMockCombatUnit({
      abilityModifiers: [spellSculptModifier]
    });

    const html = renderToStaticMarkup(
      <ActionBar
        activeCu={activeCu}
        actionMode="IDLE"
        selectedAbility={null}
        onSelectAction={() => {}}
        onEndTurn={() => {}}
      />
    );

    // Augment glyph & button class
    expect(html).toContain('augmented');
    expect(html).toContain('augment-indicator');
    expect(html).toContain('✦');

    // Discounted AP: 2 AP - 1 = 1 AP
    expect(html).toContain('cost-discounted');
    expect(html).toContain('1 AP');

    // Inline tooltip attribution badges
    expect(html).toContain('inline-attribution-badge');
    expect(html).toContain('[✦ +1 Range from Spell Sculpt]');
    expect(html).toContain('[✦ +1 AoE Radius from Spell Sculpt]');
    expect(html).toContain('[✦ -1 AP from Spell Sculpt]');

    // Active augments footer summary
    expect(html).toContain('tooltip-augments-footer');
    expect(html).toContain('Active Augments');
    expect(html).toContain('Spell Sculpt');
  });

  it('renders die step upgrade attribution for damage effects', () => {
    const bearStrength: AbilityModifier = {
      id: 'bear_strength_overclock',
      name: 'Bear Strength',
      targetAbilityIds: ['ignite'],
      effectPatches: {
        diceStep: 1
      },
      isPermanent: true
    };

    const activeCu = createMockCombatUnit({
      abilityModifiers: [bearStrength]
    });

    const html = renderToStaticMarkup(
      <ActionBar
        activeCu={activeCu}
        actionMode="IDLE"
        selectedAbility={null}
        onSelectAction={() => {}}
        onEndTurn={() => {}}
      />
    );

    // Die upgraded from 1d6 to 1d8
    expect(html).toContain('1d8 + focus');
    expect(html).toContain('[✦ 1d6 -&gt; 1d8 from Bear Strength]');
    expect(html).toContain('Bear Strength');
  });
});
