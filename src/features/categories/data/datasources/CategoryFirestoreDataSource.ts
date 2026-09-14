import { collections, getFirestoreClient } from '@infra/firebase/firebaseClient';

export type CategoryDto = {
  name: string;
  slug: string;
  iconName: string;
  coverUrl: string | null;
  promptCount: number;
  sortOrder: number;
};

export class CategoryFirestoreDataSource {
  async getCategories(): Promise<ReadonlyArray<{ id: string; data: CategoryDto }>> {
    const snapshot = await getFirestoreClient()
      .collection(collections.categories)
      .orderBy('sortOrder', 'asc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() as CategoryDto }));
  }
}
