import React from 'react';
import { StyleSheet } from 'react-native';
import { screen } from '@testing-library/react-native';

import { renderWithTheme } from '../../../../test-utils/renderWithTheme';
import { type PromptImage } from '../../domain/entities/Prompt';
import { PromptImagePager } from './PromptImagePager';

const image = (url: string, aspectRatio = 0.8): PromptImage => ({
  url,
  thumbnailUrl: `${url}-thumb`,
  width: 1000,
  height: 1250,
  aspectRatio,
});

const THUMB = image('https://cdn/thumb.webp');
const FULL = image('https://cdn/full.webp');

const aspectOf = (testID: string): number | undefined =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style)?.aspectRatio;

describe('PromptImagePager', () => {
  it('keeps one pager when the real document replaces the cached placeholder', () => {
    // The flicker users reported: swapping the whole subtree unmounted the
    // image being looked at, so it blanked and loaded a second time.
    const { rerender } = renderWithTheme(<PromptImagePager images={[THUMB]} title="Couple" />);
    expect(screen.getByTestId('detail-image-0')).toBeTruthy();

    rerender(<PromptImagePager images={[FULL, image('https://cdn/alt.webp')]} title="Couple" />);

    expect(screen.getByTestId('detail-image-pager')).toBeTruthy();
    expect(screen.getByTestId('detail-image-0')).toBeTruthy();
    expect(screen.getByTestId('detail-image-1')).toBeTruthy();
  });

  it('hides the counter for a single image', () => {
    renderWithTheme(<PromptImagePager images={[FULL]} title="Couple" />);

    expect(screen.queryByText('1/1')).toBeNull();
  });

  it('shows the counter once there is more than one image', () => {
    renderWithTheme(
      <PromptImagePager images={[FULL, image('https://cdn/alt.webp')]} title="Couple" />,
    );

    expect(screen.getByText('1/2')).toBeTruthy();
  });

  it('sizes every page to the PRIMARY ratio so the hero cannot resize mid-swipe', () => {
    renderWithTheme(
      <PromptImagePager images={[FULL, image('https://cdn/tall.webp', 0.5)]} title="Couple" />,
    );

    expect(aspectOf('detail-image-0')).toBeCloseTo(0.8);
    expect(aspectOf('detail-image-1')).toBeCloseTo(0.8);
  });

  it('renders nothing rather than crashing on an empty array', () => {
    renderWithTheme(<PromptImagePager images={[]} title="Couple" />);

    expect(screen.queryByTestId('detail-image-pager')).toBeNull();
  });
});
