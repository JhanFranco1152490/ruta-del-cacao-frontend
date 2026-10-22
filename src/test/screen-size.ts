import { vi } from 'vitest';

// jsdom no mide la pantalla y `useIsDesktop` la toma por la de un celular. Las pruebas de lo que
// solo se ve en pantallas anchas la simulan así (y la devuelven con `vi.unstubAllGlobals`).
export function stubWideScreen() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}
