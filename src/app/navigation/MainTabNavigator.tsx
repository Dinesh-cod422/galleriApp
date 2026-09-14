import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { Icon, type IconName, useTheme } from '@ds';
import { HomeScreen } from '@features/prompts/presentation/screens/HomeScreen';
import {
  ExploreScreen,
  FavoritesScreen,
  ProfileScreen,
} from '@features/prompts/presentation/screens/PlaceholderScreen';

import { type MainTabParamList } from './navigation.types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, IconName> = {
  Home: 'home',
  Explore: 'compass',
  Favorites: 'heart',
  Profile: 'user',
};

export const MainTabNavigator = (): React.JSX.Element => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        // Off-screen tabs are not mounted, and once mounted are frozen while
        // blurred — so Explore does not render or animate behind Home.
        lazy: true,
        freezeOnBlur: true,
        tabBarActiveTintColor: theme.colors.accent.default,
        tabBarInactiveTintColor: theme.colors.text.tertiary,
        tabBarStyle: {
          backgroundColor: theme.colors.bg.surface,
          borderTopColor: theme.colors.border.subtle,
        },
        tabBarIcon: ({ focused }) => (
          <Icon
            name={route.name === 'Favorites' && focused ? 'heartFilled' : ICONS[route.name]}
            color={focused ? 'accent' : 'tertiary'}
          />
        ),
      })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};
