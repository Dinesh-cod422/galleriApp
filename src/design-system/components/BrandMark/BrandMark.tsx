import React, { memo } from 'react';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { createStyles } from '../../theme/createStyles';
import { type AppTheme } from '../../theme/theme';


/**
 * The app mark, as vector.
 *
 * Every number here was MEASURED from `icon-1024.png`, the file the launcher
 * icon is built from, rather than redrawn by eye — the bowl's circle, the
 * stem's rounded bar, the sparkle's tip-to-tip span, and the three gradient
 * stops sampled from its corners. That is the whole point of this file: the
 * icon on the home screen, the mark in the masthead and the mark on the splash
 * are now one shape, so they cannot drift apart.
 *
 * Vector rather than the PNG because the splash animates it, and because a
 * 46dp masthead logo should not carry a 1024px bitmap.
 */

/** The mark is printed, not themed — the sheet carries only its two colours. */
const getStyles = (appTheme: AppTheme) => ({ palette: appTheme.colors });
const useStyles = createStyles(getStyles);

/** Everything is expressed in the icon's own 1024 coordinate space. */
const VIEWBOX = 1024;

const BOWL = { cx: 534, cy: 405, r: 187 };
const STEM = { x: 302, y: 218, w: 104, h: 585, rx: 52 };
const SPARK = { cx: 551, cy: 407, rx: 106, ry: 106, waist: 0.34 };

/** Where each of the theme's three brand stops sits along the diagonal. */
const STOP_OFFSETS = ['0', '0.5', '1'] as const;

const circle = ({ cx, cy, r }: typeof BOWL): string =>
  `M ${cx - r},${cy} a ${r},${r} 0 1,0 ${2 * r},0 a ${r},${r} 0 1,0 ${-2 * r},0 Z`;

/** Four straight tips joined by deeply concave sides; `waist` was fitted to the icon. */
const sparkle = ({ cx, cy, rx, ry, waist }: typeof SPARK): string => {
  const hx = rx * waist;
  const hy = ry * waist;
  return [
    `M ${cx},${cy - ry}`,
    `C ${cx},${cy - hy} ${cx + hx},${cy} ${cx + rx},${cy}`,
    `C ${cx + hx},${cy} ${cx},${cy + hy} ${cx},${cy + ry}`,
    `C ${cx},${cy + hy} ${cx - hx},${cy} ${cx - rx},${cy}`,
    `C ${cx - hx},${cy} ${cx},${cy - hy} ${cx},${cy - ry}`,
    'Z',
  ].join(' ');
};

/**
 * Bowl and sparkle share ONE path with `evenodd`, which is what makes the
 * sparkle a hole the gradient shows through rather than a shape painted over
 * it. Drawing a coloured sparkle on top would need it to know the gradient's
 * colour at that exact point — and would break the moment the mark moves.
 */
const GLYPH = `${circle(BOWL)} ${sparkle(SPARK)}`;

export type BrandMarkProps = {
  size: number;
  /**
   * Corner radius of the tile, in the same units as `size`. Omitted draws the
   * glyph alone on transparency — for a splash, where the background is the
   * whole screen rather than a tile.
   */
  radius?: number;
  /** False draws the glyph with no gradient tile behind it. */
  background?: boolean;
  testID?: string;
};

const BrandMarkComponent = ({
  size,
  radius,
  background = true,
  testID,
}: BrandMarkProps): React.JSX.Element => {
  // The caller thinks in dp; the artwork is in 1024 units.
  const scaled = radius === undefined ? 0 : (radius / size) * VIEWBOX;
  // Identical in light and dark: a logo is printed, not themed.
  const styles = useStyles();
  const stops = styles.palette.brand.gradient;
  const glyphColor = styles.palette.text.onAccent;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} testID={testID}>
      <Defs>
        <LinearGradient id="brandMark" x1="0" y1="0" x2="1" y2="1">
          {stops.map((color: string, index: number) => (
            <Stop key={color} offset={STOP_OFFSETS[index]} stopColor={color} />
          ))}
        </LinearGradient>
      </Defs>
      {background && (
        <Rect width={VIEWBOX} height={VIEWBOX} rx={scaled} fill="url(#brandMark)" />
      )}
      <Rect
        x={STEM.x}
        y={STEM.y}
        width={STEM.w}
        height={STEM.h}
        rx={STEM.rx}
        fill={glyphColor}
      />
      <Path d={GLYPH} fill={glyphColor} fillRule="evenodd" />
    </Svg>
  );
};

export const BrandMark = memo(BrandMarkComponent);
BrandMark.displayName = 'BrandMark';
