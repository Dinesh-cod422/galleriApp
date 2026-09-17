import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Pressable, ScrollView, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { type NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isAppError, unknownError } from '@core/errors/AppError';
import { fireAndForget } from '@core/utils/fireAndForget';
import { formatCount } from '@core/utils/formatCount';
import { formatRelativeDate } from '@core/utils/formatRelativeDate';
import { categoryId as toCategoryId, promptId as toPromptId } from '@core/types/branded';
import { type RootStackParamList } from '@app/navigation/navigation.types';
import { promptWebUrl } from '@app/navigation/linking';
import { FavoriteButton } from '@features/favorites/presentation/components/FavoriteButton';
import {
  Avatar,
  Badge,
  Divider,
  ErrorState,
  ExpandableText,
  Icon,
  IconButton,
  Screen,
  Skeleton,
  Text,
  type AppTheme,
  createStyles,
  layoutOf,
  type Responsive,
} from '@ds';

import { PromptActions } from '../components/PromptActions';
import { PromptImagePager } from '../components/PromptImagePager';
import { PromptRelatedRail } from '../components/PromptRelatedRail';
import { PromptSectionRail } from '../components/PromptSectionRail';
import {
  useDisplayStats,
  useRecordPromptEngagement,
  useRecordPromptView,
} from '../hooks/useEngagement';
import { usePromptById } from '../hooks/usePrompts';
import { useSuggestionLedger } from '../hooks/useSuggestionLedger';
import { toPromptBadge } from '../mappers/toPromptCardVm';
import { DETAIL_SECTIONS } from '../sections';


/**
 * A stable zero. `useDisplayStats` runs before the early returns below (hooks
 * cannot be conditional), so it needs something to read while the document is
 * still loading — and a fresh object literal each render would defeat its memo.
 */
const NO_STATS = {
  likesCount: 0,
  viewsCount: 0,
  copiesCount: 0,
  favoritesCount: 0,
  sharesCount: 0,
} as const;


const getStyles = (appTheme: AppTheme, responsive: Responsive) => {
  const { BORDER_RADIUS, HScale, IconSize, VScale } = responsive;
  const layout = layoutOf(responsive);
  const p = appTheme.colors;

  return {
    ...StyleSheet.create({
      body: { padding: layout.gutter, gap: HScale.Width_18 },
      hero: { position: 'relative' as const },
      /** 4:5 — the most common ratio in the library, so the least jump on average. */
      heroSkeleton: { aspectRatio: 4 / 5, width: '100%' as const },
      // Without this the status bar and the back control sit directly on an
      // arbitrary photograph — white on a pale sky is unreadable, and no single
      // icon colour survives every image.
      heroScrim: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        height: VScale.Height_166,
      },
      heroBack: { position: 'absolute' as const, left: HScale.Width_14 },
      // Same corner as on a grid tile, so the control does not move between the
      // wall and the page it opens.
      heroFavorite: { position: 'absolute' as const, right: HScale.Width_14 },
      // Bottom-left, clear of both top controls and adjacent to the title it
      // qualifies.
      heroBadge: {
        position: 'absolute' as const,
        bottom: HScale.Width_18,
        left: HScale.Width_18,
      },

      titleBlock: { gap: HScale.Width_9 },
      authorRow: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: HScale.Width_9,
      },
      // The name and the date are one fact — who posted this, and when — so they
      // share a column beside the avatar instead of the date sitting among the
      // counts, where it was the only pill that was not a number.
      authorIdentity: { flexShrink: 1 },

      // Counts as pills rather than bare text: at a glance they read as one group
      // of facts about the image, not as three stray labels under the title.
      statRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: HScale.Width_9 },
      stat: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: HScale.Width_5,
        backgroundColor: p.bg.subtle,
        paddingHorizontal: HScale.Width_14,
        paddingVertical: VScale.Height_5,
        borderRadius: 999,
      },

      section: { gap: HScale.Width_9 },
      sections: { gap: HScale.Width_28, paddingTop: VScale.Height_28 },
      promptBox: {
        backgroundColor: p.bg.subtle,
        borderRadius: BORDER_RADIUS.radius_26,
        padding: HScale.Width_18,
        gap: HScale.Width_9,
      },
      tags: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: HScale.Width_5 },

      // Pinned: the page scrolls well past the actions, and the two things a
      // prompt is FOR should never require scrolling back up to reach.
      actionBar: {
        paddingHorizontal: layout.gutter,
        paddingTop: VScale.Height_9,
        backgroundColor: p.bg.canvas,
        borderTopWidth: 1,
        borderTopColor: p.border.subtle,
      },
    }),
    palette: p,
    iconSizes: { xs: IconSize.iconSize_16, lg: IconSize.iconSize_24 },
    metrics: { actionBar: VScale.Height_90, sm: HScale.Width_37, md: VScale.Height_14, heading: VScale.Height_31, chip: VScale.Height_33, w80: HScale.Width_92, w96: HScale.Width_111 },
    radii: { pill: 999 },
  };
};

