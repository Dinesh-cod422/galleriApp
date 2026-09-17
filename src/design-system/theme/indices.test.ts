import { createResponsive } from '@dineshcodes/responsive-react-native-ui';

import { layoutOf } from './layout';
import { type Responsive } from './responsive';
import { buildType } from './typography';

/**
 * What every index in this app is supposed to render.
 *
 * Under the map-read convention there is no semantic name left to check a size
 * against: `HScale.Width_18` is either the 16dp gutter or a typo, and nothing
 * in the code says which. The index is NOT the dp — `Width_18` is
 * `shortSide * 18/450`, 15.6dp on a 390dp phone — so the number cannot be read
 * as its own documentation either.
 *
 * This file is that documentation, executable. Each index below was chosen so
 * the value rendered at the 390x844 design window matches the dp the design was
 * drawn at, and this asserts exactly that. Change an index without meaning to
 * and the table says what it used to be worth.
 *
 * Tolerance is half a point: the package pixel-snaps every result, so an exact
 * equality would be asserting `PixelRatio`, not the choice of index.
 */
const DESIGN = createResponsive({ width: 390, height: 844 }) as unknown as Responsive;

const closeTo = (label: string, actual: number | undefined, dp: number): void => {
  expect(`${label}: ${(actual ?? 0).toFixed(1)}`).toBe(
    `${label}: ${Math.abs((actual ?? 0) - dp) <= 0.5 ? (actual ?? 0).toFixed(1) : dp.toFixed(1)}`,
  );
};

describe('the horizontal ramp renders its design sizes', () => {
  it.each([
    ['Width_2', 2],
    ['Width_5', 4],
    ['Width_9', 8],
    ['Width_14', 12],
    ['Width_18', 16],
    ['Width_23', 20],
    ['Width_28', 24],
    ['Width_37', 32],
    ['Width_55', 48],
    ['Width_74', 64],
  ] as const)('%s is %ddp', (key, dp) => {
    closeTo(key, DESIGN.HScale[key as keyof typeof DESIGN.HScale], dp);
  });

  /** Controls and round glyph wells, which share the horizontal ramp. */
  it.each([
    ['Width_32', 28],
    ['Width_42', 36],
    ['Width_46', 40],
    ['Width_51', 44],
    ['Width_55', 48],
    ['Width_60', 52],
    ['Width_65', 56],
  ] as const)('%s is the %ddp control', (key, dp) => {
    closeTo(key, DESIGN.HScale[key as keyof typeof DESIGN.HScale], dp);
  });
});

describe('the vertical ramp renders its design sizes', () => {
  it.each([
    ['Height_2', 2],
    ['Height_5', 4],
    ['Height_9', 8],
    ['Height_14', 12],
    ['Height_19', 16],
    ['Height_24', 20],
    ['Height_28', 24],
    ['Height_38', 32],
    ['Height_57', 48],
    ['Height_76', 64],
  ] as const)('%s is %ddp', (key, dp) => {
    closeTo(key, DESIGN.VScale[key as keyof typeof DESIGN.VScale], dp);
  });
});

describe('radii and icons render their design sizes', () => {
  /**
   * The map most likely to be mis-keyed. `BORDER_RADIUS.radius_N` is
   * `shortSide * N/1000`, so an index that looks like dp is off by a factor of
   * about 2.5 — `radius_14` is a 5.5dp corner, not a 14dp one.
   */
  it.each([
    ['radius_15', 6],
    ['radius_26', 10],
    ['radius_41', 16],
    ['radius_56', 22],
    ['radius_72', 28],
  ] as const)('%s is the %ddp corner', (key, dp) => {
    closeTo(key, DESIGN.BORDER_RADIUS[key as keyof typeof DESIGN.BORDER_RADIUS], dp);
  });

  it.each([
    ['iconSize_16', 14],
    ['iconSize_18', 16],
    ['iconSize_20', 18],
    ['iconSize_24', 21],
    ['iconSize_45', 40],
  ] as const)('%s is the %ddp glyph', (key, dp) => {
    closeTo(key, DESIGN.IconSize[key as keyof typeof DESIGN.IconSize], dp);
  });
});

