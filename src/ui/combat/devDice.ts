import { DiceRoller, RollAdvantage, D20RollDetails } from '../../core/combat/dice';

export type DiceMode = 'NORMAL' | 'FORCE_CRIT' | 'FORCE_GRAZE' | 'FORCE_MISS';

/**
 * Developer dice roller allowing deterministic roll overrides for visual testing.
 */
export class DevDiceRoller implements DiceRoller {
  constructor(private readonly mode: DiceMode) {}

  public rollD20(advantage: RollAdvantage = 'NORMAL'): number {
    return this.rollD20Detailed(advantage).kept;
  }

  public rollD20Detailed(advantage: RollAdvantage = 'NORMAL'): D20RollDetails {
    if (this.mode === 'FORCE_CRIT') return { rolls: [20], kept: 20 };
    if (this.mode === 'FORCE_MISS') return { rolls: [2], kept: 2 };
    if (this.mode === 'FORCE_GRAZE') return { rolls: [7], kept: 7 };

    const single = () => Math.floor(Math.random() * 20) + 1;
    if (advantage === 'ADVANTAGE') {
      const r1 = single();
      const r2 = single();
      return { rolls: [r1, r2], kept: Math.max(r1, r2) };
    }
    if (advantage === 'DISADVANTAGE') {
      const r1 = single();
      const r2 = single();
      return { rolls: [r1, r2], kept: Math.min(r1, r2) };
    }
    const r = single();
    return { rolls: [r], kept: r };
  }

  public rollDice(count: number, sides: number): number {
    const rolls = this.rollIndividualDice(count, sides);
    return rolls.reduce((sum, val) => sum + val, 0);
  }

  public rollIndividualDice(count: number, sides: number): number[] {
    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
      rolls.push(Math.floor(Math.random() * sides) + 1);
    }
    return rolls;
  }
}
