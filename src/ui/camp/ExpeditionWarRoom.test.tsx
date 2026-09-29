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

    expect(html).toContain('Stage 2: Goblin Ambush');
    expect(html).toContain('Threat: 20 pts');
    expect(html).toContain('Bandit Scout');
    expect(html).toContain('Bandit Brawler');
    expect(html).toContain('3 / 3 Heroes Ready');
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
    expect(html).toContain('Deploy at least 1 hero into the active vanguard');
  });
});
