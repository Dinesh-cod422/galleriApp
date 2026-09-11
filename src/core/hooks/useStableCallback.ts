import { useCallback, useRef } from 'react';

/**
 * Returns a callback whose identity NEVER changes but which always calls the
 * latest closure.
 *
 * This is what lets `React.memo(PromptCard)` actually work: a list can pass
 * `onPress` down without a new function identity on every parent render,
 * which would defeat memoization for every visible cell.
 */
export const useStableCallback = <Args extends readonly unknown[], R>(
  callback: (...args: Args) => R,
): ((...args: Args) => R) => {
  const ref = useRef(callback);
  ref.current = callback;
  return useCallback((...args: Args) => ref.current(...args), []);
};
