import { chunk, sortedBy, uniqueBy } from './array';

describe('array utils', () => {
  it('sortedBy does not mutate its input', () => {
    const input = [3, 1, 2];
    const result = sortedBy(input, (a, b) => a - b);
    expect(result).toEqual([1, 2, 3]);
    expect(input).toEqual([3, 1, 2]);
  });

  it('chunks evenly and handles a ragged tail', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 3)).toEqual([]);
    expect(chunk([1, 2], 0)).toEqual([]);
  });

  it('uniqueBy keeps the first occurrence and preserves order', () => {
    const items = [
      { id: 'a', n: 1 },
      { id: 'b', n: 2 },
      { id: 'a', n: 3 },
    ];
    expect(uniqueBy(items, i => i.id).map(i => i.n)).toEqual([1, 2]);
  });
});
