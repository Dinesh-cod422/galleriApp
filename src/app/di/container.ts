import { env } from '@core/config/env';
import { CategoryFirestoreDataSource } from '@features/categories/data/datasources/CategoryFirestoreDataSource';
import { CategoryRepositoryImpl } from '@features/categories/data/repositories/CategoryRepositoryImpl';
import { type CategoryRepository } from '@features/categories/domain/repositories/CategoryRepository';
import { PromptFirestoreDataSource } from '@features/prompts/data/datasources/PromptFirestoreDataSource';
import { PromptRepositoryImpl } from '@features/prompts/data/repositories/PromptRepositoryImpl';
import { type PromptRepository } from '@features/prompts/domain/repositories/PromptRepository';

/**
 * The composition root. A plain object, not a DI framework — with five
 * dependencies, a container library would be pure ceremony.
 *
 * This is the single place that decides WHICH data source backs a repository,
 * which is what makes the source swap a one-branch change.
 */
export type Container = {
  readonly promptRepository: PromptRepository;
  readonly categoryRepository: CategoryRepository;
};

const build = (): Container => {
  switch (env.DATA_SOURCE) {
    case 'firebase':
      return {
        promptRepository: new PromptRepositoryImpl(new PromptFirestoreDataSource()),
        categoryRepository: new CategoryRepositoryImpl(new CategoryFirestoreDataSource()),
      };
    case 'local':
    default:
      // Only Firestore is wired today. When a local/mock source returns, it
      // is constructed here and nothing above this file changes.
      return {
        promptRepository: new PromptRepositoryImpl(new PromptFirestoreDataSource()),
        categoryRepository: new CategoryRepositoryImpl(new CategoryFirestoreDataSource()),
      };
  }
};

let instance: Container | null = null;

/** Built once. Repositories hold a data source, so recreating them per render
 *  would throw away Firestore's client-side query state for no reason. */
export const container = (): Container => {
  instance ??= build();
  return instance;
};
