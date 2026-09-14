import { createTheme } from './theme';

describe('createTheme', () => {
  it('returns a stable identity for the same inputs', () => {
    // useThemedStyles memoizes on theme identity; a new object per call would
    // rebuild every StyleSheet in the tree on every render.
    expect(createTheme('light', 'md')).toBe(createTheme('light', 'md'));
    expect(createTheme('light', 'md')).not.toBe(createTheme('dark', 'md'));
  });

  it('scales spacing up for tablets and down for small phones', () => {
    const small = createTheme('light', 'sm');
    const phone = createTheme('light', 'md');
    const tablet = createTheme('light', 'xl');

    expect(small.spacing.base).toBeLessThan(phone.spacing.base);
    expect(tablet.spacing.base).toBeGreaterThan(phone.spacing.base);
  });

  it('exposes every semantic color token in both modes', () => {
    const light = createTheme('light', 'md');
    const dark = createTheme('dark', 'md');

    const groups = ['bg', 'text', 'border', 'accent', 'status', 'skeleton', 'tag'] as const;
    for (const group of groups) {
      expect(Object.keys(light.colors[group])).toEqual(Object.keys(dark.colors[group]));
    }
  });

  it('gives every status tag a distinct background and foreground in both modes', () => {
    for (const mode of ['light', 'dark'] as const) {
      const { tag } = createTheme(mode, 'md').colors;
      const tags = [tag.featured, tag.trending, tag.fresh];

      // A tag whose ink matches its tint is invisible.
      for (const t of tags) {
        expect(t.bg).not.toBe(t.fg);
      }
      // And three tags sharing one colour carry no more information than one.
      expect(new Set(tags.map(t => t.bg)).size).toBe(3);
      expect(new Set(tags.map(t => t.fg)).size).toBe(3);
    }
  });

  it('gives tablets more grid columns and a capped content width', () => {
    const tablet = createTheme('light', 'xl');
    expect(tablet.layout.gridColumns).toBe(4);
    expect(Number.isFinite(tablet.layout.maxContentWidth)).toBe(true);
  });
});
