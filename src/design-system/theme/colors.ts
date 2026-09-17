/**
 * Two-tier color system.
 *
 * Tier 1 — `palette`: raw values. PRIVATE to this file. Nothing else in the
 * app may name a color by its hue, because "blue500" tells a component
 * nothing about whether it is legible on the current background.
 *
 * Tier 2 — semantic tokens: what the color is FOR (`bg.surface`,
 * `text.secondary`). Dark mode is then a second mapping of the same token
 * names, not a `mode === 'dark' ? … : …` conditional sprinkled through screens.
 */
const palette = {
  white: '#FFFFFF',
  black: '#000000',

  ink0: '#FFFFFF',
  ink50: '#F7F7FA',
  ink100: '#EEEEF3',
  ink200: '#E0E0E9',
  ink300: '#C6C6D4',
  ink400: '#9494A8',
  /** Dark-mode tertiary ink. ink400 is brighter than the dark canvas needs. */
  ink450: '#8A8AA0',
  ink500: '#6E6E85',
  /** Light-mode tertiary ink. ink500 misses 4.5:1 on a chip's `bg.subtle`. */
  ink550: '#68687D',
  ink600: '#4C4C60',
  ink700: '#333343',
  ink800: '#1C1C26',
  ink850: '#15151D',
  ink900: '#0E0E14',
  ink950: '#08080C',

  violet300: '#C4B5FD',
  violet400: '#A78BFA',
  violet500: '#8B5CF6',
  /**
   * Dark-mode accent. The one hue that has to satisfy two opposing bars at
   * once: white LABELS on it (4.5:1) and it as an ICON on the dark canvas
   * (3:1). violet500 fails the first at 4.23, violet600 fails the second.
   */
  violet550: '#8455F0',
  violet600: '#7C3AED',
  violet700: '#6D28D9',

  teal100: '#CCFBF1',
  teal400: '#2DD4BF',
  teal700: '#0F766E',
  amber100: '#FEF3C7',
  amber400: '#FBBF24',
  amber700: '#B45309',
  rose400: '#FB7185',
  rose500: '#F43F5E',
  rose600: '#C81A3D',
  rose700: '#BE123C',
  green500: '#22C55E',
  green700: '#137A38',
  orange500: '#F97316',
  orange400: '#FB923C',
  orange600: '#EA580C',
  blue500: '#3B82F6',
  blue400: '#60A5FA',
  blue600: '#2563EB',
  pink500: '#EC4899',
  pink400: '#F472B6',
  pink600: '#DB2777',
  amber500: '#F59E0B',
  amber600: '#C2620A',
  purple500: '#A855F7',
  purple600: '#9333EA',
  // The launcher icon's own three stops, sampled from icon-1024.png. They are
  // NOT purple500/pink500 — the mark predates the palette and is the fixed
  // point, so the palette carries the icon's values rather than the reverse.
  brandViolet: '#A68AF9',
  brandIndigo: '#8039E9',
  brandMagenta: '#DA2778',
} as const;

/**
 * A tag is a (background, foreground) PAIR, not a single hue.
 *
 * One hue cannot carry a tag on its own: the amber that reads as "trending" on
 * a white canvas is unreadable as text on a dark one, and legible-everywhere
 * hues all collapse toward the same muddy mid-tone. Pairing lets each theme
 * pick a tint and an ink that actually contrast.
 */
export type TagColor = {
  readonly bg: string;
  readonly fg: string;
  /**
   * The mark's colour, when it should differ from the label's.
   *
   * A tag laid over a photograph wants its label at full reading contrast, but
   * the glyph beside it is the part that says which tag this is at a glance —
   * so the flame stays flame-coloured while the word stays near-black. Falls
   * back to `fg` when omitted.
   */
  readonly icon?: string;
};