describe('the type ramp', () => {
  const TYPE = buildType(DESIGN);

  it.each([
    ['display', 34, 40],
    ['h1', 28, 34],
    ['h2', 22, 28],
    ['h3', 18, 24],
    ['title', 16, 22],
    ['body', 15, 22],
    ['caption', 13, 18],
    ['label', 12, 16],
    ['mono', 14, 21],
  ] as const)('%s sets at %d/%d', (variant, size, leading) => {
    closeTo(`${variant} size`, TYPE[variant].fontSize, size);
    closeTo(`${variant} leading`, TYPE[variant].lineHeight, leading);
  });

  /** Leading below its size is text drawn on top of itself. */
  it('never sets leading tighter than the size it pairs with', () => {
    for (const [name, style] of Object.entries(TYPE)) {
      const ratio = (style.lineHeight ?? 0) / (style.fontSize ?? 1);
      expect(`${name}: ${ratio > 1.1}`).toBe(`${name}: true`);
    }
  });
});

describe('derived layout', () => {
  const layout = layoutOf(DESIGN);

  it('renders the measurements screens share', () => {
    closeTo('gutter', layout.gutter, 16);
    closeTo('gridGap', layout.gridGap, 12);
    closeTo('hitSlop', layout.hitSlop, 8);
    closeTo('tabBarHeight', layout.tabBarHeight, 64);
    closeTo('tabBarInset', layout.tabBarInset, 16);
  });

  /** A fingertip is the same size on a tablet as on a phone. */
  it('never scales the touch-target floor', () => {
    expect(layout.minTouchTarget).toBe(44);
    expect(layoutOf(createResponsive({ width: 1024, height: 1366 }) as unknown as Responsive)
      .minTouchTarget).toBe(44);
  });

  it('always clears the tab bar it is derived from', () => {
    expect(layout.tabBarClearance).toBeGreaterThan(layout.tabBarHeight + layout.tabBarInset);
  });

  it('gives a tablet more grid columns than a phone', () => {
    const tablet = layoutOf(createResponsive({ width: 1024, height: 1366 }) as unknown as Responsive);
    expect(layout.gridColumns).toBe(2);
    expect(tablet.gridColumns).toBeGreaterThan(layout.gridColumns);
  });
});

/**
 * The cost of the convention, stated rather than discovered.
 *
 * These maps are pure fractions of the window with no floor and no ceiling, so
 * the sizes that are exactly right at 390x844 are not right anywhere else. This
 * is not a bug to be fixed here — it is what reading the maps directly means,
 * and it is asserted so that the numbers are in the repository rather than in
 * someone's memory of a code review.
 */
describe('what the unbounded maps do at the extremes', () => {
  const se = createResponsive({ width: 320, height: 568 }) as unknown as Responsive;
  const iPad = createResponsive({ width: 1024, height: 1366 }) as unknown as Responsive;

  it('shrinks the 44dp touch target below the accessibility floor on a small phone', () => {
    const target = se.HScale.Width_51;
    expect(target).toBeLessThan(44);
    // ~36dp, against a 44dp floor that WCAG and both platform HIGs call a
    // minimum rather than a preference.
    expect(target).toBeGreaterThan(35);
    expect(target).toBeLessThan(38);
  });

  it('shrinks 15dp body text to about 12pt on a small phone', () => {
    const body = buildType(se).body.fontSize ?? 0;
    expect(body).toBeLessThan(13);
    expect(body).toBeGreaterThan(11.5);
  });

  it('inflates the same target past 100dp on a tablet', () => {
    expect(iPad.HScale.Width_51).toBeGreaterThan(100);
  });
});
