import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AbilityHybridBody,
  AbilityCompactSummary,
  AbilityHoverTooltipBody
} from './AbilityDescriptionBlock';
import { getEffectiveAbility } from '../../core/combat/modifiers';
import { CLEAVE } from '../../data/packages/warrior';
import { AbilityModifier } from '../../core/types/modifier';

describe('AbilityDescriptionBlock', () => {
  const shardMod: AbilityModifier = {
    id: 'shard_starlight_lens',
    name: 'Starlight Lens',
    isPermanent: true,
    effectPatches: { diceStep: 1 }
  };
  const trialMod: AbilityModifier = {
    id: 'blood_frenzy',
    name: 'Blood Frenzy',
    deltas: { attackRoll: 2 },
    effectPatches: { diceStep: 1 }
  };

  it('renders flavor, Stat Strip pills, and Effect Clauses with Shard tier styling', () => {
    const withShard = getEffectiveAbility(CLEAVE, [shardMod]);
    const html = renderToStaticMarkup(<AbilityHybridBody ability={withShard} />);

    expect(html).toContain(CLEAVE.description);
    expect(html).toContain('ability-stat-pill tier-shard');
    expect(html).toContain('1d6 + FRC Physical');
    expect(html).toContain('Sweeps 1 adjacent frontal foe');
  });

  it('applies In-Trial precedence over Shard in Stat Strip and Hover Tooltip', () => {
    const withShard = getEffectiveAbility(CLEAVE, [shardMod]);
    const withTrial = getEffectiveAbility(withShard, [trialMod]);
    const html = renderToStaticMarkup(<AbilityHoverTooltipBody ability={withTrial} />);

    expect(html).toContain('1d8 + FRC Physical');
    expect(html).toContain('+FIN + 2 vs EVA');
    expect(html).toContain('ability-stat-pill tier-trial');
    expect(html).toContain('Starlight Lens');
    expect(html).toContain('Blood Frenzy');
  });

  it('renders CompactSummary segments with tier classes', () => {
    const withShard = getEffectiveAbility(CLEAVE, [shardMod]);
    const html = renderToStaticMarkup(<AbilityCompactSummary ability={withShard} />);

    expect(html).toContain('compact-seg tier-shard');
    expect(html).toContain('1d6 + FRC Physical');
    expect(html).toContain('compact-seg tier-normal');
  });
});