export type ColorTokens = {
  readonly bg: {
    /** App background, behind everything. */
    readonly canvas: string;
    /** Cards, sheets, anything raised off the canvas. */
    readonly surface: string;
    /** A surface raised above another surface (sheet over card). */
    readonly surfaceElevated: string;
    /** Chips, inputs, skeleton base. */
    readonly subtle: string;
    /** Pressed/hovered feedback layer. */
    readonly pressed: string;
    /** Scrim behind modals and sheets. */
    readonly scrim: string;
    /**
     * Two soft brand washes painted behind a screen's content.
     *
     * Deliberately very low alpha. They are meant to tint the canvas showing
     * BETWEEN cards, not to be seen as shapes — on a wall of photographs the
     * only place they read at all is the margins and the space under the
     * header, which is exactly where a flat grey canvas looks unfinished.
     */
    readonly ambientTop: string;
    readonly ambientBottom: string;
    /** Image placeholder before load — avoids a white flash in dark mode. */
    readonly imagePlaceholder: string;
  };
  readonly text: {
    readonly primary: string;
    readonly secondary: string;
    readonly tertiary: string;
    readonly inverse: string;
    readonly onAccent: string;
    readonly danger: string;
  };
  readonly border: {
    readonly subtle: string;
    readonly strong: string;
    readonly focus: string;
  };
  readonly accent: {
    /** The FILL. `text.onAccent` is written on it, so it must be dark enough. */
    readonly default: string;
    readonly pressed: string;
    /**
     * The INK: accent used as text or as a glyph on a plain surface — a link,
     * "See all", the active tab's label, a header's back chevron.
     *
     * Separate from `default` for the reason `status.dangerFill` is separate
     * from `status.danger`, and the numbers are just as unforgiving. In dark
     * mode a fill carrying white must be DARK (violet550 keeps white at 4.63:1)
     * and ink on a dark surface must be LIGHT (violet550 as text reads 4.16:1
     * on `bg.surface` and 3.65:1 on `bg.subtle`). No single violet does both;
     * every candidate between them fails one bar or the other.
     */
    readonly ink: string;
    readonly subtle: string;
    readonly onSubtle: string;
  };
  /**
   * Status colours are INKS — they are written and drawn, not painted under
   * white text. `dangerFill` is the exception that proves it.
   */
  readonly status: {
    readonly favorite: string;
    readonly success: string;
    readonly warning: string;
    readonly danger: string;
    /**
     * The fill under a destructive button's `onAccent` label.
     *
     * A separate token because one rose cannot do both jobs in dark mode, and
     * the numbers say so rather than the taste: as an ink on `bg.subtle` a rose
     * must be LIGHT (rose400 reads 6.27:1 there), and under white text it must
     * be DARK (rose400 reads 2.69:1). The two curves cross at about 4.1:1, so
     * every single value fails one bar or the other. Splitting the token is the
     * only way both land — the same split `accent.default` / `accent.subtle`
     * already makes for the accent hue.
     */
    readonly dangerFill: string;
  };
  /**
   * Editorial status tags on a prompt. Each gets its OWN hue so the tag is
   * legible at a glance in a dense grid — a wall of identically-coloured pills
   * carries no information, whatever the pills say.
   */
  readonly tag: {
    /** Editorially picked. */
    readonly featured: TagColor;
    /** Rising right now. */
    readonly trending: TagColor;
    /** Published in the last week. */
    readonly fresh: TagColor;
  };
  readonly skeleton: {
    readonly base: string;
    readonly highlight: string;
  };
  /**
   * The brand mark's gradient.
   *
   * A logo, not a semantic colour: it stays the same violet-to-pink in both
   * themes the way a printed mark does, rather than being remapped with the
   * rest of the palette.
   */
  readonly brand: {
    readonly gradientStart: string;
    readonly gradientEnd: string;
    /**
     * Three stops, in order, exactly as the icon has them.
     *
     * Two would be wrong, not merely approximate: the icon's midpoint is a
     * deeper violet than any blend of its ends, so a two-stop version reads
     * visibly washed out beside the real launcher icon.
     */
    readonly gradient: readonly [string, string, string];
  };
  /**
   * Identity hues for category marks.
   *
   * Not state — these say WHICH category a chip is, so they are named by hue
   * rather than by meaning. They are the one group where that is correct: a
   * "Women's" chip is pink because pink is what names it, and remapping it per
   * theme would make it a different category. Each is tuned per mode so it
   * stays legible on that canvas.
   */
  readonly mark: {
    readonly rose: string;
    readonly blue: string;
    readonly pink: string;
    readonly amber: string;
    readonly violet: string;
  };
};

