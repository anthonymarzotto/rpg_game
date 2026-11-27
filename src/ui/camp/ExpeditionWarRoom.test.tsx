import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ExpeditionWarRoom } from './ExpeditionWarRoom';
import { EncounterDefinition } from '../../core/combat/encounter';
import { Unit } from '../../core/types/unit';

function makeMockEnemy(id: string, name: string, classId: string): Unit {
  return {
    id,
    name,
    gender: 'male',
    race: 'human',
    faction: 'ENEMY',
    baseAttributes: { force: 0, finesse: 0, focus: 0 },
    effectiveVitals: { maxHp: 15, maxAp: 3, movement: 3, armor: 0, defenseDc: 10 },
    progression: {
      unitId: id,
      currentLevel: 0,
      constellation: [],
      accumulatedXp: { fighter: 0, rogue: 0, mage: 0 },
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

describe('ExpeditionWarRoom Component', () => {
  it('renders stage title, threat budget, and detected enemy tokens', () => {
    const mockEncounter: EncounterDefinition = {
      id: 'enc-1',
      name: 'Goblin Ambush',
      arenaRadius: 3,
      units: [
        {
          unit: makeMockEnemy('e1', 'Bandit Scout', 'thief'),
          coord: { q: 2, r: 0 }
        },
        {
          unit: makeMockEnemy('e2', 'Bandit Brawler', 'warrior'),
          coord: { q: 2, r: 1 }
        }
      ]
    };

    const html = renderToStaticMarkup(
      <ExpeditionWarRoom
        stage={2}
        encounter={mockEncounter}
        activeSquadCount={3}
        onDeploySquad={vi.fn()}
      />
    );

    expect(html).toContain('Trial 2: Goblin Ambush');
    expect(html).toContain('Budget: 20 pts');
    expect(html).toContain('Bandit Scout');
    expect(html).toContain('Bandit Brawler');
    expect(html).toContain('3 / 3 Wayfarers Staged');
    expect(html).not.toContain('disabled=""');
  });

  it('disables deploy button and warns when activeSquadCount is 0', () => {
    const html = renderToStaticMarkup(
      <ExpeditionWarRoom
        stage={1}
        activeSquadCount={0}
        onDeploySquad={vi.fn()}
      />
    );

    expect(html).toContain('disabled=""');
    expect(html).toContain('Stage at least 1 wayfarer on The Staging Dais');
  });

  it('renders activeSquadThreat points vs stage budget, allowing over-budget deployment on localhost and disabling on production hostnames', () => {
    const htmlWithinBudget = renderToStaticMarkup(
      <ExpeditionWarRoom
        stage={1}
        activeSquadCount={3}
        activeSquadThreat={60}
        deploymentBudget={75}
        onDeploySquad={vi.fn()}
      />
    );

    expect(htmlWithinBudget).toContain('3 Staged (60 / 75 Pts)');
    expect(htmlWithinBudget).not.toContain('disabled=""');
    expect(htmlWithinBudget).toContain('title="Step onto the Celestial Trial Grounds"');

    // Default test runner environment is localhost/dev mode -> over-budget deployment is optional/allowed
    const htmlOverBudgetDev = renderToStaticMarkup(
      <ExpeditionWarRoom
        stage={1}
        activeSquadCount={4}
        activeSquadThreat={90}
        deploymentBudget={75}
        onDeploySquad={vi.fn()}
      />
    );

    expect(htmlOverBudgetDev).toContain('4 Staged (90 / 75 Pts)');
    expect(htmlOverBudgetDev).not.toContain('disabled=""');
    expect(htmlOverBudgetDev).toContain(
      'title="Enter the tournament bout (Dev Mode: Staged weight 90 pts exceeds 75 pts Trial Budget)"'
    );

    // Production hostname enforces strict threat cap
    (globalThis as unknown as { window?: unknown }).window = {
      location: { hostname: 'astral-tactics.com' }
    };
    try {
      const htmlOverBudgetProd = renderToStaticMarkup(
        <ExpeditionWarRoom
          stage={1}
          activeSquadCount={4}
          activeSquadThreat={90}
          deploymentBudget={75}
          onDeploySquad={vi.fn()}
        />
      );

      expect(htmlOverBudgetProd).toContain('4 Staged (90 / 75 Pts)');
      expect(htmlOverBudgetProd).toContain('disabled=""');
      expect(htmlOverBudgetProd).toContain(
        'title="Staged weight (90 pts) exceeds Trial Budget (75 pts)"'
      );
      expect(htmlOverBudgetProd).not.toContain('readiness-warning');
    } finally {
      delete (globalThis as unknown as { window?: unknown }).window;
    }
  });

  it('renders reroll bout button when onRerollEncounter is provided', () => {
    const htmlWithReroll = renderToStaticMarkup(
      <ExpeditionWarRoom
        stage={2}
        activeSquadCount={3}
        onDeploySquad={vi.fn()}
        onRerollEncounter={vi.fn()}
      />
    );
    expect(htmlWithReroll).toContain('data-testid="reroll-trial-btn"');
    expect(htmlWithReroll).toContain('Scout Another Bout');

    const htmlWithoutReroll = renderToStaticMarkup(
      <ExpeditionWarRoom
        stage={2}
        activeSquadCount={3}
        onDeploySquad={vi.fn()}
      />
    );
    expect(htmlWithoutReroll).not.toContain('data-testid="reroll-trial-btn"');
  });
});
