import React from 'react';
import { Text as RNText } from 'react-native';

import { renderWithTheme } from '../../test-utils/renderWithTheme';
import { AnimatedSplash } from './AnimatedSplash';

const Child = (): React.JSX.Element => <RNText>app content</RNText>;

const render = (disabled = false) =>
  renderWithTheme(
    <AnimatedSplash disabled={disabled}>
      <Child />
    </AnimatedSplash>,
  );

/**
 * The Reanimated mock settles every animation instantly and fires its callbacks
 * as finished, so these assert the END state — which is the interesting half
 * anyway. The interpolation is the library's job, not this component's.
 */
describe('AnimatedSplash', () => {
  /**
   * The splash is a curtain, not a gate. Holding the app back until it finished
   * would turn a decorative half second into half a second of doing nothing,
   * when the queries should already be in flight behind it.
   */
  it('mounts the app underneath rather than waiting for the animation', () => {
    expect(render().getByText('app content')).toBeTruthy();
  });

  /**
   * Left mounted at zero opacity it would be a full-screen layer composited on
   * every frame for the life of the app.
   */
  it('removes the curtain once it has finished', () => {
    expect(render().queryByTestId('animated-splash')).toBeNull();
  });

  it('renders nothing extra when disabled', () => {
    const { queryByTestId, getByText } = render(true);

    expect(queryByTestId('animated-splash')).toBeNull();
    expect(getByText('app content')).toBeTruthy();
  });
});
