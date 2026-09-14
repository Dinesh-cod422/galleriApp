import { type Category } from '../entities/Category';

export interface CategoryRepository {
  getCategories(): Promise<readonly Category[]>;
}
