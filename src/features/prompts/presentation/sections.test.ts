import { categoryId } from '@core/types/branded';

import { promptKeys } from './hooks/queryKeys';
import { DETAIL_SECTIONS, sectionForSort } from './sections';

describe('DETAIL_SECTIONS', () => {
  it('covers the four strips the detail page shows', () => {
    expect(DETAIL_SECTIONS.map(s => s.sort)).toEqual([
      'mostCopied',
      'mostShared',
      'trending',
      'newest',
    ]);
  });

  it('keys each section on a distinct sort', () => {
    // A duplicate sort would make two rails share a query cache and render the
    // same prompts under different headings.
    const sorts = DETAIL_SECTIONS.map(s => s.sort);
    expect(new Set(sorts).size).toBe(sorts.length);
  });

  it('resolves a sort back to the section, so the rail and its page agree', () => {
    expect(sectionForSort('mostCopied')?.title).toBe('Most copied');
    expect(sectionForSort('featured')).toBeUndefined();
  });
});

describe('promptKeys', () => {
  it('separates each section preview from every other', () => {
    const keys = DETAIL_SECTIONS.map(s => JSON.stringify(promptKeys.section(s.sort)));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('keeps a section preview apart from the full feed for the same sort', () => {
    // They hold different page sizes; sharing a key would let a nine-item
    // preview satisfy the infinite list, or be overwritten by it.
    expect(promptKeys.section('trending')).not.toEqual(promptKeys.list('trending'));
  });

  it('keeps "related" apart from the category feed it links to', () => {
    // Both are "prompts in category X", but related holds ten un-paginated
    // items and the feed holds infinite pages; sharing a key would let one
    // satisfy the other.
    const photography = categoryId('photography');
    expect(promptKeys.related(photography)).not.toEqual(
      promptKeys.list('newest', photography),
    );
  });

  it('gives every category its own related cache', () => {
    expect(promptKeys.related(categoryId('photography'))).not.toEqual(
      promptKeys.related(categoryId('portrait')),
    );
  });

  it('separates the same sort in different categories', () => {
    expect(promptKeys.list('newest', null)).not.toEqual(
      promptKeys.list('newest', categoryId('photography')),
    );
  });
});
