import React from 'react';

import { renderWithTheme } from '../../../test-utils/renderWithTheme';
import { BrandMark } from './BrandMark';

describe('BrandMark', () => {
  it('renders at the requested size', () => {
    const { getByTestId } = renderWithTheme(<BrandMark size={46} testID="mark" />);

    const svg = getByTestId('mark');
    expect(svg.props.width).toBe(46);
    expect(svg.props.height).toBe(46);
  });

  /**
   * The artwork is authored in the icon's own 1024 space. Keeping the viewBox
   * fixed is what lets every call site pick a size without the proportions
   * drifting from the launcher icon.
   */
  it('always draws in the icon coordinate space', () => {
    const { getByTestId } = renderWithTheme(<BrandMark size={200} testID="mark" />);

    // react-native-svg decomposes viewBox into these on the host component.
    expect(getByTestId('mark').props.vbWidth).toBe(1024);
    expect(getByTestId('mark').props.vbHeight).toBe(1024);
  });

  it('can drop the tile for use on a full-bleed background', () => {
    const withTile = renderWithTheme(<BrandMark size={46} radius={14} testID="a" />);
    const without = renderWithTheme(<BrandMark size={46} background={false} testID="b" />);

    // The tile is one extra <Rect> behind the glyph.
    const count = (tree: ReturnType<typeof renderWithTheme>) =>
      JSON.stringify(tree.toJSON()).split('RNSVGRect').length;

    expect(count(withTile)).toBeGreaterThan(count(without));
  });
});
