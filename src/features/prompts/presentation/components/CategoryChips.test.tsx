import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import { categoryId } from '@core/types/branded';
import { type Category } from '@features/categories/domain/entities/Category';

import { renderWithTheme } from '../../../../test-utils/renderWithTheme';
import { CategoryChips } from './CategoryChips';

const category = (id: string, name: string, promptCount: number): Category => ({
  id: categoryId(id),
  name,
  slug: id,
  iconName: 'image',
  coverUrl: null,
  promptCount,
  sortOrder: 0,
});

const CATEGORIES = [category('photography', 'Photography', 4), category('portrait', 'Portrait', 7)];

describe('CategoryChips', () => {
  it('always offers a way back to the unfiltered feed', () => {
    const onSelect = jest.fn();
    renderWithTheme(
      <CategoryChips
        categories={CATEGORIES}
        loading={false}
        selectedId="photography"
        onSelect={onSelect}
      />,
    );

    fireEvent.press(screen.getByTestId('category-chip-all'));

    // null, not '' or 'all' — the feed hook keys off null to mean "no filter".
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('reports the category id when one is chosen', () => {
    const onSelect = jest.fn();
    renderWithTheme(
      <CategoryChips categories={CATEGORIES} loading={false} selectedId={null} onSelect={onSelect} />,
    );

    fireEvent.press(screen.getByTestId('category-chip-portrait'));

    expect(onSelect).toHaveBeenCalledWith('portrait');
  });

  it('marks the active chip as selected for assistive tech, not just visually', () => {
    renderWithTheme(
      <CategoryChips
        categories={CATEGORIES}
        loading={false}
        selectedId="portrait"
        onSelect={jest.fn()}
      />,
    );

    expect(screen.getByTestId('category-chip-portrait').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('category-chip-all').props.accessibilityState.selected).toBe(false);
  });

  it('shows placeholders instead of an empty bar while categories load', () => {
    renderWithTheme(
      <CategoryChips categories={[]} loading onSelect={jest.fn()} selectedId={null} />,
    );

    expect(screen.queryByTestId('category-chip-all')).toBeNull();
    expect(screen.getAllByLabelText('Loading').length).toBeGreaterThan(0);
  });
});
