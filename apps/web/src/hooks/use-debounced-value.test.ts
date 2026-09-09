import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './use-debounced-value';

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('only settles after the value stops changing for the delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'a' },
    });
    rerender({ value: 'ab' });
    void act(() => vi.advanceTimersByTime(200));
    rerender({ value: 'abc' });
    void act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe('a');
    void act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe('abc');
  });
});
