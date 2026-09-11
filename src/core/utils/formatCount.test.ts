import { formatCount } from './formatCount';

describe('formatCount', () => {
  it('leaves small numbers alone', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(7)).toBe('7');
    expect(formatCount(999)).toBe('999');
  });

  it('abbreviates thousands and drops a trailing .0', () => {
    expect(formatCount(1_000)).toBe('1K');
    expect(formatCount(1_234)).toBe('1.2K');
    expect(formatCount(12_800)).toBe('12.8K');
  });

  it('abbreviates millions', () => {
    expect(formatCount(1_000_000)).toBe('1M');
    expect(formatCount(2_450_000)).toBe('2.5M');
  });

  it('does not produce junk for invalid input', () => {
    expect(formatCount(Number.NaN)).toBe('0');
    expect(formatCount(-5)).toBe('0');
  });
});
