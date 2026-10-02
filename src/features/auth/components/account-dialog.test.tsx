import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { buildSessionUser } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { AccountDialog } from './account-dialog';

const RESET = apiUrl('/api/auth/password-reset/request');
const user = buildSessionUser({
  email: 'ana@example.com',
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
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
    expect(screen.getByText('Cuenta de un productor')).toBeInTheDocument();
    expect(screen.getByText('Productor')).toBeInTheDocument();
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
