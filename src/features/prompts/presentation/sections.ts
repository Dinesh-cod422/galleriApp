import { type IconName } from '@ds';

import { type PromptSort } from '../domain/repositories/PromptRepository';

export type PromptSectionDef = {
  readonly sort: PromptSort;
  readonly title: string;
  /**
   * The section's mark. Four strips of identical-looking cards differ only by
   * their heading, so the glyph is what distinguishes them at a glance.
   */
  readonly icon: IconName;
  /** Shown on the full page when the section has nothing in it. */
  readonly emptyDescription: string;
};

/**
 * The strips under a prompt, in order.
 *
 * Declared once and shared by the detail screen and the full-page screen, so a
 * section's title cannot say "Most copied" in the rail and something else in
 * the header it navigates to.
 */
export const DETAIL_SECTIONS: readonly PromptSectionDef[] = [
  {
    sort: 'mostCopied',
    title: 'Most copied',
    icon: 'copy',
    emptyDescription: 'No prompts have been copied yet.',
  },
  {
    sort: 'mostShared',
    title: 'Most shared',
    icon: 'share',
    emptyDescription: 'No prompts have been shared yet.',
  },
  {
    sort: 'trending',
    title: 'Trending',
    icon: 'flame',
    emptyDescription: 'Nothing is trending right now.',
  },
  {
    sort: 'newest',
    title: 'Newly added',
    icon: 'sparkles',
    emptyDescription: 'Once prompts are published they will appear here.',
  },
];

export const sectionForSort = (sort: PromptSort): PromptSectionDef | undefined =>
  DETAIL_SECTIONS.find(section => section.sort === sort);

export type FeedSortOption = {
  readonly sort: PromptSort;
  readonly title: string;
  readonly icon: IconName;
  /** One line under the title, saying what the ordering actually means. */
  readonly description: string;
};

/**
 * What the feed can be ordered by, in the order the filter sheet lists them.
 *
 * Separate from DETAIL_SECTIONS on purpose, and not derived from it: the rails
 * under a prompt are a curated set of four, while this is every ordering the
 * repository supports — including `featured`, which is an editorial shelf
 * rather than a strip worth repeating under every prompt.
 */
export const FEED_SORTS: readonly FeedSortOption[] = [
  {
    sort: 'newest',
    title: 'Newest',
    icon: 'sparkles',
    description: 'Most recently published first',
  },
  {
    sort: 'trending',
    title: 'Trending',
    icon: 'flame',
    description: 'Gaining attention right now',
  },
  {
    sort: 'featured',
    title: 'Featured',
    icon: 'grid',
    description: 'Hand-picked prompts',
  },
  {
    sort: 'mostCopied',
    title: 'Most copied',
    icon: 'copy',
    description: 'What people actually use',
  },
  {
    sort: 'mostShared',
    title: 'Most shared',
    icon: 'share',
    description: 'What people pass on',
  },
];

/** The ordering the feed uses until someone chooses otherwise. */
export const DEFAULT_FEED_SORT: PromptSort = 'newest';
