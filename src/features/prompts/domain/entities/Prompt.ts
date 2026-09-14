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
  readonly imageUrl: string;
  /**
   * Permalink to the post this prompt was published from, or null.
   * Attribution only — it is a web page, never an image source.
   */
  readonly sourceUrl: string | null;
  readonly tags: readonly string[];
  readonly metadata: PromptMetadata;
  readonly updatedAt: string;
};
