import { authorId, categoryId, promptId } from '@core/types/branded';

import { type PromptListItem } from '../../domain/entities/Prompt';
import { toPromptBadge, toPromptCardVm } from './toPromptCardVm';

const NOW = Date.parse('2026-09-13T12:00:00.000Z');
const daysAgo = (n: number): string => new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString();

const item = (overrides: Partial<PromptListItem> = {}): PromptListItem => ({
  id: promptId('p1'),
  title: 'Neon rain over Shibuya',
  thumbnailUrl: 'https://example.test/t.webp',
  blurHash: null,
  aspectRatio: 1.5,
  categoryId: categoryId('photography'),
  categoryName: 'Photography',
  author: { id: authorId('a1'), name: 'Ada', avatarUrl: null },
  stats: { likesCount: 1200, viewsCount: 18000, copiesCount: 40, favoritesCount: 90, sharesCount: 30 },
  isFeatured: false,
  isTrending: false,
  createdAt: daysAgo(40),
  ...overrides,
});

describe('toPromptBadge', () => {
  it('tags nothing when a prompt carries no signal', () => {
    expect(toPromptBadge(item(), NOW)).toBeNull();
  });

  it('tags a just-posted prompt as new when it has no other claim', () => {
    expect(toPromptBadge(item({ createdAt: daysAgo(1) }), NOW)).toEqual({
      label: 'New',
      tone: 'fresh',
    });
  });

  it('stops calling a prompt new once the window has passed', () => {
    expect(toPromptBadge(item({ createdAt: daysAgo(3) }), NOW)).toBeNull();
  });

  it('shows the strongest editorial signal when a prompt carries several', () => {
    // Only one tag fits, so the editorial flags outrank recency — the feed is
    // already sorted newest-first, which makes "New" near the top redundant.
    const everything = { isFeatured: true, isTrending: true, createdAt: daysAgo(1) };
    expect(toPromptBadge(item(everything), NOW)?.label).toBe('Featured');
    expect(toPromptBadge(item({ isTrending: true, createdAt: daysAgo(1) }), NOW)?.label).toBe(
      'Trending',
    );
    expect(toPromptBadge(item({ isTrending: true }), NOW)?.label).toBe('Trending');
  });

  it('gives each tag its own tone so the grid is readable without reading', () => {
    const tones = [
      toPromptBadge(item({ createdAt: daysAgo(1) }), NOW)?.tone,
      toPromptBadge(item({ isFeatured: true }), NOW)?.tone,
      toPromptBadge(item({ isTrending: true }), NOW)?.tone,
    ];
    expect(new Set(tones).size).toBe(3);
  });

  it('yields no tag on an unparseable date rather than claiming new', () => {
    expect(toPromptBadge(item({ createdAt: 'not-a-date' }), NOW)).toBeNull();
  });
});

describe('toPromptCardVm', () => {
  it('formats counts and dates once, off the render path', () => {
    const vm = toPromptCardVm(item({ createdAt: daysAgo(1) }), NOW);

    expect(vm.likesLabel).toBe('1.2K');
    expect(vm.viewsLabel).toBe('18K');
    expect(vm.dateLabel).toBeTruthy();
    expect(vm.badge).toEqual({ label: 'New', tone: 'fresh' });
  });
});
