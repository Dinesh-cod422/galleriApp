import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import { renderWithTheme } from '../../../../test-utils/renderWithTheme';
import { categoryId } from '@core/types/branded';
import { type Category } from '@features/categories/domain/entities/Category';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockUseCategories = jest.fn();
jest.mock('../hooks/useCategories', () => ({
  useCategories: () => mockUseCategories(),
}));

const mockUseSectionPrompts = jest.fn();
jest.mock('../hooks/usePrompts', () => ({
  useSectionPrompts: (sort: string) => mockUseSectionPrompts(sort),
}));

import { ExploreScreen } from './ExploreScreen';
import { DETAIL_SECTIONS } from '../sections';

const category = (id: string, name: string, slug: string, count: number): Category => ({
  id: categoryId(id),
  name,
  slug,
  iconName: 'heart',
  coverUrl: null,
  promptCount: count,
  sortOrder: 1,
});

describe('ExploreScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCategories.mockReturnValue({
      data: [category('cat_couple', 'Couple', 'couple', 12)],
      isPending: false,
    });
    mockUseSectionPrompts.mockReturnValue({ items: [], isPending: false });
  });

  /**
   * Home's chip row is a filter and hides most of the set off-screen. Explore's
   * job is the opposite — the whole shape of the library at once.
   */
  it('shows every category as a browsable tile', () => {
    const { getByTestId } = renderWithTheme(<ExploreScreen />);

    expect(getByTestId('category-tile-cat_couple')).toBeTruthy();
  });

  it('opens a category with its name, so the header paints before the query', () => {
    const { getByTestId } = renderWithTheme(<ExploreScreen />);

    fireEvent.press(getByTestId('category-tile-cat_couple'));

    expect(mockNavigate).toHaveBeenCalledWith('Category', {
      categoryId: 'cat_couple',
      title: 'Couple',
    });
  });

  it('shows a rail for every section, each fetched on its own', () => {
    renderWithTheme(<ExploreScreen />);

    const asked = mockUseSectionPrompts.mock.calls.map(([sort]) => sort);
    expect(asked).toEqual(DETAIL_SECTIONS.map(section => section.sort));
  });

  it('offers search from here too', () => {
    const { getByTestId } = renderWithTheme(<ExploreScreen />);

    fireEvent.press(getByTestId('explore-search'));

    expect(mockNavigate).toHaveBeenCalledWith('Search');
  });

  it('shows placeholder tiles rather than an empty page while categories load', () => {
    mockUseCategories.mockReturnValue({ data: undefined, isPending: true });

    const { getByTestId, queryByTestId } = renderWithTheme(<ExploreScreen />);

    expect(getByTestId('category-grid-loading')).toBeTruthy();
    expect(queryByTestId('category-grid')).toBeNull();
  });
});
