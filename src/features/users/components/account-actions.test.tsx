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
const foremanId = '22222222-2222-4222-8222-222222222222';
const harvesterId = '44444444-4444-4444-8444-444444444444';
const account = {
  id,
  email: 'empleado@example.com',
  first_name: 'Ana',
  last_name: 'Prueba',
  document_type: 'CC',
  identity_document: '1234567890',
  phone: null,
  producer: { id: producerId, member_code: 'PROD-000001', status: 'active' },
  roles: [{ id: foremanId, code: 'foreman', name: 'Capataz' }],
  status: 'active',
  activation_pending: false,
  created_at: '2026-09-28T12:00:00Z',
};
const producerAccount = {
  ...account,
  roles: [{ id: 'role-producer', code: 'producer', name: 'Productor' }],
};
const role = (roleId: string, name: string) => ({
  id: roleId,
  code: null,
  kind: 'predefined',
  name,
  description: '',
  producer_id: null,
  permissions: [],
});
const allPermissions = [
  PERMISSIONS.USERS_VIEW,
  PERMISSIONS.USERS_UPDATE,
  PERMISSIONS.USERS_CHANGE_STATUS,
  PERMISSIONS.ROLES_VIEW,
];

// Por defecto, alguien del espacio del productor; `null` es una cuenta de la asociación.
function mockSession(
  permissions: string[] = allPermissions,
  userId = 'u1',
  producer: string | null = producerId,
) {
  server.use(
    http.get(apiUrl('/api/auth/me'), () =>
      HttpResponse.json(
        buildSession({ id: userId, producer_id: producer, permissions }),
      ),
    ),
  );
}
function mockAccount(detail: object) {
  server.use(
    http.get(apiUrl(`/api/users/${id}`), () => HttpResponse.json(detail)),
  );
}
// Guarda el cuerpo de cada petición y responde con lo que decida la prueba.
function record(respond: (body: Record<string, unknown>) => Promise<Response>) {
  const bodies: Record<string, unknown>[] = [];
  const handler = async ({ request }: { request: Request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    bodies.push(body);
    return respond(body);
  };
  return { bodies, handler };
}
const json = (body: object) => Promise.resolve(HttpResponse.json(body));
const openAccount = () =>
  renderWithProviders(<AccountListScreen />, {
    searchParams: `?cuenta=${id}`,
  });
const button = (name: string) => screen.findByRole('button', { name });
const panel = () =>
  screen.getByRole('dialog', { name: 'Detalle de la cuenta' });

beforeEach(() => {
  mockSession();
  server.use(
    http.get(apiUrl('/api/users'), () =>
      HttpResponse.json(buildPage([account])),
    ),
    http.get(apiUrl('/api/roles'), () =>
      HttpResponse.json(
        buildPage([role(foremanId, 'Capataz'), role(harvesterId, 'Cosechero')]),
      ),
    ),
  );
  mockAccount(account);
});

describe('account edition', () => {
  it('edits the data and shows the updated account', async () => {
    const update = record((body) => json({ ...account, ...body }));
    server.use(http.patch(apiUrl(`/api/users/${id}`), update.handler));
    openAccount();
    await userEvent.click(await button('Editar datos'));
    const names = screen.getByLabelText('Nombres');
    await userEvent.clear(names);
    await userEvent.type(names, 'Lucía');
    await userEvent.type(
      screen.getByLabelText('Teléfono (opcional)'),
      '3001234567',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Lucía Prueba' }),
    ).toBeVisible();
    expect(update.bodies).toEqual([
      {
        email: 'empleado@example.com',
        document_type: 'CC',
        identity_document: '1234567890',
        first_name: 'Lucía',
        last_name: 'Prueba',
        phone: '3001234567',
      },
    ]);
  });

  it('keeps the typed email when it is duplicated', async () => {
    server.use(
      http.patch(apiUrl(`/api/users/${id}`), () =>
        apiError(409, 'duplicate_email'),
      ),
    );
    openAccount();
    await userEvent.click(await button('Editar datos'));
    const email = screen.getByLabelText('Correo');
    await userEvent.clear(email);
    await userEvent.type(email, 'otra@example.com');
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    );
    expect(
      await screen.findByText('Ya existe una cuenta con este correo.'),
    ).toBeVisible();
    expect(screen.getByLabelText('Correo')).toHaveValue('otra@example.com');
  });

  it('sends one request on double submit and returns to the detail on cancel', async () => {
    const update = record(async () => {
      await delay(100);
      return HttpResponse.json(account);
    });
    server.use(http.patch(apiUrl(`/api/users/${id}`), update.handler));
    openAccount();
    await userEvent.click(await button('Editar datos'));
    await userEvent.dblClick(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    );
    await userEvent.click(await button('Editar datos'));
    expect(update.bodies).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(await button('Editar datos')).toBeVisible();
  });

  it('keeps the document and names of a producer account read-only', async () => {
    mockSession(allPermissions, 'u1', null);
    mockAccount(producerAccount);
    const update = record(() => json(producerAccount));
    server.use(http.patch(apiUrl(`/api/users/${id}`), update.handler));
    openAccount();
    await userEvent.click(await button('Editar datos'));
    expect(
      screen.getByText(/los gobierna el expediente del productor/),
    ).toBeVisible();
    for (const label of [
      'Tipo de documento',
      'Número de documento',
      'Nombres',
      'Apellidos',
    ])
      expect(screen.queryByLabelText(label)).toBeNull();
    expect(within(panel()).getByText('Ana Prueba')).toBeVisible();
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    );
    await waitFor(() =>
      expect(update.bodies).toEqual([
        { email: 'empleado@example.com', phone: null },
      ]),
    );
    expect(await button('Editar datos')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Cambiar roles' })).toBeNull();
  });

  it('offers nothing to modify on the producer account from its own space', async () => {
    mockAccount(producerAccount);
    openAccount();
    expect(
      await screen.findByRole('heading', { name: 'Ana Prueba' }),
    ).toBeVisible();
    for (const name of ['Editar datos', 'Cambiar roles', 'Desactivar'])
      expect(screen.queryByRole('button', { name })).toBeNull();
  });

  it('offers nothing to modify on the own account', async () => {
    mockSession(allPermissions, id);
    openAccount();
    expect(
      await screen.findByRole('heading', { name: 'Ana Prueba' }),
    ).toBeVisible();
    for (const name of ['Editar datos', 'Cambiar roles', 'Desactivar'])
      expect(screen.queryByRole('button', { name })).toBeNull();
  });

  it('offers nothing to modify without update or status permissions', async () => {
    mockSession([PERMISSIONS.USERS_VIEW]);
    mockAccount({ ...account, activation_pending: true });
    openAccount();
    expect(
      await screen.findByRole('heading', { name: 'Ana Prueba' }),
    ).toBeVisible();
    for (const name of [
      'Editar datos',
      'Cambiar roles',
      'Desactivar',
      'Reenviar activación',
    ])
      expect(screen.queryByRole('button', { name })).toBeNull();
  });
});

