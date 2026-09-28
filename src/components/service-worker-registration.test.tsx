import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ServiceWorkerRegistration } from './service-worker-registration';

afterEach(() => {
  Reflect.deleteProperty(navigator, 'serviceWorker');
});

describe('ServiceWorkerRegistration', () => {
  it('registers the service worker when the browser supports it', () => {
    const register = vi.fn().mockResolvedValue(undefined);
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
});
