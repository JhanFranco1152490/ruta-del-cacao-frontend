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

    expect(register).toHaveBeenCalledWith('/sw.js');
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
});