export const lightColors: ColorTokens = {
  bg: {
    canvas: palette.ink50,
    surface: palette.ink0,
    surfaceElevated: palette.ink0,
    subtle: palette.ink100,
    pressed: palette.ink200,
    scrim: 'rgba(14, 14, 20, 0.45)',
    // The brand violet and magenta, barely there. On a white canvas 6–7% is
    // the point where the tint is felt rather than seen.
    ambientTop: 'rgba(166, 138, 249, 0.07)',
    ambientBottom: 'rgba(218, 39, 120, 0.05)',
    imagePlaceholder: palette.ink200,
  },
  text: {
    primary: palette.ink900,
    secondary: palette.ink600,
    // ink400 read 2.78:1 on the canvas. `tertiary` carries captions and
    // metadata — 13pt and 12pt, i.e. NOT WCAG "large text" — so it owes the
    // full 4.5:1, including on the `bg.subtle` a chip and the search field use.
    tertiary: palette.ink550,
    inverse: palette.ink0,
    onAccent: palette.white,
    // rose500 is a fill colour, and as ink it read 3.43:1.
    danger: palette.rose600,
  },
  border: {
    // Deliberately below 3:1. It draws card outlines and row rules, which are
    // decoration — every surface it edges is identifiable by its own fill, so
    // 1.4.11 does not apply and a compliant hairline would read as a cage.
    subtle: palette.ink200,
    // `strong` is the opposite case: its only consumer is the bottom sheet's
    // drag handle, which IS the affordance that says the sheet can be dragged,
    // so it owes 3:1. ink300 read 1.69:1.
    strong: '#8E8EA4',
    focus: palette.violet500,
  },
  accent: {
    default: palette.violet600,
    pressed: palette.violet700,
    // On paper the fill and the ink coincide: one dark violet carries white at
    // 5.70:1 and still reads as text on every light surface at 4.93:1 or better.
    ink: palette.violet600,
    subtle: '#EDE9FE',
    onSubtle: palette.violet700,
  },
  status: {
    // A filled heart, drawn not written, so it keeps the vivid fill at 3:1.
    favorite: palette.rose500,
    // `success` and `danger` are rendered as Badge LABELS on `bg.subtle`, not
    // as fills — so they owe 4.5:1 as text. The 400/500 steps read 2.28:1 and
    // 3.18:1 there.
    success: palette.green700,
    warning: palette.amber700,
    danger: palette.rose600,
    // In light mode the ink and the fill happen to coincide: a chip's `subtle`
    // backdrop is pale, so one dark rose contrasts with both it and white.
    dangerFill: palette.rose600,
  },
  tag: {
    featured: { bg: '#EDE9FE', fg: palette.violet700 },
    // orange500 read 2.80:1 on the near-white tag fill.
    trending: { bg: 'rgba(255,255,255,0.94)', fg: palette.ink800, icon: palette.orange600 },
    fresh: { bg: palette.teal100, fg: palette.ink800, icon: palette.teal700 },
  },
  skeleton: {
    base: palette.ink100,
    highlight: palette.ink200,
  },
  brand: {
    gradientStart: palette.brandViolet,
    gradientEnd: palette.brandMagenta,
    gradient: [palette.brandViolet, palette.brandIndigo, palette.brandMagenta],
  },
  /*
   * The 600 step, not the 500.
   *
   * A mark is drawn as an icon on a 10% wash OF ITSELF, which tints the plate
   * toward the mark and eats the contrast the plain surface suggested. Measured
   * on that real backing, amber500 came out at 1.99:1 and the rest sat between
   * 3.11 and 3.50 — passing, but with no margin left for a future tweak. The
   * 600s land between 3.67 and 4.62 on the same backing, at the same hues.
   */
  mark: {
    rose: palette.rose600,
    blue: palette.blue600,
    pink: palette.pink600,
    amber: palette.amber600,
    violet: palette.purple600,
  },
};

