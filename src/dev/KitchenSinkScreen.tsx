import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';

import { networkError, notFoundError } from '@core/errors/AppError';

import { FirebaseStatusCard } from './FirebaseStatusCard';
import { AppImage, Avatar, Badge, BottomSheet, type BottomSheetRef, Button, Card, Divider, EmptyState, ErrorState, Icon, IconButton, Screen, Skeleton, Text, type AppTheme, type ThemePreference, useResponsive, useThemeContext, createStyles, type Responsive } from '@ds';

/**
 * Phase 1's definition of done, and a permanent regression surface: every
 * design-system component rendered in one place, in both themes, at whatever
 * width the device happens to be. A broken token shows up here before it
 * reaches a screen.
 *
 * Not shipped in release builds — Phase 3 drops it behind a dev-only route.
 */
const getStyles = (appTheme: AppTheme, responsive: Responsive) => {
  const { BORDER_RADIUS, HScale, IconSize, VScale } = responsive;
  const p = appTheme.colors;

  return {
    ...StyleSheet.create({
      scroll: {
        paddingBottom: VScale.Height_76,
        gap: HScale.Width_28,
      },
      section: {
        gap: HScale.Width_14,
      },
      row: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        flexWrap: 'wrap' as const,
        gap: HScale.Width_9,
      },
      cardBody: {
        padding: HScale.Width_18,
        gap: HScale.Width_5,
      },
      stateBox: {
        height: VScale.Height_237,
        borderRadius: BORDER_RADIUS.radius_41,
        backgroundColor: p.bg.surface,
        borderWidth: 1,
        borderColor: p.border.subtle,
      },
      swatchRow: {
        flexDirection: 'row' as const,
        gap: HScale.Width_5,
      },
      swatch: {
        flex: 1,
        height: HScale.Width_51,
        borderRadius: BORDER_RADIUS.radius_15,
        borderWidth: 1,
        borderColor: p.border.subtle,
      },
    }),
    palette: p,
    iconSizes: { xl: IconSize.iconSize_45 },
    metrics: { title: VScale.Height_21, media: VScale.Height_166 },
    radii: { md: BORDER_RADIUS.radius_26 },
  };
};

const useStyles = createStyles(getStyles);

const PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark'];

const SAMPLE_IMAGE = 'https://picsum.photos/seed/kitchen-sink/600/400';

