/**
 * Diacritic- and case-insensitive normalization used by search. Lives in core
 * because both the search feature and the prompts data source need it.
 */
export const normalizeForSearch = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
