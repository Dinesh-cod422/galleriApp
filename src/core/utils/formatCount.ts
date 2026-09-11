/**
 * 1_234 → "1.2K". Called once per prompt in a mapper, never during render,
 * so list cells do zero string work while scrolling.
 */
export const formatCount = (value: number): string => {
  if (!Number.isFinite(value) || value < 0) {
    return '0';
  }
  if (value < 1_000) {
    return String(Math.round(value));
  }
  if (value < 1_000_000) {
    return `${trimZero(value / 1_000)}K`;
  }
  return `${trimZero(value / 1_000_000)}M`;
};

const trimZero = (value: number): string => {
  const fixed = value.toFixed(1);
  return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
};
