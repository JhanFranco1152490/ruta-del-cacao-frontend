import { vi } from 'vitest';

// Misma referencia entre renders: algunos efectos usan el router como dependencia.
export const router = {
  replace: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
};

// La pantalla en la que está el componente de la prueba; se cambia por prueba y se restablece con
// `resetLocation`. Los componentes que recuerdan de dónde vienen leen la ruta y los parámetros.
export const mockLocation = { path: '/fincas', search: '' };

export function resetLocation() {
  mockLocation.path = '/fincas';
  mockLocation.search = '';
}

// Para `vi.mock('next/navigation', () => navigation)`.
export const navigation = {
  useRouter: () => router,
  usePathname: () => mockLocation.path,
  useSearchParams: () => new URLSearchParams(mockLocation.search),
};
