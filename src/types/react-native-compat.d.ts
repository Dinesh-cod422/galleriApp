/**
 * Compatibility shim — third-party typings vs React Native 0.87.
 *
 * RN 0.87 removed the public `FlexStyle` and `ShadowStyleIOS` type aliases.
 * `@d11/react-native-fast-image` still imports them, so with `skipLibCheck`
 * its `ImageStyle` silently degrades to "no layout props at all" and every
 * `width`/`height` we pass is rejected.
 *
 * Re-declaring them as `ViewStyle` (a strict superset of both) restores the
 * intended meaning. This is the one and only place we patch library types,
 * and it disappears when the library updates to RN 0.87's type surface.
 */
import type { ViewStyle } from 'react-native';

declare module 'react-native' {
  export type FlexStyle = ViewStyle;
  export type ShadowStyleIOS = ViewStyle;
}
