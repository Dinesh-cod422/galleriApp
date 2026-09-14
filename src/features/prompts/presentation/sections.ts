import { type PromptSort } from '../domain/repositories/PromptRepository';

export type PromptSectionDef = {
  readonly sort: PromptSort;
  readonly title: string;
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
    emptyDescription: 'No prompts have been copied yet.',
  },
  {
    sort: 'mostShared',
    title: 'Most shared',
    emptyDescription: 'No prompts have been shared yet.',
  },
  {
    sort: 'trending',
    title: 'Trending',
    emptyDescription: 'Nothing is trending right now.',
  },
  {
    sort: 'newest',
    title: 'Newly added',
    emptyDescription: 'Once prompts are published they will appear here.',
  },
];

export const sectionForSort = (sort: PromptSort): PromptSectionDef | undefined =>
  DETAIL_SECTIONS.find(section => section.sort === sort);
