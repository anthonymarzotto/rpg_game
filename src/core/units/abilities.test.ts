import { describe, it, expect } from 'vitest';
import {
  NOVICE_FIGHTER_ABILITIES,
  NOVICE_ROGUE_ABILITIES,
  NOVICE_MAGE_ABILITIES,
  UNIVERSAL_ACTIONS,
  rollNoviceAbilityKit,
  STRIKE,
  SHIELD_BASH,
  BRACE,
  QUICK_THRUST,
  THROW_DART,
  SKIRMISH,
  SPARK,
  FROSTBITE,
  MINOR_WARD
} from '../../data/abilities';
import { createRecruit } from './unitFactory';

describe('Novice Abilities Pool (3x3x3)', () => {
  it('contains exactly 3 abilities per archetype', () => {
    expect(NOVICE_FIGHTER_ABILITIES).toHaveLength(3);
    expect(NOVICE_ROGUE_ABILITIES).toHaveLength(3);
    expect(NOVICE_MAGE_ABILITIES).toHaveLength(3);
  });

  it('verifies all Fighter abilities cost 1 AP and carry FIGHTER tag', () => {
    for (const ability of NOVICE_FIGHTER_ABILITIES) {
      expect(ability.apCost).toBe(1);
      expect(ability.archetypeTag).toBe('FIGHTER');
      expect(ability.targetType).toBe('SINGLE_TARGET');
      expect(ability.defenseTarget).toBe('EVASION');
      expect(ability.damageType).toBe('PHYSICAL');
      expect(ability.damageProfile?.modifierAttribute).toBe('FORCE');
    }
  });

  it('verifies all Rogue abilities cost 1 AP and carry ROGUE tag', () => {
    for (const ability of NOVICE_ROGUE_ABILITIES) {
      expect(ability.apCost).toBe(1);
      expect(ability.archetypeTag).toBe('ROGUE');
      expect(ability.defenseTarget).toBe('EVASION');
      expect(ability.damageType).toBe('PHYSICAL');
      expect(ability.damageProfile?.modifierAttribute).toBe('FINESSE');
    }
  });

  it('verifies all Mage abilities cost 1 AP and carry MAGE tag', () => {
    for (const ability of NOVICE_MAGE_ABILITIES) {
      expect(ability.apCost).toBe(1);
      expect(ability.archetypeTag).toBe('MAGE');
    }
  });

  it('verifies unique tactical effects on special abilities', () => {
    expect(SHIELD_BASH.effect?.type).toBe('KNOCKBACK');
    expect(BRACE.effect?.type).toBe('ARMOR_BUFF');
    expect(QUICK_THRUST.effect?.type).toBe('CRIT_BOOST');
    expect(SKIRMISH.effect?.type).toBe('RETREAT_STEP');
    expect(FROSTBITE.effect?.type).toBe('SLOW');
    expect(MINOR_WARD.effect?.type).toBe('WARD_BUFF');
  });

  it('verifies universal actions (Move and Wait)', () => {
    expect(UNIVERSAL_ACTIONS).toHaveLength(2);
    const move = UNIVERSAL_ACTIONS.find((a) => a.id === 'move');
    const wait = UNIVERSAL_ACTIONS.find((a) => a.id === 'wait');

    expect(move?.apCost).toBe(1);
    expect(move?.targetType).toBe('HEX');
    expect(wait?.apCost).toBe(0);
    expect(wait?.targetType).toBe('SELF');
  });
});

describe('Starter Ability Kit Generation', () => {
  it('rolls 1 Fighter, 1 Rogue, 1 Mage ability plus universal actions', () => {
    const kit = rollNoviceAbilityKit();

    // 1 Fighter + 1 Rogue + 1 Mage + 2 Universal = 5 total actions
    expect(kit).toHaveLength(5);

    const fighterActions = kit.filter((a) => a.archetypeTag === 'FIGHTER');
    const rogueActions = kit.filter((a) => a.archetypeTag === 'ROGUE');
    const mageActions = kit.filter((a) => a.archetypeTag === 'MAGE');
    const universalActions = kit.filter((a) => !a.archetypeTag);

    expect(fighterActions).toHaveLength(1);
    expect(rogueActions).toHaveLength(1);
    expect(mageActions).toHaveLength(1);
    expect(universalActions).toHaveLength(2);
  });

  it('supports deterministic generation using a mock RNG', () => {
    // Return index 0 for all rolls -> Strike, Quick Thrust, Spark
    const mockRng = () => 0.0;
    const kit = rollNoviceAbilityKit(mockRng);

    expect(kit[0].id).toBe('strike');
    expect(kit[1].id).toBe('quick_thrust');
    expect(kit[2].id).toBe('spark');
  });

  it('equips newly recruited units with their rolled starter kit', () => {
    const recruit = createRecruit('unit-novice', 'Bran');

    expect(recruit.abilities).toHaveLength(5);
    expect(recruit.abilities.some((a) => a.archetypeTag === 'FIGHTER')).toBe(true);
    expect(recruit.abilities.some((a) => a.archetypeTag === 'ROGUE')).toBe(true);
    expect(recruit.abilities.some((a) => a.archetypeTag === 'MAGE')).toBe(true);
  });
});
