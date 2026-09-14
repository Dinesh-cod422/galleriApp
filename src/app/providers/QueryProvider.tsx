import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { isAppError } from '@core/errors/AppError';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        /**
         * Firestore keeps its own on-device cache, so a query can be answered
         * offline. Without `offlineFirst`, TanStack sees the device as offline
         * and PAUSES the query — leaving a spinner in front of data that is
         * already on disk.
         */
        networkMode: 'offlineFirst',
        staleTime: 5 * 60_000,
        gcTime: 30 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Never burn retries on failures retrying cannot fix.
          if (isAppError(error) && !error.retryable) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: { networkMode: 'offlineFirst' },
    },
  });

export const QueryProvider = ({ children }: { children: React.ReactNode }): React.JSX.Element => {
  // useState, not a module constant: one client per app instance, created
  // exactly once, and never shared across tests.
  const [client] = useState(createQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};
