import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import { runOfflineBootstrap } from '@/lib/offline/bootstrap';
import { recordLogin } from '@/lib/offline/session-clock';
import { saveSessionSnapshot } from '@/lib/offline/session-snapshot';
import { buildSession } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { router } from '@/test/router';
import { server } from '@/test/server';

import { SessionShell } from './session-shell';

vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/panel',
}));

vi.mock('@/lib/offline/bootstrap', () => ({ runOfflineBootstrap: vi.fn() }));
vi.mock('@/lib/offline/session-clock', () => ({ recordLogin: vi.fn() }));
vi.mock('@/lib/offline/session-snapshot', () => ({
  saveSessionSnapshot: vi.fn(),
  clearSessionSnapshot: vi.fn(),
  forgetLastSession: vi.fn(),
  readSessionSnapshot: vi.fn().mockResolvedValue(null),
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

async function chooseFromAccountMenu(name: string) {
  await userEvent.click(
    await screen.findByRole('button', { name: 'Cuenta de ana@example.com' }),
  );
  await userEvent.click(await screen.findByRole('menuitem', { name }));
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  signInWith([PERMISSIONS.PRODUCERS_VIEW]);
});

describe('SessionShell', () => {
  it('records the session clock and saves the copy when the server confirms it', async () => {
    renderWithProviders(<SessionShell>contenido</SessionShell>);

    await waitFor(() => expect(recordLogin).toHaveBeenCalled());
    expect(saveSessionSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ana@example.com' }),
    );
  });

  it('does not renew the offline window with the device copy', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(queryKeys.session(), {
      ...buildSession({ email: 'ana@example.com' }),
      fromDevice: true,
    });
    server.use(http.get(ME, () => HttpResponse.error()));
    renderWithProviders(<SessionShell>contenido</SessionShell>, {
      queryClient,
    });

    await screen.findByText('ana@example.com');
    expect(recordLogin).not.toHaveBeenCalled();
    expect(saveSessionSnapshot).not.toHaveBeenCalled();
  });

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
    expect(
      screen.queryByRole('link', { name: 'Fincas' }),
    ).not.toBeInTheDocument();
  });

  it('still draws the shell when the session has no permissions', async () => {
    signInWith([]);
    renderWithProviders(<SessionShell>contenido</SessionShell>);

    expect(await screen.findByText('ana@example.com')).toBeInTheDocument();
    expect(screen.getByText('contenido')).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Principal' }),
    ).not.toBeInTheDocument();
  });

  it('offers the mobile menu with only the allowed sections', async () => {
    signInWith([PERMISSIONS.FARMS_VIEW]);
    renderWithProviders(<SessionShell>contenido</SessionShell>);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Abrir menú' }),
    );

    const menu = await screen.findByRole('dialog', {
      name: 'Menú de navegación',
    });
    expect(within(menu).getByRole('link', { name: 'Fincas' })).toBeVisible();
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

    await chooseFromAccountMenu('Cerrar sesión');

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith('/iniciar-sesion'),
    );
  });

  it('shows the name of the account in the header', async () => {
    server.use(
      http.get(ME, () =>
        HttpResponse.json(
          buildSession({
            email: 'ana@example.com',
            first_name: 'Ana',
            last_name: 'Rojas',
          }),
        ),
      ),
    );
    renderWithProviders(<SessionShell>contenido</SessionShell>);

    expect(
      await screen.findByRole('button', { name: 'Cuenta de Ana Rojas' }),
    ).toHaveTextContent('Ana Rojas');
  });

  it('opens Mi cuenta from the account menu', async () => {
    renderWithProviders(<SessionShell>contenido</SessionShell>);

    await chooseFromAccountMenu('Mi cuenta');

    expect(
      await screen.findByRole('dialog', { name: 'Mi cuenta' }),
    ).toBeVisible();
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

    await chooseFromAccountMenu('Cerrar sesión');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos cerrar tu sesión',
    );
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();

    failing = false;
    await chooseFromAccountMenu('Cerrar sesión');
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith('/iniciar-sesion'),
    );
  });

  it('does not log out twice while the request is in flight', async () => {
    let calls = 0;
    // La respuesta queda retenida hasta después del segundo clic: así el envío sigue en curso
    // mientras se intenta de nuevo, sin depender de cuánto tarde el menú en abrirse.
    let release!: () => void;
    const answered = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post(LOGOUT, async () => {
        calls += 1;
        await answered;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderWithProviders(<SessionShell>contenido</SessionShell>);

    await chooseFromAccountMenu('Cerrar sesión');
    await userEvent.click(
      screen.getByRole('button', { name: 'Cuenta de ana@example.com' }),
    );
    const item = await screen.findByRole('menuitem', { name: 'Cerrar sesión' });
    expect(item).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(item);
    release();

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith('/iniciar-sesion'),
    );
    expect(calls).toBe(1);
  });

  it('shows the device records indicator when there is no connection', async () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      renderWithProviders(<SessionShell>contenido</SessionShell>);

      expect(
        await screen.findByRole('button', { name: 'Sin conexión' }),
      ).toBeInTheDocument();
    } finally {
      onLine.mockRestore();
    }
  });

  it('runs the offline bootstrap for the signed-in user', async () => {
    renderWithProviders(<SessionShell>contenido</SessionShell>);

    await waitFor(() => expect(runOfflineBootstrap).toHaveBeenCalledWith('u1'));
  });

  it('touches the offline session clock every time the session is confirmed, not only at login', async () => {
    renderWithProviders(<SessionShell>contenido</SessionShell>);

    await waitFor(() => expect(recordLogin).toHaveBeenCalledWith('u1'));
  });

  it('retries the offline bootstrap when the connection comes back', async () => {
    renderWithProviders(<SessionShell>contenido</SessionShell>);
    await waitFor(() => expect(runOfflineBootstrap).toHaveBeenCalledTimes(1));

    window.dispatchEvent(new Event('online'));

    await waitFor(() => expect(runOfflineBootstrap).toHaveBeenCalledTimes(2));
  });
});
