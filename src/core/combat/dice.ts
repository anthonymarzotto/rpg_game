/**
 * Dice rolling contracts and implementations for combat resolution.
 */

import { createRng } from '../prng';
export type RollAdvantage = 'ADVANTAGE' | 'DISADVANTAGE' | 'NORMAL';

export interface DiceRoller {
  /** Rolls a 20-sided die (1 to 20), optionally with Advantage or Disadvantage */
  rollD20(advantage?: RollAdvantage): number;
  /** Rolls count dice with sides (e.g. 1d6, 2d4) and sums the result */
  rollDice(count: number, sides: number): number;
}

/**
 * Deterministic dice roller powered by Mulberry32 PRNG.
 */
export class SeededDiceRoller implements DiceRoller {
  private rng: () => number;

  constructor(seed = 1337) {
    this.rng = createRng(seed);
  }

  private singleD20(): number {
    return Math.floor(this.rng() * 20) + 1;
  }

  public rollD20(advantage: RollAdvantage = 'NORMAL'): number {
    if (advantage === 'ADVANTAGE') {
      const r1 = this.singleD20();
      const r2 = this.singleD20();
      return Math.max(r1, r2);
    }
    if (advantage === 'DISADVANTAGE') {
      const r1 = this.singleD20();
      const r2 = this.singleD20();
      return Math.min(r1, r2);
    }
    return this.singleD20();
  }

  public rollDice(count: number, sides: number): number {
    if (count <= 0 || sides <= 0) return 0;
    let total = 0;
    for (let i = 0; i < count; i++) {
      total += Math.floor(this.rng() * sides) + 1;
    }
    return total;
  }
}

/**
 * Mock dice roller for deterministic unit tests.
 */
export class MockDiceRoller implements DiceRoller {
  private d20Queue: number[] = [];
  private damageQueue: number[] = [];

  constructor(options?: { d20Rolls?: number[]; damageRolls?: number[] }) {
    if (options?.d20Rolls) this.d20Queue = [...options.d20Rolls];
    if (options?.damageRolls) this.damageQueue = [...options.damageRolls];
  }

  public queueD20(roll: number): void {
    this.d20Queue.push(roll);
  }

  public queueDamage(roll: number): void {
    this.damageQueue.push(roll);
  }

  public rollD20(advantage: RollAdvantage = 'NORMAL'): number {
    if (advantage === 'ADVANTAGE') {
      const r1 = this.d20Queue.shift() ?? 10;
      const r2 = this.d20Queue.shift() ?? 10;
      return Math.max(r1, r2);
    }
    if (advantage === 'DISADVANTAGE') {
      const r1 = this.d20Queue.shift() ?? 10;
      const r2 = this.d20Queue.shift() ?? 10;
      return Math.min(r1, r2);
    }
    return this.d20Queue.shift() ?? 10;
  }

  public rollDice(count: number, sides: number): number {
    return this.damageQueue.shift() ?? Math.floor(count * (sides / 2));
  }
}