export const KitchenSinkScreen = (): React.JSX.Element => {
  const styles = useStyles();
  const { theme, preference, setPreference } = useThemeContext();
  const { breakpoint, width, gridColumns, isTablet } = useResponsive();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [pressCount, setPressCount] = useState(0);

  const openSheet = useCallback(() => sheetRef.current?.open(), []);
  const bump = useCallback(() => setPressCount(count => count + 1), []);

  return (
    <Screen padded testID="kitchen-sink">
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        // Dismiss the keyboard on scroll everywhere in the app.
        keyboardDismissMode="on-drag">
        <View style={styles.section}>
          <Text variant="display">Design System</Text>
          <Text variant="body" color="secondary">
            {`${theme.mode} · breakpoint ${breakpoint} · ${Math.round(width)}dp · ${gridColumns} columns${
              isTablet ? ' · tablet' : ''
            }`}
          </Text>
          <View style={styles.row}>
            {PREFERENCES.map(option => (
              <Button
                key={option}
                label={option}
                size="sm"
                variant={preference === option ? 'primary' : 'secondary'}
                onPress={() => setPreference(option)}
              />
            ))}
          </View>
        </View>

        <Divider />

        <View style={styles.section}>
          <Text variant="h2">Live backend</Text>
          <FirebaseStatusCard />
        </View>

        <View style={styles.section}>
          <Text variant="h2">Typography</Text>
          <Text variant="display">Display 34</Text>
          <Text variant="h1">Heading 1</Text>
          <Text variant="h2">Heading 2</Text>
          <Text variant="h3">Heading 3</Text>
          <Text variant="title">Title</Text>
          <Text variant="body">Body — the default reading size for prompt text.</Text>
          <Text variant="bodyStrong">Body strong</Text>
          <Text variant="caption" color="secondary">
            Caption · secondary
          </Text>
          <Text variant="label" color="tertiary">
            LABEL · TERTIARY
          </Text>
          <Text variant="mono">a photorealistic portrait, 85mm, golden hour</Text>
        </View>

        <View style={styles.section}>
          <Text variant="h2">Surfaces</Text>
          <View style={styles.swatchRow}>
            <View style={[styles.swatch, { backgroundColor: styles.palette.bg.canvas }]} />
            <View style={[styles.swatch, { backgroundColor: styles.palette.bg.surface }]} />
            <View style={[styles.swatch, { backgroundColor: styles.palette.bg.subtle }]} />
            <View style={[styles.swatch, { backgroundColor: styles.palette.accent.default }]} />
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="h2">Buttons</Text>
          <View style={styles.row}>
            <Button label="Primary" onPress={bump} />
            <Button label="Secondary" variant="secondary" onPress={bump} />
            <Button label="Ghost" variant="ghost" onPress={bump} />
            <Button label="Danger" variant="danger" onPress={bump} />
          </View>
          <View style={styles.row}>
            <Button label="Small" size="sm" onPress={bump} />
            <Button label="Large" size="lg" onPress={bump} />
            <Button label="Loading" loading onPress={bump} />
            <Button label="Disabled" disabled onPress={bump} />
          </View>
          <Text variant="caption" color="secondary">
            {`pressed ${pressCount} times`}
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="h2">Icons &amp; icon buttons</Text>
          <View style={styles.row}>
            <IconButton accessibilityLabel="Home" onPress={bump}>
              <Icon name="home" />
            </IconButton>
            <IconButton accessibilityLabel="Explore" variant="surface" onPress={bump}>
              <Icon name="compass" />
            </IconButton>
            <IconButton accessibilityLabel="Favorite" variant="surface" onPress={bump}>
              <Icon name="heartFilled" color="favorite" />
            </IconButton>
            <IconButton accessibilityLabel="Copy" variant="surface" onPress={bump}>
              <Icon name="copy" color="accent" />
            </IconButton>
            <IconButton accessibilityLabel="Share" variant="surface" onPress={bump}>
              <Icon name="share" />
            </IconButton>
            <IconButton accessibilityLabel="Search" variant="surface" onPress={bump}>
              <Icon name="search" color="secondary" />
            </IconButton>
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="h2">Card · image · avatar · badge</Text>
          <Card elevation="md">
            <AppImage uri={SAMPLE_IMAGE} aspectRatio={3 / 2} priority="high" borderRadius={0} />
            <View style={styles.cardBody}>
              <Text variant="title" numberOfLines={1}>
                Cinematic desert portrait
              </Text>
              <View style={styles.row}>
                <Avatar name="Mara Vance" size="sm" />
                <Text variant="caption" color="secondary">
                  Mara Vance
                </Text>
                <Badge label="Portrait" tone="accent" />
                <Badge label="1.2K views" />
              </View>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text variant="h2">Skeletons</Text>
          <Card>
            <View style={styles.cardBody}>
              <Skeleton height={styles.metrics.media} borderRadius={styles.radii.md} />
              <Skeleton height={styles.metrics.title} width="70%" />
              <Skeleton width="45%" />
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text variant="h2">Empty state</Text>
          <View style={styles.stateBox}>
            <EmptyState
              title="No favorites yet"
              description="Tap the heart on any prompt to keep it here."
              icon={<Icon name="inbox" size={styles.iconSizes.xl} color="tertiary" />}
              actionLabel="Browse prompts"
              onAction={bump}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="h2">Error states</Text>
          <View style={styles.stateBox}>
            <ErrorState error={networkError()} onRetry={bump} />
          </View>
          <View style={styles.stateBox}>
            {/* notFound is not retryable — no button is offered. */}
            <ErrorState error={notFoundError()} onRetry={bump} />
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="h2">Bottom sheet</Text>
          <Button label="Open sheet" variant="secondary" onPress={openSheet} />
        </View>
      </ScrollView>

      <BottomSheet ref={sheetRef} title="Share prompt" snapPoints={['40%']}>
        <Text variant="body" color="secondary">
          Sheets are wrapped by the design system, so screens never touch the
          underlying library's imperative API.
        </Text>
        <Button label="Close" variant="secondary" onPress={() => sheetRef.current?.close()} />
      </BottomSheet>
    </Screen>
  );
};
