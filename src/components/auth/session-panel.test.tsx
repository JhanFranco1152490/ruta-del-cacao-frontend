import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { ApiError, getCurrentUser, logout } from '@/lib/auth';
import { SessionPanel } from './session-panel';

const router = { replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth')>()),
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
}));
const identity = {
  user: {
    id: 'test-user',
    email: 'test@example.com',
    roles: ['producer'],
    permissions: [],
  },
};
beforeEach(() => vi.resetAllMocks());

it('redirige cuando la sesión no se puede renovar', async () => {
  vi.mocked(getCurrentUser).mockRejectedValue(
    new ApiError('Sesión vencida', 401),
  );
  render(<SessionPanel />);
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
});

it('permite reintentar un error de red sin redirigir al login', async () => {
  vi.mocked(getCurrentUser)
    .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    .mockResolvedValueOnce(identity);
  render(<SessionPanel />);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Revisa la conexión',
  );
  expect(router.replace).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByText('test@example.com')).toBeInTheDocument();
});

it('conserva el panel y permite reintentar si falla el cierre', async () => {
  vi.mocked(getCurrentUser).mockResolvedValue(identity);
  vi.mocked(logout)
    .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    .mockResolvedValueOnce(undefined);
  render(<SessionPanel />);
  await userEvent.click(
    await screen.findByRole('button', { name: 'Cerrar sesión' }),
  );
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'No pudimos cerrar tu sesión',
  );
  expect(router.replace).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
});
