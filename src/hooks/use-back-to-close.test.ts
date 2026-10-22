import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useBackToClose } from './use-back-to-close';

// Con `back` simulado el navegador no avisa del retroceso: se avisa a mano para que la cuenta de
// «atrás» propios, que es global, no pase a la prueba siguiente.
const settleOwnBack = () => window.dispatchEvent(new PopStateEvent('popstate'));
const userDismissed = (value = false) => ({ current: value });

describe('useBackToClose', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('adds a history entry when the modal opens and closes it on back', () => {
    const push = vi.spyOn(window.history, 'pushState');
    const close = vi.fn();
    renderHook(() => useBackToClose(true, close, userDismissed()));

    expect(push).toHaveBeenCalledOnce();
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(close).toHaveBeenCalledOnce();
  });

  it('does nothing while the modal is closed', () => {
    const push = vi.spyOn(window.history, 'pushState');
    renderHook(() => useBackToClose(false, vi.fn(), userDismissed()));

    expect(push).not.toHaveBeenCalled();
  });

  it('gives the entry back at once when the person dismissed the modal', () => {
    vi.useFakeTimers();
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    const dismissed = userDismissed(true);
    const { rerender } = renderHook(
      ({ open }) => useBackToClose(open, vi.fn(), dismissed),
      { initialProps: { open: true } },
    );

    rerender({ open: false });
    vi.advanceTimersByTime(1);

    expect(back).toHaveBeenCalledOnce();
    settleOwnBack();
  });

  it('waits before giving the entry back when the code closed the modal', () => {
    vi.useFakeTimers();
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    const { rerender } = renderHook(
      ({ open }) => useBackToClose(open, vi.fn(), userDismissed()),
      { initialProps: { open: true } },
    );

    rerender({ open: false });
    vi.advanceTimersByTime(1);
    expect(back).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);

    expect(back).toHaveBeenCalledOnce();
    settleOwnBack();
  });

  it('leaves the history alone when a navigation already left another entry on top', () => {
    vi.useFakeTimers();
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    const { rerender } = renderHook(
      ({ open }) => useBackToClose(open, vi.fn(), userDismissed()),
      { initialProps: { open: true } },
    );

    window.history.pushState({}, '', window.location.href);
    rerender({ open: false });
    vi.advanceTimersByTime(2000);

    expect(back).not.toHaveBeenCalled();
  });

  it('only the top modal closes with back', () => {
    const first = vi.fn();
    const second = vi.fn();
    renderHook(() => useBackToClose(true, first, userDismissed()));
    renderHook(() => useBackToClose(true, second, userDismissed()));

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(second).toHaveBeenCalledOnce();
    expect(first).not.toHaveBeenCalled();
  });
});
