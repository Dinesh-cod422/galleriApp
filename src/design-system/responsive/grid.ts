/**
 * Cell width for an N-column grid with equal gutters and outer padding.
 * Returning a concrete number (not a flex ratio) is what lets FlashList
 * compute a correct `estimatedItemSize` — a wrong estimate is the number one
 * cause of blank cells while scrolling.
 */
export const gridCellWidth = (params: {
  containerWidth: number;
  columns: number;
  gap: number;
  horizontalPadding: number;
}): number => {
  const { containerWidth, columns, gap, horizontalPadding } = params;
  if (columns <= 0) {
    return 0;
  }
  const available = containerWidth - horizontalPadding * 2 - gap * (columns - 1);
  return Math.floor(available / columns);
};
