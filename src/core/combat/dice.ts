/**
 * Dice rolling contracts and implementations for combat resolution.
 */

export type RollAdvantage = 'ADVANTAGE' | 'NORMAL';

export interface DiceRoller {
  /** Rolls a 20-sided die (1 to 20), optionally with Advantage */
  rollD20(advantage?: RollAdvantage): number;
  /** Rolls count dice with sides (e.g. 1d6, 2d4) and sums the result */
  rollDice(count: number, sides: number): number;
}

/**
 * Deterministic 32-bit Mulberry32 PRNG.
 */
export class SeededDiceRoller implements DiceRoller {
  private state: number;

  constructor(seed = 1337) {
    this.state = seed;
  }

  private next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  private singleD20(): number {
    return Math.floor(this.next() * 20) + 1;
  }

  public rollD20(advantage: RollAdvantage = 'NORMAL'): number {
    if (advantage === 'ADVANTAGE') {
      const r1 = this.singleD20();
      const r2 = this.singleD20();
      return Math.max(r1, r2);
    }
    return this.singleD20();
  }

  public rollDice(count: number, sides: number): number {
    if (count <= 0 || sides <= 0) return 0;
    let total = 0;
    for (let i = 0; i < count; i++) {
      total += Math.floor(this.next() * sides) + 1;
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
    return this.d20Queue.shift() ?? 10;
  }

  public rollDice(count: number, sides: number): number {
    return this.damageQueue.shift() ?? Math.floor(count * (sides / 2));
  }
}
