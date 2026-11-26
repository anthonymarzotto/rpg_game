import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ActionBar } from './ActionBar';
import { Ability } from '../../core/types/ability';
import { CombatUnit } from '../../core/combat/types';
import { AbilityModifier } from '../../core/types/modifier';
import { createRecruit } from '../../core/units/unitFactory';
import { createRadialArena } from '../../core/grid/templates';
import { createCombatState } from '../../core/combat/resolver';
import { applyConditionToUnit } from '../../core/combat/effects/conditionHandler';
import { HENOSIS } from '../../data/packages/theurge';

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
    expect(html).toContain('tooltip-tag">Focus');
    expect(html).not.toContain('tooltip-tag">MAGE');
    expect(html).not.toContain('cost-discounted');
    expect(html).not.toContain('augment-indicator');
    expect(html).not.toContain('augmented');
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

    // Hybrid Stat Strip pills with In-Trial tier highlights
    expect(html).toContain('ability-stat-pill tier-trial');
    expect(html).toContain('Range 4');
    expect(html).toContain('Blast 1');

    // Active augments footer summary
    expect(html).toContain('tooltip-augments-footer');
    expect(html).toContain('Active Augments');
    expect(html).toContain('Spell Sculpt');
    expect(html).toContain('+1 Range');
    expect(html).toContain('+1 AoE Radius');
    expect(html).toContain('-1 AP');
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

    // Die upgraded from 1d6 to 1d8 with Shard tier highlight
    expect(html).toContain('1d8 + FOC Magical');
    expect(html).toContain('ability-stat-pill tier-shard');
    expect(html).toContain('1d6 -&gt; 1d8');
    expect(html).toContain('Bear Strength');
  });

  it('disables Henosis when an active vessel exists and displays the vessel name alongside full description in tooltip', () => {
    const arena = createRadialArena(3);
    const theurge = createRecruit('theurge', 'Iamblichus', { faction: 'PLAYER' });
    const ally = createRecruit('ally', 'Alden', { faction: 'PLAYER' });
    arena.setUnitPosition('theurge', { q: 0, r: 0 });
    arena.setUnitPosition('ally', { q: 1, r: 0 });

    const state = createCombatState(arena, [theurge, ally], 'theurge');
    const theurgeCu = state.units.get('theurge')!;
    const allyCu = state.units.get('ally')!;
    const activeTheurgeCu: CombatUnit = {
      ...theurgeCu,
      currentAp: 3,
      abilities: [HENOSIS]
    };

    applyConditionToUnit(allyCu, 'HENOSIS', 2, 'theurge');

    const html = renderToStaticMarkup(
      <ActionBar
        state={state}
        activeCu={activeTheurgeCu}
        actionMode="IDLE"
        selectedAbility={null}
        onSelectAction={() => {}}
        onEndTurn={() => {}}
      />
    );

    expect(html).toMatch(/<button[^>]*ability-btn[^>]*disabled=""/);
    expect(html).toContain('data-testid="tooltip-disabled-reason"');
    expect(html).toContain('Henosis is already active on Alden.');
    // Full ability description remains present in the hover tooltip
    expect(html).toContain(HENOSIS.description);
    expect(html).toContain('Bestows Henosis');
  });

  it('disables once-per-turn abilities after use and shows disabled reason alongside description', () => {
    const oncePerTurnAbility: Ability = {
      id: 'spell_sculpt',
      name: 'Spell Sculpt',
      description: 'Widens the next mage spell.',
      archetypeTag: 'MAGE',
      apCost: 1,
      range: 0,
      targetType: 'SELF',
      defenseTarget: 'NONE',
      damageType: 'NONE',
      oncePerTurn: true,
      effects: []
    };

    const activeCu = createMockCombatUnit({
      currentAp: 3,
      abilities: [oncePerTurnAbility],
      abilitiesUsedThisTurn: ['spell_sculpt']
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

    expect(html).toMatch(/<button[^>]*ability-btn[^>]*disabled=""/);
    expect(html).toContain('data-testid="tooltip-disabled-reason"');
    expect(html).toContain('Spell Sculpt can only be used once per turn.');
    expect(html).toContain('Widens the next mage spell.');
  });

  it('disables ability when AP is insufficient and shows required AP reason in tooltip', () => {
    const activeCu = createMockCombatUnit({ currentAp: 1 });

    const html = renderToStaticMarkup(
      <ActionBar
        activeCu={activeCu}
        actionMode="IDLE"
        selectedAbility={null}
        onSelectAction={() => {}}
        onEndTurn={() => {}}
      />
    );

    expect(html).toMatch(/<button[^>]*ability-btn[^>]*disabled=""/);
    expect(html).toContain('data-testid="tooltip-disabled-reason"');
    expect(html).toContain('Requires 2 AP (have 1).');
    expect(html).toContain('Launch astral embers at a target.');
  });

  it('displays shared passive counters and ready glow in ActionBar passives tray for Zeroed In and Coiled Apex', () => {
    const activeCu = createMockCombatUnit({
      zeroedInStacks: 2,
      virtualElevation: 1,
      passives: [
        {
          id: 'zeroed_in',
          name: 'Zeroed In',
          description: 'Stationary calibration stacks.',
          hook: 'ALWAYS',
          stationaryCalibration: true
        },
        {
          id: 'coiled_apex',
          name: 'Coiled Apex',
          description: 'Coiled Readiness.',
          hook: 'ALWAYS',
          unspentApVirtualHeight: true,
          lowerElevationDamageBonus: 2
        }
      ]
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

    expect(html).toContain('data-testid="action-bar-passive-zeroed_in"');
    expect(html).toContain('🔭');
    expect(html).toContain('2/3');
    expect(html).toContain('CALIBRATED (2/3)');
    expect(html).toContain('data-testid="action-bar-passive-coiled_apex"');
    expect(html).toContain('+1 Hgt');
    expect(html).toContain('COILED (+1 HEIGHT)');
  });
});
