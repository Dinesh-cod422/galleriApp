import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useTheme } from '@ds';
import { CategoryScreen } from '@features/prompts/presentation/screens/CategoryScreen';
import { PromptDetailScreen } from '@features/prompts/presentation/screens/PromptDetailScreen';
import { PromptSectionScreen } from '@features/prompts/presentation/screens/PromptSectionScreen';
import { SearchScreen } from '@features/prompts/presentation/screens/SearchScreen';
import { sectionForSort } from '@features/prompts/presentation/sections';

import { linking } from './linking';
import { MainTabNavigator } from './MainTabNavigator';
import { type RootStackParamList } from './navigation.types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// The canvas colour is themed, so only the layout lives here.
const styles = StyleSheet.create({
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export const RootNavigator = (): React.JSX.Element => {
  const theme = useTheme();

  // Navigation gets the app's own tokens, so headers and card backgrounds
  // cannot drift from the design system.
  const navTheme = useMemo<NavTheme>(() => {
    const base = theme.mode === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        // React Navigation's `primary` tints headers' text and back chevron,
        // so it is the ink rather than the fill.
        primary: theme.colors.accent.ink,
        background: theme.colors.bg.canvas,
        card: theme.colors.bg.surface,
        text: theme.colors.text.primary,
        border: theme.colors.border.subtle,
      },
    };
  }, [theme]);

  return (
    <NavigationContainer
      theme={navTheme}
      linking={linking}
      /*
       * Shown only while a COLD START resolves an incoming URL — the container
       * has to know which screen to mount before it renders anything, and on a
       * launch from a link that takes a moment. Without it the app shows a blank
       * frame that reads as a crash. A normal launch never renders this.
       */
      fallback={
        <View style={[styles.fallback, { backgroundColor: theme.colors.bg.canvas }]}>
          <ActivityIndicator size="large" color={theme.colors.accent.ink} />
        </View>
      }>
      <Stack.Navigator screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
        <Stack.Screen name="Main" component={MainTabNavigator} options={{ headerShown: false }} />
        <Stack.Screen
          name="PromptDetail"
          component={PromptDetailScreen}
          // No header bar: it was an empty strip above the image, spending the
          // most valuable ~50pt on the screen to show a title of ''. The screen
          // floats its own back control over the hero instead, so the picture —
          // which is what the page is about — starts at the top edge.
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Search"
          component={SearchScreen}
          // The screen puts the field where a title bar would be, so a header
          // would only push it down and add a second back control.
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Category"
          component={CategoryScreen}
          // A link carries no title; the screen corrects the header once the
          // category's real name resolves.
          options={({ route }) => ({ title: route.params.title ?? '' })}
        />
        <Stack.Screen
          name="PromptSection"
          component={PromptSectionScreen}
          // Unlike Category this needs no lookup: the sort IS the identity, and
          // the title for it is declared in the same table the rails use.
          options={({ route }) => ({
            title: route.params.title ?? sectionForSort(route.params.sort)?.title ?? '',
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
