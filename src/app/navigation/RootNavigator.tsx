import React, { useMemo } from 'react';
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

import { MainTabNavigator } from './MainTabNavigator';
import { type RootStackParamList } from './navigation.types';

const Stack = createNativeStackNavigator<RootStackParamList>();

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
        primary: theme.colors.accent.default,
        background: theme.colors.bg.canvas,
        card: theme.colors.bg.surface,
        text: theme.colors.text.primary,
        border: theme.colors.border.subtle,
      },
    };
  }, [theme]);

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
        <Stack.Screen name="Main" component={MainTabNavigator} options={{ headerShown: false }} />
        <Stack.Screen
          name="PromptDetail"
          component={PromptDetailScreen}
          options={{ title: '', headerTransparent: false }}
        />
        <Stack.Screen
          name="Category"
          component={CategoryScreen}
          options={({ route }) => ({ title: route.params.title })}
        />
        <Stack.Screen
          name="PromptSection"
          component={PromptSectionScreen}
          options={({ route }) => ({ title: route.params.title })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
