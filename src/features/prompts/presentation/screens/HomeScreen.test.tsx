import React from 'react';

import { renderWithTheme } from '../../../../test-utils/renderWithTheme';

const mockVm = jest.fn();
jest.mock('../viewmodels/useHomeViewModel', () => ({
  useHomeViewModel: () => mockVm(),
}));

// These run their own queries and are not what these assertions are about.
jest.mock('../components/PromptFilterSheet', () => ({ PromptFilterSheet: () => null }));
jest.mock('../components/CategoryChips', () => ({ CategoryChips: () => null }));

import { HomeScreen } from './HomeScreen';

const baseVm = {
  status: 'success' as const,
  error: null,
  prompts: [],
  categories: [],
  isLoadingCategories: false,
  selectedCategoryId: null,
  selectedCategoryName: null,
  sort: 'newest' as const,
  sortTitle: 'Newest',
  isFiltered: false,
  onSelectSort: jest.fn(),
  isFetchingMore: false,
  isRefreshing: false,
  onSelectCategory: jest.fn(),
  onPressPrompt: jest.fn(),
  onPressSearch: jest.fn(),
  onEndReached: jest.fn(),
  onRefresh: jest.fn(),
  retry: jest.fn(),
};

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVm.mockReturnValue(baseVm);
  });

  /** Painted by `Screen`, so every screen gets it from one place. */
  it('sits on the app canvas, wash and all', () => {
    const { getByTestId } = renderWithTheme(<HomeScreen />);

    expect(getByTestId('ambient-background')).toBeTruthy();
  });

  it('shows the skeleton only while there is nothing to show', () => {
    mockVm.mockReturnValue({ ...baseVm, status: 'loading' });
    const loading = renderWithTheme(<HomeScreen />);
    expect(loading.getByTestId('home-loading')).toBeTruthy();

    mockVm.mockReturnValue({ ...baseVm, status: 'success', isRefreshing: true });
    const refreshing = renderWithTheme(<HomeScreen />);

    // A background refresh keeps the content rather than blanking the screen.
    expect(refreshing.queryByTestId('home-loading')).toBeNull();
  });

  it('surfaces a load failure with a way back', () => {
    mockVm.mockReturnValue({
      ...baseVm,
      status: 'error',
      error: { kind: 'unknown', message: 'nope', retryable: true },
    });

    expect(renderWithTheme(<HomeScreen />).getByTestId('home-error')).toBeTruthy();
  });
});
