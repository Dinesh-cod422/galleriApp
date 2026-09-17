import {
  useResponsive as usePackageResponsive,
  type ResponsiveTokens,
} from '@dineshcodes/responsive-react-native-ui';

/**
 * The second argument every style factory receives.
 *
 * It is the package's own `useResponsive()` surface, narrowed to the indices
 * this app actually reads. The narrowing is not decoration — it is what makes
 * the maps usable under `noUncheckedIndexedAccess`.
 *
 * The package types its maps with a template index signature
 * (`{ [key: `Width_${number}`]: number }`), and under that flag EVERY read off
 * an index signature comes back as `number | undefined`. That is why the doctor
 * app's sheets carry `fontSize: FONTSIZE.size_14 || 14` — a fallback for a value
 * that is always present, written because the compiler could not know it.
 * Listing the keys turns each read back into a plain `number`, so no sheet in
 * this app needs that `||`.
 *
 * It doubles as the inventory: this is every size the app uses, in one place.
 * Reaching for an index that is not here is a compile error, which is the
 * prompt to ask whether the design really needs a new step.
 *
 * REMEMBER: the index is not the dp. `HScale.Width_18` is
 * `shortSide * 18/450`, which is 15.6dp on a 390dp phone. Each index below was
 * chosen so the rendered value at the 390x844 design window matches the dp the
 * design was drawn at.
 */
export type Responsive = Omit<
  ResponsiveTokens,
  'FONTSIZE' | 'HScale' | 'VScale' | 'BORDER_RADIUS' | 'IconSize'
> & {
  readonly FONTSIZE: Readonly<Record<
    | 'size_14'
    | 'size_15'
    | 'size_16'
    | 'size_17'
    | 'size_18'
    | 'size_20'
    | 'size_25'
    | 'size_32'
    | 'size_38',
    number
  >>;
  readonly HScale: Readonly<Record<
    | 'Width_2'
    | 'Width_5'
    | 'Width_7'
    | 'Width_9'
    | 'Width_12'
    | 'Width_14'
    | 'Width_16'
    | 'Width_18'
    | 'Width_28'
    | 'Width_32'
    | 'Width_37'
    | 'Width_42'
    | 'Width_46'
    | 'Width_51'
    | 'Width_53'
    | 'Width_55'
    | 'Width_60'
    | 'Width_65'
    | 'Width_74'
    | 'Width_83'
    | 'Width_92'
    | 'Width_104'
    | 'Width_111'
    | 'Width_127'
    | 'Width_231'
    | 'Width_485',
    number
  >>;
  readonly VScale: Readonly<Record<
    | 'Height_2'
    | 'Height_5'
    | 'Height_9'
    | 'Height_14'
    | 'Height_17'
    | 'Height_19'
    | 'Height_21'
    | 'Height_25'
    | 'Height_26'
    | 'Height_28'
    | 'Height_31'
    | 'Height_33'
    | 'Height_38'
    | 'Height_40'
    | 'Height_47'
    | 'Height_55'
    | 'Height_76'
    | 'Height_90'
    | 'Height_123'
    | 'Height_166'
    | 'Height_237',
    number
  >>;
  readonly BORDER_RADIUS: Readonly<Record<
    | 'radius_14'
    | 'radius_15'
    | 'radius_26'
    | 'radius_41'
    | 'radius_56'
    | 'radius_72',
    number
  >>;
  readonly IconSize: Readonly<Record<
    | 'iconSize_16'
    | 'iconSize_18'
    | 'iconSize_20'
    | 'iconSize_24'
    | 'iconSize_45',
    number
  >>;
};

/** The package hook, typed as the surface the factories expect. */
export const useResponsiveTokens = (): Responsive =>
  usePackageResponsive() as unknown as Responsive;
