/**
 * Dice rolling contracts and implementations for combat resolution.
 */

import { createRng } from '../prng';
export type RollAdvantage = 'ADVANTAGE' | 'DISADVANTAGE' | 'NORMAL';

export interface D20RollDetails {
  readonly rolls: readonly number[];
  readonly kept: number;
}

export interface DiceRoller {
  /** Rolls a 20-sided die (1 to 20), optionally with Advantage or Disadvantage */
  rollD20(advantage?: RollAdvantage): number;
  /** Rolls count dice with sides (e.g. 1d6, 2d4) and sums the result */
  rollDice(count: number, sides: number): number;
  /** Optional detailed roll returning both candidate rolls for Advantage/Disadvantage */
  rollD20Detailed?(advantage?: RollAdvantage): D20RollDetails;
  /** Optional detailed damage dice returning individual die values */
  rollIndividualDice?(count: number, sides: number): number[];
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
    return this.rollD20Detailed(advantage).kept;
  }

  public rollD20Detailed(advantage: RollAdvantage = 'NORMAL'): D20RollDetails {
    if (advantage === 'ADVANTAGE') {
      const r1 = this.singleD20();
      const r2 = this.singleD20();
      return { rolls: [r1, r2], kept: Math.max(r1, r2) };
    }
    if (advantage === 'DISADVANTAGE') {
      const r1 = this.singleD20();
      const r2 = this.singleD20();
      return { rolls: [r1, r2], kept: Math.min(r1, r2) };
    }
    const r = this.singleD20();
    return { rolls: [r], kept: r };
  }

  public rollDice(count: number, sides: number): number {
    const rolls = this.rollIndividualDice(count, sides);
    return rolls.reduce((sum, val) => sum + val, 0);
  }

  public rollIndividualDice(count: number, sides: number): number[] {
    if (count <= 0 || sides <= 0) return [];
    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
      rolls.push(Math.floor(this.rng() * sides) + 1);
    }
    return rolls;
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
    return this.rollD20Detailed(advantage).kept;
  }

  public rollD20Detailed(advantage: RollAdvantage = 'NORMAL'): D20RollDetails {
    if (advantage === 'ADVANTAGE') {
      const r1 = this.d20Queue.shift() ?? 10;
      const r2 = this.d20Queue.shift() ?? 10;
      return { rolls: [r1, r2], kept: Math.max(r1, r2) };
    }
    if (advantage === 'DISADVANTAGE') {
      const r1 = this.d20Queue.shift() ?? 10;
      const r2 = this.d20Queue.shift() ?? 10;
      return { rolls: [r1, r2], kept: Math.min(r1, r2) };
    }
    const r = this.d20Queue.shift() ?? 10;
    return { rolls: [r], kept: r };
  }

  public rollDice(count: number, sides: number): number {
    return this.damageQueue.shift() ?? Math.floor(count * (sides / 2));
  }

  public rollIndividualDice(count: number, sides: number): number[] {
    if (count <= 0 || sides <= 0) return [];
    const total = this.rollDice(count, sides);
    if (count === 1) return [total];
    const base = Math.floor(total / count);
    const remainder = total % count;
    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
      rolls.push(base + (i < remainder ? 1 : 0));
    }
    return rolls;
  }
}
