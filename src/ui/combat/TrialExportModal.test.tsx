import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TrialExportModal } from './TrialExportModal';
import { createRadialArena } from '../../core/grid/templates';
import { createCombatState } from '../../core/combat/resolver';
import { Unit } from '../../core/types/unit';

function createMockUnit(id: string, name: string, faction: 'PLAYER' | 'ENEMY'): Unit {
  return {
    id,
    name,
    gender: 'male',
    race: 'human',
    faction,
    progression: {
      unitId: id,
      currentLevel: 1,
      archetypePoints: { fighter: 1, rogue: 0, mage: 0 },
      constellation: [],
      milestoneSelections: {}
    },
    baseAttributes: { force: 10, finesse: 10, focus: 10 },
    effectiveVitals: {
      maxHp: 30,
      maxAp: 4,
      armor: 2,
      ward: 1,
      speed: 10,
      move: 3,
      evasion: 10,
      resolve: 10
    },
    loadout: {
      activeClassId: 'novice',
      wildcardAbilityIds: [],
      wildcardPassiveIds: []
    },
    starterAbilityIds: []
  };
}

describe('TrialExportModal', () => {
  it('Task 5.1: does not render markup when isOpen is false', () => {
    const arena = createRadialArena(2);
    const hero = createMockUnit('hero', 'Valen', 'PLAYER');
    const state = createCombatState(arena, [hero], hero.id);

    const html = renderToStaticMarkup(
      <TrialExportModal
        isOpen={false}
        state={state}
        onClose={vi.fn()}
      />
    );

    expect(html).toBe('');
  });

  it('Task 5.1: renders modal structure, title, pills, tabs, and export actions when isOpen is true', () => {
    const arena = createRadialArena(3);
    const hero = createMockUnit('hero', 'Valen', 'PLAYER');
    const enemy = createMockUnit('enemy', 'Gorik', 'ENEMY');
    arena.setUnitPosition(hero.id, { q: 0, r: 0 });
    arena.setUnitPosition(enemy.id, { q: 1, r: 0 });

    const state = createCombatState(arena, [hero, enemy], hero.id);
    state.turnNumber = 2;

    const html = renderToStaticMarkup(
      <TrialExportModal
        isOpen={true}
        state={state}
        encounterName="Celestial Arena"
        stage={3}
        onClose={vi.fn()}
      />
    );

    expect(html).toContain('Export Trial Telemetry');
    expect(html).toContain('Turn: 2');
    expect(html).toContain('Celestial Arena');
    expect(html).toContain('Copy Markdown Report');
    expect(html).toContain('Markdown Summary (For Chat)');
    expect(html).toContain('Raw State JSON');
    expect(html).toContain('trial-export-preview');
    expect(html).toContain('trial-export-card');
  });
});
