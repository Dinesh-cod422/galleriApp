import { formatRelativeDate } from './formatRelativeDate';

const NOW = Date.parse('2026-09-11T12:00:00.000Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe('formatRelativeDate', () => {
  it('buckets recent timestamps', () => {
    expect(formatRelativeDate(ago(30_000), NOW)).toBe('just now');
    expect(formatRelativeDate(ago(5 * 60_000), NOW)).toBe('5m ago');
    expect(formatRelativeDate(ago(3 * 3_600_000), NOW)).toBe('3h ago');
    expect(formatRelativeDate(ago(2 * 86_400_000), NOW)).toBe('2d ago');
    expect(formatRelativeDate(ago(10 * 86_400_000), NOW)).toBe('1w ago');
  });

  it('falls back to a date beyond four weeks', () => {
    expect(formatRelativeDate(ago(60 * 86_400_000), NOW)).not.toMatch(/ago/);
  });

  it('returns empty string for an unparseable date rather than throwing', () => {
    expect(formatRelativeDate('not-a-date', NOW)).toBe('');
  });

  it('never reports a negative duration for a future date', () => {
    expect(formatRelativeDate(new Date(NOW + 60_000).toISOString(), NOW)).toBe('just now');
  });
});
