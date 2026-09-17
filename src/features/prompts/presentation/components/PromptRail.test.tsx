import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithTheme } from '../../../../test-utils/renderWithTheme';
import { type PromptCardVm } from '../mappers/toPromptCardVm';
import { PromptRail } from './PromptRail';

const vm = (id: string): PromptCardVm => ({
  id,
  title: `Prompt ${id}`,
  thumbnailUrl: `https://example.test/${id}.webp`,
  aspectRatio: 1.5,
  authorName: 'Ada',
  authorAvatarUrl: null,
  categoryName: 'Photography',
  viewsLabel: '18K',
  dateLabel: '2d ago',
  badge: null,
});

const NINE = Array.from({ length: 9 }, (_, i) => vm(`p${i + 1}`));

describe('PromptRail', () => {
  it('ends the strip with a way into the full list', () => {
    const onShowAll = jest.fn();
    renderWithTheme(
      <PromptRail
        title="Most copied"
        items={NINE}
        loading={false}
        onPressPrompt={jest.fn()}
        onShowAll={onShowAll}
      />,
    );

    fireEvent.press(screen.getByTestId('show-all-most-copied'));

    expect(onShowAll).toHaveBeenCalledTimes(1);
  });

  it('names the destination for assistive tech, not just "Show all"', () => {
    renderWithTheme(
      <PromptRail
        title="Most shared"
        items={NINE}
        loading={false}
        onPressPrompt={jest.fn()}
        onShowAll={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Show all most shared prompts')).toBeTruthy();
  });

  it('omits the tenth cell when there is no full list to open', () => {
    renderWithTheme(
      <PromptRail title="Trending" items={NINE} loading={false} onPressPrompt={jest.fn()} />,
    );

    expect(screen.queryByTestId('show-all-trending')).toBeNull();
  });

  it('shows placeholders rather than an empty strip while loading', () => {
    renderWithTheme(
      <PromptRail title="Trending" items={[]} loading onPressPrompt={jest.fn()} onShowAll={jest.fn()} />,
    );

    expect(screen.getAllByLabelText('Loading').length).toBeGreaterThan(0);
  });

  it('shows images only — no title, author or counts on a rail card', () => {
    renderWithTheme(
      <PromptRail title="Trending" items={NINE} loading={false} onPressPrompt={jest.fn()} />,
    );

    expect(screen.queryByText('Prompt p1')).toBeNull();
    expect(screen.queryByText('Ada')).toBeNull();
    expect(screen.queryByText('1.2K')).toBeNull();
    // Still reachable by name: the label is all a screen reader has to go on.
    expect(screen.getByLabelText('Prompt p1, by Ada')).toBeTruthy();
  });

  it('gives every cell the same ratio, whatever the image is', () => {
    // A rail sizes itself to its tallest cell, so natural ratios would leave
    // dead space under every shorter one.
    const mixed = [{ ...NINE[0]!, id: 'tall', aspectRatio: 0.67 }, { ...NINE[1]!, id: 'wide', aspectRatio: 1.78 }];
    renderWithTheme(
      <PromptRail title="Trending" items={mixed} loading={false} onPressPrompt={jest.fn()} />,
    );

    const ratioOf = (id: string): unknown =>
      StyleSheet.flatten(screen.getByTestId(`prompt-tile-image-${id}`).props.style).aspectRatio;

    expect(ratioOf('tall')).toBe(ratioOf('wide'));
  });
});
