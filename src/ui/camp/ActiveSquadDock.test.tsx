import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ActiveSquadDock } from './ActiveSquadDock';
import { Unit } from '../../core/types/unit';

function makeMockUnit(id: string, name: string): Unit {
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
      accumulatedXp: { fighter: 0, rogue: 0, mage: 0 },
      archetypePoints: { fighter: 0, rogue: 0, mage: 0 }
    },
    loadout: {
      activeClassId: 'novice',
      signatureAbilityId: 'strike',
      wildcardAbilityIds: [],
      wildcardPassiveIds: []
    },
    starterAbilityIds: ['strike']
  } as unknown as Unit;
}

describe('ActiveSquadDock Component', () => {
  it('renders 2 hero cards and 1 empty slot when 2 heroes are deployed', () => {
    const squad = [makeMockUnit('h1', 'Roland'), makeMockUnit('h2', 'Lyra')];
    const html = renderToStaticMarkup(
      <ActiveSquadDock
        activeSquad={squad}
        onInspectHero={vi.fn()}
        onBenchHero={vi.fn()}
        onSwapHero={vi.fn()}
      />
    );

    expect(html).toContain('The Vanguard');
    expect(html).toContain('2 / 3');
    expect(html).toContain('Roland');
    expect(html).toContain('Lyra');
    expect(html).toContain('Vacant Conduit');
  });

  it('renders 3 hero cards and zero empty slots when squad is full (3/3)', () => {
    const squad = [
      makeMockUnit('h1', 'Roland'),
      makeMockUnit('h2', 'Lyra'),
      makeMockUnit('h3', 'Vael')
    ];
    const html = renderToStaticMarkup(
      <ActiveSquadDock
        activeSquad={squad}
        onInspectHero={vi.fn()}
        onBenchHero={vi.fn()}
        onSwapHero={vi.fn()}
      />
    );

    expect(html).toContain('3 / 3');
    expect(html).toContain('Roland');
    expect(html).toContain('Lyra');
    expect(html).toContain('Vael');
    expect(html).not.toContain('Vacant Conduit');
  });
});
