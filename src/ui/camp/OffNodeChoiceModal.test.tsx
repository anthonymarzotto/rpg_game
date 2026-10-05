import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { OffNodeChoiceModal } from './OffNodeChoiceModal';
import { Unit } from '../../core/types/unit';

const mockWarrior: Unit = {
  id: 'unit-1',
  name: 'Alden',
  gender: 'male',
  race: 'human',
  faction: 'PLAYER',
  baseAttributes: { force: 10, finesse: 10, focus: 10 },
  effectiveVitals: {
    maxHp: 65,
    maxAp: 3,
    speed: 10,
    move: 4,
    evasion: 2,
    resolve: 2,
    armor: 2,
    ward: 0
  },
  starterAbilityIds: ['strike', 'defend'],
  progression: {
    unitId: 'unit-1',
    currentLevel: 1,
    archetypePoints: { fighter: 1, rogue: 0, mage: 0 },
    constellation: ['warrior']
  },
  loadout: {
    unitId: 'unit-1',
    activeClassId: 'warrior',
    coreAbilityIds: ['lead_the_charge', 'cleave', 'brace'],
    wildcardAbilityIds: [],
    wildcardPassiveIds: []
  }
};

describe('OffNodeChoiceModal', () => {
  it('renders Step 1 with standard attunements for a standard off-node', () => {
    const html = renderToStaticMarkup(
      <OffNodeChoiceModal
        isOpen={true}
        hero={mockWarrior}
        archetype="ROGUE"
        targetPoints={{ fighter: 1, rogue: 1, mage: 0 }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(html).toContain('Wayfarer Milestone Reached');
    expect(html).toContain("Wayfarer&#x27;s Bastion");
    expect(html).toContain("Wayfarer&#x27;s Stride");
    expect(html).toContain("Wayfarer&#x27;s Ward");
    // Not a tri-centroid, so Zenith should not be present
    expect(html).not.toContain("Wayfarer&#x27;s Zenith");
  });

  it('renders Wayfarer Zenith for a tri-centroid coordinate', () => {
    const html = renderToStaticMarkup(
      <OffNodeChoiceModal
        isOpen={true}
        hero={mockWarrior}
        archetype="MAGE"
        targetPoints={{ fighter: 1, rogue: 1, mage: 1 }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(html).toContain("Wayfarer&#x27;s Zenith");
    expect(html).toContain('+4 Max HP, +1 Armor, +1 Ward, +1 Speed, +1 Evasion, +1 Resolve');
  });

  it('does not render when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <OffNodeChoiceModal
        isOpen={false}
        hero={mockWarrior}
        archetype="ROGUE"
        targetPoints={{ fighter: 1, rogue: 1, mage: 0 }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(html).toBe('');
  });
});
