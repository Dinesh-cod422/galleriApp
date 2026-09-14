import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithTheme } from '../../../../test-utils/renderWithTheme';
import { type PromptCardVm } from '../mappers/toPromptCardVm';
import { PromptTile } from './PromptTile';

const vm = (overrides: Partial<PromptCardVm> = {}): PromptCardVm => ({
  id: 'p1',
  title: 'Neon rain over Shibuya',
  thumbnailUrl: 'https://example.test/t.webp',
  aspectRatio: 1.5,
  authorName: 'Ada',
  authorAvatarUrl: null,
  categoryName: 'Cyberpunk',
  likesLabel: '1.2K',
  viewsLabel: '18K',
  dateLabel: '2d ago',
  badge: null,
  ...overrides,
});

const aspectOf = (id: string): unknown =>
  StyleSheet.flatten(screen.getByTestId(`prompt-tile-image-${id}`).props.style).aspectRatio;

describe('PromptTile', () => {
  it('hands the detail screen only the prompt id', () => {
    const onPress = jest.fn();
    renderWithTheme(<PromptTile vm={vm()} onPress={onPress} />);

    fireEvent.press(screen.getByTestId('prompt-tile-p1'));

    expect(onPress).toHaveBeenCalledWith('p1');
  });

  it('takes its height from the image aspect ratio — the whole point of masonry', () => {
    renderWithTheme(<PromptTile vm={vm({ aspectRatio: 0.8 })} onPress={jest.fn()} />);
    expect(aspectOf('p1')).toBe(0.8);
  });

  it.each([
    ['a sliver-thin panorama', 8, 2],
    ['a skyscraper crop', 0.1, 0.5],
  ])('clamps %s so one tile cannot own the column', (_label, given, expected) => {
    renderWithTheme(<PromptTile vm={vm({ aspectRatio: given })} onPress={jest.fn()} />);
    expect(aspectOf('p1')).toBe(expected);
  });

  it('falls back to square on a corrupt ratio rather than collapsing', () => {
    renderWithTheme(<PromptTile vm={vm({ aspectRatio: Number.NaN })} onPress={jest.fn()} />);
    expect(aspectOf('p1')).toBe(1);
  });

  it('does not open the detail page when the favourite control is pressed', () => {
    // Guards the composition, not the native responder: this proves the tile's
    // onPress is not also bound to an ancestor of the heart. Real touch
    // arbitration between nested Pressables is the platform's job.
    const onPress = jest.fn();
    renderWithTheme(<PromptTile vm={vm()} onPress={onPress} />);

    fireEvent.press(screen.getByTestId('favorite-p1'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('carries the title in its accessible name, since the tile renders no text', () => {
    renderWithTheme(<PromptTile vm={vm()} onPress={jest.fn()} />);

    expect(screen.queryByText('Neon rain over Shibuya')).toBeNull();
    expect(screen.getByLabelText('Neon rain over Shibuya, by Ada')).toBeTruthy();
  });
});
