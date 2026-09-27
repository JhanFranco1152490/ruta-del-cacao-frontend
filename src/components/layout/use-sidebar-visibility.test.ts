import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSidebarVisibility } from './use-sidebar-visibility';

const KEY = 'sidebar-hidden';

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('useSidebarVisibility', () => {
  it('starts visible', () => {
    const { result } = renderHook(() => useSidebarVisibility());

    expect(result.current.hidden).toBe(false);
  });

  it('toggles and remembers the choice', () => {
    const { result } = renderHook(() => useSidebarVisibility());

    act(() => result.current.toggle());
    expect(result.current.hidden).toBe(true);
    expect(window.localStorage.getItem(KEY)).toBe('true');

    act(() => result.current.toggle());
    expect(result.current.hidden).toBe(false);
    expect(window.localStorage.getItem(KEY)).toBe('false');
  });

  it('restores a hidden sidebar on the next visit', () => {
    window.localStorage.setItem(KEY, 'true');

    const { result } = renderHook(() => useSidebarVisibility());

    expect(result.current.hidden).toBe(true);
  });

  it('ignores an unexpected stored value', () => {
    window.localStorage.setItem(KEY, 'quizás');

    const { result } = renderHook(() => useSidebarVisibility());

    expect(result.current.hidden).toBe(false);
  });

  it('keeps working when the storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });

    const { result } = renderHook(() => useSidebarVisibility());
    expect(result.current.hidden).toBe(false);

    act(() => result.current.toggle());
    expect(result.current.hidden).toBe(true);
  });
});
