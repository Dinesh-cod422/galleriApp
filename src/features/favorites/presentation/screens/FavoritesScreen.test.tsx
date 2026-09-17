import React from 'react';

import { renderWithTheme } from '../../../../test-utils/renderWithTheme';
import {
  authorId,
  categoryId,
  promptId as toPromptId,
} from '@core/types/branded';
import { type PromptDetail } from '@features/prompts/domain/entities/Prompt';

const mockPush = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ push: mockPush }),
}));

/** Reaches Firestore through the container, which Jest cannot transform. */
const mockUsePromptsByIds = jest.fn();
jest.mock('@features/prompts/presentation/hooks/usePrompts', () => ({
  usePromptsByIds: (ids: readonly string[]) => mockUsePromptsByIds(ids),
}));

import { FavoritesScreen } from './FavoritesScreen';
import { useFavoritesStore } from '../stores/favoritesStore';

const prompt = (id: string, title: string): PromptDetail =>
  ({
    id: toPromptId(id),
    title,
    thumbnailUrl: 'https://example.test/t.webp',
    blurHash: null,
    aspectRatio: 0.8,
    categoryId: categoryId('cat_couple'),
    categoryName: 'Couple',
    author: { id: authorId('a1'), name: 'Ada', avatarUrl: null },
    stats: { likesCount: 0, viewsCount: 0, copiesCount: 0, favoritesCount: 0, sharesCount: 0 },
    isFeatured: false,
    isTrending: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  }) as PromptDetail;

describe('FavoritesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFavoritesStore.setState({ ids: new Set() });
    mockUsePromptsByIds.mockReturnValue({ items: [], isPending: false, isError: false });
  });

  it('explains how to save something when nothing is saved', () => {
    const { getByTestId, queryByTestId } = renderWithTheme(<FavoritesScreen />);

    expect(getByTestId('favorites-empty')).toBeTruthy();
    expect(queryByTestId('favorites-grid')).toBeNull();
  });

  it('does not fetch anything when there are no favourites', () => {
    renderWithTheme(<FavoritesScreen />);

    expect(mockUsePromptsByIds).toHaveBeenCalledWith([]);
  });

  /**
   * A Set iterates in insertion order, so the prompt just saved would land at
   * the BOTTOM of a long grid — the one place the user is not looking.
   */
  it('asks for the most recently saved prompt first', () => {
    useFavoritesStore.setState({ ids: new Set(['pr_1', 'pr_2', 'pr_3']) });

    renderWithTheme(<FavoritesScreen />);

    expect(mockUsePromptsByIds).toHaveBeenCalledWith(['pr_3', 'pr_2', 'pr_1']);
  });

  it('shows the saved prompts once they resolve', async () => {
    useFavoritesStore.setState({ ids: new Set(['pr_1']) });
    mockUsePromptsByIds.mockReturnValue({
      items: [prompt('pr_1', 'Golden hour portrait')],
      isPending: false,
      isError: false,
    });

    const { findByTestId, getByText } = renderWithTheme(<FavoritesScreen />);

    // findBy, not getBy: FlashList settles its layout on a timer, and querying
    // synchronously leaves that update to fire after the test ends — which
    // setupAfterEnv turns into an act() failure.
    expect(await findByTestId('prompt-tile-pr_1')).toBeTruthy();
    expect(getByText('1 saved prompt')).toBeTruthy();
  });

  it('pluralises the saved count', () => {
    useFavoritesStore.setState({ ids: new Set(['pr_1', 'pr_2']) });

    const { getByText } = renderWithTheme(<FavoritesScreen />);

    expect(getByText('2 saved prompts')).toBeTruthy();
  });
});
