import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import { renderWithTheme } from '../../../../test-utils/renderWithTheme';
import { type PromptListItem } from '@features/prompts/domain/entities/Prompt';
import { authorId, categoryId, promptId } from '@core/types/branded';

const mockGoBack = jest.fn();
const mockPush = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, push: mockPush }),
}));

const mockUseSearchResults = jest.fn();
jest.mock('../hooks/usePrompts', () => ({
  useSearchResults: (query: string) => mockUseSearchResults(query),
}));

const mockUseCategories = jest.fn();
jest.mock('../hooks/useCategories', () => ({
  useCategories: () => mockUseCategories(),
}));

import { SearchScreen } from './SearchScreen';

const item = (id: string, title: string): PromptListItem =>
  ({
    id: promptId(id),
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
  }) as PromptListItem;

const idle = { items: [], enabled: false, isPending: false, isError: false, error: null,
  hasNextPage: false, isFetchingNextPage: false, fetchNextPage: jest.fn(), refetch: jest.fn() };

describe('SearchScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSearchResults.mockReturnValue(idle);
    mockUseCategories.mockReturnValue({
      data: [{ id: 'cat_couple', name: 'Couple' }],
      isPending: false,
    });
  });

  /**
   * Matching is whole-word only (Firestore `array-contains`), so an empty field
   * with no help is a dead end. The chips are guaranteed-valid words.
   */
  it('offers category suggestions before anything is typed', () => {
    const { getByTestId } = renderWithTheme(<SearchScreen />);

    expect(getByTestId('search-suggestion-cat_couple')).toBeTruthy();
  });

  it('fills the field when a suggestion is tapped', () => {
    const { getByTestId } = renderWithTheme(<SearchScreen />);

    fireEvent.press(getByTestId('search-suggestion-cat_couple'));

    expect(getByTestId('search-input').props.value).toBe('Couple');
  });

  /** Below the minimum length the query must not run at all. */
  it('does not search a single character', () => {
    const { getByTestId } = renderWithTheme(<SearchScreen />);

    fireEvent.changeText(getByTestId('search-input'), 'c');

    expect(getByTestId('search-suggestion-cat_couple')).toBeTruthy();
  });

  it('shows results once they arrive', async () => {
    mockUseSearchResults.mockReturnValue({
      ...idle,
      enabled: true,
      items: [item('pr_1', 'Cinematic Romantic Letter')],
    });

    const { findByTestId } = renderWithTheme(<SearchScreen />);

    expect(await findByTestId('prompt-tile-pr_1')).toBeTruthy();
  });

  it('explains how to search when nothing matches', () => {
    mockUseSearchResults.mockReturnValue({ ...idle, enabled: true });

    const { getByTestId } = renderWithTheme(<SearchScreen />);

    expect(getByTestId('search-empty')).toBeTruthy();
  });

  it('can be dismissed', () => {
    const { getByTestId } = renderWithTheme(<SearchScreen />);

    fireEvent.press(getByTestId('search-back'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('clears the field from the field itself', () => {
    const { getByTestId } = renderWithTheme(<SearchScreen />);

    fireEvent.changeText(getByTestId('search-input'), 'couple');
    fireEvent.press(getByTestId('search-input-clear'));

    expect(getByTestId('search-input').props.value).toBe('');
  });
});
