import { act, renderHook } from '@testing-library/react-native';

import { useSuggestionLedger } from './useSuggestionLedger';

describe('useSuggestionLedger', () => {
  it('hides nothing from the highest-ranked strip', () => {
    const { result } = renderHook(() => useSuggestionLedger());

    act(() => result.current.claim(0, ['a', 'b']));
    expect(result.current.excludedFor(0)).toEqual([]);
  });

  it('passes a strip everything the strips above it claimed', () => {
    const { result } = renderHook(() => useSuggestionLedger());

    act(() => result.current.claim(0, ['a', 'b']));
    act(() => result.current.claim(1, ['c']));

    expect(result.current.excludedFor(1)).toEqual(['a', 'b']);
    expect(result.current.excludedFor(2)).toEqual(expect.arrayContaining(['a', 'b', 'c']));
    expect(result.current.excludedFor(2)).toHaveLength(3);
  });

  // Claims flow strictly downward, so a lower strip can never take a prompt
  // back from a higher one.
  it('never hides a lower strip’s picks from a higher one', () => {
    const { result } = renderHook(() => useSuggestionLedger());

    act(() => result.current.claim(3, ['z']));
    expect(result.current.excludedFor(1)).toEqual([]);
  });

  /**
   * Each strip claims from an effect that runs on every render. Re-publishing
   * an unchanged list has to be inert — otherwise the claim sets state, the
   * state re-renders the strip, and the effect claims again forever.
   */
  it('ignores a repeated claim so the strips settle', () => {
    const { result } = renderHook(() => useSuggestionLedger());

    act(() => result.current.claim(0, ['a', 'b']));
    const afterFirst = result.current.excludedFor(1);

    act(() => result.current.claim(0, ['a', 'b']));

    // Same contents AND the same array identity: a new identity would be a new
    // dependency for every strip below, re-running their effects on every pass.
    expect(result.current.excludedFor(1)).toBe(afterFirst);
  });

  it('republishes when a strip’s picks actually change', () => {
    const { result } = renderHook(() => useSuggestionLedger());

    act(() => result.current.claim(0, ['a']));
    act(() => result.current.claim(0, ['a', 'b']));

    expect(result.current.excludedFor(1)).toEqual(['a', 'b']);
  });

  it('treats a reordered claim as a change', () => {
    const { result } = renderHook(() => useSuggestionLedger());

    act(() => result.current.claim(0, ['a', 'b']));
    act(() => result.current.claim(0, ['b', 'a']));

    expect(result.current.excludedFor(1)).toEqual(['b', 'a']);
  });
});
