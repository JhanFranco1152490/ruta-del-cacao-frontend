import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useIsDesktop } from './use-is-desktop';

type Listener = () => void;

function fakeMatchMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<Listener>();
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      get matches() {
        return matches;
      },
      media: query,
      addEventListener: (_: string, listener: Listener) =>
        listeners.add(listener),
      removeEventListener: (_: string, listener: Listener) =>
        listeners.delete(listener),
    })),
  );
  return (next: boolean) => {
    matches = next;
    listeners.forEach((listener) => listener());
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('useIsDesktop', () => {
  it('is false when the browser cannot tell the width of the screen', () => {
    vi.stubGlobal('matchMedia', undefined);

    const { result } = renderHook(() => useIsDesktop());

    expect(result.current).toBe(false);
  });

  it('follows the width of the screen', () => {
    const resize = fakeMatchMedia(true);
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(true);

    act(() => resize(false));

    expect(result.current).toBe(false);
  });

  it('asks for the width where the layout changes to the desktop one', () => {
    fakeMatchMedia(false);

    renderHook(() => useIsDesktop());

    expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 768px)');
  });
});
