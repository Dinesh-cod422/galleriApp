import React, { useCallback } from 'react';
import { StyleSheet, Alert, Pressable, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { APP_NAME, APP_TAGLINE } from '@core/config/brand';
import { useStableCallback } from '@core/hooks/useStableCallback';
import { formatCount } from '@core/utils/formatCount';
import { type RootStackParamList } from '@app/navigation/navigation.types';
import {
  useFavoriteIds,
  useFavoritesStore,
} from '@features/favorites/presentation/stores/favoritesStore';
import {
  BrandMark,
  Divider,
  Icon,
  Screen,
  Text,
  createStyles,
  layoutOf,
  useThemeContext,
  type AppTheme,
  type Responsive,
  type ThemePreference,
} from '@ds';

/** The three choices, in the order they are offered. */
const THEMES: ReadonlyArray<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const getStyles = (appTheme: AppTheme, responsive: Responsive) => {
  const { BORDER_RADIUS, HScale, IconSize, VScale } = responsive;
  const layout = layoutOf(responsive);
  const p = appTheme.colors;

  return {
    ...StyleSheet.create({
      content: { paddingBottom: layout.tabBarClearance },
      header: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: HScale.Width_18,
        paddingHorizontal: layout.gutter,
        paddingTop: VScale.Height_9,
        paddingBottom: VScale.Height_28,
      },
      identity: { flex: 1 },
      section: { paddingHorizontal: layout.gutter, gap: HScale.Width_14 },
      sections: { gap: HScale.Width_28 },
      card: {
        backgroundColor: p.bg.surface,
        borderRadius: BORDER_RADIUS.radius_41,
        borderWidth: 1,
        borderColor: p.border.subtle,
        paddingHorizontal: HScale.Width_18,
      },
      row: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: HScale.Width_18,
        paddingVertical: VScale.Height_14,
      },
      rowLabel: { flex: 1 },
      /** A segmented control: one track, three equal cells. */
      segments: {
        flexDirection: 'row' as const,
        backgroundColor: p.bg.subtle,
        borderRadius: BORDER_RADIUS.radius_26,
        padding: HScale.Width_5,
        gap: HScale.Width_5,
      },
      segment: {
        flex: 1,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        paddingVertical: VScale.Height_9,
        borderRadius: BORDER_RADIUS.radius_15,
      },
      segmentSelected: {
        backgroundColor: p.bg.surface,
        ...appTheme.shadows.sm,
      },
      note: { paddingHorizontal: layout.gutter, gap: HScale.Width_5 },
    }),
    palette: p,
    iconSizes: { sm: IconSize.iconSize_18, md: IconSize.iconSize_20 },
    metrics: { xl: HScale.Width_65 },
    radii: { lg: BORDER_RADIUS.radius_41 },
  };
};

const useStyles = createStyles(getStyles);

/**
 * Settings and what this device remembers.
 *
 * NOT an account page, because there are no accounts: nothing is signed in and
 * nothing syncs. Showing an avatar, a name field and a "Sign out" button would
 * be inventing a feature. What is real is the theme choice and the favourites
 * list, both stored on this device — so that is what this page is about, and
 * the footer says so plainly rather than leaving the user to wonder where their
 * saved prompts live.
 */
export const ProfileScreen = (): React.JSX.Element => {
  const styles = useStyles();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { preference, setPreference } = useThemeContext();
  const favoriteIds = useFavoriteIds();
  const favoriteCount = favoriteIds.size;

  const openFavorites = useStableCallback(() => {
    navigation.navigate('Main', { screen: 'Favorites' });
  });

  const clearFavorites = useCallback(() => {
    // Destructive and irreversible — there is no server copy to restore from.
    Alert.alert(
      'Clear favourites?',
      `This removes all ${favoriteCount} saved prompts from this device. It cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => useFavoritesStore.setState({ ids: new Set() }),
        },
      ],
    );
  }, [favoriteCount]);

  return (
    <Screen testID="profile">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BrandMark size={styles.metrics.xl} radius={styles.radii.lg} />
          <View style={styles.identity}>
            <Text variant="h2">{APP_NAME}</Text>
            <Text variant="caption" color="secondary">
              {APP_TAGLINE}
            </Text>
          </View>
        </View>

        <View style={styles.sections}>
          <View style={styles.section}>
            <Text variant="h3">Appearance</Text>
            <View style={styles.segments} accessibilityRole="radiogroup">
              {THEMES.map(option => {
                const selected = option.value === preference;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setPreference(option.value)}
                    style={[styles.segment, selected && styles.segmentSelected]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${option.label} theme`}
                    testID={`theme-${option.value}`}>
                    <Text variant="bodyStrong" color={selected ? 'primary' : 'secondary'}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text variant="h3">Your library</Text>
            <View style={styles.card}>
              <Pressable
                style={styles.row}
                onPress={openFavorites}
                accessibilityRole="button"
                accessibilityLabel={`Favourites, ${favoriteCount} saved`}
                testID="profile-favorites">
                <Icon name="heartFilled" size={styles.iconSizes.md} color="tertiary" />
                <Text variant="body" style={styles.rowLabel}>
                  Favourites
                </Text>
                <Text variant="bodyStrong" color="secondary">
                  {formatCount(favoriteCount)}
                </Text>
                <Icon name="chevronRight" size={styles.iconSizes.sm} color="tertiary" />
              </Pressable>

              {favoriteCount > 0 && (
                <>
                  <Divider />
                  <Pressable
                    style={styles.row}
                    onPress={clearFavorites}
                    accessibilityRole="button"
                    accessibilityLabel="Clear all favourites"
                    testID="profile-clear-favorites">
                    <Icon name="close" size={styles.iconSizes.md} tint={styles.palette.text.danger} />
                    <Text variant="body" color="danger" style={styles.rowLabel}>
                      Clear favourites
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>

          <View style={styles.note}>
            <Text variant="caption" color="tertiary">
              Favourites and your theme are stored on this device. Accounts and syncing
              between devices are not available yet.
            </Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
};
