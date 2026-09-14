import { type Timestamp } from '@infra/firebase/firebaseClient';
import { authorId, categoryId, promptId } from '@core/types/branded';

import {
  type PromptDetail,
  type PromptListItem,
  type PromptMetadata,
  type PromptStats,
} from '../../domain/entities/Prompt';
import { type PromptDto } from '../dto/PromptDto';

/** Timestamp -> ISO string. Null (pending server write) falls back to now. */
const toIso = (value: Timestamp | null): string =>
  value ? value.toDate().toISOString() : new Date().toISOString();

/** '3:2' -> 1.5. Parsed once here so no card parses a string while scrolling. */
export const parseAspectRatio = (ratio: string, fallback = 1): number => {
  const [w, h] = ratio.split(':').map(Number);
  if (w === undefined || h === undefined || !Number.isFinite(w) || !Number.isFinite(h) || h === 0) {
    return fallback;
  }
  return w / h;
};

const toStats = (dto: PromptDto): PromptStats => ({
  likesCount: dto.stats?.likesCount ?? 0,
  viewsCount: dto.stats?.viewsCount ?? 0,
  copiesCount: dto.stats?.copiesCount ?? 0,
  favoritesCount: dto.stats?.favoritesCount ?? 0,
  // Defaults to 0: documents written before this counter existed have no field.
  sharesCount: dto.stats?.sharesCount ?? 0,
});

const toMetadata = (dto: PromptDto): PromptMetadata => ({
  model: dto.metadata?.model ?? 'Unknown',
  modelVersion: dto.metadata?.modelVersion ?? '',
  negativePrompt: dto.metadata?.negativePrompt ?? null,
  aspectRatio: dto.metadata?.aspectRatio ?? '1:1',
  resolution: dto.metadata?.resolution ?? { width: 0, height: 0 },
  style: dto.metadata?.style ?? null,
  generationParameters: dto.metadata?.generationParameters ?? {},
});

export const toPromptListItem = (id: string, dto: PromptDto): PromptListItem => ({
  id: promptId(id),
  title: dto.title,
  thumbnailUrl: dto.thumbnailUrl,
  blurHash: dto.blurHash ?? null,
  aspectRatio: parseAspectRatio(dto.metadata?.aspectRatio ?? '1:1'),
  categoryId: categoryId(dto.categoryId),
  categoryName: dto.categoryName,
  author: {
    id: authorId(dto.authorId),
    name: dto.authorName,
    avatarUrl: dto.authorAvatarUrl ?? null,
  },
  stats: toStats(dto),
  isFeatured: dto.flags?.isFeatured ?? false,
  isTrending: dto.flags?.isTrending ?? false,
  // publishedAt is what the gallery sorts by; createdAt is when the draft began.
  createdAt: toIso(dto.publishedAt ?? dto.createdAt),
});

export const toPromptDetail = (id: string, dto: PromptDto): PromptDetail => ({
  ...toPromptListItem(id, dto),
  prompt: dto.prompt,
  imageUrl: dto.imageUrl,
  sourceUrl: dto.sourceUrl ?? null,
  tags: dto.tags ?? [],
  metadata: toMetadata(dto),
  updatedAt: toIso(dto.updatedAt),
});
