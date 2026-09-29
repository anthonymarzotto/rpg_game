import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HeroProgressionDrawer } from './HeroProgressionDrawer';
import { Unit } from '../../core/types/unit';
import { CampaignState } from '../../core/campaign/types';

import { createCampaign } from '../../core/campaign/campaignFactory';

function makeMockUnit(overrides: Partial<Unit> = {}): Unit {
  return {
    id: 'hero-1',
    name: 'Valerius',
    gender: 'male',
    race: 'human',
    faction: 'PLAYER',
    baseAttributes: { force: 2, finesse: 1, focus: 0 },
    effectiveVitals: { maxHp: 24, maxAp: 3, movement: 3, armor: 0, defenseDc: 10 },
    progression: {
      unitId: 'hero-1',
      currentLevel: 0,
      constellation: [],
      accumulatedXp: { fighter: 120, rogue: 20, mage: 0 },
      archetypePoints: { fighter: 0, rogue: 0, mage: 0 }
    },
    loadout: {
      activeClassId: 'novice',
      wildcardAbilityIds: [],
      wildcardPassiveIds: []
    },
    starterAbilityIds: ['strike'],
    ...overrides
  } as unknown as Unit;
}

function makeMockCampaign(unit: Unit): CampaignState {
  const base = createCampaign({ seed: 1 });
  return {
    ...base,
    roster: [unit],
    activeSquadIds: [unit.id]
  };
}

describe('HeroProgressionDrawer Component', () => {
  it('renders hero overview, attributes, and constellation section', () => {
    const hero = makeMockUnit();
    const campaign = makeMockCampaign(hero);
    const html = renderToStaticMarkup(
      <HeroProgressionDrawer
        hero={hero}
        campaign={campaign}
        onClose={vi.fn()}
        onUpdateCampaign={vi.fn()}
      />
    );

    expect(html).toContain('Hero Progression: Valerius');
    expect(html).toContain('Valerius');
    expect(html).toContain('Level 0 novice');
    expect(html).toContain('Force: 2');
    expect(html).toContain('Finesse: 1');
    expect(html).toContain('Focus: 0');
    expect(html).toContain('Class Constellation');
    expect(html).toContain('drawer-svg-viewport');
    expect(html).toContain('chart-svg');
  });

  it('renders Level Ready allocation CTA when hero has qualifying XP', () => {
    const hero = makeMockUnit({
      progression: {
        unitId: 'hero-1',
        currentLevel: 0,
        constellation: [],
        accumulatedXp: { fighter: 5, rogue: 2, mage: 0 },
        archetypePoints: { fighter: 0, rogue: 0, mage: 0 }
      }
    });
    const campaign = makeMockCampaign(hero);
    const html = renderToStaticMarkup(
      <HeroProgressionDrawer
        hero={hero}
        campaign={campaign}
        onClose={vi.fn()}
        onUpdateCampaign={vi.fn()}
      />
    );

    expect(html).toContain('Level Ready: Allocate 1 Archetype Point');
    expect(html).toContain('Advance Fighter (+1 Force)');
    expect(html).toContain('Current: 5 XP');
    expect(html).not.toContain('Advance Rogue');
    expect(html).not.toContain('Advance Mage');
  });

  it('hides Level Ready allocation CTA when hero does not have enough XP', () => {
    const hero = makeMockUnit({
      progression: {
        unitId: 'hero-1',
        currentLevel: 0,
        constellation: [],
        accumulatedXp: { fighter: 3, rogue: 2, mage: 1 },
        archetypePoints: { fighter: 0, rogue: 0, mage: 0 }
      }
    });
    const campaign = makeMockCampaign(hero);
    const html = renderToStaticMarkup(
      <HeroProgressionDrawer
        hero={hero}
        campaign={campaign}
        onClose={vi.fn()}
        onUpdateCampaign={vi.fn()}
      />
    );

    expect(html).not.toContain('Level Ready: Allocate 1 Archetype Point');
  });

  it('renders loadout configuration options for active class, wildcards, and passive', () => {
    const hero = makeMockUnit();
    const campaign = makeMockCampaign(hero);
    const html = renderToStaticMarkup(
      <HeroProgressionDrawer
        hero={hero}
        campaign={campaign}
        onClose={vi.fn()}
        onUpdateCampaign={vi.fn()}
      />
    );

    expect(html).toContain('Equipped Loadout &amp; Wildcards');
    expect(html).toContain('Active Class:');
    expect(html).toContain('Wildcard Ability 1:');
    expect(html).toContain('Wildcard Ability 2:');
    expect(html).toContain('Wildcard Passive Trait:');
  });
});
