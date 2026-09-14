import { categoryId } from '@core/types/branded';

import { toFirestoreAppError } from '@infra/firebase/firestoreError';
import { type Category } from '../../domain/entities/Category';
import { type CategoryRepository } from '../../domain/repositories/CategoryRepository';
import { type CategoryFirestoreDataSource } from '../datasources/CategoryFirestoreDataSource';

export class CategoryRepositoryImpl implements CategoryRepository {
  constructor(private readonly dataSource: CategoryFirestoreDataSource) {}

  async getCategories(): Promise<readonly Category[]> {
    try {
      const rows = await this.dataSource.getCategories();
      return rows.map(({ id, data }) => ({
        id: categoryId(id),
        name: data.name,
        slug: data.slug,
        iconName: data.iconName,
        coverUrl: data.coverUrl ?? null,
        promptCount: data.promptCount ?? 0,
        sortOrder: data.sortOrder ?? 0,
      }));
    } catch (error) {
      throw toFirestoreAppError(error);
    }
  }
}
