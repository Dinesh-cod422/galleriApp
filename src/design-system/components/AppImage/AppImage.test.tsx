import React from 'react';
import { act, screen } from '@testing-library/react-native';

import { renderWithTheme } from '../../../test-utils/renderWithTheme';
import { AppImage } from './AppImage';

jest.mock('@d11/react-native-fast-image', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => (
      <View {...props} testID={(props.testID as string | undefined) ?? 'fast-image'} />
    ),
  };
});

const finishLoading = (): void => {
  act(() => {
    screen.getByTestId('fast-image').props.onLoadEnd?.();
  });
};

const skeleton = () => screen.queryByTestId("hero-skeleton");

describe('AppImage', () => {
  it('shimmers until the image resolves, then stops', () => {
    renderWithTheme(<AppImage testID="hero" uri="https://cdn/a.webp" />);
    expect(skeleton()).toBeTruthy();

    finishLoading();

    expect(skeleton()).toBeNull();
  });

  it('stops shimmering on a FAILED load too', () => {
    // onLoadEnd fires for errors as well; onLoad would not, leaving a dead URL
    // shimmering for ever.
    renderWithTheme(<AppImage testID="hero" uri="https://cdn/missing.webp" />);

    finishLoading();

    expect(skeleton()).toBeNull();
  });

  it('shimmers again when the source changes', () => {
    const { rerender } = renderWithTheme(
      <AppImage testID="hero" uri="https://cdn/a.webp" />,
    );
    finishLoading();
    expect(skeleton()).toBeNull();

    rerender(<AppImage testID="hero" uri="https://cdn/b.webp" />);

    expect(skeleton()).toBeTruthy();
  });

  it('does not shimmer again on an unrelated re-render', () => {
    const { rerender } = renderWithTheme(
      <AppImage testID="hero" uri="https://cdn/a.webp" priority="normal" />,
    );
    finishLoading();

    // Same uri, different prop: the picture is already on screen and must stay.
    rerender(<AppImage testID="hero" uri="https://cdn/a.webp" priority="high" />);

    expect(skeleton()).toBeNull();
  });

  it('can be turned off', () => {
    renderWithTheme(
      <AppImage testID="hero" uri="https://cdn/a.webp" showSkeleton={false} />,
    );

    expect(skeleton()).toBeNull();
  });
});

describe('AppImage placeholder layer', () => {
  const placeholder = () => screen.queryByTestId('hero-placeholder');

  it('holds the cached thumbnail under the full file until it paints', () => {
    renderWithTheme(
      <AppImage testID="hero" uri="https://cdn/full.webp" placeholderUri="https://cdn/thumb.webp" />,
    );
    expect(placeholder()).toBeTruthy();

    finishLoading();

    // Dropped once the real file covers it — no second decoded bitmap kept.
    expect(placeholder()).toBeNull();
  });

  it('does not stack the same picture on itself', () => {
    renderWithTheme(
      <AppImage testID="hero" uri="https://cdn/a.webp" placeholderUri="https://cdn/a.webp" />,
    );

    expect(placeholder()).toBeNull();
  });

  it('brings the thumbnail back when the source upgrades', () => {
    // The detail screen: placeholder paints the thumbnail, then the real
    // document swaps in the full file. The thumbnail must cover that gap.
    const { rerender } = renderWithTheme(
      <AppImage testID="hero" uri="https://cdn/thumb.webp" placeholderUri="https://cdn/thumb.webp" />,
    );
    finishLoading();
    expect(placeholder()).toBeNull();

    rerender(
      <AppImage testID="hero" uri="https://cdn/full.webp" placeholderUri="https://cdn/thumb.webp" />,
    );

    expect(placeholder()).toBeTruthy();
  });
});

describe('AppImage fade', () => {
  const mainImage = () => screen.getByTestId('fast-image');

  it('does NOT fade when there is nothing behind it', () => {
    // Fading from transparent over the grey ground is what produced the
    // washed-out first frame on the detail screen.
    renderWithTheme(<AppImage testID="hero" uri="https://cdn/a.webp" transition="fade" />);

    expect(mainImage().props.transition).toBe('none');
  });

  it('does not fade while the placeholder and the source are the same picture', () => {
    renderWithTheme(
      <AppImage
        testID="hero"
        uri="https://cdn/thumb.webp"
        placeholderUri="https://cdn/thumb.webp"
        transition="fade"
      />,
    );

    expect(mainImage().props.transition).toBe('none');
  });

  it('fades once a real thumbnail sits underneath', () => {
    renderWithTheme(
      <AppImage
        testID="hero"
        uri="https://cdn/full.webp"
        placeholderUri="https://cdn/thumb.webp"
        transition="fade"
      />,
    );

    expect(mainImage().props.transition).toBe('fade');
  });

  it('honours transition="none" even with a layer beneath', () => {
    renderWithTheme(
      <AppImage
        testID="hero"
        uri="https://cdn/full.webp"
        placeholderUri="https://cdn/thumb.webp"
        transition="none"
      />,
    );

    expect(mainImage().props.transition).toBe('none');
  });
});
