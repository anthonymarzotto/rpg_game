import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HeroCard } from './HeroCard';
import { Unit } from '../../core/types/unit';

function makeMockUnit(overrides: Partial<Unit> = {}): Unit {
  return {
    id: 'hero-1',
    name: 'Roland',
    gender: 'male',
    race: 'human',
    faction: 'PLAYER',
    baseAttributes: { force: 1, finesse: 0, focus: 0 },
    effectiveVitals: { maxHp: 20, maxAp: 3, movement: 3, armor: 0, defenseDc: 10 },
    progression: {
      unitId: 'hero-1',
      currentLevel: 0,
      constellation: [],
      accumulatedXp: { fighter: 2, rogue: 1, mage: 0 },
      archetypePoints: { fighter: 0, rogue: 0, mage: 0 }
    },
    loadout: {
      activeClassId: 'novice',
      signatureAbilityId: 'strike',
      wildcardAbilityIds: [],
      wildcardPassiveIds: []
    },
    starterAbilityIds: ['strike'],
    ...overrides
  } as unknown as Unit;
}

describe('HeroCard Component', () => {
  it('renders hero information, vitals, attributes, and inspect CTA', () => {
    const unit = makeMockUnit();
    const onInspect = vi.fn();
    const html = renderToStaticMarkup(
      <HeroCard unit={unit} onInspect={onInspect} />
    );

    expect(html).toContain('Roland');
    expect(html).toContain('Lv 0 Novice');
    expect(html).toContain('20 / 20');
    expect(html).toContain('FRC: 1');
    expect(html).toContain('Inspect');
    expect(html).not.toContain('✦ ASCENSION READY!');
  });

  it('renders Wayfarer title on hero card when off-node milestones are achieved', () => {
    const unit = makeMockUnit({
      progression: {
        unitId: 'hero-1',
        currentLevel: 1,
        constellation: ['warrior'],
        accumulatedXp: { fighter: 0, rogue: 0, mage: 0 },
        archetypePoints: { fighter: 1, rogue: 0, mage: 0 },
        offNodeMilestones: ['1,1,0']
      },
      loadout: {
        activeClassId: 'warrior',
        wildcardAbilityIds: [],
        wildcardPassiveIds: []
      }
    });
    const html = renderToStaticMarkup(
      <HeroCard unit={unit} onInspect={vi.fn()} />
    );

    expect(html).toContain('Lv 1 Warrior • Wayfarer I');
  });

  it('renders ASCENSION READY banner and Ascend CTA when archetype threshold is reached', () => {
    const unit = makeMockUnit({
      progression: {
        unitId: 'hero-1',
        currentLevel: 0,
        constellation: [],
        accumulatedXp: { fighter: 5, rogue: 1, mage: 0 },
        archetypePoints: { fighter: 0, rogue: 0, mage: 0 }
      }
    });
    const onInspect = vi.fn();
    const html = renderToStaticMarkup(
      <HeroCard unit={unit} onInspect={onInspect} />
    );

    expect(html).toContain('✦ ASCENSION READY!');
    expect(html).toContain('✦ Ascend');
  });

  it('renders disabled Withdraw button when canBench is false', () => {
    const unit = makeMockUnit();
    const onInspect = vi.fn();
    const onBench = vi.fn();
    const html = renderToStaticMarkup(
      <HeroCard unit={unit} onInspect={onInspect} onBench={onBench} canBench={false} />
    );

    expect(html).toContain('disabled=""');
    expect(html).toContain('Withdraw');
  });
});
