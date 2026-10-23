import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { App } from './App';
import { CombatArena } from './ui/combat/CombatArena';
import { HeroProgressionDrawer } from './ui/camp/HeroProgressionDrawer';
import { createNoviceSandboxEncounter } from './data/encounters/noviceSandbox';
import { createCampaign } from './core/campaign/campaignFactory';
import { Unit } from './core/types/unit';
import { CampaignState } from './core/campaign/types';

function makeMockUnit(): Unit {
  return {
    id: 'hero-1',
    name: 'Valerius',
    gender: 'male',
    race: 'human',
    faction: 'PLAYER',
    baseAttributes: { force: 2, finesse: 1, focus: 0 },
    effectiveVitals: { maxHp: 24, maxAp: 3, movement: 3, armor: 0, defenseDc: 10 },
    loadout: {
      activeClassId: 'novice',
      wildcardAbilityIds: [],
      wildcardPassiveIds: []
    },
    starterAbilityIds: ['strike'],
    progression: {
      unitId: 'hero-1',
      currentLevel: 0,
      constellation: [],
      accumulatedXp: { fighter: 10, rogue: 0, mage: 0 },
      archetypePoints: { fighter: 0, rogue: 0, mage: 0 }
    }
  };
}

function makeMockCampaign(hero: Unit): CampaignState {
  const c = createCampaign();
  return {
    ...c,
    roster: [hero]
  };
}

describe('Localhost Dev-Mode Restrictions (Task 2.2)', () => {
  beforeEach(() => {
    (globalThis as unknown as { window?: unknown }).window = {
      location: { hostname: 'localhost' },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
  });

  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it('renders dev toggle button and controls when on localhost', () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain('data-testid="app-dev-toggle-btn"');
    expect(html).toContain('Dev Modes');
  });

  it('hides dev toggle button and controls when deployed on production hostnames (e.g. github.io)', () => {
    (globalThis as unknown as { window?: { location: { hostname: string } } }).window!.location.hostname = 'anthonymarzotto.github.io';

    const html = renderToStaticMarkup(<App />);
    expect(html).not.toContain('data-testid="app-dev-toggle-btn"');
    expect(html).not.toContain('app-dev-controls');
  });

  it('hides dev dice controls in CombatArena when deployed on production hostnames', () => {
    (globalThis as unknown as { window?: { location: { hostname: string } } }).window!.location.hostname = 'astral-tactics.com';

    const encounter = createNoviceSandboxEncounter();
    const html = renderToStaticMarkup(
      <CombatArena encounter={encounter} onExit={vi.fn()} />
    );

    expect(html).not.toContain('dev-dice-controls');
    expect(html).not.toContain('🎲 Dice:');
  });

  it('hides dev grant XP button in HeroProgressionDrawer when deployed on production hostnames', () => {
    (globalThis as unknown as { window?: { location: { hostname: string } } }).window!.location.hostname = 'astral-tactics.com';

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

    expect(html).not.toContain('data-testid="hero-drawer-dev-xp-btn"');
    expect(html).not.toContain('+10 XP (Dev)');
  });
});
