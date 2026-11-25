import { describe, it, expect } from 'vitest';
import { formatAbilityDescription, formatAbilityEffectClause } from './abilityFormatter';
import { getEffectiveAbility } from './modifiers';
import { Ability, AbilityEffect } from '../types/ability';
import { AbilityModifier } from '../types/modifier';
import { CLEAVE, WARRIOR_PACKAGE } from '../../data/packages/warrior';
import { SNEAK_ATTACK } from '../../data/packages/thief';
import { ARCANE_BLAST } from '../../data/packages/wizard';
import { BASTION_PLANT } from '../../data/packages/shieldBearer';
import { POMMEL_STRIKE } from '../../data/packages/knight';
import { WYRMFLAME_BREATH } from '../../data/packages/dragoon';
import { EXPOSE_WEAKNESS } from '../../data/packages/infiltrator';

describe('abilityFormatter', () => {
  it('formats melee physical ability with Stat Strip pills and compact summary', () => {
    const formatted = formatAbilityDescription(CLEAVE);
    expect(formatted.statPills.map((p) => p.label)).toEqual([
      'Melee 1',
      '1d4 + FRC Physical',
      '+FIN vs EVA'
    ]);
    expect(formatted.effectClauses).toHaveLength(1);
    expect(formatted.effectClauses[0].triggerLabel).toBe('On Hit');
    expect(formatted.effectClauses[0].text).toContain('Sweeps 1 adjacent frontal foe');
    expect(formatted.compactSummary).toBe('Melee 1 • 1d4 + FRC Physical • +FIN vs EVA • Cleave 1');
    expect(formatted.highestTier).toBe('NORMAL');
  });

  it('formats AoE ground-targeted spell with Blast and Splash pills', () => {
    const formatted = formatAbilityDescription(ARCANE_BLAST);
    expect(formatted.statPills.map((p) => p.label)).toEqual([
      'Range 3',
      'Blast 1',
      '1d4 + FOC Magical',
      '1d4 Blast',
      '+FOC vs RES'
    ]);
  });

  it('formats cone template ability with Burn clause', () => {
    const formatted = formatAbilityDescription(WYRMFLAME_BREATH);
    expect(formatted.statPills.some((p) => p.label === 'Cone 2')).toBe(true);
    expect(formatted.effectClauses[0].text).toBe('Inflicts Burn (1 dmg/turn, 2 turns)');
  });

  it('formats stat modifier debuff into readable stat names instead of raw enums', () => {
    const formatted = formatAbilityDescription(EXPOSE_WEAKNESS);
    expect(formatted.effectClauses[0].text).toBe('Inflicts -2 Armor, -2 Evasion on target (2 turns)');
    expect(formatted.compactSummary).toContain('-2 ARM, -2 EVA');
  });

  it('formats conditional bonus damage for Sneak Attack and Pommel Strike', () => {
    const sneak = formatAbilityDescription(SNEAK_ATTACK);
    expect(sneak.effectClauses[0].triggerLabel).toBe('Flank/Rear');
    expect(sneak.effectClauses[0].text).toContain('+1d6 + FRC bonus damage');

    const pommel = formatAbilityDescription(POMMEL_STRIKE);
    const challengedClause = pommel.effectClauses.find((c) => c.triggerLabel === 'Vs Challenged');
    expect(challengedClause?.text).toBe('+2 Attack Roll and +1d4 bonus damage');
  });

  it('deduplicates move lock when paired with BASTION_STANCE', () => {
    const bastion = formatAbilityDescription(BASTION_PLANT);
    const texts = bastion.effectClauses.map((c) => c.text);
    expect(texts.some((t) => t.includes('Grants +3 Armor to self'))).toBe(true);
    expect(texts.some((t) => t.includes('Plants Phalanx Front'))).toBe(true);
    expect(texts.filter((t) => t.includes('Move'))).toHaveLength(1);
  });

  it('reflects Normal -> Shard -> In-Trial precedence across pills, clauses, and compact segments', () => {
    const baseStrike = WARRIOR_PACKAGE.signatureAbility;
    const bloodboundShard: AbilityModifier = {
      id: 'shard_bloodbound_shard',
      name: 'Bloodbound Shard',
      isPermanent: true,
      deltas: { hpCost: 2 },
      effectPatches: { diceStep: 1, flatDamage: 2 }
    };
    const venomShard: AbilityModifier = {
      id: 'shard_venom_shard',
      name: 'Venom Shard',
      isPermanent: true,
      appendEffects: [
        { type: 'CONDITION', conditionType: 'POISON', durationTurns: 2, applyOn: 'HIT_OR_CRIT' }
      ]
    };
    const bloodFrenzy: AbilityModifier = {
      id: 'blood_frenzy',
      name: 'Blood Frenzy',
      deltas: { attackRoll: 2 },
      effectPatches: { diceStep: 1 }
    };

    const withShards = getEffectiveAbility(baseStrike, [bloodboundShard, venomShard]);
    const shardFmt = formatAbilityDescription(withShards);
    expect(shardFmt.statPills.find((p) => p.id === 'damage')?.tier).toBe('SHARD');
    expect(shardFmt.statPills.find((p) => p.id === 'damage')?.label).toBe('2d8 + FRC + 2 Physical');
    expect(shardFmt.statPills.find((p) => p.id === 'cost')?.tier).toBe('SHARD');
    expect(shardFmt.statPills.find((p) => p.id === 'reach')?.tier).toBe('NORMAL');
    expect(shardFmt.effectClauses[0].tier).toBe('SHARD');
    expect(shardFmt.effectClauses[0].text).toContain('Poison');
    expect(shardFmt.highestTier).toBe('SHARD');

    const withTrial = getEffectiveAbility(withShards, [bloodFrenzy]);
    const trialFmt = formatAbilityDescription(withTrial);
    // In-Trial overrides Shard on damageProfile and adds Trial tier on contest
    expect(trialFmt.statPills.find((p) => p.id === 'damage')?.tier).toBe('TRIAL');
    expect(trialFmt.statPills.find((p) => p.id === 'damage')?.label).toBe('2d10 + FRC + 2 Physical');
    expect(trialFmt.statPills.find((p) => p.id === 'contest')?.tier).toBe('TRIAL');
    expect(trialFmt.statPills.find((p) => p.id === 'contest')?.label).toBe('+FIN + 2 vs EVA');
    // HP Cost and Venom Poison remain SHARD
    expect(trialFmt.statPills.find((p) => p.id === 'cost')?.tier).toBe('SHARD');
    expect(trialFmt.effectClauses[0].tier).toBe('SHARD');
    // Reach remains NORMAL
    expect(trialFmt.statPills.find((p) => p.id === 'reach')?.tier).toBe('NORMAL');
    expect(trialFmt.highestTier).toBe('TRIAL');
  });

  it('handles every AbilityEffectType cleanly without raw enum strings', () => {
    const dummyAbility: Ability = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      apCost: 1,
      range: 2,
      targetType: 'SINGLE_TARGET',
      defenseTarget: 'EVASION',
      damageType: 'PHYSICAL',
      effects: []
    };

    const allEffects: AbilityEffect[] = [
      { type: 'KNOCKBACK', magnitude: 1 },
      { type: 'RETREAT_STEP', magnitude: 1 },
      { type: 'PENETRATE_STEP', magnitude: 1 },
      { type: 'RUSH_CHARGE', magnitude: 3 },
      { type: 'AERIAL_VAULT' },
      { type: 'TELEPORT' },
      { type: 'POSITION_SWAP' },
      { type: 'CLEAVE', magnitude: 2 },
      { type: 'LINE_PIERCE' },
      { type: 'CTB_DELAY', magnitude: 20 },
      { type: 'INITIATIVE_BOOST', magnitude: 15, targetScope: 'SELF' },
      { type: 'FORCE_FACING' },
      { type: 'FORCE_FACING_AWAY' },
      { type: 'CONDITION', conditionType: 'BURN', magnitude: 2, durationTurns: 2 },
      { type: 'ARMOR_BUFF', magnitude: 2, durationTurns: 1, targetScope: 'SELF' },
      { type: 'WARD_BUFF', magnitude: 2, durationTurns: 1 },
      { type: 'SLOW', magnitude: 1, durationTurns: 1 },
      { type: 'STAT_MODIFIER', statModifiers: { evasion: 2 }, durationTurns: 1, targetScope: 'SELF' },
      { type: 'BASTION_STANCE', durationTurns: 1, targetScope: 'SELF' },
      { type: 'CRIT_BOOST', magnitude: 1 },
      { type: 'SPELL_SCULPT', magnitude: 1 },
      { type: 'BLOOD_FRENZY', magnitude: 1 },
      { type: 'WILD_SURGE', magnitude: 1 },
      { type: 'PULL', magnitude: 1 },
      { type: 'CONDITION', conditionType: 'CHARMED', durationTurns: 1, applyOn: 'HIT_ONLY' },
      { type: 'CONDITION', conditionType: 'BLINDED', durationTurns: 1, applyOn: 'HIT_OR_CRIT' },
      { type: 'CONDITION', conditionType: 'EXPOSED', durationTurns: 1, applyOn: 'GRAZE_ONLY' },
      { type: 'CONDITION', conditionType: 'HENOSIS', durationTurns: 2 },
      { type: 'CONDITION', conditionType: 'MORTAL_EBB', durationTurns: 1 },
      { type: 'CLEANSE' }
    ];

    for (const eff of allEffects) {
      const clause = formatAbilityEffectClause(eff, dummyAbility);
      expect(clause).not.toBeNull();
      expect(clause!.text.length).toBeGreaterThan(5);
      expect(clause!.text).not.toContain('STAT_MODIFIER');
      expect(clause!.text).not.toContain('CTB_DELAY');
    }
  });

  it('formats minimum range deadzone as Range min–max', () => {
    const artillery: Ability = {
      id: 'test_artillery',
      name: 'Test Artillery',
      description: 'Long-range siege shot.',
      apCost: 2,
      minRange: 2,
      range: 4,
      targetType: 'HEX',
      defenseTarget: 'EVASION',
      attackModifierAttribute: 'finesse',
      damageType: 'PHYSICAL',
      aoeRadius: 1,
      effects: [{ type: 'DAMAGE', damageProfile: { count: 2, sides: 8, modifierAttribute: 'force' } }]
    };

    const formatted = formatAbilityDescription(artillery);
    const reachPill = formatted.statPills.find((p) => p.id === 'reach');
    expect(reachPill?.label).toBe('Range 2–4');
  });

  it('formats POST_ACTION effects (e.g. Shadow Shard on Sneak Attack) with After Action trigger label', async () => {
    const { ASTRAL_AUGMENT_SHARDS } = await import('../progression/harmonization');
    const augmented = getEffectiveAbility(SNEAK_ATTACK, [ASTRAL_AUGMENT_SHARDS.shadow_shard.modifier]);
    const formatted = formatAbilityDescription(augmented);
    const stealthClause = formatted.effectClauses.find((c) => c.text.includes('Grants Stealth to self'));
    expect(stealthClause).toBeDefined();
    expect(stealthClause?.triggerLabel).toBe('After Action');
    expect(stealthClause?.tier).toBe('SHARD');
  });
});
