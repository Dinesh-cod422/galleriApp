import { type Category } from '../entities/Category';
import { type CategoryRepository } from '../repositories/CategoryRepository';

export const getCategories =
  (repo: CategoryRepository) =>
  (): Promise<readonly Category[]> =>
    repo.getCategories();
