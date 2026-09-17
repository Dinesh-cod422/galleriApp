import { type ColorTokens, darkColors, lightColors } from './colors';

/**
 * WCAG 2.1 contrast, computed on the REAL colours rather than eyeballed.
 *
 * Every failure this file now guards against was live in the app: `tertiary`
 * caption text at 2.78:1 in light mode, white button labels at 4.23:1 on the
 * dark accent, a green "success" badge at 2.28:1. None of them look obviously
 * wrong next to each other — which is exactly why a palette needs arithmetic
 * and not a review.
 *
 * Two bars, from SC 1.4.3 and 1.4.11:
 *   4.5:1  text below 18pt (or below 14pt bold) — which is all of this app's
 *          reading sizes, the largest being 16pt semibold
 *   3:1    graphics and the parts of a control that identify it
 */

type Rgb = readonly [number, number, number];
type Rgba = readonly [number, number, number, number];

const parse = (color: string): Rgba => {
  if (color.startsWith('#')) {
    const h = color.slice(1);
    const full = h.length === 3 ? [...h].map(c => c + c).join('') : h;
    return [
      parseInt(full.slice(0, 2), 16),
      parseInt(full.slice(2, 4), 16),
      parseInt(full.slice(4, 6), 16),
      1,
    ];
  }
  const parts = color.replace(/rgba?\(|\)/g, '').split(',').map(Number);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1];
};

/**
 * Flatten a translucent colour onto what is behind it.
 *
 * Not optional: several tokens here ARE translucent — the trending tag's
 * near-white fill, every ambient wash — and a ratio taken from the raw rgba
 * describes a colour that never reaches the screen.
 */
const over = (fg: Rgba, bg: Rgba): Rgb => {
  const a = fg[3];
  return [0, 1, 2].map(i => (fg[i] ?? 0) * a + (bg[i] ?? 0) * (1 - a)) as unknown as Rgb;
};

