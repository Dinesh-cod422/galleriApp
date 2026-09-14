import { QueryClient } from '@tanstack/react-query';

import { authorId, categoryId, promptId } from '@core/types/branded';

import { type PromptListItem } from '../../domain/entities/Prompt';
import { findCachedPrompt } from './promptPlaceholder';
import { promptKeys } from './queryKeys';

const listItem = (id: string): PromptListItem => ({
  id: promptId(id),
  title: 'Neon rain over Shibuya',
  thumbnailUrl: `https://example.test/${id}-thumb.webp`,
  blurHash: null,
  aspectRatio: 1.5,
  categoryId: categoryId('photography'),
  categoryName: 'Photography',
  author: { id: authorId('a1'), name: 'Ada', avatarUrl: null },
  stats: { likesCount: 1200, viewsCount: 18000, copiesCount: 40, favoritesCount: 90, sharesCount: 30 },
  isFeatured: true,
  isTrending: false,
  createdAt: '2026-08-01T00:00:00.000Z',
});

/**
 * `gcTime: Infinity` so no garbage-collection timer is scheduled. These tests
 * never mount a query, so a default 5-minute gc timeout would sit in the event
 * loop and keep the Jest worker alive after the assertions finish.
 */
const makeClient = (): QueryClient =>
  new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });

const infinitePage = (items: readonly PromptListItem[]) => ({
  pages: [{ items, nextCursor: null }],
  pageParams: [null],
});

describe('findCachedPrompt', () => {
  it('seeds the first paint from the feed the user just scrolled', () => {
    const client = makeClient();
    client.setQueryData(promptKeys.list('newest'), infinitePage([listItem('p1')]));

    const seeded = findCachedPrompt(client, 'p1');

    expect(seeded?.title).toBe('Neon rain over Shibuya');
    expect(seeded?.stats.likesCount).toBe(1200);
  });

  it('paints the cached thumbnail rather than nothing, pending the full image', () => {
    const client = makeClient();
    client.setQueryData(promptKeys.list('newest'), infinitePage([listItem('p1')]));

    expect(findCachedPrompt(client, 'p1')?.imageUrl).toBe('https://example.test/p1-thumb.webp');
  });

  it('leaves the prompt body empty instead of inventing one', () => {
    // The detail screen keys its shimmer off this: a plausible fake would flash
    // wrong text and then correct itself.
    const client = makeClient();
    client.setQueryData(promptKeys.list('newest'), infinitePage([listItem('p1')]));

    const seeded = findCachedPrompt(client, 'p1');
    expect(seeded?.prompt).toBe('');
    expect(seeded?.tags).toEqual([]);
  });

  it('finds a prompt cached under a category feed, not just the main one', () => {
    const client = makeClient();
    client.setQueryData(promptKeys.list('newest', categoryId('photography')), infinitePage([listItem('p7')]));

    expect(findCachedPrompt(client, 'p7')?.id).toBe('p7');
  });

  it('returns undefined on a cold open so the screen shows its real loading state', () => {
    expect(findCachedPrompt(makeClient(), 'p1')).toBeUndefined();
  });

  it('ignores cache entries that are not prompt pages', () => {
    const client = makeClient();
    client.setQueryData(promptKeys.lists(), { nonsense: true });
    client.setQueryData(promptKeys.search('x'), null);
    client.setQueryData(promptKeys.list('newest'), infinitePage([listItem('p1')]));

    expect(findCachedPrompt(client, 'p1')?.id).toBe('p1');
    expect(findCachedPrompt(client, 'nope')).toBeUndefined();
  });

  it('does not read the detail cache, which holds a different shape', () => {
    const client = makeClient();
    client.setQueryData(promptKeys.detail('p1'), { id: 'p1', items: [listItem('p1')] });

    expect(findCachedPrompt(client, 'p1')).toBeUndefined();
  });
});
