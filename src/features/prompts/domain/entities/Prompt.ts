import { type AuthorId, type CategoryId, type PromptId } from '@core/types/branded';

export type PromptStatus = 'draft' | 'pending' | 'published' | 'rejected' | 'removed';

export type PromptAuthorRef = {
  readonly id: AuthorId;
  readonly name: string;
  readonly avatarUrl: string | null;
};

export type PromptStats = {
  readonly likesCount: number;
  readonly viewsCount: number;
  readonly copiesCount: number;
  readonly favoritesCount: number;
  readonly sharesCount: number;
};

export type PromptMetadata = {
  readonly model: string;
  readonly modelVersion: string;
  readonly negativePrompt: string | null;
  readonly aspectRatio: string;
  readonly resolution: { readonly width: number; readonly height: number };
  readonly style: string | null;
  readonly generationParameters: Readonly<Record<string, string | number | boolean>>;
};

/**
 * One picture belonging to a prompt.
 *
 * A prompt can have more than one — a before/after pair for an enhancement
 * prompt, or the male and female takes on a "unisex" pose — and the array is
 * what keeps them together instead of forcing a second, fake prompt per image.
 */
export type PromptImage = {
  readonly url: string;
  readonly thumbnailUrl: string;
  readonly width: number;
  readonly height: number;
  /** Width / height, already divided, for the same reason as below. */
  readonly aspectRatio: number;
};

/**
 * Everything a gallery card renders — and nothing more.
 *
 * `imageUrl` is deliberately absent: a card physically cannot pull a 2048px
 * image into a scrolling grid, because the type does not expose one.
 */
export type PromptListItem = {
  readonly id: PromptId;
  readonly title: string;
  readonly thumbnailUrl: string;
  readonly blurHash: string | null;
  /** Parsed from '3:2' to 1.5 so layout never parses strings during render. */
  readonly aspectRatio: number;
  readonly categoryId: CategoryId;
  readonly categoryName: string;
  readonly author: PromptAuthorRef;
  readonly stats: PromptStats;
  readonly isFeatured: boolean;
  readonly isTrending: boolean;
  /** ISO-8601. No Firestore Timestamp ever reaches this layer. */
  readonly createdAt: string;
};

/**
 * Structurally a superset of PromptListItem, which is what lets the detail
 * screen seed itself from a cached list item and paint on the first frame.
 */
export type PromptDetail = PromptListItem & {
  readonly prompt: string;
  /** The primary image. Always equal to `images[0].url`. */
  readonly imageUrl: string;
  /**
   * Every picture for this prompt, primary first. NEVER empty: a prompt with a
   * single image still has a one-element array, so callers never branch on
   * "array or scalar" — only on `length > 1` when they want a gallery.
   */
  readonly images: readonly PromptImage[];
  /**
   * Permalink to the post this prompt was published from, or null.
   * Attribution only — it is a web page, never an image source.
   */
  readonly sourceUrl: string | null;
  readonly tags: readonly string[];
  readonly metadata: PromptMetadata;
  readonly updatedAt: string;
};
