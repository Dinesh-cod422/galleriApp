import React, { memo } from 'react';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

import { type ColorTokens } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';

/**
 * One Icon component with a path registry, rather than ~16 separate icon
 * components. Icons are data, not behaviour; a registry keeps the bundle flat
 * and makes `<Icon name="heart" />` the single call shape everywhere.
 */
export type IconName =
  | 'home'
  | 'compass'
  | 'heart'
  | 'heartFilled'
  | 'user'
  | 'search'
  | 'copy'
  | 'share'
  | 'chevronLeft'
  | 'chevronRight'
  | 'eye'
  | 'close'
  | 'alert'
  | 'inbox'
  | 'check'
  | 'sparkles'
  | 'trending'
  | 'grid';

type IconColorToken = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'onAccent' | 'favorite';

const resolveColor = (colors: ColorTokens, token: IconColorToken): string => {
  switch (token) {
    case 'accent':
      return colors.accent.default;
    case 'onAccent':
      return colors.text.onAccent;
    case 'favorite':
      return colors.status.favorite;
    default:
      return colors.text[token];
  }
};

type PathProps = { stroke: string; strokeWidth: number };

const REGISTRY: Record<IconName, (props: PathProps) => React.JSX.Element> = {
  home: p => (
    <>
      <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" {...p} />
      <Polyline points="9 22 9 12 15 12 15 22" {...p} />
    </>
  ),
  compass: p => (
    <>
      <Circle cx={12} cy={12} r={10} {...p} />
      <Polyline points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" {...p} />
    </>
  ),
  heart: p => (
    <Path
      d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
      {...p}
    />
  ),
  heartFilled: p => (
    <Path
      d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
      fill={p.stroke}
      stroke={p.stroke}
      strokeWidth={p.strokeWidth}
    />
  ),
  user: p => (
    <>
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" {...p} />
      <Circle cx={12} cy={7} r={4} {...p} />
    </>
  ),
  search: p => (
    <>
      <Circle cx={11} cy={11} r={8} {...p} />
      <Line x1={21} y1={21} x2={16.65} y2={16.65} {...p} />
    </>
  ),
  copy: p => (
    <>
      <Rect x={9} y={9} width={13} height={13} rx={2} ry={2} {...p} />
      <Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" {...p} />
    </>
  ),
  share: p => (
    <>
      <Circle cx={18} cy={5} r={3} {...p} />
      <Circle cx={6} cy={12} r={3} {...p} />
      <Circle cx={18} cy={19} r={3} {...p} />
      <Line x1={8.59} y1={13.51} x2={15.42} y2={17.49} {...p} />
      <Line x1={15.41} y1={6.51} x2={8.59} y2={10.49} {...p} />
    </>
  ),
  chevronLeft: p => <Polyline points="15 18 9 12 15 6" {...p} />,
  chevronRight: p => <Polyline points="9 18 15 12 9 6" {...p} />,
  eye: p => (
    <>
      <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" {...p} />
      <Circle cx={12} cy={12} r={3} {...p} />
    </>
  ),
  close: p => (
    <>
      <Line x1={18} y1={6} x2={6} y2={18} {...p} />
      <Line x1={6} y1={6} x2={18} y2={18} {...p} />
    </>
  ),
  alert: p => (
    <>
      <Circle cx={12} cy={12} r={10} {...p} />
      <Line x1={12} y1={8} x2={12} y2={12} {...p} />
      <Line x1={12} y1={16} x2={12.01} y2={16} {...p} />
    </>
  ),
  inbox: p => (
    <>
      <Polyline points="22 12 16 12 14 15 10 15 8 12 2 12" {...p} />
      <Path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" {...p} />
    </>
  ),
  check: p => <Polyline points="20 6 9 17 4 12" {...p} />,
  sparkles: p => (
    <>
      <Path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z" {...p} />
      <Line x1={18} y1={16} x2={18} y2={20} {...p} />
      <Line x1={16} y1={18} x2={20} y2={18} {...p} />
    </>
  ),
  trending: p => (
    <>
      <Polyline points="23 6 13.5 15.5 8.5 10.5 1 18" {...p} />
      <Polyline points="17 6 23 6 23 12" {...p} />
    </>
  ),
  grid: p => (
    <>
      <Rect x={3} y={3} width={7} height={7} rx={1.5} {...p} />
      <Rect x={14} y={3} width={7} height={7} rx={1.5} {...p} />
      <Rect x={14} y={14} width={7} height={7} rx={1.5} {...p} />
      <Rect x={3} y={14} width={7} height={7} rx={1.5} {...p} />
    </>
  ),
};

export type IconProps = {
  name: IconName;
  size?: number;
  color?: IconColorToken;
  strokeWidth?: number;
};

const IconComponent = ({
  name,
  size = 22,
  color = 'primary',
  strokeWidth = 1.8,
}: IconProps): React.JSX.Element => {
  const theme = useTheme();
  const stroke = resolveColor(theme.colors, color);

  // strokeLinecap/Join are set on the root and inherited by every child
  // path, instead of repeating them on ~40 elements.
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round">
      {REGISTRY[name]({ stroke, strokeWidth })}
    </Svg>
  );
};

export const Icon = memo(IconComponent);
Icon.displayName = 'Icon';
