import { notFoundError } from '@core/errors/AppError';
import { type CategoryId, type PromptId } from '@core/types/branded';

import { type PromptDetail } from '../../domain/entities/Prompt';
import {
  type GetPromptsParams,
  type PromptPage,
  type PromptRepository,
  type SearchPromptsParams,
} from '../../domain/repositories/PromptRepository';
import { type PromptFirestoreDataSource, type RawPage } from '../datasources/PromptFirestoreDataSource';
import { toFirestoreAppError } from '@infra/firebase/firestoreError';
import { toPromptDetail, toPromptListItem } from '../mappers/promptMapper';

const DEFAULT_LIMIT = 12;

/**
 * Maps DTOs to entities and every failure to an AppError. This is the only
 * place that knows the data source exists — swapping Firestore for REST means
 * constructing this with a different data source, nothing more.
 */
export class PromptRepositoryImpl implements PromptRepository {
  constructor(private readonly dataSource: PromptFirestoreDataSource) {}

  async getPrompts(params: GetPromptsParams): Promise<PromptPage> {
    try {
      const raw = await this.dataSource.getPrompts({
        sort: params.sort ?? 'newest',
        limit: params.limit ?? DEFAULT_LIMIT,
        cursor: params.cursor ?? null,
        ...(params.categoryId !== undefined ? { categoryId: params.categoryId } : {}),
      });
      return this.toPage(raw);
    } catch (error) {
      throw toFirestoreAppError(error);
    }
  }

  async getPromptById(id: PromptId): Promise<PromptDetail> {
    try {
      const found = await this.dataSource.getById(id);
      if (!found) {
        throw notFoundError('That prompt no longer exists.');
      }
      return toPromptDetail(found.id, found.data);
    } catch (error) {
      throw toFirestoreAppError(error);
    }
  }

  async getPromptsByCategory(
    categoryId: CategoryId,
    params: Omit<GetPromptsParams, 'categoryId'> = {},
  ): Promise<PromptPage> {
    return this.getPrompts({ ...params, categoryId, sort: 'newest' });
  }

  async searchPrompts(params: SearchPromptsParams): Promise<PromptPage> {
    try {
      const raw = await this.dataSource.getPrompts({
        sort: 'newest',
        limit: params.limit ?? DEFAULT_LIMIT,
        cursor: params.cursor ?? null,
        searchToken: params.query,
      });
      return this.toPage(raw);
    } catch (error) {
      throw toFirestoreAppError(error);
    }
  }

  private toPage(raw: RawPage): PromptPage {
    return {
      items: raw.docs.map(doc => toPromptListItem(doc.id, doc.data)),
      nextCursor: raw.nextCursor,
      fromCache: raw.fromCache,
    };
  }
}
