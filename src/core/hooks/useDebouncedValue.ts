import { useEffect, useState } from 'react';

/**
 * Keystrokes must not spawn a query each. Debouncing here (rather than
 * inside the data layer) keeps the use case pure and testable.
 */
export const useDebouncedValue = <T>(value: T, delayMs: number): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
};
