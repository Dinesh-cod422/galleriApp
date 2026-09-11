import { gridColumnsForBreakpoint, resolveBreakpoint } from './breakpoints';
import { gridCellWidth } from './grid';

describe('resolveBreakpoint', () => {
  it('maps real device widths to the intended bucket', () => {
    expect(resolveBreakpoint(320)).toBe('sm'); // iPhone SE
    expect(resolveBreakpoint(390)).toBe('md'); // iPhone 15
    expect(resolveBreakpoint(430)).toBe('md'); // iPhone 15 Pro Max
    expect(resolveBreakpoint(600)).toBe('lg'); // small foldable
    expect(resolveBreakpoint(834)).toBe('lg'); // iPad portrait short edge
    expect(resolveBreakpoint(1024)).toBe('xl');
  });

  it('gives tablets more columns than phones', () => {
    expect(gridColumnsForBreakpoint.sm).toBe(2);
    expect(gridColumnsForBreakpoint.xl).toBeGreaterThan(gridColumnsForBreakpoint.md);
  });
});

describe('gridCellWidth', () => {
  it('accounts for gutters and inter-column gaps', () => {
    // 390 - (16 * 2) - 12 = 346, / 2 = 173
    expect(gridCellWidth({ containerWidth: 390, columns: 2, gap: 12, horizontalPadding: 16 })).toBe(
      173,
    );
  });

  it('returns a whole number so FlashList estimates stay stable', () => {
    const width = gridCellWidth({
      containerWidth: 375,
      columns: 3,
      gap: 10,
      horizontalPadding: 16,
    });
    expect(Number.isInteger(width)).toBe(true);
  });

  it('does not divide by zero', () => {
    expect(gridCellWidth({ containerWidth: 390, columns: 0, gap: 12, horizontalPadding: 16 })).toBe(
      0,
    );
  });
});
