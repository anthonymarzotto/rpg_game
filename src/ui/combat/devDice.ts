import { DiceRoller } from '../../core/combat/dice';

export type DiceMode = 'NORMAL' | 'FORCE_CRIT' | 'FORCE_GRAZE' | 'FORCE_MISS';

/**
 * Developer dice roller allowing deterministic roll overrides for visual testing.
 */
export class DevDiceRoller implements DiceRoller {
  constructor(private readonly mode: DiceMode) {}

  public rollD20(): number {
    if (this.mode === 'FORCE_CRIT') return 20;
    if (this.mode === 'FORCE_MISS') return 2;
    if (this.mode === 'FORCE_GRAZE') return 7;
    return Math.floor(Math.random() * 20) + 1;
  }

  public rollDice(count: number, sides: number): number {
    let total = 0;
    for (let i = 0; i < count; i++) {
      total += Math.floor(Math.random() * sides) + 1;
    }
    return total;
  }
}
