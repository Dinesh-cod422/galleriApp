import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { type BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { renderWithTheme } from '../../test-utils/renderWithTheme';
import { haptics } from '@infra/haptics/haptics';
import { TabBar } from './TabBar';

jest.mock('@infra/haptics/haptics', () => ({ haptics: { trigger: jest.fn() } }));

const ROUTES = [
  { key: 'Home-1', name: 'Home', title: 'Home' },
  { key: 'Explore-1', name: 'Explore', title: 'Explore' },
  { key: 'Favorites-1', name: 'Favorites', title: 'Favourites' },
  { key: 'Profile-1', name: 'Profile', title: 'Profile' },
] as const;

type Harness = {
  navigate: jest.Mock;
  emit: jest.Mock;
};

/**
 * The navigator's props, hand-built.
 *
 * Mounting the real `Tab.Navigator` would test React Navigation; the bar's
 * whole job is what it does with `state`, `descriptors` and `navigation`, so
 * those are what it is given.
 */
const setup = (
  { index = 0, preventDefault = false }: { index?: number; preventDefault?: boolean } = {},
) => {
  const navigate = jest.fn();
  const emit = jest.fn(() => ({ defaultPrevented: preventDefault }));

  const props = {
    state: {
      index,
      routes: ROUTES.map(r => ({ key: r.key, name: r.name })),
    },
    descriptors: Object.fromEntries(
      ROUTES.map(r => [r.key, { options: { title: r.title } }]),
    ),
    navigation: { navigate, emit },
  } as unknown as BottomTabBarProps;

  return { ...renderWithTheme(<TabBar {...props} />), navigate, emit } as ReturnType<
    typeof renderWithTheme
  > &
    Harness;
};

/** Drives a measurement the indicator's placement depends on. */
const layout = (
  node: unknown,
  width: number,
  height: number,
  y = 0,
): void => {
  fireEvent(node as never, 'layout', {
    nativeEvent: { layout: { x: 0, y, width, height } },
  });
};

/** RN accepts nested style arrays; the assertions want one object. */
const flatten = (style: unknown): Record<string, number> =>
  Array.isArray(style)
    ? Object.assign({}, ...style.map(flatten))
    : ((style ?? {}) as Record<string, number>);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('TabBar', () => {
  it('renders one tab per route, labelled from the navigator options', () => {
    const { getByText } = setup();

    for (const route of ROUTES) {
      expect(getByText(route.title)).toBeTruthy();
    }
  });

  /**
   * The bar supplies its own accessibility, because a custom `tabBar` replaces
   * everything React Navigation would have set. Without this, VoiceOver
   * announces four unlabelled buttons and never says which one you are on.
   */
  it('marks exactly the focused tab as selected', () => {
    const { getByTestId } = setup({ index: 2 });

    expect(getByTestId('tab-Favorites').props.accessibilityState.selected).toBe(true);
    expect(getByTestId('tab-Home').props.accessibilityState.selected).toBe(false);
    expect(getByTestId('tab-Home').props.accessibilityRole).toBe('tab');
  });

  it('navigates to the route behind the tab that was pressed', () => {
    const { getByTestId, navigate, emit } = setup({ index: 0 });

    fireEvent.press(getByTestId('tab-Explore'));

    expect(emit).toHaveBeenCalledWith({
      type: 'tabPress',
      target: 'Explore-1',
      canPreventDefault: true,
    });
    expect(navigate).toHaveBeenCalledWith('Explore');
    expect(haptics.trigger).toHaveBeenCalledWith('selection');
  });

  /**
   * Pressing the tab you are already on is how a screen is asked to scroll back
   * to the top. Navigating again would reset the stack instead, and buzzing
   * would make a no-op feel like an action.
   */
  it('emits but does not navigate when the focused tab is pressed', () => {
    const { getByTestId, navigate, emit } = setup({ index: 1 });

    fireEvent.press(getByTestId('tab-Explore'));

    expect(emit).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    expect(haptics.trigger).not.toHaveBeenCalled();
  });

  /** A listener that calls `preventDefault` owns the press outright. */
  it('lets a screen take the press for itself', () => {
    const { getByTestId, navigate } = setup({ index: 0, preventDefault: true });

    fireEvent.press(getByTestId('tab-Profile'));

    expect(navigate).not.toHaveBeenCalled();
    expect(haptics.trigger).not.toHaveBeenCalled();
  });

  it('forwards a long press so a screen can offer a shortcut', () => {
    const { getByTestId, emit } = setup();

    fireEvent(getByTestId('tab-Profile'), 'longPress');

    expect(emit).toHaveBeenCalledWith({ type: 'tabLongPress', target: 'Profile-1' });
  });

  /**
   * The indicator waits for BOTH measurements — the row's width and the glyph
   * band's position. Drawn earlier it is a zero-width pill at the left edge
   * that then springs across the bar, a launch animation nobody asked for.
   *
   * The band is measured rather than computed because the glyph's offset
   * depends on the type ramp AND on the OS text-size setting, so no arithmetic
   * here would survive a user who enlarges their text.
   */
  it('places the indicator from what it measured, not from arithmetic', () => {
    const { getByTestId, queryByTestId } = setup({ index: 0 });

    expect(queryByTestId('tab-indicator')).toBeNull();

    layout(getByTestId('tab-row'), 360, 62);
    // Still nothing: the width alone does not say where the icons sit.
    expect(queryByTestId('tab-indicator')).toBeNull();

    // Only the first tab reports — one measurement describes all four.
    layout(getByTestId('tab-Home').children[0] as never, 60, 32, 8);

    const indicator = getByTestId('tab-indicator');
    const style = flatten(indicator.props.style);
    expect(style.top).toBe(8);
    expect(style.height).toBe(32);
    // Narrower than its tab, so it reads as a highlight and not as a divider.
    expect(style.width).toBeGreaterThan(0);
    expect(style.width).toBeLessThan(360 / ROUTES.length);
  });

  it('sits the indicator over the tab that is focused', () => {
    const { getByTestId } = setup({ index: 2 });

    layout(getByTestId('tab-row'), 360, 62);
    layout(getByTestId('tab-Home').children[0] as never, 60, 32, 8);

    const style = flatten(getByTestId('tab-indicator').props.style);
    const tabWidth = 360 / ROUTES.length;
    const expected = tabWidth * 2 + (tabWidth - (style.width ?? 0)) / 2;
    expect(style.transform).toContainEqual({ translateX: expected });
  });
});
