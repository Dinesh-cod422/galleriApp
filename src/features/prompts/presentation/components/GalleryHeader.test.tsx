import React from 'react';
import { Text } from 'react-native';

import { renderWithTheme } from '../../../../test-utils/renderWithTheme';
import { APP_NAME, APP_TAGLINE } from '@core/config/brand';
import { GalleryHeader } from './GalleryHeader';

const setup = (isFiltered = false) =>
  renderWithTheme(
    <GalleryHeader onPressSearch={jest.fn()} onPressFilter={jest.fn()} isFiltered={isFiltered} />,
  );

/** Every string the masthead actually paints, in render order. */
const visibleText = (tree: ReturnType<typeof setup>): string[] =>
  tree.UNSAFE_getAllByType(Text).flatMap(node =>
    node.props.children === undefined || typeof node.props.children !== 'string'
      ? []
      : [node.props.children],
  );

describe('GalleryHeader', () => {
  it('shows the app name and its tagline', () => {
    const { getByText } = setup();

    expect(getByText(APP_NAME)).toBeTruthy();
    expect(getByText(APP_TAGLINE)).toBeTruthy();
  });

  /**
   * The masthead once carried a different name from the launcher and the URL
   * scheme. This asserts the WHOLE of what it paints rather than checking for
   * particular old spellings — so any second name that reappears fails here,
   * including one nobody thought to look for, and this test never has to name
   * the strings it is guarding against.
   */
  it('paints nothing but the app name and the tagline', () => {
    expect(visibleText(setup())).toEqual([APP_NAME, APP_TAGLINE]);
  });

  it('shows the launcher icon artwork rather than a stand-in glyph', () => {
    expect(setup().getByTestId('brand-mark')).toBeTruthy();
  });

  /**
   * The sort sheet closes on choosing, so without this the feed reorders and
   * the control that did it looks untouched — the change reads as the app
   * rearranging itself rather than as something the user did.
   */
  it('marks the filter button only while the feed is not in its default state', () => {
    expect(setup(false).queryByTestId('header-filter-dot')).toBeNull();
    expect(setup(true).getByTestId('header-filter-dot')).toBeTruthy();
  });
});
