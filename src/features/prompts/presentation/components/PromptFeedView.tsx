import React, { useMemo } from 'react';

import { isAppError, unknownError } from '@core/errors/AppError';
import { fireAndForget } from '@core/utils/fireAndForget';
import { useStableCallback } from '@core/hooks/useStableCallback';
import { EmptyState, ErrorState, Icon } from '@ds';

import { type usePromptFeed } from '../hooks/usePrompts';
import { toPromptCardVm } from '../mappers/toPromptCardVm';
import { PromptMasonryGrid } from './PromptMasonryGrid';
import { PromptMasonrySkeleton } from './PromptMasonrySkeleton';

export type PromptFeedViewProps = {
  feed: ReturnType<typeof usePromptFeed>;
  onPressPrompt: (promptId: string) => void;
  emptyTitle: string;
  emptyDescription: string;
  testID?: string;
};

/**
 * Loading / error / empty / grid for any paginated feed.
 *
 * Extracted because the category page and every section page differ only in
 * which query they pass and what they say when it is empty — four copies of the
 * same `switch` is four places for the states to drift apart.
 */
export const PromptFeedView = ({
  feed,
  onPressPrompt,
  emptyTitle,
  emptyDescription,
  testID,
}: PromptFeedViewProps): React.JSX.Element => {
  // Memoized: this array reaches every memoized tile, and remapping it on each
  // render would hand them all new props.
  const items = useMemo(() => feed.items.map(item => toPromptCardVm(item)), [feed.items]);

  const onEndReached = useStableCallback(() => {
    if (feed.hasNextPage && !feed.isFetchingNextPage) {
      fireAndForget(feed.fetchNextPage());
    }
  });

  const retry = useStableCallback(() => {
    fireAndForget(feed.refetch());
  });

  if (feed.isPending) {
    return <PromptMasonrySkeleton />;
  }

  if (feed.isError) {
    return (
      <ErrorState
        error={isAppError(feed.error) ? feed.error : unknownError()}
        onRetry={retry}
        testID={testID === undefined ? undefined : `${testID}-error`}
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={<Icon name="inbox" size={40} color="tertiary" />}
      />
    );
  }

  return (
    <PromptMasonryGrid
      items={items}
      onPressPrompt={onPressPrompt}
      onEndReached={onEndReached}
      testID={testID}
    />
  );
};
