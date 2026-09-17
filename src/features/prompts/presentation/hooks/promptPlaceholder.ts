import { type QueryClient } from '@tanstack/react-query';

import { type PromptDetail, type PromptListItem } from '../../domain/entities/Prompt';
import { promptKeys } from './queryKeys';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;

/**
 * Every prompt already sitting in a cached feed, whatever shape cached it.
 *
 * Walks both an infinite query's `pages` and a plain single page, because the
 * feed and the rails cache differently and a preview should not care which
 * screen the user arrived from. Anything unrecognised is skipped rather than
 * trusted — cache contents are not a type guarantee.
 */
export const cachedListItems = (client: QueryClient): readonly PromptListItem[] => {
  const items: PromptListItem[] = [];

  for (const [, data] of client.getQueriesData({ queryKey: promptKeys.lists() })) {
    const record = asRecord(data);
    if (record === null) {
      continue;
    }
    const pages = Array.isArray(record.pages) ? record.pages : [record];
    for (const page of pages) {
      const pageRecord = asRecord(page);
      if (pageRecord !== null && Array.isArray(pageRecord.items)) {
        items.push(...(pageRecord.items as PromptListItem[]));
      }
    }
  }

  return items;
};

/**
 * A PromptDetail assembled from a list item the feed already has.
 *
 * Fields the list model does not carry are left EMPTY rather than invented:
 * `prompt: ''` is the signal the detail screen renders a shimmer for, whereas
 * a plausible-looking fake would flash wrong text and then correct itself.
 */
export const toDetailPlaceholder = (item: PromptListItem): PromptDetail => ({
  ...item,
  prompt: '',
  // The thumbnail, upscaled, until the full-resolution file crossfades over it.
  imageUrl: item.thumbnailUrl,
  // One entry, because a list item cannot know about a prompt's other images.
  // The real document replaces this the moment the fetch lands.
  images: [
    {
      url: item.thumbnailUrl,
      thumbnailUrl: item.thumbnailUrl,
      width: 0,
      height: 0,
      aspectRatio: item.aspectRatio,
    },
  ],
  sourceUrl: null,
  tags: [],
  metadata: {
    model: '',
    modelVersion: '',
    negativePrompt: null,
    aspectRatio: '1:1',
    resolution: { width: 0, height: 0 },
    style: null,
    generationParameters: {},
  },
  updatedAt: item.createdAt,
});

/**
 * The first paint for a prompt the user has already seen in a feed, or
 * `undefined` on a cold open (a deep link, or a process restart).
 */
export const findCachedPrompt = (client: QueryClient, id: string): PromptDetail | undefined => {
  const cached = cachedListItems(client).find(item => item.id === id);
  return cached === undefined ? undefined : toDetailPlaceholder(cached);
};
