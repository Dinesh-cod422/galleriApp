/**
 * The design system's ONLY public entry point.
 *
 * Everything outside `src/design-system` imports from '@ds' and nothing
 * deeper. That is what makes internal reorganisation free, and it is a flat
 * barrel — it re-exports leaf modules, never another barrel — so it cannot
 * take part in an import cycle.
 */

// Theme
export { ThemeProvider, useTheme, useThemeContext, type ThemePreference } from './theme/ThemeProvider';
export { useThemedStyles } from './theme/useThemedStyles';
export { createTheme, darkTheme, lightTheme, type Theme, type ThemeMode } from './theme/theme';
export { type ColorTokens } from './theme/colors';
export { type TextVariant } from './theme/typography';
export { type ShadowToken } from './theme/shadows';
export { type SpacingToken } from './theme/spacing';
export { type RadiusToken } from './theme/radius';

// Responsive
export { useResponsive, type ResponsiveInfo } from './responsive/useResponsive';
export { type Breakpoint } from './responsive/breakpoints';
export { gridCellWidth } from './responsive/grid';

// Animation primitives
export { usePressScale } from './animation/usePressScale';
export { ShimmerProvider, useShimmerProgress } from './animation/ShimmerProvider';

// Components
export { Text, type AppTextProps, type TextColorToken } from './components/Text/Text';
export { Button, type ButtonProps, type ButtonVariant } from './components/Button/Button';
export { IconButton, type IconButtonProps } from './components/IconButton/IconButton';
export { Card, type CardProps } from './components/Card/Card';
export { Avatar, type AvatarProps } from './components/Avatar/Avatar';
export { Badge, type BadgeTone } from './components/Badge/Badge';
export { Skeleton, type SkeletonProps } from './components/Skeleton/Skeleton';
export { EmptyState, type EmptyStateProps } from './components/EmptyState/EmptyState';
export { ErrorState, type ErrorStateProps } from './components/ErrorState/ErrorState';
export { BottomSheet, type BottomSheetRef } from './components/BottomSheet/BottomSheet';
export { Divider } from './components/Divider/Divider';
export { Screen, type ScreenProps } from './components/Screen/Screen';
export { AppImage, type AppImageProps, type ImagePriority } from './components/AppImage/AppImage';

// Icons
export { Icon, type IconName, type IconProps } from './icons/Icon';
