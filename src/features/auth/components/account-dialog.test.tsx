import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { apiError, buildProfile, buildSessionUser } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { AccountDialog } from './account-dialog';

const RESET = apiUrl('/api/auth/password-reset/request');
const PROFILE = apiUrl('/api/auth/profile');
const user = buildSessionUser({
  email: 'ana@example.com',
  first_name: 'Luis',
  last_name: 'Pérez',
  producer_id: 'p1',
  roles: [{ id: 'r1', code: 'producer', name: 'Productor' }],
});

// La sesión ya cargada: el diálogo pregunta de dónde salió para saber si hay conexión, y las
// pruebas no responden peticiones que no esperan.
function renderDialog({ fromDevice = false } = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.session(), {
    user,
    ...(fromDevice && { fromDevice: true }),
  });
  return renderWithProviders(
    <AccountDialog user={user} open onOpenChange={() => {}} />,
    { queryClient },
  );
}

afterEach(() => vi.restoreAllMocks());

describe('AccountDialog', () => {
  it('shows the account of the session', () => {
    renderDialog();

    expect(screen.getByRole('dialog', { name: 'Mi cuenta' })).toBeVisible();
    expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
    expect(screen.getByText('Cuenta de un productor')).toBeInTheDocument();
    expect(
      screen.getByText('Productor', { selector: 'span' }),
    ).toBeInTheDocument();
  });

  it('shows the document, phone and producer of the account', async () => {
    renderDialog();

    expect(await screen.findByText('CC 1094000111')).toBeInTheDocument();
    expect(screen.getByText('3001234567')).toBeInTheDocument();
    expect(screen.getByText('Ana Ejemplo · PROD-000001')).toBeInTheDocument();
  });

  it('shows no producer for an association account', async () => {
    server.use(
      http.get(PROFILE, () =>
        HttpResponse.json(buildProfile({ producer: null, phone: null })),
      ),
    );
    renderDialog();

    expect(await screen.findByText('CC 1094000111')).toBeInTheDocument();
    expect(screen.getByText('Sin teléfono registrado')).toBeInTheDocument();
    expect(
      screen.queryByText('Productor', { selector: 'dt' }),
    ).not.toBeInTheDocument();
  });

  it('offers to retry when the account data could not be loaded', async () => {
    let failing = true;
    server.use(
      http.get(PROFILE, () =>
        failing
          ? apiError(500, 'server_error')
          : HttpResponse.json(buildProfile()),
      ),
    );
    renderDialog();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible cargar los datos de tu cuenta',
    );
    failing = false;
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('CC 1094000111')).toBeInTheDocument();
  });

  it('asks for a connection to show the rest of the data, without requesting it', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { queryClient } = renderDialog();

    expect(
      screen.getByText(
        'Conéctate para ver tu documento, teléfono y productor.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
    // Ni siquiera se intenta: una consulta en pausa saldría sola al volver la red.
    expect(queryClient.getQueryState(queryKeys.profile())?.fetchStatus).toBe(
      'idle',
    );
  });

  it('sends the link to change the password to the session email', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(RESET, async ({ request }) => {
        bodies.push(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderDialog();

    await userEvent.click(
      screen.getByRole('button', { name: 'Cambiar contraseña' }),
    );

    expect(
      await screen.findByText(
        'Te enviamos un enlace a ana@example.com para cambiar tu contraseña.',
      ),
    ).toBeInTheDocument();
    expect(bodies).toEqual([{ email: 'ana@example.com' }]);
  });

  it('says when the link could not be sent', async () => {
    server.use(http.post(RESET, () => HttpResponse.error()));
    renderDialog();

    await userEvent.click(
      screen.getByRole('button', { name: 'Cambiar contraseña' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible enviar el enlace',
    );
  });

  it('needs a connection to change the password', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderDialog();

    expect(
      screen.getByRole('button', { name: 'Cambiar contraseña' }),
    ).toBeDisabled();
    expect(
      screen.getByText('Necesitas conexión para cambiar la contraseña.'),
    ).toBeInTheDocument();
  });

  it('needs a connection too when the browser has a network but the server did not answer', () => {
    renderDialog({ fromDevice: true });

    expect(
      screen.getByRole('button', { name: 'Cambiar contraseña' }),
    ).toBeDisabled();
  });
});
