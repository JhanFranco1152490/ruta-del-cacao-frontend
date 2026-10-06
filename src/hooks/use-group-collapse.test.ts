import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useGroupCollapse } from './use-group-collapse';

describe('useGroupCollapse', () => {
  it('starts with every group open', () => {
    const { result } = renderHook(() => useGroupCollapse(['a', 'b']));

    expect(result.current.isOpen('a')).toBe(true);
    expect(result.current.isOpen('b')).toBe(true);
    expect(result.current.allOpen).toBe(true);
  });

  it('folds and unfolds one group at a time', () => {
    const { result } = renderHook(() => useGroupCollapse(['a', 'b']));

    act(() => result.current.toggle('a'));
    expect(result.current.isOpen('a')).toBe(false);
    expect(result.current.isOpen('b')).toBe(true);
    expect(result.current.allOpen).toBe(false);

    act(() => result.current.toggle('a'));
    expect(result.current.isOpen('a')).toBe(true);
  });

  it('folds all when all are open and unfolds all otherwise', () => {
    const { result } = renderHook(() => useGroupCollapse(['a', 'b']));

    act(() => result.current.toggleAll());
    expect(result.current.isOpen('a')).toBe(false);
    expect(result.current.isOpen('b')).toBe(false);

    act(() => result.current.toggleAll());
    expect(result.current.allOpen).toBe(true);
  });

  it('counts a group that was not folded as open when it appears later', () => {
    const { result, rerender } = renderHook(
      ({ keys }) => useGroupCollapse(keys),
      { initialProps: { keys: ['a'] } },
    );
    act(() => result.current.toggleAll());

    rerender({ keys: ['a', 'b'] });

    expect(result.current.isOpen('b')).toBe(true);
    expect(result.current.allOpen).toBe(false);
  });
});
