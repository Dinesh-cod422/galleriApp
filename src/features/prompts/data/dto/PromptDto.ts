import { type Timestamp } from '@infra/firebase/firebaseClient';

/** Mirrors the Firestore document exactly. Never leaves the data layer. */
export type PromptDto = {
  title: string;
  titleLower: string;
  searchTokens: string[];
  prompt: string;
  sourceUrl?: string | null;
  imageUrl: string;
  thumbnailUrl: string;
  blurHash: string | null;
  categoryId: string;
  categoryName: string;
  tags: string[];
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  stats: {
    likesCount: number;
    viewsCount: number;
    copiesCount: number;
    favoritesCount: number;
    sharesCount: number;
  };
  flags: { isFeatured: boolean; isTrending: boolean };
  trendingScore: number;
  status: string;
  metadata: {
    model: string;
    modelVersion: string;
    negativePrompt: string | null;
    aspectRatio: string;
    resolution: { width: number; height: number };
    style: string | null;
    generationParameters: Record<string, string | number | boolean>;
  };

  /**
   * NULLABLE ON PURPOSE. serverTimestamp() resolves to null in the local
   * snapshot until the server acknowledges the write, so a document read back
   * immediately after writing has null here. Typing these as `Timestamp` is the
   * single most common Firestore bug in React Native apps.
   */
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  publishedAt: Timestamp | null;
};
