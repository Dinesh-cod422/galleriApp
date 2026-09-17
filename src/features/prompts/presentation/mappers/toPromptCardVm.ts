import { formatCount } from '@core/utils/formatCount';
import { formatRelativeDate } from '@core/utils/formatRelativeDate';
import { type BadgeTone } from '@ds';

import { type PromptListItem } from '../../domain/entities/Prompt';

export type PromptBadge = {
  readonly label: string;
  readonly tone: BadgeTone;
};

/** A prompt reads as "just posted" for two days. */
const FRESH_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * At most ONE tag per card, strongest editorial signal first.
 *
 * Stacking every flag a prompt happens to carry is exactly what made the old
 * single "Trending" pill meaningless — it landed on half the grid, so it told
 * you nothing about any particular prompt. Picking one keeps a tag worth
 * reading; the distinct colour per tag is what makes it legible at a glance,
 * without stopping to parse the word.
 *
 * "New" is LAST despite being the scarcest-looking signal. The feed is sorted
 * newest-first, so recency is already encoded in a card's POSITION, and a "New"
 * pill near the top of the list only restates what the reader can already see.
 * It earns its place solely on a just-posted prompt that has no other claim to
 * attention — which is why it does not appear at all in the sample data.
 */
export const toPromptBadge = (item: PromptListItem, now = Date.now()): PromptBadge | null => {
  if (item.isFeatured) {
    return { label: 'Featured', tone: 'featured' };
  }
  if (item.isTrending) {
    return { label: 'Trending', tone: 'trending' };
  }
  // NaN comparisons are false, so an unparseable date simply yields no tag
  // rather than claiming the prompt is brand new.
  if (now - Date.parse(item.createdAt) < FRESH_WINDOW_MS) {
    return { label: 'New', tone: 'fresh' };
  }
  return null;
};

/**
 * UI-shaped view model. Counts and dates are formatted ONCE here rather than
 * inside a card's render, so scrolling a long grid does no string work.
 */
export type PromptCardVm = {
  readonly id: string;
  readonly title: string;
  readonly thumbnailUrl: string;
  readonly aspectRatio: number;
  readonly authorName: string;
  readonly authorAvatarUrl: string | null;
  readonly categoryName: string;
  readonly viewsLabel: string;
  readonly dateLabel: string;
  readonly badge: PromptBadge | null;
};

export const toPromptCardVm = (item: PromptListItem, now = Date.now()): PromptCardVm => ({
  id: item.id,
  title: item.title,
  thumbnailUrl: item.thumbnailUrl,
  aspectRatio: item.aspectRatio,
  authorName: item.author.name,
  authorAvatarUrl: item.author.avatarUrl,
  categoryName: item.categoryName,
  viewsLabel: formatCount(item.stats.viewsCount),
  dateLabel: formatRelativeDate(item.createdAt, now),
  badge: toPromptBadge(item, now),
});
