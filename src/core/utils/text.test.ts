import { normalizeForSearch } from './text';

describe('normalizeForSearch', () => {
  it('folds case, accents and surrounding whitespace', () => {
    expect(normalizeForSearch('  Café  ')).toBe('cafe');
    expect(normalizeForSearch('ÉTÉ')).toBe('ete');
  });

  it('is idempotent', () => {
    const once = normalizeForSearch('Piñata');
    expect(normalizeForSearch(once)).toBe(once);
  });
});
