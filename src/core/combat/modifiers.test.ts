import { describe, it, expect } from 'vitest';
import {
  upgradeDieSides,
  STANDARD_DICE_STEPS,
  isModifierApplicable,
  getEffectiveAbility
} from './modifiers';
import { Ability } from '../types/ability';
import { AbilityModifier } from '../types/modifier';

describe('Universal Ability Modifier Engine', () => {
  describe('upgradeDieSides() & STANDARD_DICE_STEPS', () => {
    it('has standard polyhedral progression ladder [4, 6, 8, 10, 12]', () => {
      expect(STANDARD_DICE_STEPS).toEqual([4, 6, 8, 10, 12]);
    });

    it('upgrades 1 step across canonical polyhedrals', () => {
      expect(upgradeDieSides(4, 1)).toBe(6);
      expect(upgradeDieSides(6, 1)).toBe(8);
      expect(upgradeDieSides(8, 1)).toBe(10);
      expect(upgradeDieSides(10, 1)).toBe(12);
    });

    it('clamps at maximum d12', () => {
      expect(upgradeDieSides(12, 1)).toBe(12);
      expect(upgradeDieSides(12, 3)).toBe(12);
    });

    it('clamps at minimum d4 when stepping down', () => {
      expect(upgradeDieSides(6, -1)).toBe(4);
      expect(upgradeDieSides(4, -1)).toBe(4);
      expect(upgradeDieSides(4, -3)).toBe(4);
    });

    it('handles multi-step upgrades', () => {
      expect(upgradeDieSides(4, 2)).toBe(8);
      expect(upgradeDieSides(4, 3)).toBe(10);
      expect(upgradeDieSides(4, 4)).toBe(12);
    });

    it('returns unmodified value if steps is 0', () => {
      expect(upgradeDieSides(6, 0)).toBe(6);
    });
  });

  describe('isModifierApplicable()', () => {
    const testAbility: Ability = {
      id: 'ignite',
      name: 'Ignite',
      description: 'Test fire spell',
      archetypeTag: 'MAGE',
      apCost: 2,
      range: 3,
      targetType: 'SINGLE_TARGET',
      defenseTarget: 'RESOLVE',
      damageType: 'MAGICAL',
      effects: [
        {
          type: 'DAMAGE',
          damageProfile: { count: 1, sides: 6, modifierAttribute: 'focus' }
        }
      ]
    };

    it('returns true when modifier specifies no filters', () => {
      const mod: AbilityModifier = {
        id: 'universal_boost',
        name: 'Universal Boost'
      };
      expect(isModifierApplicable(mod, testAbility)).toBe(true);
    });

    it('filters by targetAbilityIds', () => {
      const matchMod: AbilityModifier = {
        id: 'mod1',
        name: 'Mod 1',
        targetAbilityIds: ['ignite', 'fireball']
      };
      const mismatchMod: AbilityModifier = {
        id: 'mod2',
        name: 'Mod 2',
        targetAbilityIds: ['cleave']
      };
      expect(isModifierApplicable(matchMod, testAbility)).toBe(true);
      expect(isModifierApplicable(mismatchMod, testAbility)).toBe(false);
    });

    it('filters by targetArchetypes', () => {
      const mageMod: AbilityModifier = {
        id: 'mod_mage',
        name: 'Mage Mod',
        targetArchetypes: ['MAGE']
      };
      const fighterMod: AbilityModifier = {
        id: 'mod_fighter',
        name: 'Fighter Mod',
        targetArchetypes: ['FIGHTER']
      };
      expect(isModifierApplicable(mageMod, testAbility)).toBe(true);
      expect(isModifierApplicable(fighterMod, testAbility)).toBe(false);
    });

    it('filters by targetDamageTypes', () => {
      const magicMod: AbilityModifier = {
        id: 'mod_magic',
        name: 'Magic Mod',
        targetDamageTypes: ['MAGICAL']
      };
      const physMod: AbilityModifier = {
        id: 'mod_phys',
        name: 'Phys Mod',
        targetDamageTypes: ['PHYSICAL']
      };
      expect(isModifierApplicable(magicMod, testAbility)).toBe(true);
      expect(isModifierApplicable(physMod, testAbility)).toBe(false);
    });
  });

  describe('getEffectiveAbility()', () => {
    const baseAbility: Ability = {
      id: 'strike',
      name: 'Strike',
      description: 'Basic strike',
      archetypeTag: 'FIGHTER',
      apCost: 2,
      range: 1,
      targetType: 'SINGLE_TARGET',
      defenseTarget: 'EVASION',
      attackModifierAttribute: 'force',
      damageType: 'PHYSICAL',
      effects: [
        {
          type: 'DAMAGE',
          damageProfile: { count: 1, sides: 6, modifierAttribute: 'force' }
        }
      ]
    };

    it('returns unmodified ability when modifiers are undefined or empty', () => {
      const eff = getEffectiveAbility(baseAbility);
      expect(eff.apCost).toBe(2);
      expect(eff.range).toBe(1);
      expect(eff.attributions).toEqual([]);
      expect(eff.appliedModifierIds).toEqual([]);
    });

    it('applies numeric deltas and logs attributions', () => {
      const mod: AbilityModifier = {
        id: 'spell_sculpt',
        name: 'Spell Sculpt',
        deltas: {
          apCost: -1,
          range: 1,
          aoeRadius: 1
        }
      };

      const eff = getEffectiveAbility(baseAbility, [mod]);
      expect(eff.apCost).toBe(1);
      expect(eff.range).toBe(2);
      expect(eff.aoeRadius).toBe(1);
      expect(eff.appliedModifierIds).toContain('spell_sculpt');
      expect(eff.attributions).toHaveLength(3);
      expect(eff.attributions.find((a) => a.property === 'apCost')?.changeLabel).toBe('-1 AP');
      expect(eff.attributions.find((a) => a.property === 'range')?.changeLabel).toBe('+1 Range');
      expect(eff.attributions.find((a) => a.property === 'aoeRadius')?.changeLabel).toBe('+1 AoE Radius');
    });

    it('applies property overrides and logs attributions', () => {
      const mod: AbilityModifier = {
        id: 'mystic_stance',
        name: 'Mystic Stance',
        overrides: {
          attackModifierAttribute: 'focus',
          defenseTarget: 'RESOLVE'
        }
      };

      const eff = getEffectiveAbility(baseAbility, [mod]);
      expect(eff.attackModifierAttribute).toBe('focus');
      expect(eff.defenseTarget).toBe('RESOLVE');
      expect(eff.attributions).toHaveLength(2);
    });

    it('applies die step patches to damage effects (e.g. Bear Strength 1d6 -> 1d8)', () => {
      const mod: AbilityModifier = {
        id: 'bear_strength',
        name: 'Bear Strength',
        effectPatches: {
          diceStep: 1,
          flatDamage: 2
        }
      };

      const eff = getEffectiveAbility(baseAbility, [mod]);
      expect(eff.effects[0].damageProfile?.sides).toBe(8);
      expect(eff.effects[0].flatDamage).toBe(2);
      expect(eff.attributions.some((a) => a.property === 'damageProfile')).toBe(true);
    });

    it('appends injected effects and logs attributions', () => {
      const mod: AbilityModifier = {
        id: 'toxic_coating',
        name: 'Toxic Coating',
        appendEffects: [
          {
            type: 'CONDITION',
            conditionType: 'POISON',
            durationTurns: 2
          }
        ]
      };

      const eff = getEffectiveAbility(baseAbility, [mod]);
      expect(eff.effects).toHaveLength(2);
      expect(eff.effects[1].type).toBe('CONDITION');
      expect(eff.attributions.some((a) => a.property === 'effects')).toBe(true);
    });
  });
});
