import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { apiError, buildPage, buildSession } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { PERMISSIONS } from '@/lib/permissions';
import { AccountListScreen } from './account-list-screen';

const id = '11111111-1111-4111-8111-111111111111';
const producerId = '33333333-3333-4333-8333-333333333333';
const account = {
  id,
  email: 'empleado@example.com',
  first_name: 'Ana',
  last_name: 'Prueba',
  document_type: 'CC',
  identity_document: '1234567890',
  phone: null,
  producer: { id: producerId, member_code: 'PROD-000001', status: 'active' },
  roles: [
    {
      id: '22222222-2222-4222-8222-222222222222',
      code: 'foreman',
      name: 'Capataz',
    },
  ],
  status: 'active',
  activation_pending: false,
  has_signed_in: false,
  created_at: '2026-09-28T12:00:00Z',
};
const permissions = [
  PERMISSIONS.USERS_VIEW,
  PERMISSIONS.USERS_UPDATE,
  PERMISSIONS.USERS_CHANGE_STATUS,
  PERMISSIONS.USERS_DELETE,
  PERMISSIONS.ROLES_VIEW,
];

function mockSession(list: string[] = permissions, userId = 'u1') {
  server.use(
    http.get(apiUrl('/api/auth/me'), () =>
      HttpResponse.json(
        buildSession({
          id: userId,
          producer_id: producerId,
          permissions: list,
        }),
      ),
    ),
  );
}
function mockAccount(detail: object) {
  server.use(
    http.get(apiUrl(`/api/users/${id}`), () => HttpResponse.json(detail)),
  );
}
const openAccount = () =>
  renderWithProviders(<AccountListScreen />, { searchParams: `?cuenta=${id}` });
const trigger = () => screen.findByRole('button', { name: 'Eliminar cuenta' });
const queryTrigger = () =>
  screen.queryByRole('button', { name: 'Eliminar cuenta' });

beforeEach(() => {
  mockSession();
  server.use(
    http.get(apiUrl('/api/users'), () =>
      HttpResponse.json(buildPage([account])),
    ),
    http.get(apiUrl('/api/roles'), () => HttpResponse.json(buildPage([]))),
  );
  mockAccount(account);
});

describe('deleting an account', () => {
  it('offers it to an account that never signed in, with permission', async () => {
    openAccount();
    expect(await trigger()).toBeVisible();
  });

  it('does not offer it once the account has signed in', async () => {
    mockAccount({ ...account, has_signed_in: true });
    openAccount();
    await screen.findByRole('button', { name: 'Editar datos' });
    expect(queryTrigger()).toBeNull();
  });

  it('does not offer it without users_delete', async () => {
    mockSession(
      permissions.filter((code) => code !== PERMISSIONS.USERS_DELETE),
    );
    openAccount();
    await screen.findByRole('button', { name: 'Editar datos' });
    expect(queryTrigger()).toBeNull();
  });

  it('does not offer it on your own account', async () => {
    mockSession(permissions, id);
    openAccount();
    await screen.findByText('empleado@example.com');
    expect(queryTrigger()).toBeNull();
  });

  it('asks for confirmation and says what is lost and what stays', async () => {
    openAccount();
    await userEvent.click(await trigger());
    const dialog = await screen.findByRole('dialog', {
      name: '¿Eliminar la cuenta?',
    });
    expect(within(dialog).getByText(/nunca ha iniciado sesión/)).toBeVisible();
    expect(within(dialog).getByText(/historial se conserva/)).toBeVisible();
  });

  it('explains an account that already signed in and offers to deactivate it', async () => {
    const statuses: unknown[] = [];
    server.use(
      http.delete(apiUrl(`/api/users/${id}`), () =>
        apiError(
          409,
          'account_has_activity',
          'La cuenta ya inició sesión: desactívala en lugar de eliminarla.',
        ),
      ),
      http.patch(apiUrl(`/api/users/${id}/status`), async ({ request }) => {
        statuses.push(await request.json());
        return HttpResponse.json({ ...account, status: 'inactive' });
      }),
    );
    openAccount();
    await userEvent.click(await trigger());
    const dialog = await screen.findByRole('dialog', {
      name: '¿Eliminar la cuenta?',
    });
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Eliminar cuenta' }),
    );
    const offer = await screen.findByRole('dialog', {
      name: 'No se puede eliminar esta cuenta',
    });
    await userEvent.click(
      within(offer).getByRole('button', { name: 'Desactivar cuenta' }),
    );
    await waitFor(() => expect(statuses).toEqual([{ status: 'inactive' }]));
  });

  it('shows the reason of the last administrator and stays open', async () => {
    server.use(
      http.delete(apiUrl(`/api/users/${id}`), () =>
        apiError(
          409,
          'last_administrator',
          'Debe quedar al menos un administrador activo.',
        ),
      ),
    );
    openAccount();
    await userEvent.click(await trigger());
    const dialog = await screen.findByRole('dialog', {
      name: '¿Eliminar la cuenta?',
    });
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Eliminar cuenta' }),
    );
    expect(
      await within(dialog).findByText(
        'Debe quedar al menos un administrador activo.',
      ),
    ).toBeVisible();
  });

  it('lets the person retry after a network error', async () => {
    let attempts = 0;
    server.use(
      http.delete(apiUrl(`/api/users/${id}`), () => {
        attempts += 1;
        if (attempts === 1) return HttpResponse.error();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    openAccount();
    await userEvent.click(await trigger());
    const dialog = await screen.findByRole('dialog', {
      name: '¿Eliminar la cuenta?',
    });
    const confirm = within(dialog).getByRole('button', {
      name: 'Eliminar cuenta',
    });
    await userEvent.click(confirm);
    expect(await within(dialog).findByRole('alert')).toBeVisible();
    await userEvent.click(confirm);
    await waitFor(() => expect(attempts).toBe(2));
  });

  // Va al final: cerrar el panel deja la selección en la memoria del adaptador de la URL, que
  // comparten las pruebas del archivo.
  it('deletes once even with a double click, and closes the panel', async () => {
    let calls = 0;
    server.use(
      http.delete(apiUrl(`/api/users/${id}`), async () => {
        calls += 1;
        await delay(100);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    openAccount();
    await userEvent.click(await trigger());
    const dialog = await screen.findByRole('dialog', {
      name: '¿Eliminar la cuenta?',
    });
    await userEvent.dblClick(
      within(dialog).getByRole('button', { name: 'Eliminar cuenta' }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Detalle de la cuenta' }),
      ).toBeNull(),
    );
    expect(calls).toBe(1);
  });
});
