import React from 'react';

import { EmptyState, Icon, Screen } from '@ds';

/**
 * Explore, Favorites and Profile are navigable but not built yet. A labelled
 * placeholder is honest; a blank tab looks like a bug.
 */
export const PlaceholderScreen = ({
  title,
  description,
  iconName,
}: {
  title: string;
  description: string;
  iconName: 'compass' | 'heart' | 'user';
}): React.JSX.Element => (
  <Screen padded>
    <EmptyState
      title={title}
      description={description}
      icon={<Icon name={iconName} size={40} color="tertiary" />}
    />
  </Screen>
);

export const ExploreScreen = (): React.JSX.Element => (
  <PlaceholderScreen
    title="Explore"
    description="Search and full category browsing land in the next phase."
    iconName="compass"
  />
);

export const FavoritesScreen = (): React.JSX.Element => (
  <PlaceholderScreen
    title="No favorites yet"
    description="Favorites need sign-in, which is not wired up yet."
    iconName="heart"
  />
);

export const ProfileScreen = (): React.JSX.Element => (
  <PlaceholderScreen
    title="Profile"
    description="Theme preferences and your prompts will live here."
    iconName="user"
  />
);
