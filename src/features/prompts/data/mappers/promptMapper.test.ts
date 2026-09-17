import { type Timestamp } from '@infra/firebase/firebaseClient';

import { type PromptDto } from '../dto/PromptDto';
import { parseAspectRatio, toPromptDetail, toPromptListItem } from './promptMapper';

const ts = (iso: string): Timestamp =>
  ({ toDate: () => new Date(iso) }) as unknown as Timestamp;

const dto = (overrides: Partial<PromptDto> = {}): PromptDto => ({
  title: 'Cinematic desert portrait',
  titleLower: 'cinematic desert portrait',
  searchTokens: ['cinematic', 'desert'],
  prompt: 'A cinematic portrait…',
  imageUrl: 'https://cdn/full.webp',
  thumbnailUrl: 'https://cdn/thumb.webp',
  blurHash: null,
  categoryId: 'cat_photography',
  categoryName: 'Photography',
  tags: ['portrait', 'film'],
  authorId: 'usr_mara',
  authorName: 'Mara Vance',
  authorAvatarUrl: 'https://cdn/a.webp',
  stats: { likesCount: 10, viewsCount: 20, copiesCount: 3, favoritesCount: 4, sharesCount: 1 },
  flags: { isFeatured: true, isTrending: false },
  trendingScore: 1.5,
  status: 'published',
  metadata: {
    model: 'Midjourney',
    modelVersion: 'v6.1',
    negativePrompt: 'blurry',
    aspectRatio: '3:2',
    resolution: { width: 2048, height: 1365 },
    style: 'Editorial',
    generationParameters: { stylize: 250 },
  },
  createdAt: ts('2026-01-01T00:00:00.000Z'),
  updatedAt: ts('2026-01-03T00:00:00.000Z'),
  publishedAt: ts('2026-01-02T00:00:00.000Z'),
  ...overrides,
});

describe('parseAspectRatio', () => {
  it('parses w:h into a number', () => {
    expect(parseAspectRatio('3:2')).toBeCloseTo(1.5);
    expect(parseAspectRatio('1:1')).toBe(1);
    expect(parseAspectRatio('9:16')).toBeCloseTo(0.5625);
  });

  it('falls back rather than producing NaN or Infinity', () => {
    expect(parseAspectRatio('garbage', 1)).toBe(1);
    expect(parseAspectRatio('3:0', 1)).toBe(1);
    expect(parseAspectRatio('', 2)).toBe(2);
  });
});

describe('toPromptListItem', () => {
  it('exposes the thumbnail and NOT the full-resolution image', () => {
    const item = toPromptListItem('pr_1', dto());
    expect(item.thumbnailUrl).toBe('https://cdn/thumb.webp');
    expect(item as unknown as Record<string, unknown>).not.toHaveProperty('imageUrl');
  });

  it('sorts by publishedAt, not createdAt', () => {
    // A prompt drafted in January and published in March must not sort into January.
    const item = toPromptListItem('pr_1', dto());
    expect(item.createdAt).toBe('2026-01-02T00:00:00.000Z');
  });

  it('pre-parses the aspect ratio so cards never parse strings', () => {
    expect(toPromptListItem('pr_1', dto()).aspectRatio).toBeCloseTo(1.5);
  });

  it('survives a null serverTimestamp instead of throwing', () => {
    const item = toPromptListItem('pr_1', dto({ publishedAt: null, createdAt: null }));
    expect(Number.isNaN(Date.parse(item.createdAt))).toBe(false);
  });

  it('defaults missing stats and flags to safe values', () => {
    const partial = dto();
    // Simulates a document written before a field existed.
    delete (partial as Partial<PromptDto>).stats;
    delete (partial as Partial<PromptDto>).flags;
    const item = toPromptListItem('pr_1', partial);
    expect(item.stats.likesCount).toBe(0);
    expect(item.isFeatured).toBe(false);
  });
});

describe('toPromptDetail', () => {
  it('is a structural superset of the list item', () => {
    const list = toPromptListItem('pr_1', dto());
    const detail = toPromptDetail('pr_1', dto());
    for (const key of Object.keys(list)) {
      expect(detail).toHaveProperty(key);
    }
    expect(detail.imageUrl).toBe('https://cdn/full.webp');
    expect(detail.prompt).toBe('A cinematic portrait…');
  });
});

describe('toPromptDetail images', () => {
  it('synthesises a one-element array for a document written before multi-image support', () => {
    const detail = toPromptDetail('pr_1', dto());

    expect(detail.images).toEqual([
      {
        url: 'https://cdn/full.webp',
        thumbnailUrl: 'https://cdn/thumb.webp',
        width: 2048,
        height: 1365,
        aspectRatio: expect.closeTo(1.5, 3) as unknown as number,
      },
    ]);
  });

  it('keeps every image, primary first, with its OWN aspect ratio', () => {
    const detail = toPromptDetail(
      'pr_172',
      dto({
        images: [
          { url: 'https://cdn/after.webp', thumbnailUrl: 'https://cdn/after-t.webp', width: 1000, height: 1250 },
          { url: 'https://cdn/before.webp', thumbnailUrl: 'https://cdn/before-t.webp', width: 988, height: 1285 },
        ],
      }),
    );

    expect(detail.images).toHaveLength(2);
    expect(detail.images[0]?.url).toBe('https://cdn/after.webp');
    // Not the document's 3:2 metadata — each image reports its own pixels.
    expect(detail.images[0]?.aspectRatio).toBeCloseTo(0.8);
    expect(detail.images[1]?.aspectRatio).toBeCloseTo(0.7689, 3);
  });

  it('falls back to the metadata ratio when an image reports no dimensions', () => {
    const detail = toPromptDetail(
      'pr_2',
      dto({ images: [{ url: 'https://cdn/x.webp', thumbnailUrl: 'https://cdn/x-t.webp', width: 0, height: 0 }] }),
    );

    expect(detail.images[0]?.aspectRatio).toBeCloseTo(1.5);
  });

  it('always leads with the same url as imageUrl', () => {
    const detail = toPromptDetail('pr_3', dto());
    expect(detail.images[0]?.url).toBe(detail.imageUrl);
  });
});

describe('layout aspect ratio', () => {
  it('uses the image dimensions rather than the nearest-standard label', () => {
    // 1103x1426 is 0.7735. The label rounds it to 4:5 (0.8) for display, but
    // laying out with 0.8 makes the detail hero resize when it loads.
    const item = toPromptListItem(
      'pr_197',
      dto({ metadata: { ...dto().metadata, aspectRatio: '4:5', resolution: { width: 1103, height: 1426 } } }),
    );

    expect(item.aspectRatio).toBeCloseTo(0.7735, 4);
  });

  it('falls back to the label when a document carries no dimensions', () => {
    const item = toPromptListItem(
      'pr_x',
      dto({ metadata: { ...dto().metadata, aspectRatio: '16:9', resolution: { width: 0, height: 0 } } }),
    );

    expect(item.aspectRatio).toBeCloseTo(16 / 9);
  });

  it('gives the list item and the detail the SAME ratio', () => {
    // They disagreeing is what makes the hero jump between the grid tap and
    // the document arriving.
    const source = dto({
      metadata: { ...dto().metadata, aspectRatio: '4:5', resolution: { width: 1103, height: 1426 } },
    });

    const item = toPromptListItem('pr_197', source);
    const detail = toPromptDetail('pr_197', source);

    expect(detail.aspectRatio).toBe(item.aspectRatio);
    expect(detail.images[0]?.aspectRatio).toBeCloseTo(item.aspectRatio, 5);
  });
});
