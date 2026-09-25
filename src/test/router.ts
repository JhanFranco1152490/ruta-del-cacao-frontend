import { vi } from 'vitest';

// Misma referencia entre renders: algunos efectos usan el router como dependencia.
export const router = {
  replace: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
};
