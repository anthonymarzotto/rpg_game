import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReserveBarracksTray } from './ReserveBarracksTray';
import { Unit } from '../../core/types/unit';

function makeMockHero(id: string, name: string, classId: string = 'novice', readyXp: number = 0): Unit {
  return {
    id,
    name,
    gender: 'male',
    race: 'human',
    faction: 'PLAYER',
    baseAttributes: { force: 0, finesse: 0, focus: 0 },
    effectiveVitals: { maxHp: 20, maxAp: 3, movement: 3, armor: 0, defenseDc: 10 },
    progression: {
      unitId: id,
      currentLevel: 0,
      constellation: [],
      accumulatedXp: { fighter: readyXp, rogue: 0, mage: 0 },
      archetypePoints: { fighter: 0, rogue: 0, mage: 0 }
    },
    loadout: {
      activeClassId: classId,
      signatureAbilityId: 'strike',
      wildcardAbilityIds: [],
      wildcardPassiveIds: []
    },
    starterAbilityIds: ['strike']
  } as unknown as Unit;
}

describe('ReserveBarracksTray Component', () => {
  it('renders reserve heroes, filter chips, and recruit novice button', () => {
    const heroes = [
      makeMockHero('h1', 'Garrick', 'novice', 0),
      makeMockHero('h2', 'Kaelen', 'warrior', 5)
    ];

    const html = renderToStaticMarkup(
      <ReserveBarracksTray
        reserveHeroes={heroes}
        onInspectHero={vi.fn()}
        onDeployHero={vi.fn()}
        onSelectForSwap={vi.fn()}
        onRecruitNovice={vi.fn()}
      />
    );

    expect(html).toContain('Reserve Barracks');
    expect(html).toContain('2 Heroes');
    expect(html).toContain('+ Recruit Novice');
    expect(html).toContain('Garrick');
    expect(html).toContain('Kaelen');
    expect(html).toContain('All (2)');
    expect(html).toContain('Level Ready (1)');
  });

  it('renders swap guidance banner and Slot In buttons when in swap mode', () => {
    const heroes = [makeMockHero('h1', 'Garrick')];

    const html = renderToStaticMarkup(
      <ReserveBarracksTray
        reserveHeroes={heroes}
        onInspectHero={vi.fn()}
        onDeployHero={vi.fn()}
        onSelectForSwap={vi.fn()}
        onRecruitNovice={vi.fn()}
        onCancelSwap={vi.fn()}
        swappingHeroName="Roland"
      />
    );

    expect(html).toContain('Select a reserve hero below to replace');
    expect(html).toContain('Roland');
    expect(html).toContain('Slot In');
    expect(html).toContain('Cancel Swap');
  });

  it('renders empty reserve message when no heroes are in reserve', () => {
    const html = renderToStaticMarkup(
      <ReserveBarracksTray
        reserveHeroes={[]}
        onInspectHero={vi.fn()}
        onDeployHero={vi.fn()}
        onSelectForSwap={vi.fn()}
        onRecruitNovice={vi.fn()}
      />
    );

    expect(html).toContain('No heroes in reserve. Recruit a Novice');
  });
});
