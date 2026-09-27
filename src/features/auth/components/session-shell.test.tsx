import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PERMISSIONS } from '@/lib/permissions';
import { buildSession } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { router } from '@/test/router';
import { server } from '@/test/server';

import { SessionShell } from './session-shell';

vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/panel',
}));

const ME = apiUrl('/api/auth/me');
const LOGOUT = apiUrl('/api/auth/logout');

function signInWith(permissions: string[]) {
  server.use(
    http.get(ME, () =>
      HttpResponse.json(
        buildSession({ email: 'ana@example.com', permissions }),
      ),
    ),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  signInWith([PERMISSIONS.PRODUCERS_VIEW]);
});

describe('SessionShell', () => {
  it('shows the email of the session and the page content', async () => {
    renderWithProviders(
      <SessionShell>
        <p>Contenido de la página</p>
      </SessionShell>,
    );

    expect(await screen.findByText('ana@example.com')).toBeInTheDocument();
    expect(screen.getByText('Contenido de la página')).toBeInTheDocument();
  });

  it('lists the sections the permissions allow', async () => {
    renderWithProviders(<SessionShell>contenido</SessionShell>);

    expect(
      await screen.findByRole('link', { name: 'Productores' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Panel' })).toBeInTheDocument();
  });

  it('still draws the shell when the session has no permissions', async () => {
    signInWith([]);
    renderWithProviders(<SessionShell>contenido</SessionShell>);

    expect(await screen.findByText('ana@example.com')).toBeInTheDocument();
    expect(screen.getByText('contenido')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Panel' })).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Productores' }),
    ).not.toBeInTheDocument();
  });

  it('offers the mobile menu with only the allowed sections', async () => {
    signInWith([]);
    renderWithProviders(<SessionShell>contenido</SessionShell>);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Abrir menú' }),
    );

    const menu = await screen.findByRole('dialog', {
      name: 'Menú de navegación',
    });
    expect(within(menu).getByRole('link', { name: 'Panel' })).toBeVisible();
    expect(
      within(menu).queryByRole('link', { name: 'Productores' }),
    ).not.toBeInTheDocument();
  });

  it('hides and shows the sidebar and remembers it on the next visit', async () => {
    const first = renderWithProviders(<SessionShell>contenido</SessionShell>);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Ocultar barra lateral' }),
    );
    expect(
      screen.getByRole('button', { name: 'Mostrar barra lateral' }),
    ).toHaveAttribute('aria-expanded', 'false');
    first.unmount();

    renderWithProviders(<SessionShell>contenido</SessionShell>);
    expect(
      await screen.findByRole('button', { name: 'Mostrar barra lateral' }),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Mostrar barra lateral' }),
    );
    expect(
      screen.getByRole('button', { name: 'Ocultar barra lateral' }),
    ).toBeInTheDocument();
  });

  it('logs out and goes to the start', async () => {
    server.use(
      http.post(LOGOUT, () => new HttpResponse(null, { status: 204 })),
    );
    renderWithProviders(<SessionShell>contenido</SessionShell>);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Cerrar sesión' }),
    );

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  });

  it('keeps the shell and allows retrying when the logout fails', async () => {
    let failing = true;
    server.use(
      http.post(LOGOUT, () =>
        failing
          ? HttpResponse.error()
          : new HttpResponse(null, { status: 204 }),
      ),
    );
    renderWithProviders(<SessionShell>contenido</SessionShell>);

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
    renderWithProviders(<SessionShell>contenido</SessionShell>);

    const button = await screen.findByRole('button', { name: 'Cerrar sesión' });
    await userEvent.click(button);
    expect(button).toBeDisabled();
    await userEvent.click(button);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(calls).toBe(1);
  });
});
