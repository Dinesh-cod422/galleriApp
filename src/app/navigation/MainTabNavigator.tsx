import React, { useCallback } from 'react';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { HomeScreen } from '@features/prompts/presentation/screens/HomeScreen';
import { FavoritesScreen } from '@features/favorites/presentation/screens/FavoritesScreen';
import { ExploreScreen } from '@features/prompts/presentation/screens/ExploreScreen';
import { ProfileScreen } from '@features/profile/presentation/screens/ProfileScreen';

import { type MainTabParamList } from './navigation.types';
import { TabBar } from './TabBar';

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * The bar itself lives in `TabBar` — icons, colours, the sliding indicator and
 * the safe-area inset are all its business now.
 *
 * What is left here is only what the NAVIGATOR decides: which screens exist,
 * and how they are mounted. That split is the point: styling a tab bar through
 * `tabBarStyle` / `tabBarIcon` / `tabBarLabelStyle` meant one control's
 * appearance was specified across three unrelated options on the navigator, and
 * anything those options could not express — an indicator that moves between
 * tabs rather than appearing under one — could not be built at all.
 */
const SCREEN_OPTIONS = {
  headerShown: false,
  // Off-screen tabs are not mounted, and once mounted are frozen while blurred
  // — so Explore does not render or animate behind Home.
  lazy: true,
  freezeOnBlur: true,
  /*
   * The bar floats OVER the content rather than shortening it.
   *
   * Screens clear it with `layout.tabBarClearance` in their own bottom padding,
   * which is what lets a grid scroll to the very bottom of the glass instead of
   * stopping at a hard edge above the home indicator.
   */
  tabBarStyle: { position: 'absolute' as const },
} as const;

export const MainTabNavigator = (): React.JSX.Element => {
  const renderTabBar = useCallback(
    (props: BottomTabBarProps) => <TabBar {...props} />,
    [],
  );

  return (
    <Tab.Navigator screenOptions={SCREEN_OPTIONS} tabBar={renderTabBar}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Explore" component={ExploreScreen} options={{ title: 'Explore' }} />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ title: 'Favourites' }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
};
