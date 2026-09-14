import React, { useCallback, useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isAppError, unknownError } from '@core/errors/AppError';
import { fireAndForget } from '@core/utils/fireAndForget';
import { formatCount } from '@core/utils/formatCount';
import { formatRelativeDate } from '@core/utils/formatRelativeDate';
import { promptId as toPromptId } from '@core/types/branded';
import { type RootStackParamList } from '@app/navigation/navigation.types';
import { FavoriteButton } from '@features/favorites/presentation/components/FavoriteButton';
import {
  AppImage,
  Avatar,
  Badge,
  Divider,
  ErrorState,
  Icon,
  Screen,
  Skeleton,
  Text,
  type Theme,
  useThemedStyles,
} from '@ds';

import { PromptActions } from '../components/PromptActions';
import { PromptRelatedRail } from '../components/PromptRelatedRail';
import { PromptSectionRail } from '../components/PromptSectionRail';
import { usePromptById } from '../hooks/usePrompts';
import { toPromptBadge } from '../mappers/toPromptCardVm';
import { DETAIL_SECTIONS } from '../sections';

/** Clears the sticky action bar so the last metadata row is never hidden. */
const ACTION_BAR_HEIGHT = 76;

const styleFactory = (theme: Theme) => ({
  body: { padding: theme.layout.gutter, gap: theme.spacing.base },
  hero: { position: 'relative' as const },
  heroBadge: { position: 'absolute' as const, top: theme.spacing.base, left: theme.spacing.base },
  heroFavorite: {
    position: 'absolute' as const,
    bottom: theme.spacing.sm,
    right: theme.spacing.sm,
  },

  titleBlock: { gap: theme.spacing.sm },
  authorRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing.sm,
  },
  authorName: { flexShrink: 1 },

  // Counts as pills rather than bare text: at a glance they read as one group
  // of facts about the image, not as three stray labels under the title.
  statRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: theme.spacing.sm },
  stat: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.bg.subtle,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill,
  },

  section: { gap: theme.spacing.sm },
  sections: { gap: theme.spacing.xl, paddingTop: theme.spacing.xl },
  promptBox: {
    backgroundColor: theme.colors.bg.subtle,
    borderRadius: theme.radius.md,
    padding: theme.spacing.base,
    gap: theme.spacing.sm,
  },
  tags: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: theme.spacing.xs },

  card: {
    backgroundColor: theme.colors.bg.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    paddingHorizontal: theme.spacing.base,
  },
  metaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: theme.spacing.base,
    paddingVertical: theme.spacing.md,
  },
  metaValue: { flexShrink: 1, textAlign: 'right' as const },

  // Pinned: the page scrolls well past the actions, and the two things a
  // prompt is FOR should never require scrolling back up to reach.
  actionBar: {
    paddingHorizontal: theme.layout.gutter,
    paddingTop: theme.spacing.sm,
    backgroundColor: theme.colors.bg.canvas,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.subtle,
  },
});

export const PromptDetailScreen = (): React.JSX.Element => {
  const styles = useThemedStyles(styleFactory);
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootStackParamList, 'PromptDetail'>>();
  const { promptId } = route.params;

  const query = usePromptById(toPromptId(promptId));
  const prompt = query.data;
  // The same rule the grid tiles use, so a prompt cannot be tagged "Featured"
  // in the feed and untagged on its own page.
  const badge = prompt ? toPromptBadge(prompt) : null;

  const retry = useCallback(() => {
    fireAndForget(query.refetch());
  }, [query]);

  const contentStyle = useMemo(
    () => ({ paddingBottom: ACTION_BAR_HEIGHT + insets.bottom }),
    [insets.bottom],
  );
  const actionBarStyle = useMemo(
    () => ({ paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }),
    [insets.bottom],
  );

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
      <Screen testID="detail-loading">
        <Skeleton height={260} borderRadius={0} />
        <View style={styles.body}>
          <Skeleton height={28} width="85%" />
          <Skeleton height={16} width="45%" />
          <Skeleton height={120} />
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
              cached thumbnail the placeholder painted on the first frame. */}
          <AppImage
            uri={prompt.imageUrl}
            aspectRatio={prompt.aspectRatio}
            priority="high"
            borderRadius={0}
            transition="fade"
            accessibilityLabel={prompt.title}
          />
          {badge !== null && (
            <View style={styles.heroBadge}>
              <Badge label={badge.label} tone={badge.tone} />
            </View>
          )}
          <View style={styles.heroFavorite}>
            <FavoriteButton promptId={prompt.id} promptTitle={prompt.title} />
          </View>
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
              <Text variant="bodyStrong" numberOfLines={1} style={styles.authorName}>
                {prompt.author.name}
              </Text>
              <Badge label={prompt.categoryName} tone="accent" />
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Icon name="heart" size={14} color="tertiary" />
              <Text variant="label" color="secondary">
                {`${formatCount(prompt.stats.likesCount)} likes`}
              </Text>
            </View>
            <View style={styles.stat}>
              <Icon name="eye" size={14} color="tertiary" />
              <Text variant="label" color="secondary">
                {`${formatCount(prompt.stats.viewsCount)} views`}
              </Text>
            </View>
            <View style={styles.stat}>
              <Icon name="copy" size={14} color="tertiary" />
              <Text variant="label" color="secondary">
                {`${formatCount(prompt.stats.copiesCount)} copies`}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text variant="label" color="secondary">
                {formatRelativeDate(prompt.createdAt)}
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
                  <Skeleton height={14} />
                  <Skeleton height={14} />
                  <Skeleton height={14} width="60%" />
                </>
              ) : (
                <Text variant="mono" selectable>
                  {prompt.prompt}
                </Text>
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

          {prompt.metadata.model.length > 0 && (
            <View style={styles.section}>
              <Text variant="h3">Generation</Text>
              <View style={styles.card}>
                <View style={styles.metaRow}>
                  <Text variant="body" color="secondary">
                    Model
                  </Text>
                  <Text variant="bodyStrong" style={styles.metaValue}>
                    {`${prompt.metadata.model} ${prompt.metadata.modelVersion}`.trim()}
                  </Text>
                </View>
                <Divider />
                <View style={styles.metaRow}>
                  <Text variant="body" color="secondary">
                    Aspect ratio
                  </Text>
                  <Text variant="bodyStrong" style={styles.metaValue}>
                    {prompt.metadata.aspectRatio}
                  </Text>
                </View>
                <Divider />
                <View style={styles.metaRow}>
                  <Text variant="body" color="secondary">
                    Resolution
                  </Text>
                  <Text variant="bodyStrong" style={styles.metaValue}>
                    {`${prompt.metadata.resolution.width}×${prompt.metadata.resolution.height}`}
                  </Text>
                </View>
                {prompt.metadata.negativePrompt !== null && (
                  <>
                    <Divider />
                    <View style={styles.metaRow}>
                      <Text variant="body" color="secondary">
                        Negative
                      </Text>
                      <Text variant="caption" color="tertiary" style={styles.metaValue}>
                        {prompt.metadata.negativePrompt}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          )}
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
          />
          {DETAIL_SECTIONS.map(section => (
            <PromptSectionRail key={section.sort} section={section} excludeId={prompt.id} />
          ))}
        </View>
      </ScrollView>

      <View style={[styles.actionBar, actionBarStyle]}>
        <PromptActions
          title={prompt.title}
          promptText={prompt.prompt}
          imageUrl={prompt.imageUrl}
          authorName={prompt.author.name}
        />
      </View>
    </Screen>
  );
};
