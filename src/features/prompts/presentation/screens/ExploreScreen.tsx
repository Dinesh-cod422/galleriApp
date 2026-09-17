import React, { useCallback, useMemo } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useStableCallback } from '@core/hooks/useStableCallback';
import { type RootStackParamList } from '@app/navigation/navigation.types';
import { type Category } from '@features/categories/domain/entities/Category';
import { CategoryGrid } from '@features/categories/presentation/components/CategoryGrid';
import {
  Icon,
  IconButton,
  Screen,
  Text,
  createStyles,
  layoutOf,
  type AppTheme,
  type Responsive,
} from '@ds';

import { PromptRail } from '../components/PromptRail';
import { useCategories } from '../hooks/useCategories';
import { useSectionPrompts } from '../hooks/usePrompts';
import { toPromptCardVm } from '../mappers/toPromptCardVm';
import { DETAIL_SECTIONS, type PromptSectionDef } from '../sections';

const getStyles = (appTheme: AppTheme, responsive: Responsive) => {
  const { HScale, IconSize, VScale } = responsive;
  const layout = layoutOf(responsive);
  const p = appTheme.colors;

  return {
    ...StyleSheet.create({
      header: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        paddingHorizontal: layout.gutter,
        paddingTop: VScale.Height_9,
        paddingBottom: VScale.Height_19,
        gap: HScale.Width_14,
      },
      title: { flex: 1 },
      search: {
        width: HScale.Width_51,
        height: HScale.Width_51,
        borderRadius: 999,
        backgroundColor: p.bg.subtle,
      },
      sectionTitle: { paddingHorizontal: layout.gutter, paddingBottom: VScale.Height_14 },
      rails: { gap: HScale.Width_28, paddingTop: VScale.Height_28 },
      content: { paddingBottom: layout.tabBarClearance },
    }),
    palette: p,
    iconSizes: { lg: IconSize.iconSize_24 },
  };
};

const useStyles = createStyles(getStyles);

/**
 * One rail, fetched independently.
 *
 * A component per rail rather than one screen running four queries: each keeps
 * its own loading state, so a slow ordering shows a shimmering strip instead of
 * holding the whole page back.
 */
const SectionRail = ({
  section,
  onPressPrompt,
  onShowAll,
}: {
  section: PromptSectionDef;
  onPressPrompt: (promptId: string) => void;
  onShowAll: (section: PromptSectionDef) => void;
}): React.JSX.Element => {
  // No excludeId: unlike the detail page, nothing here is "the prompt you are
  // already looking at". Same query key though, so a prompt opened earlier has
  // already paid for these.
  const query = useSectionPrompts(section.sort);
  const items = useMemo(() => query.items.map(item => toPromptCardVm(item)), [query.items]);
  const showAll = useCallback(() => onShowAll(section), [onShowAll, section]);

  return (
    <PromptRail
      title={section.title}
      icon={section.icon}
      items={items}
      loading={query.isPending}
      onPressPrompt={onPressPrompt}
      onShowAll={showAll}
    />
  );
};

/**
 * The library's shape, rather than its stream.
 *
 * Home answers "show me something"; Search answers "find me this one". Explore
 * is the third question — "what is in here?" — and it is the only surface that
 * shows the whole category set and every ordering side by side.
 *
 * Everything on it is assembled from pieces that already existed and are
 * already reachable: the category grid leads to `Category`, and each rail's
 * "See all" leads to `PromptSection`. No new data plumbing.
 */
export const ExploreScreen = (): React.JSX.Element => {
  const styles = useStyles();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const categories = useCategories();

  const onPressPrompt = useStableCallback((promptId: string) => {
    navigation.navigate('PromptDetail', { promptId });
  });

  const onPressCategory = useStableCallback((category: Category) => {
    navigation.navigate('Category', { categoryId: category.id, title: category.name });
  });

  const onShowAll = useStableCallback((section: PromptSectionDef) => {
    navigation.navigate('PromptSection', { sort: section.sort, title: section.title });
  });

  const onPressSearch = useStableCallback(() => {
    navigation.navigate('Search');
  });

  return (
    <Screen testID="explore">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text variant="h1" style={styles.title}>
            Explore
          </Text>
          <IconButton
            variant="surface"
            style={styles.search}
            onPress={onPressSearch}
            accessibilityLabel="Search prompts"
            testID="explore-search">
            <Icon name="search" size={styles.iconSizes.lg} color="primary" strokeWidth={2} />
          </IconButton>
        </View>

        <Text variant="h3" style={styles.sectionTitle}>
          Browse by category
        </Text>
        <CategoryGrid
          categories={categories.data ?? []}
          loading={categories.isPending}
          onPress={onPressCategory}
        />

        <View style={styles.rails}>
          {DETAIL_SECTIONS.map(section => (
            <SectionRail
              key={section.sort}
              section={section}
              onPressPrompt={onPressPrompt}
              onShowAll={onShowAll}
            />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
};
