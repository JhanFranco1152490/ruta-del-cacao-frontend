import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ServiceWorkerRegistration } from './service-worker-registration';

afterEach(() => {
  Reflect.deleteProperty(navigator, 'serviceWorker');
});

describe('ServiceWorkerRegistration', () => {
  it('registers the service worker when the browser supports it', () => {
    const register = vi.fn().mockResolvedValue({});
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register },
      configurable: true,
    });

    render(<ServiceWorkerRegistration />);

    expect(register).toHaveBeenCalledWith('/serwist/sw.js', { scope: '/' });
  });

  it('does nothing when the browser has no service worker support', () => {
    expect(() => render(<ServiceWorkerRegistration />)).not.toThrow();
  });

  it('registers background sync when the browser supports it', async () => {
    const syncRegister = vi.fn().mockResolvedValue(undefined);
    const register = vi
      .fn()
      .mockResolvedValue({ sync: { register: syncRegister } });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register },
      configurable: true,
    });

    render(<ServiceWorkerRegistration />);

    await waitFor(() =>
      expect(syncRegister).toHaveBeenCalledWith('cacao-sync'),
    );
  });

  it('does not throw when the browser has no background sync support', async () => {
    const register = vi.fn().mockResolvedValue({});
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register },
      configurable: true,
    });

    expect(() => render(<ServiceWorkerRegistration />)).not.toThrow();
    await waitFor(() => expect(register).toHaveBeenCalled());
  });

  it('handles a background sync registration that fails', async () => {
    // Una promesa rechazada que anota si alguien se encarga del rechazo: sin manejarlo, quedaría
    // como una promesa rechazada sin manejar.
    let handled = false;
    const failing = {
      then(_onFulfilled: unknown, onRejected?: (reason: unknown) => void) {
        if (!onRejected) return;
        handled = true;
        onRejected(new Error('no active service worker'));
      },
    };
    const register = vi
      .fn()
      .mockResolvedValue({ sync: { register: () => failing } });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register },
      configurable: true,
    });

    render(<ServiceWorkerRegistration />);

    await waitFor(() => expect(handled).toBe(true));
  });
});
