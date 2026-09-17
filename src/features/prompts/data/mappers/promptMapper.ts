import { type Timestamp } from '@infra/firebase/firebaseClient';
import { authorId, categoryId, promptId } from '@core/types/branded';

import {
  type PromptDetail,
  type PromptImage,
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

/**
 * The image's own pixels beat the '4:5' label, which is only ever the NEAREST
 * standard ratio. A 1103x1426 file is 0.774, not 0.8 — small, but it is the
 * difference between the detail hero keeping the height the grid reserved for
 * it and visibly resizing the moment the real document lands.
 */
const layoutAspectRatio = (dto: PromptDto): number => {
  const { width = 0, height = 0 } = dto.metadata?.resolution ?? {};
  if (width > 0 && height > 0) {
    return width / height;
  }
  return parseAspectRatio(dto.metadata?.aspectRatio ?? '1:1');
};

export const toPromptListItem = (id: string, dto: PromptDto): PromptListItem => ({
  id: promptId(id),
  title: dto.title,
  thumbnailUrl: dto.thumbnailUrl,
  blurHash: dto.blurHash ?? null,
  aspectRatio: layoutAspectRatio(dto),
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

/**
 * Primary first, and never empty.
 *
 * A document from before multi-image support has no `images`, so one is
 * synthesised from the scalar fields — which keeps every consumer on a single
 * code path instead of testing for the field's existence.
 */
const toImages = (dto: PromptDto): PromptImage[] => {
  // The SAME number the list item lays out with, or the hero resizes when the
  // real document replaces the cached placeholder.
  const fallbackAspect = layoutAspectRatio(dto);
  const declared = dto.images ?? [];
  if (declared.length === 0) {
    return [
      {
        url: dto.imageUrl,
        thumbnailUrl: dto.thumbnailUrl,
        width: dto.metadata?.resolution?.width ?? 0,
        height: dto.metadata?.resolution?.height ?? 0,
        aspectRatio: fallbackAspect,
      },
    ];
  }
  return declared.map(image => ({
    url: image.url,
    thumbnailUrl: image.thumbnailUrl,
    width: image.width,
    height: image.height,
    aspectRatio:
      image.width > 0 && image.height > 0 ? image.width / image.height : fallbackAspect,
  }));
};

export const toPromptDetail = (id: string, dto: PromptDto): PromptDetail => ({
  ...toPromptListItem(id, dto),
  prompt: dto.prompt,
  imageUrl: dto.imageUrl,
  images: toImages(dto),
  sourceUrl: dto.sourceUrl ?? null,
  tags: dto.tags ?? [],
  metadata: toMetadata(dto),
  updatedAt: toIso(dto.updatedAt),
});