const luminance = ([r, g, b]: Rgb): number => {
  const channel = (v: number): number => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

/** Contrast of `fg` over `bg`, with `bg` itself flattened onto white. */
export const contrast = (fg: string, bg: string): number => {
  const backdrop = over(parse(bg), [255, 255, 255, 1]);
  const [hi, lo] = [luminance(over(parse(fg), parse(bg))), luminance(backdrop)].sort(
    (a, b) => b - a,
  );
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
};

/** A colour laid over a wash of ITSELF, which is how category marks are drawn. */
const selfTint = (color: string, alpha: number, base: string): string => {
  const [r, g, b] = over([...parse(color).slice(0, 3), alpha] as unknown as Rgba, parse(base));
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
};

const MODES: ReadonlyArray<readonly [string, ColorTokens]> = [
  ['light', lightColors],
  ['dark', darkColors],
];

/** Reports the ratio in the failure message — "expected 4.5" alone is useless. */
const expectRatio = (label: string, fg: string, bg: string, min: number): void => {
  const value = contrast(fg, bg);
  expect(`${label}: ${value.toFixed(2)} (min ${min})`).toBe(
    `${label}: ${Math.max(value, min).toFixed(2)} (min ${min})`,
  );
};

const TEXT_MIN = 4.5;
const GRAPHIC_MIN = 3;

describe.each(MODES)('%s mode contrast', (mode, c) => {
  const surfaces = [
    ['canvas', c.bg.canvas],
    ['surface', c.bg.surface],
    ['surfaceElevated', c.bg.surfaceElevated],
    // Chips, the search field and both status badges sit on this one, so it is
    // a real text backdrop and not just a fill.
    ['subtle', c.bg.subtle],
  ] as const;

  it('renders every reading colour at 4.5:1 on every surface it can land on', () => {
    for (const token of ['primary', 'secondary', 'tertiary', 'danger'] as const) {
      for (const [name, bg] of surfaces) {
        expectRatio(`${mode} text.${token} on bg.${name}`, c.text[token], bg, TEXT_MIN);
      }
    }
    /*
     * `accent.ink` belongs in this list, not with the fills.
     *
     * `<Text color="accent">` and `<Icon color="accent">` are how a link, a
     * "See all" and the active tab's label are drawn — all of them 12pt, all of
     * them on a plain surface. Reading `accent.default` there put dark mode at
     * 3.65:1 on a chip, which is what splitting the token fixed.
     */
    for (const [name, bg] of surfaces) {
      expectRatio(`${mode} accent.ink on bg.${name}`, c.accent.ink, bg, TEXT_MIN);
    }
  });

  it('keeps a label legible on the fill it is written on', () => {
    // The primary Button: 16pt semibold, which WCAG counts as small text.
    expectRatio(`${mode} onAccent on accent.default`, c.text.onAccent, c.accent.default, TEXT_MIN);
    expectRatio(
      `${mode} accent.onSubtle on accent.subtle`,
      c.accent.onSubtle,
      c.accent.subtle,
      TEXT_MIN,
    );
    expectRatio(
      `${mode} onAccent on status.dangerFill`,
      c.text.onAccent,
      c.status.dangerFill,
      TEXT_MIN,
    );
    expectRatio(`${mode} text.inverse on text.primary`, c.text.inverse, c.text.primary, TEXT_MIN);
  });

  it('keeps both halves of every editorial tag legible on its own fill', () => {
    for (const [name, tag] of Object.entries(c.tag)) {
      expectRatio(`${mode} tag.${name} label`, tag.fg, tag.bg, TEXT_MIN);
      // The mark is a glyph, so it takes the graphic bar rather than the text
      // one — it may stay flame-coloured while the word goes to full contrast.
      expectRatio(`${mode} tag.${name} icon`, tag.icon ?? tag.fg, tag.bg, GRAPHIC_MIN);
    }
  });

  it('carries status colours at the bar their RENDERING demands', () => {
    // `success` and `danger` are Badge labels on bg.subtle — text, not fills.
    expectRatio(`${mode} status.success`, c.status.success, c.bg.subtle, TEXT_MIN);
    expectRatio(`${mode} status.danger`, c.status.danger, c.bg.subtle, TEXT_MIN);
    // `favorite` is a filled heart and `warning` an indicator: graphics.
    expectRatio(`${mode} status.favorite`, c.status.favorite, c.bg.surface, GRAPHIC_MIN);
    // The destructive button has to read as a shape on the canvas too, not
    // just carry its label.
    expectRatio(`${mode} status.dangerFill`, c.status.dangerFill, c.bg.canvas, GRAPHIC_MIN);
    expectRatio(`${mode} status.warning`, c.status.warning, c.bg.subtle, GRAPHIC_MIN);
  });

  /**
   * Category marks are drawn as an icon on a 10% wash of themselves (see
   * CategoryGrid). That wash tints the plate toward the mark, so a ratio taken
   * against the plain surface overstates it — amber measured 2.98:1 on surface
   * and 1.99:1 on the plate it is actually drawn on.
   */
  it('keeps a category mark visible on the wash of itself it sits on', () => {
    for (const [name, hue] of Object.entries(c.mark)) {
      expectRatio(
        `${mode} mark.${name} on its own 10% wash`,
        hue,
        selfTint(hue, 0.1, c.bg.surface),
        GRAPHIC_MIN,
      );
    }
  });

  it('makes the one border that is an affordance meet the graphic bar', () => {
    // `strong` draws the bottom sheet's drag handle, which is the only thing
    // saying the sheet can be dragged.
    expectRatio(`${mode} border.strong`, c.border.strong, c.bg.surfaceElevated, GRAPHIC_MIN);
    expectRatio(`${mode} border.focus`, c.border.focus, c.bg.canvas, GRAPHIC_MIN);
  });

  /**
   * `border.subtle` is deliberately NOT asserted against 3:1.
   *
   * It draws card outlines and row rules. Every surface it edges is already
   * identifiable by its own fill, so 1.4.11 does not apply — and a hairline
   * pushed to 3:1 reads as a cage drawn around the content. What it does owe is
   * being visible at all, which is the floor below.
   */
  it('keeps a decorative rule visible without turning it into a cage', () => {
    const ratio = contrast(c.border.subtle, c.bg.surface);
    expect(`${mode} border.subtle: ${ratio.toFixed(2)}`).toBe(
      `${mode} border.subtle: ${Math.min(Math.max(ratio, 1.15), 2).toFixed(2)}`,
    );
  });
});

describe('the two modes stay a pair', () => {
  /**
   * Dark mode is a second MAPPING of the same token names, never a subset —
   * a token present in one and missing in the other is a screen that renders
   * `undefined` as a colour, which React Native silently draws as transparent.
   */
  it('defines exactly the same token names in both', () => {
    const shape = (c: ColorTokens): string =>
      JSON.stringify(
        Object.fromEntries(
          Object.entries(c).map(([group, tokens]) => [group, Object.keys(tokens).sort()]),
        ),
      );
    expect(shape(lightColors)).toBe(shape(darkColors));
  });

  it('never ships an empty or malformed colour', () => {
    for (const [mode, c] of MODES) {
      for (const [group, tokens] of Object.entries(c)) {
        for (const [name, value] of Object.entries(tokens)) {
          const colors = typeof value === 'string' ? [value] : Object.values(value ?? {}).flat();
          for (const color of colors as string[]) {
            expect(`${mode}.${group}.${name}=${color}`).toMatch(
              /[=](#[0-9a-fA-F]{3,8}|rgba?\([\d.,\s]+\))$/,
            );
          }
        }
      }
    }
  });

  /** A canvas that did not invert would make "dark mode" a word, not a theme. */
  it('actually inverts: the dark canvas is darker than the light one', () => {
    const lum = (color: string): number => luminance(over(parse(color), [255, 255, 255, 1]));
    expect(lum(darkColors.bg.canvas)).toBeLessThan(lum(lightColors.bg.canvas));
    expect(lum(darkColors.text.primary)).toBeGreaterThan(lum(lightColors.text.primary));
    // Surfaces lift AWAY from the canvas in both modes — up on ink, down on
    // paper — which is what makes a card read as raised rather than as a patch.
    expect(lum(darkColors.bg.surface)).toBeGreaterThan(lum(darkColors.bg.canvas));
    expect(lum(lightColors.bg.surface)).toBeGreaterThan(lum(lightColors.bg.canvas));
    expect(lum(darkColors.bg.surfaceElevated)).toBeGreaterThan(lum(darkColors.bg.surface));
  });
});
