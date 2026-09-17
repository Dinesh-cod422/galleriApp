import { type IconName, type AppTheme } from '@ds';

import { type Category } from '../domain/entities/Category';

/**
 * How a category is marked — its glyph and its hue.
 *
 * Extracted from `CategoryChips` so the chip row and the Explore grid cannot
 * disagree: a category that is a rose heart in the filter row and a violet
 * sparkle two taps later reads as two different categories.
 */

/**
 * Solid, not outlined: at chip and tile sizes a 1.8dp stroke is most of the
 * glyph, and the shapes turn to mush next to their label.
 */
const ICON_BY_NAME: Record<string, IconName> = {
  heart: 'heartFilled',
  user: 'userFilled',
  users: 'usersFilled',
  sparkles: 'sparkles',
};

export type MarkName = keyof AppTheme['colors']['mark'];

/**
 * Keyed by SLUG rather than by icon.
 *
 * Men's and Women's are both `user` in the data, so the icon alone cannot tell
 * them apart — the slug is the only stable key that distinguishes them.
 */
const MARK_BY_SLUG: Record<string, MarkName> = {
  couple: 'rose',
  mens: 'blue',
  womens: 'pink',
  kids: 'amber',
};

export const DEFAULT_MARK: MarkName = 'violet';

/** `null` when the data names an icon this app does not draw. */
export const categoryIcon = (category: Category): IconName | null =>
  ICON_BY_NAME[category.iconName] ?? null;

export const categoryMarkName = (category: Category): MarkName =>
  MARK_BY_SLUG[category.slug] ?? DEFAULT_MARK;

/** The resolved colour, so callers never index the theme themselves. */
export const categoryMarkColor = (category: Category, theme: AppTheme): string =>
  theme.colors.mark[categoryMarkName(category)];
