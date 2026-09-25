import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildSession } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { router } from '@/test/router';
import { server } from '@/test/server';

import { SessionPanel } from './session-panel';

vi.mock('next/navigation', () => ({ useRouter: () => router }));

const ME = apiUrl('/api/auth/me');
const LOGOUT = apiUrl('/api/auth/logout');

beforeEach(() => {
  vi.clearAllMocks();
  server.use(
    http.get(ME, () =>
      HttpResponse.json(
        buildSession({
          email: 'ana@example.com',
          roles: ['producer', 'admin'],
        }),
      ),
    ),
  );
});

describe('SessionPanel', () => {
  it('shows the email and the roles of the session', async () => {
    renderWithProviders(<SessionPanel />);

    expect(await screen.findByText('ana@example.com')).toBeInTheDocument();
    expect(screen.getByText('producer')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('says so when the account has no roles', async () => {
    server.use(
      http.get(ME, () => HttpResponse.json(buildSession({ roles: [] }))),
    );
    renderWithProviders(<SessionPanel />);

    expect(await screen.findByText('Sin roles asignados')).toBeInTheDocument();
  });

  it('only links to the producers section', async () => {
    renderWithProviders(<SessionPanel />);
    await screen.findByText('ana@example.com');

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/productores');
  });

  it('logs out and goes to the start', async () => {
    server.use(
      http.post(LOGOUT, () => new HttpResponse(null, { status: 204 })),
    );
    renderWithProviders(<SessionPanel />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Cerrar sesión' }),
    );

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  });

  it('keeps the panel and allows retrying when the logout fails', async () => {
    let failing = true;
    server.use(
      http.post(LOGOUT, () =>
        failing
          ? HttpResponse.error()
          : new HttpResponse(null, { status: 204 }),
      ),
    );
    renderWithProviders(<SessionPanel />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Cerrar sesión' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos cerrar tu sesión',
    );
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();

    failing = false;
    await userEvent.click(
      screen.getByRole('button', { name: 'Cerrar sesión' }),
    );
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  });

  it('disables the logout button while the request is in flight', async () => {
    let calls = 0;
    server.use(
      http.post(LOGOUT, async () => {
        calls += 1;
        await new Promise((resolve) => setTimeout(resolve, 100));
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderWithProviders(<SessionPanel />);

    const button = await screen.findByRole('button', { name: 'Cerrar sesión' });
    await userEvent.click(button);
    expect(button).toBeDisabled();
    await userEvent.click(button);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(calls).toBe(1);
  });
});
