import { useQuery } from '@tanstack/react-query';

import { container } from '@app/di/container';
import { getCategories } from '@features/categories/domain/usecases/getCategories';

import { categoryKeys } from './queryKeys';

export const useCategories = () =>
  useQuery({
    queryKey: categoryKeys.list(),
    // Categories change roughly never — an hour of staleness costs nothing and
    // saves a read on every Home mount.
    staleTime: 60 * 60_000,
    queryFn: () => getCategories(container().categoryRepository)(),
  });
