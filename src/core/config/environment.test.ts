import { describe, it, expect } from 'vitest';
import { isLocalhost } from './environment';

describe('isLocalhost', () => {
  it('returns true for localhost hostnames', () => {
    expect(isLocalhost('localhost')).toBe(true);
    expect(isLocalhost('127.0.0.1')).toBe(true);
    expect(isLocalhost('[::1]')).toBe(true);
    expect(isLocalhost('subdomain.localhost')).toBe(true);
    expect(isLocalhost('LOCALHOST')).toBe(true);
  });

  it('returns false for public / deployment hostnames', () => {
    expect(isLocalhost('anthonymarzotto.github.io')).toBe(false);
    expect(isLocalhost('astral-tactics.com')).toBe(false);
    expect(isLocalhost('staging.rpg-game.net')).toBe(false);
    expect(isLocalhost('192.168.1.100')).toBe(false);
  });

  it('defaults to true in non-browser or empty-hostname test environments', () => {
    expect(isLocalhost('')).toBe(false);
    // When called with no arguments in test environment
    expect(isLocalhost()).toBe(true);
  });
});