export const darkColors: ColorTokens = {
  bg: {
    canvas: palette.ink950,
    surface: palette.ink900,
    surfaceElevated: palette.ink850,
    subtle: palette.ink800,
    pressed: '#23232F',
    scrim: 'rgba(0, 0, 0, 0.6)',
    // Lower still on ink: the same alpha that reads as a tint on white reads
    // as a glow on black, which looks like a rendering artefact.
    ambientTop: 'rgba(166, 138, 249, 0.05)',
    ambientBottom: 'rgba(218, 39, 120, 0.04)',
    imagePlaceholder: palette.ink800,
  },
  text: {
    primary: palette.ink50,
    secondary: palette.ink300,
    // ink500 read 4.03:1 on the dark canvas and 3.40:1 on `bg.subtle`. Same
    // reasoning as light mode: this is caption-sized text, so it owes 4.5:1.
    tertiary: palette.ink450,
    inverse: palette.ink900,
    onAccent: palette.white,
    danger: palette.rose400,
  },
  border: {
    // Decoration, as in light mode — see the note there.
    subtle: '#262632',
    // The sheet's drag handle. ink700 read 1.55:1 against the sheet surface.
    strong: '#63637C',
    focus: palette.violet400,
  },
  accent: {
    /*
     * violet550, not violet500.
     *
     * This token is a fill AND an ink: the primary Button paints it and writes
     * `onAccent` white on top, while `color="accent"` uses it as the ink for
     * links and glyphs on the canvas. White on violet500 is 4.23:1 — under the
     * bar for a 16pt semibold label — and dropping to violet600 to fix that
     * pushes the ICON use down to 3.51:1 against the canvas. violet550 clears
     * both: 4.63:1 for the label, 4.32:1 for the glyph.
     */
    default: palette.violet550,
    pressed: palette.violet400,
    // Light, because on ink this is read rather than written on: 7.07:1 on the
    // surface and 6.21:1 on a chip.
    ink: palette.violet400,
    subtle: '#2A2140',
    onSubtle: palette.violet300,
  },
  status: {
    favorite: palette.rose400,
    success: palette.green500,
    warning: palette.amber400,
    // Light, because on ink this is read as text.
    danger: palette.rose400,
    // Dark, because here it is painted UNDER text. rose700 keeps white at
    // 6.29:1 while still reading as a red shape on the canvas at 3.18:1.
    dangerFill: palette.rose700,
  },
  tag: {
    featured: { bg: '#2A2140', fg: palette.violet300 },
    trending: { bg: '#3A2E12', fg: palette.amber100, icon: palette.orange400 },
    fresh: { bg: '#0F2E2A', fg: palette.teal100, icon: palette.teal400 },
  },
  skeleton: {
    base: palette.ink800,
    highlight: '#26263A',
  },
  // The mark keeps its own colours across themes — that is what makes it a mark.
  brand: {
    gradientStart: palette.brandViolet,
    gradientEnd: palette.brandMagenta,
    gradient: [palette.brandViolet, palette.brandIndigo, palette.brandMagenta],
  },
  // Lifted a step: the 500s are tuned for a white canvas and go muddy on ink.
  mark: {
    rose: palette.rose400,
    blue: palette.blue400,
    pink: palette.pink400,
    amber: palette.amber400,
    violet: palette.violet400,
  },
};