describe('account roles', () => {
  it('replaces the roles of the account', async () => {
    const replace = record(() =>
      json({
        ...account,
        roles: [{ id: harvesterId, code: null, name: 'Cosechero' }],
      }),
    );
    server.use(http.put(apiUrl(`/api/users/${id}/roles`), replace.handler));
    openAccount();
    await userEvent.click(await button('Cambiar roles'));
    await userEvent.click(
      await screen.findByRole('checkbox', { name: 'Capataz' }),
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Cosechero' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar roles' }),
    );
    expect(await within(panel()).findByText('Cosechero')).toBeVisible();
    expect(replace.bodies).toEqual([{ role_ids: [harvesterId] }]);
  });

  it('requires at least one role before sending', async () => {
    const replace = record(() => json(account));
    server.use(http.put(apiUrl(`/api/users/${id}/roles`), replace.handler));
    openAccount();
    await userEvent.click(await button('Cambiar roles'));
    await userEvent.click(
      await screen.findByRole('checkbox', { name: 'Capataz' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar roles' }),
    );
    expect(
      await screen.findByText('Selecciona al menos un rol.'),
    ).toBeVisible();
    expect(replace.bodies).toEqual([]);
  });

  it('presents exceeds_own_permissions over the roles', async () => {
    server.use(
      http.put(apiUrl(`/api/users/${id}/roles`), () =>
        apiError(403, 'exceeds_own_permissions'),
      ),
    );
    openAccount();
    await userEvent.click(await button('Cambiar roles'));
    await userEvent.click(
      await screen.findByRole('checkbox', { name: 'Cosechero' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar roles' }),
    );
    expect(
      await screen.findByText(
        'No puedes asignar todos los roles seleccionados.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('checkbox', { name: 'Cosechero' })).toBeChecked();
  });

  it('keeps a role the viewer cannot grant, checked and locked', async () => {
    mockAccount({
      ...account,
      roles: [{ id: 'role-hidden', code: null, name: 'Supervisor' }],
    });
    const replace = record(() => json(account));
    server.use(http.put(apiUrl(`/api/users/${id}/roles`), replace.handler));
    openAccount();
    await userEvent.click(await button('Cambiar roles'));
    const locked = await screen.findByRole('checkbox', { name: 'Supervisor' });
    expect(locked).toBeChecked();
    expect(locked).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Capataz' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar roles' }),
    );
    await waitFor(() =>
      expect(replace.bodies).toEqual([
        { role_ids: ['role-hidden', foremanId] },
      ]),
    );
  });
});

describe('account status', () => {
  it('deactivates after confirmation with a single request', async () => {
    const change = record(async () => {
      await delay(100);
      return HttpResponse.json({ ...account, status: 'inactive' });
    });
    server.use(http.patch(apiUrl(`/api/users/${id}/status`), change.handler));
    openAccount();
    await userEvent.click(await button('Desactivar'));
    const dialog = await screen.findByRole('dialog', {
      name: '¿Desactivar cuenta?',
    });
    await userEvent.dblClick(
      within(dialog).getByRole('button', { name: 'Desactivar cuenta' }),
    );
    expect(await button('Reactivar')).toBeVisible();
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: '¿Desactivar cuenta?' }),
      ).toBeNull(),
    );
    expect(change.bodies).toEqual([{ status: 'inactive' }]);
  });

  it('reactivates an inactive account', async () => {
    mockAccount({ ...account, status: 'inactive' });
    const change = record(() => json(account));
    server.use(http.patch(apiUrl(`/api/users/${id}/status`), change.handler));
    openAccount();
    await userEvent.click(await button('Reactivar'));
    const dialog = await screen.findByRole('dialog', {
      name: '¿Reactivar cuenta?',
    });
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Reactivar cuenta' }),
    );
    expect(await button('Desactivar')).toBeVisible();
    expect(change.bodies).toEqual([{ status: 'active' }]);
  });

  it('explains last_administrator with the API message and stays open', async () => {
    server.use(
      http.patch(apiUrl(`/api/users/${id}/status`), () =>
        apiError(
          409,
          'last_administrator',
          'No puedes desactivar al último administrador.',
        ),
      ),
    );
    openAccount();
    await userEvent.click(await button('Desactivar'));
    const dialog = await screen.findByRole('dialog', {
      name: '¿Desactivar cuenta?',
    });
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Desactivar cuenta' }),
    );
    expect(
      await within(dialog).findByText(
        'No puedes desactivar al último administrador.',
      ),
    ).toBeVisible();
    expect(
      screen.getByRole('dialog', { name: '¿Desactivar cuenta?' }),
    ).toBeVisible();
  });

  it('hides the status change without users_change_status', async () => {
    mockSession([
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.USERS_UPDATE,
      PERMISSIONS.ROLES_VIEW,
    ]);
    openAccount();
    expect(await button('Editar datos')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Desactivar' })).toBeNull();
  });
});

describe('activation resend', () => {
  it('resends the activation of a pending account and shows the result', async () => {
    mockAccount({ ...account, activation_pending: true });
    let calls = 0;
    server.use(
      http.post(apiUrl(`/api/users/${id}/resend-activation`), async () => {
        calls += 1;
        await delay(100);
        return HttpResponse.json({ activation_email_sent: true });
      }),
    );
    openAccount();
    expect(
      await screen.findByText('La cuenta aún no se ha activado.'),
    ).toBeVisible();
    await userEvent.dblClick(await button('Reenviar activación'));
    expect(await screen.findByText('Correo enviado')).toBeVisible();
    expect(calls).toBe(1);
  });

  it('does not offer the resend on an activated account', async () => {
    openAccount();
    expect(await button('Editar datos')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Reenviar activación' }),
    ).toBeNull();
  });
});