const useStyles = createStyles(getStyles);

export const PromptDetailScreen = (): React.JSX.Element => {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'PromptDetail'>>();
  const { promptId } = route.params;

  const query = usePromptById(toPromptId(promptId));
  // Shared by every suggestion strip below, so four sections cannot all show
  // the same popular prompts. Ranked in render order.
  const ledger = useSuggestionLedger();
  const prompt = query.data;
  // The same rule the grid tiles use, so a prompt cannot be tagged "Featured"
  // in the feed and untagged on its own page.
  const badge = prompt ? toPromptBadge(prompt) : null;

  // Counted once per prompt per session, and only once the document has
  // actually loaded — see useRecordPromptView.
  useRecordPromptView(toPromptId(promptId), prompt !== undefined);

  // Server value + anything this device has counted but not had confirmed.
  const stats = useDisplayStats(promptId, prompt?.stats ?? NO_STATS);

  const recordEngagement = useRecordPromptEngagement();
  const onCopied = useCallback(() => {
    recordEngagement(toPromptId(promptId), 'copiesCount');
  }, [recordEngagement, promptId]);
  const onShared = useCallback(() => {
    recordEngagement(toPromptId(promptId), 'sharesCount');
  }, [recordEngagement, promptId]);

  const retry = useCallback(() => {
    fireAndForget(query.refetch());
  }, [query]);

  const contentStyle = useMemo(
    () => ({ paddingBottom: styles.metrics.actionBar + insets.bottom }),
    [insets.bottom, styles],
  );
  // The gesture bar already provides the pad on a device that has one; where it
  // does not, the bar supplies its own so the buttons never sit on the edge.
  const actionBarStyle = useMemo(
    () => ({ paddingBottom: insets.bottom > 0 ? insets.bottom : styles.metrics.md }),
    [insets.bottom, styles],
  );

  // The hero runs under the status bar, so the floating controls have to place
  // themselves below it rather than inheriting a safe-area pad from Screen.
  const heroControlStyle = useMemo(
    () => ({ top: insets.top + styles.metrics.sm }),
    [insets.top, styles],
  );

  const onBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // push, not navigate: browsing the category from here should stack on top of
  // this prompt, so Back returns to it rather than unwinding to the feed.
  const onOpenCategory = useCallback(() => {
    if (prompt === undefined) {
      return;
    }
    navigation.push('Category', {
      categoryId: toCategoryId(prompt.categoryId),
      title: prompt.categoryName,
    });
  }, [navigation, prompt]);

  if (query.isError) {
    return (
      <Screen testID="detail-error">
        <ErrorState
          error={isAppError(query.error) ? query.error : unknownError()}
          onRetry={retry}
        />
      </Screen>
    );
  }

  // Only reached on a cold open — arriving from the grid, the cache seeds a
  // placeholder and this branch is skipped entirely.
  if (!prompt) {
    return (
      <Screen edges={[]} testID="detail-loading">
        {/* Shaped like the real page, not three grey bars: the hero keeps a
            4:5 box so nothing jumps when the image lands, and each block sits
            where its content will. */}
        <View style={styles.heroSkeleton}>
          <Skeleton height="100%" borderRadius={0} />
        </View>
        <View style={styles.body}>
          <View style={styles.titleBlock}>
            <Skeleton height={styles.metrics.heading} width="80%" />
            <View style={styles.authorRow}>
              <Skeleton height={styles.metrics.sm} width={styles.metrics.sm} borderRadius={styles.radii.pill} />
              <Skeleton width="40%" />
            </View>
          </View>
          <View style={styles.statRow}>
            <Skeleton height={styles.metrics.chip} width={styles.metrics.w96} borderRadius={styles.radii.pill} />
            <Skeleton height={styles.metrics.chip} width={styles.metrics.w96} borderRadius={styles.radii.pill} />
            <Skeleton height={styles.metrics.chip} width={styles.metrics.w80} borderRadius={styles.radii.pill} />
          </View>
          <View style={styles.promptBox}>
            <Skeleton />
            <Skeleton />
            <Skeleton />
            <Skeleton width="55%" />
          </View>
        </View>
      </Screen>
    );
  }

  // The placeholder carries everything except the prompt body, so this is the
  // one region that still has to show it is waiting.
  const isHydrating = prompt.prompt.length === 0;

  return (
    <Screen edges={[]} testID="detail">
      <ScrollView contentContainerStyle={contentStyle} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          {/* Full resolution here — and only here. It crossfades in over the
              cached thumbnail the placeholder painted on the first frame.
              Swipeable when the prompt carries more than one image. */}
          <PromptImagePager images={prompt.images} title={prompt.title} />

          {/* Top-down, opaque to transparent — it darkens the band the status
              bar and back control occupy without dimming the image itself. */}
          <LinearGradient
            colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)']}
            style={styles.heroScrim}
            pointerEvents="none"
          />

          <IconButton
            variant="overlay"
            style={[styles.heroBack, heroControlStyle]}
            onPress={onBack}
            accessibilityLabel="Go back"
            testID="detail-back">
            <Icon name="chevronLeft" size={styles.iconSizes.lg} color="onAccent" strokeWidth={2.2} />
          </IconButton>

          <View style={[styles.heroFavorite, heroControlStyle]}>
            <FavoriteButton promptId={prompt.id} promptTitle={prompt.title} />
          </View>

          {badge !== null && (
            <View style={styles.heroBadge}>
              <Badge label={badge.label} tone={badge.tone} />
            </View>
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.titleBlock}>
            <Text variant="h1">{prompt.title}</Text>

            <View style={styles.authorRow}>
              <Avatar
                name={prompt.author.name}
                uri={prompt.author.avatarUrl ?? undefined}
                size="sm"
              />
              <View style={styles.authorIdentity}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {prompt.author.name}
                </Text>
                <Text variant="caption" color="tertiary">
                  {formatRelativeDate(prompt.createdAt)}
                </Text>
              </View>
              {/* Tappable: the category was already named here, and a reader who
                  likes this one wants more of the same. It saves going back to
                  the wall and finding the chip. */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Browse ${prompt.categoryName}`}
                testID="detail-category"
                onPress={onOpenCategory}>
                <Badge label={prompt.categoryName} tone="accent" />
              </Pressable>
            </View>
          </View>

          {/* Views, copies and shares — what a prompt is actually FOR.
              Likes were removed: a heart that both scored the prompt and saved
              it to Favourites made one gesture mean two things. The heart on
              the hero is now unambiguously "save this". */}
          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Icon name="eye" size={styles.iconSizes.xs} color="tertiary" />
              <Text variant="label" color="secondary" testID="stat-views">
                {`${formatCount(stats.viewsCount)} views`}
              </Text>
            </View>
            <View style={styles.stat}>
              <Icon name="copy" size={styles.iconSizes.xs} color="tertiary" />
              <Text variant="label" color="secondary" testID="stat-copies">
                {`${formatCount(stats.copiesCount)} copies`}
              </Text>
            </View>
            <View style={styles.stat}>
              <Icon name="share" size={styles.iconSizes.xs} color="tertiary" />
              <Text variant="label" color="secondary" testID="stat-shares">
                {`${formatCount(stats.sharesCount)} shares`}
              </Text>
            </View>
          </View>

          <Divider />

          <View style={styles.section}>
            <Text variant="h3">Prompt</Text>
            <View style={styles.promptBox}>
              {isHydrating ? (
                // Three lines of shimmer, not the words "Loading prompt…":
                // placeholder text is indistinguishable from a prompt that
                // genuinely says that, and it does not reserve the real height.
                <>
                  <Skeleton />
                  <Skeleton />
                  <Skeleton width="60%" />
                </>
              ) : (
                // Prompts run to several thousand characters. Seven lines is
                // enough to judge one; the rest is a tap away.
                <ExpandableText variant="mono" selectable numberOfLines={7} testID="detail-prompt">
                  {prompt.prompt}
                </ExpandableText>
              )}
            </View>

            {prompt.tags.length > 0 && (
              <View style={styles.tags}>
                {prompt.tags.map(tag => (
                  <Badge key={tag} label={`#${tag}`} />
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Suggestions live outside the padded body so each rail can bleed to
            the screen edge and scroll past it. */}
        <View style={styles.sections}>
          {/* Closest to the prompt, because it is the only strip that depends
              on which prompt you are actually looking at. */}
          <PromptRelatedRail
            promptId={prompt.id}
            categoryId={prompt.categoryId}
            categoryName={prompt.categoryName}
            rank={0}
            ledger={ledger}
          />
          {DETAIL_SECTIONS.map((section, index) => (
            <PromptSectionRail
              key={section.sort}
              section={section}
              excludeId={prompt.id}
              // Related holds rank 0, so the declared sections follow it.
              rank={index + 1}
              ledger={ledger}
            />
          ))}
        </View>
      </ScrollView>

      <View style={[styles.actionBar, actionBarStyle]}>
        <PromptActions
          title={prompt.title}
          promptText={prompt.prompt}
          shareUrl={promptWebUrl(prompt.id)}
          authorName={prompt.author.name}
          onCopied={onCopied}
          onShared={onShared}
        />
      </View>
    </Screen>
  );
};
