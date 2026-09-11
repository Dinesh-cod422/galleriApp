/** Non-mutating sort — Array.prototype.sort mutates, which corrupts mock data. */
export const sortedBy = <T>(items: readonly T[], compare: (a: T, b: T) => number): T[] =>
  [...items].sort(compare);

export const chunk = <T>(items: readonly T[], size: number): T[][] => {
  if (size <= 0) {
    return [];
  }
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
};

export const uniqueBy = <T, K>(items: readonly T[], key: (item: T) => K): T[] => {
  const seen = new Set<K>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(item);
    }
  }
  return out;
};
