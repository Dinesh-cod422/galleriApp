import { type PromptDetail, type PromptListItem } from '../entities/Prompt';
import {
  type GetPromptsParams,
  type PromptCounter,
  type PromptPage,
  type PromptRepository,
  type SearchPromptsParams,
} from '../repositories/PromptRepository';
import { getFeaturedPrompts } from './getFeaturedPrompts';
import { getPromptById } from './getPromptById';
import { getPrompts } from './getPrompts';
import { getTrendingPrompts } from './getTrendingPrompts';
import { recordPromptEngagement } from './recordPromptEngagement';
import { searchPrompts } from './searchPrompts';
import { promptId } from '@core/types/branded';

const emptyPage: PromptPage = { items: [], nextCursor: null, fromCache: false };

/**
 * A hand-written fake, not jest.mock(). Use cases take their repository as an
 * argument, so tests need no module mocking at all — that is the entire
 * practical payoff of the layering.
 */
class FakePromptRepository implements PromptRepository {
  lastParams: GetPromptsParams | null = null;
  lastSearch: SearchPromptsParams | null = null;
  searchCalls = 0;
  increments: Array<{ id: string; counter: PromptCounter }> = [];

  async getPrompts(params: GetPromptsParams): Promise<PromptPage> {
    this.lastParams = params;
    return emptyPage;
  }
  async getPromptById(): Promise<PromptDetail> {
    return {} as PromptDetail;
  }
  async getPromptsByCategory(): Promise<PromptPage> {
    return emptyPage;
  }
  async searchPrompts(params: SearchPromptsParams): Promise<PromptPage> {
    this.searchCalls += 1;
    this.lastSearch = params;
    return { ...emptyPage, items: [{ id: promptId('x') } as PromptListItem] };
  }
  async incrementStat(id: string, counter: PromptCounter): Promise<void> {
    this.increments.push({ id, counter });
  }
}

describe('recordPromptEngagement', () => {
  it('forwards the prompt and counter to the repository', async () => {
    const repo = new FakePromptRepository();
    await recordPromptEngagement(repo)(promptId('pr_1'), 'copiesCount');
    expect(repo.increments).toEqual([{ id: 'pr_1', counter: 'copiesCount' }]);
  });

  it('rejects a blank id instead of writing to an empty document path', async () => {
    const repo = new FakePromptRepository();
    // AppError is a plain object, not an Error — `toThrow` would not match it.
    await expect(
      recordPromptEngagement(repo)(promptId('  '), 'viewsCount'),
    ).rejects.toMatchObject({ kind: 'validation' });
    expect(repo.increments).toHaveLength(0);
  });
});

describe('getPrompts', () => {
  it('defaults to newest with a page size', async () => {
    const repo = new FakePromptRepository();
    await getPrompts(repo)();
    expect(repo.lastParams?.sort).toBe('newest');
    expect(repo.lastParams?.limit).toBeGreaterThan(0);
    expect(repo.lastParams?.cursor).toBeNull();
  });

  it('passes an explicit cursor through for pagination', async () => {
    const repo = new FakePromptRepository();
    await getPrompts(repo)({ cursor: '2026-01-01|pr_9' });
    expect(repo.lastParams?.cursor).toBe('2026-01-01|pr_9');
  });
});

describe('featured and trending', () => {
  it('request their own sort modes and are not paginated', async () => {
    const repo = new FakePromptRepository();
    await getFeaturedPrompts(repo)();
    expect(repo.lastParams?.sort).toBe('featured');
    await getTrendingPrompts(repo)();
    expect(repo.lastParams?.sort).toBe('trending');
    expect(repo.lastParams?.cursor).toBeNull();
  });
});

describe('searchPrompts', () => {
  it('does not hit the repository below the minimum query length', async () => {
    const repo = new FakePromptRepository();
    const result = await searchPrompts(repo)({ query: 'a' });
    expect(repo.searchCalls).toBe(0);
    expect(result.items).toEqual([]);
  });

  it('normalizes case and accents before querying', async () => {
    const repo = new FakePromptRepository();
    await searchPrompts(repo)({ query: '  PortrÄit ' });
    expect(repo.lastSearch?.query).toBe('portrait');
  });

  it('treats whitespace-only input as empty', async () => {
    const repo = new FakePromptRepository();
    await searchPrompts(repo)({ query: '     ' });
    expect(repo.searchCalls).toBe(0);
  });
});

describe('getPromptById', () => {
  it('rejects a blank id as a validation error, without a round trip', async () => {
    const repo = new FakePromptRepository();
    await expect(getPromptById(repo)(promptId('  '))).rejects.toMatchObject({
      kind: 'validation',
      retryable: false,
    });
  });
});
