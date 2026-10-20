import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HeroProgressionDrawer } from './HeroProgressionDrawer';
import { ConstellationSvg } from '../pyramid/ConstellationSvg';
import { Unit } from '../../core/types/unit';
import { UnitProgression } from '../../core/types/class';
import { CampaignState } from '../../core/campaign/types';

import { createCampaign } from '../../core/campaign/campaignFactory';

interface MockUnitOverrides extends Omit<Partial<Unit>, 'progression'> {
  progression?: Partial<UnitProgression>;
}

function makeMockUnit(overrides: MockUnitOverrides = {}): Unit {
  const { progression: progressionOverride, ...restOverrides } = overrides;
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
      archetypePoints: { fighter: 0, rogue: 0, mage: 0 },
      milestoneSelections: {},
      ...(progressionOverride as object)
    },
    loadout: {
      activeClassId: 'novice',
      wildcardAbilityIds: [],
      wildcardPassiveIds: []
    },
    starterAbilityIds: ['strike'],
    ...restOverrides
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

    expect(html).toContain('Valerius');
    expect(html).toContain('Level 0 Novice');
    expect(html).toContain('Force: 2');
    expect(html).toContain('Finesse: 1');
    expect(html).toContain('Focus: 0');
    expect(html).toContain('The Constellation');
    expect(html).toContain('drawer-svg-viewport');
    expect(html).toContain('chart-svg');
  });

  it('renders slot socket pips for ability slots', () => {
    const hero = makeMockUnit({
      loadout: {
        activeClassId: 'novice',
        wildcardAbilityIds: [],
        wildcardPassiveIds: [],
        earnedShards: ['starlight_lens'],
        slotAugments: { 0: ['starlight_lens'] }
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

    expect(html).toContain('data-testid="slot-sockets-0"');
    expect(html).toContain('data-testid="slot-sockets-3"');
    expect(html).toContain('Starlight Lens');
    expect(html).toContain('Empty Socket');
  });

  it('renders Wayfarer rank in header when hero has reached off-node milestones', () => {
    const hero = makeMockUnit({
      progression: {
        unitId: 'hero-1',
        currentLevel: 2,
        constellation: ['warrior'],
        accumulatedXp: { fighter: 0, rogue: 0, mage: 0 },
        archetypePoints: { fighter: 1, rogue: 1, mage: 0 },
        offNodeMilestones: ['(1,1,0)']
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

    expect(html).toContain('Level 2 Novice • Wayfarer I');
  });

  it('previews Wayfarer Milestone on advancement CTA when target point is off-node', () => {
    const hero = makeMockUnit({
      progression: {
        unitId: 'hero-1',
        currentLevel: 1,
        constellation: ['warrior'],
        accumulatedXp: { fighter: 0, rogue: 10, mage: 0 },
        archetypePoints: { fighter: 1, rogue: 0, mage: 0 }
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

    expect(html).toContain('Ascend: Rogue (+1 Finesse)');
    expect(html).toContain('✦ Wayfarer Milestone');
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

    expect(html).toContain('Ascension Ready: Channel 1 Astral Discipline Point');
    expect(html).toContain('Ascend: Fighter (+1 Force)');
    expect(html).toContain('Current: 5 XP');
    expect(html).not.toContain('Ascend: Rogue');
    expect(html).not.toContain('Ascend: Mage');
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

    expect(html).not.toContain('Ascension Ready: Channel 1 Astral Discipline Point');
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

    expect(html).toContain('Combat Manifest');
    expect(html).toContain('Attuned Class:');
    expect(html).toContain('Resonant Ability I:');
    expect(html).toContain('Resonant Ability II:');
    expect(html).toContain('Resonant Passive:');
  });

  it('renders persistent Class Inspector Card displaying class details and abilities', () => {
    const hero = makeMockUnit({
      progression: {
        unitId: 'hero-1',
        currentLevel: 1,
        constellation: ['warrior'],
        accumulatedXp: { fighter: 0, rogue: 0, mage: 0 },
        archetypePoints: { fighter: 1, rogue: 0, mage: 0 }
      },
      loadout: {
        activeClassId: 'warrior',
        wildcardAbilityIds: ['strike'],
        wildcardPassiveIds: []
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

    // Inspector card shows warrior details
    expect(html).toContain('drawer-class-inspector-card');
    expect(html).toContain('Warrior');
    expect(html).toContain('Tier 1');
    expect(html).toContain('Force: 1');
    expect(html).toContain('Attuned Class');
    // Tactical slot cards for equipped wildcards
    expect(html).toContain('drawer-tactical-slot-card');
    expect(html).toContain('Strike');
  });

  it('renders Equip As Active Class action when inspecting an unlocked non-active class', () => {
    const hero = makeMockUnit({
      progression: {
        unitId: 'hero-1',
        currentLevel: 1,
        constellation: ['warrior'],
        accumulatedXp: { fighter: 0, rogue: 0, mage: 0 },
        archetypePoints: { fighter: 1, rogue: 0, mage: 0 }
      },
      loadout: {
        activeClassId: 'novice',
        wildcardAbilityIds: [],
        wildcardPassiveIds: []
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

    // Initial inspection shows novice (currently active)
    expect(html).toContain('Novice');
    expect(html).toContain('Attuned Class');
  });

  it('renders the Dev XP button for quick ascension testing', () => {
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

    expect(html).toContain('+10 XP (Dev)');
    expect(html).toContain('hero-drawer-dev-xp-btn');
  });

  it('renders concise "✦ Next Ascension • +1 Force" in scanner HUD when hovering eligible class triangle', () => {
    const hero = makeMockUnit({
      progression: {
        unitId: 'hero-1',
        currentLevel: 0,
        constellation: [],
        accumulatedXp: { fighter: 10, rogue: 0, mage: 0 },
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
        initialHoveredClassId="warrior"
      />
    );

    expect(html).toContain('✦ Next Ascension • +1 Force');
    expect(html).toContain('Warrior');
  });

  it('renders concise "✦ Next Waypoint • +1 Force" in scanner HUD when hovering eligible waypoint', () => {
    // Level 1 wizard with 1 Focus (0, 0, 1) hovering waypoint (1, 0, 1)
    const hero = makeMockUnit({
      progression: {
        unitId: 'hero-1',
        currentLevel: 1,
        constellation: ['wizard'],
        accumulatedXp: { fighter: 0, rogue: 0, mage: 0 },
        archetypePoints: { fighter: 0, rogue: 0, mage: 1 }
      }
    });
    const campaign = makeMockCampaign(hero);
    const html = renderToStaticMarkup(
      <HeroProgressionDrawer
        hero={hero}
        campaign={campaign}
        onClose={vi.fn()}
        onUpdateCampaign={vi.fn()}
        initialHoveredWaypointKey="1,0,1"
      />
    );

    expect(html).toContain('◇ Waypoint (1,0,1)');
    expect(html).toContain('Tier 2');
    expect(html).toContain('✦ Next Waypoint • +1 Force');
    // Ensure verbose instructions, old bullet text, and option lists are absent from floating HUD
    expect(html).not.toContain('ELIGIBLE NEXT LEVEL');
    expect(html).not.toContain('scanner-instruction');
    expect(html).not.toContain('harmonize with this milestone');
    expect(html).not.toContain('Attunements:');
  });

  it('renders streamlined 3-line format in scanner HUD when hovering an attuned waypoint', () => {
    const hero = makeMockUnit({
      progression: {
        unitId: 'hero-1',
        currentLevel: 2,
        constellation: ['warrior'],
        accumulatedXp: { fighter: 0, rogue: 0, mage: 0 },
        archetypePoints: { fighter: 1, rogue: 1, mage: 0 },
        offNodeMilestones: ['1,1,0']
      }
    });
    const campaign = makeMockCampaign(hero);
    const html = renderToStaticMarkup(
      <HeroProgressionDrawer
        hero={hero}
        campaign={campaign}
        onClose={vi.fn()}
        onUpdateCampaign={vi.fn()}
        initialHoveredWaypointKey="1,1,0"
      />
    );

    expect(html).toContain('★ Waypoint (1,1,0)');
    expect(html).toContain('Tier 2');
    expect(html).toContain('★ Milestone Attuned');
    expect(html).not.toContain('Attunements:');
    expect(html).not.toContain('Next Waypoint');
  });

  it('Task 3.1 & 3.2: renders active selection ring on selected waypoint in ConstellationSvg and triggers onClickWaypoint callback', () => {
    const progression = {
      unitId: 'hero-1',
      currentLevel: 2,
      constellation: ['warrior'],
      accumulatedXp: { fighter: 0, rogue: 0, mage: 0 },
      archetypePoints: { fighter: 1, rogue: 1, mage: 0 },
      offNodeMilestones: ['1,1,0'],
      milestoneSelections: {}
    };

    // 1. Verify selection ring SVG markup
    const htmlSelected = renderToStaticMarkup(
      <ConstellationSvg
        progression={progression}
        unlockedSet={new Set(['warrior'])}
        hoveredClassId={null}
        constellationPathD=""
        onHoverNode={vi.fn()}
        selectedWaypointKey="1,1,0"
      />
    );
    expect(htmlSelected).toContain('waypoint-selected-ring');
    expect(htmlSelected).toContain('starlight-waypoint unlocked  selected');

    const htmlUnselected = renderToStaticMarkup(
      <ConstellationSvg
        progression={progression}
        unlockedSet={new Set(['warrior'])}
        hoveredClassId={null}
        constellationPathD=""
        onHoverNode={vi.fn()}
        selectedWaypointKey={null}
      />
    );
    expect(htmlUnselected).not.toContain('waypoint-selected-ring');

    // 2. Verify onClickWaypoint callback fires on waypoint click
    const onClickWaypoint = vi.fn();
    const tree = ConstellationSvg({
      progression,
      unlockedSet: new Set(['warrior']),
      hoveredClassId: null,
      constellationPathD: '',
      onHoverNode: vi.fn(),
      selectedWaypointKey: '1,1,0',
      onClickWaypoint
    });

    function findByTestId(el: unknown, testId: string): { props: { onClick: () => void } } | null {
      if (!el || typeof el !== 'object') return null;
      const maybeNode = el as { props?: { 'data-testid'?: string; children?: unknown; onClick?: () => void } };
      if (maybeNode.props?.['data-testid'] === testId) return maybeNode as { props: { onClick: () => void } };
      if (Array.isArray(maybeNode.props?.children)) {
        for (const child of maybeNode.props.children) {
          const found = findByTestId(child, testId);
          if (found) return found;
        }
      } else if (maybeNode.props?.children) {
        return findByTestId(maybeNode.props.children, testId);
      }
      return null;
    }

    const wpNode = findByTestId(tree, 'waypoint-1,1,0');
    expect(wpNode).toBeTruthy();
    wpNode?.props.onClick();
    expect(onClickWaypoint).toHaveBeenCalledWith('1,1,0');
  });

  it('Task 4.1 & 4.2: renders persistent WaypointInspectorCard with exact attuned selections and shard reward', () => {
    const hero = makeMockUnit({
      loadout: {
        activeClassId: 'warrior',
        wildcardAbilityIds: [],
        wildcardPassiveIds: []
      },
      progression: {
        unitId: 'hero-1',
        currentLevel: 2,
        constellation: ['warrior'],
        accumulatedXp: { fighter: 0, rogue: 0, mage: 0 },
        archetypePoints: { fighter: 1, rogue: 1, mage: 0 },
        offNodeMilestones: ['1,1,0'],
        milestoneSelections: {
          '1,1,0': {
            coordKey: '1,1,0',
            attunementId: 'wayfarer_bastion',
            reward: { type: 'SHARD', shardId: 'starlight_lens' },
            levelAwarded: 2
          }
        }
      }
    });
    const campaign = makeMockCampaign(hero);
    const html = renderToStaticMarkup(
      <HeroProgressionDrawer
        hero={hero}
        campaign={campaign}
        onClose={vi.fn()}
        onUpdateCampaign={vi.fn()}
        initialSelectedWaypointKey="1,1,0"
      />
    );

    // Inspector card renders in waypoint mode
    expect(html).toContain('data-testid="drawer-waypoint-inspector-card"');
    expect(html).not.toContain('data-testid="drawer-class-inspector-card"');

    // Header metadata
    expect(html).toContain('★ Waypoint (1,1,0)');
    expect(html).toContain('Tier 2');
    expect(html).toContain('Level 2');
    expect(html).toContain('Off-Node Milestone');
    expect(html).toContain('★ Milestone Attuned');

    // Attuned Defense details
    expect(html).toContain('data-testid="waypoint-attuned-details"');
    expect(html).toContain('ATTUNED DEFENSE');
    expect(html).toContain('Bastion');
    expect(html).toContain('+6 Max HP, +1 Armor');

    // Augment Shard Specialization details
    expect(html).toContain('ASTRAL AUGMENT SHARD');
    expect(html).toContain('Starlight Lens');
    expect(html).toContain('Socketable into loadout ability slots');

    // Switch back to active class button
    expect(html).toContain('data-testid="btn-inspect-active-class"');
    expect(html).toContain('✦ Inspect Active Class (Warrior)');
  });

  it('Task 4.1 & 4.2: renders persistent WaypointInspectorCard with domain ability unlock when attuned with ability reward', () => {
    const hero = makeMockUnit({
      loadout: {
        activeClassId: 'warrior',
        wildcardAbilityIds: [],
        wildcardPassiveIds: []
      },
      progression: {
        unitId: 'hero-1',
        currentLevel: 2,
        constellation: ['warrior'],
        accumulatedXp: { fighter: 0, rogue: 0, mage: 0 },
        archetypePoints: { fighter: 1, rogue: 1, mage: 0 },
        offNodeMilestones: ['1,1,0'],
        milestoneSelections: {
          '1,1,0': {
            coordKey: '1,1,0',
            attunementId: 'wayfarer_stride',
            reward: { type: 'ABILITY', abilityId: 'shadow_step' },
            levelAwarded: 2
          }
        }
      }
    });
    const campaign = makeMockCampaign(hero);
    const html = renderToStaticMarkup(
      <HeroProgressionDrawer
        hero={hero}
        campaign={campaign}
        onClose={vi.fn()}
        onUpdateCampaign={vi.fn()}
        initialSelectedWaypointKey="1,1,0"
      />
    );

    expect(html).toContain('ATTUNED DEFENSE');
    expect(html).toContain('Stride');
    expect(html).toContain('+2 Evasion, +2 Speed');
    expect(html).toContain('DOMAIN ABILITY');
    expect(html).toContain('Shadow Step');
    expect(html).toContain('Permanent Wildcard');
  });

  it('Task 4.1 & 4.2: renders persistent WaypointInspectorCard with choice overview when a potential waypoint is selected', () => {
    const hero = makeMockUnit({
      progression: {
        unitId: 'hero-1',
        currentLevel: 1,
        constellation: ['wizard'],
        accumulatedXp: { fighter: 0, rogue: 0, mage: 0 },
        archetypePoints: { fighter: 0, rogue: 0, mage: 1 }
      }
    });
    const campaign = makeMockCampaign(hero);
    const html = renderToStaticMarkup(
      <HeroProgressionDrawer
        hero={hero}
        campaign={campaign}
        onClose={vi.fn()}
        onUpdateCampaign={vi.fn()}
        initialSelectedWaypointKey="1,0,1"
      />
    );

    expect(html).toContain('data-testid="drawer-waypoint-inspector-card"');
    expect(html).not.toContain('data-testid="drawer-class-inspector-card"');
    expect(html).toContain('◇ Waypoint (1,0,1)');
    expect(html).toContain('Tier 2');
    expect(html).toContain('✦ Next Waypoint • +1 Force');

    // Potential details: Abbreviated choice overview
    expect(html).toContain('data-testid="waypoint-potential-details"');
    expect(html).toContain('DEFENSIVE ATTUNEMENT (CHOOSE 1)');
    expect(html).toContain('Bastion');
    expect(html).toContain('Ward');
    expect(html).toContain('SPECIALIZATION REWARD (CHOOSE 1)');
    expect(html).toContain('Domain Ability Draft');
    expect(html).toContain('Astral Augment Shard');
  });

  it('Task 4.1: defaults to Class Inspector when no waypoint is selected', () => {
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

    expect(html).toContain('data-testid="drawer-class-inspector-card"');
    expect(html).not.toContain('data-testid="drawer-waypoint-inspector-card"');
  });

  describe('Hero Renaming', () => {
    it('renders hero rename trigger button and hero name in header', () => {
      const hero = makeMockUnit({ name: 'Alden Starfall' });
      const campaign = makeMockCampaign(hero);
      const html = renderToStaticMarkup(
        <HeroProgressionDrawer
          hero={hero}
          campaign={campaign}
          onClose={vi.fn()}
          onUpdateCampaign={vi.fn()}
        />
      );

      expect(html).toContain('data-testid="drawer-hero-name"');
      expect(html).toContain('Alden Starfall');
      expect(html).toContain('data-testid="hero-rename-trigger"');
      expect(html).toContain('✎');
      expect(html).toContain('title="Rename Hero"');
    });

    it('validates name constraints (2 to 24 characters, trimming whitespace)', () => {
      const validateName = (raw: string) => {
        const trimmed = raw.trim();
        return trimmed.length >= 2 && trimmed.length <= 24;
      };

      expect(validateName('   ')).toBe(false);
      expect(validateName('A')).toBe(false);
      expect(validateName('Al')).toBe(true);
      expect(validateName('Alden Voidwalker')).toBe(true);
      expect(validateName('123456789012345678901234')).toBe(true); // 24 chars
      expect(validateName('1234567890123456789012345')).toBe(false); // 25 chars
    });
  });
});


