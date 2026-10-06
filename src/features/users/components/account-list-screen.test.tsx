import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildPage,
  buildProducer,
  buildSession,
  apiError,
} from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { PERMISSIONS } from '@/lib/permissions';
import { createQueryClient } from '@/lib/query-client';

import { AccountListScreen } from './account-list-screen';

const id = '11111111-1111-4111-8111-111111111111';
const roleId = '22222222-2222-4222-8222-222222222222';
const account = {
  id,
  email: 'empleado@example.com',
  first_name: 'Ana',
  last_name: 'Prueba',
  document_type: 'CC',
  identity_document: '1234567890',
  phone: null,
  producer: { id, member_code: 'PROD-000001', status: 'active' },
  roles: [{ id: roleId, code: 'foreman', name: 'Capataz' }],
  status: 'active',
  activation_pending: true,
  created_at: '2026-09-28T12:00:00Z',
};
const role = {
  id: roleId,
  code: 'foreman',
  kind: 'predefined',
  name: 'Capataz',
  description: '',
  producer_id: null,
  permissions: [],
};
const permissions = [
  PERMISSIONS.USERS_VIEW,
  PERMISSIONS.USERS_CREATE,
  PERMISSIONS.USERS_UPDATE,
  PERMISSIONS.ROLES_VIEW,
];
beforeEach(() =>
  server.use(
    http.get(apiUrl('/api/auth/me'), () =>
      HttpResponse.json(buildSession({ producer_id: id, permissions })),
    ),
    http.get(apiUrl('/api/users'), () =>
      HttpResponse.json(buildPage([account])),
    ),
    http.get(apiUrl(`/api/users/${id}`), () => HttpResponse.json(account)),
    http.get(apiUrl('/api/roles'), () => HttpResponse.json(buildPage([role]))),
  ),
);
async function fillForm(selectRole = true) {
  await userEvent.type(
    await screen.findByLabelText('Correo'),
    'nuevo@example.com',
  );
  await userEvent.type(
    screen.getByLabelText('Número de documento'),
    '987654321',
  );
  await userEvent.type(screen.getByLabelText('Nombres'), 'Luis');
  await userEvent.type(screen.getByLabelText('Apellidos'), 'Prueba');
  if (selectRole)
    await userEvent.click(
      await screen.findByRole('checkbox', { name: 'Capataz' }),
    );
}
describe('AccountListScreen', () => {
  it('shows loading before an empty result', async () => {
    server.use(
      http.get(apiUrl('/api/users'), async () => {
        await delay(200);
        return HttpResponse.json(buildPage([]));
      }),
    );
    renderWithProviders(<AccountListScreen />);
    expect(await screen.findByText('Cargando usuarios…')).toBeVisible();
    expect(
      await screen.findByText('No hay usuarios para mostrar'),
    ).toBeVisible();
  });
  it('shows inactive and pending account states without relying on color', async () => {
    server.use(
      http.get(apiUrl('/api/users'), () =>
        HttpResponse.json(
          buildPage([
            account,
            {
              ...account,
              id: roleId,
              status: 'inactive',
              activation_pending: false,
            },
          ]),
        ),
      ),
    );
    renderWithProviders(<AccountListScreen />);
    const table = await screen.findByRole('table');
    expect(within(table).getByText('Inactiva')).toBeVisible();
    expect(within(table).getByText('Pendiente de activación')).toBeVisible();
  });
  it('requires a role and personal data before sending', async () => {
    const create = vi.fn(() => HttpResponse.json(account));
    server.use(http.post(apiUrl('/api/users'), create));
    renderWithProviders(<AccountListScreen />, {
      searchParams: '?cuenta=nueva',
    });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Crear cuenta' }),
    );
    expect(
      await screen.findByText('Selecciona al menos un rol.'),
    ).toBeVisible();
    expect(screen.getByText('Ingresa los nombres.')).toBeVisible();
    expect(create).not.toHaveBeenCalled();
  });
  it.each([
    ['duplicate_document', 'Ya existe una cuenta con este documento.'],
    [
      'exceeds_own_permissions',
      'No puedes asignar todos los roles seleccionados.',
    ],
  ])('presents %s without clearing the form', async (code, message) => {
    server.use(http.post(apiUrl('/api/users'), () => apiError(409, code)));
    renderWithProviders(<AccountListScreen />, {
      searchParams: '?cuenta=nueva',
    });
    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByText(message)).toBeVisible();
    expect(screen.getByLabelText('Nombres')).toHaveValue('Luis');
  });
  it('keeps the panel open during creation and closes it with Escape afterwards', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const create = vi.fn(async () => {
      await pending;
      return HttpResponse.json(
        { ...account, activation_email_sent: true },
        { status: 201 },
      );
    });
    server.use(http.post(apiUrl('/api/users'), create));
    renderWithProviders(<AccountListScreen />, {
      searchParams: '?cuenta=nueva',
    });
    await fillForm();
    await userEvent.dblClick(
      screen.getByRole('button', { name: 'Crear cuenta' }),
    );
    await screen.findByRole('button', { name: 'Creando…' });
    try {
      await userEvent.keyboard('{Escape}');
      expect(screen.getByRole('dialog')).toBeVisible();
      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
      expect(create).toHaveBeenCalledTimes(1);
    } finally {
      release();
    }
    await screen.findByText('Correo enviado');
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });
  it('resets pagination and writes the selected role to the URL', async () => {
    const requests: URL[] = [];
    const onUrlUpdate = vi.fn();
    server.use(
      http.get(apiUrl('/api/users'), ({ request }) => {
        requests.push(new URL(request.url));
        return HttpResponse.json(buildPage([account], 41));
      }),
    );
    renderWithProviders(<AccountListScreen />, {
      searchParams: '?pagina=2',
      onUrlUpdate,
    });
    await screen.findByText('Ana Prueba');
    await screen.findByRole('option', { name: 'Capataz' });
    await userEvent.selectOptions(
      screen.getByLabelText('Filtrar por rol'),
      roleId,
    );
    await waitFor(() =>
      expect(requests.at(-1)?.searchParams.get('role')).toBe(roleId),
    );
    expect(requests.at(-1)?.searchParams.get('page')).toBe('1');
    expect(onUrlUpdate.mock.lastCall?.[0].searchParams.get('rol')).toBe(roleId);
  });
  it.each(['incorrecto', ''])(
    'handles malformed account selection %s',
    async (selected) => {
      renderWithProviders(<AccountListScreen />, {
        searchParams: `?cuenta=${selected}`,
      });
      expect(await screen.findByText('Cuenta no disponible')).toBeVisible();
    },
  );
  it('handles an account outside the scope', async () => {
    server.use(
      http.get(apiUrl(`/api/users/${id}`), () => apiError(404, 'not_found')),
    );
    renderWithProviders(<AccountListScreen />, {
      searchParams: `?cuenta=${id}`,
    });
    expect(await screen.findByText('Cuenta no disponible')).toBeVisible();
  });
  it('hides creation when users_create is missing', async () => {
    server.use(
      http.get(apiUrl('/api/auth/me'), () =>
        HttpResponse.json(
          buildSession({ permissions: [PERMISSIONS.USERS_VIEW] }),
        ),
      ),
    );
    renderWithProviders(<AccountListScreen />);
    await screen.findByText('Ana Prueba');
    expect(
      screen.queryByRole('button', { name: /Crear cuenta/ }),
    ).not.toBeInTheDocument();
  });
  it('uses safe defaults for malformed filters', async () => {
    const requests: URL[] = [];
    server.use(
      http.get(apiUrl('/api/users'), ({ request }) => {
        requests.push(new URL(request.url));
        return HttpResponse.json(buildPage([]));
      }),
    );
    renderWithProviders(<AccountListScreen />, {
      searchParams:
        '?pagina=-3&estado=otro&activacion=otro&rol=mal&productor=mal',
    });
    await screen.findByText('No hay usuarios para mostrar');
    expect(requests[0].searchParams.get('page')).toBe('1');
    for (const key of ['status', 'activation_pending', 'role', 'producer'])
      expect(requests[0].searchParams.has(key)).toBe(false);
  });
  it('retries a failed list', async () => {
    let calls = 0;
    server.use(
      http.get(apiUrl('/api/users'), () =>
        ++calls === 1
          ? apiError(500, 'internal_error')
          : HttpResponse.json(buildPage([account])),
      ),
    );
    renderWithProviders(<AccountListScreen />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Reintentar' }),
    );
    expect(await screen.findByText('Ana Prueba')).toBeVisible();
  });
  it('creates an association administrator with its exclusive role', async () => {
    let body: unknown;
    server.use(
      http.get(apiUrl('/api/auth/me'), () =>
        HttpResponse.json(buildSession({ producer_id: null, permissions })),
      ),
      http.get(apiUrl('/api/roles'), () =>
        HttpResponse.json(
          buildPage([
            {
              ...role,
              code: 'administrator',
              kind: 'fixed',
              name: 'Administrador',
            },
          ]),
        ),
      ),
      http.post(apiUrl('/api/users'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          { ...account, producer: null, activation_email_sent: true },
          { status: 201 },
        );
      }),
    );
    renderWithProviders(<AccountListScreen />, {
      searchParams: '?cuenta=nueva',
    });
    // El Administrador solo crea cuentas de administrador: no se le pregunta el tipo.
    await fillForm(false);
    expect(
      screen.queryByRole('button', { name: 'Continuar' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    await screen.findByText('Correo enviado');
    expect(body).toMatchObject({ role_ids: [roleId] });
    expect(body).not.toHaveProperty('producer_id');
  });
  it('sends the selected producer when the technical account creates an employee', async () => {
    let body: unknown;
    server.use(
      http.get(apiUrl('/api/auth/me'), () =>
        HttpResponse.json(
          buildSession({
            producer_id: null,
            is_superuser: true,
            permissions: [...permissions, PERMISSIONS.PRODUCERS_VIEW],
          }),
        ),
      ),
      http.get(apiUrl('/api/producers'), () =>
        HttpResponse.json(buildPage([])),
      ),
      http.get(apiUrl(`/api/producers/${id}`), () =>
        HttpResponse.json(buildProducer({ id })),
      ),
      http.post(apiUrl('/api/users'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          { ...account, activation_email_sent: true },
          { status: 201 },
        );
      }),
    );
    renderWithProviders(<AccountListScreen />, {
      searchParams: `?cuenta=nueva&productor=${id}`,
    });
    // El productor del filtro llega ya elegido al paso del tipo de cuenta.
    const next = await screen.findByRole('button', { name: 'Continuar' });
    await waitFor(() => expect(next).toBeEnabled());
    await userEvent.click(next);
    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    await screen.findByText('Correo enviado');
    expect(body).toHaveProperty('producer_id', id);
  });
  it('does not offer fixed or more privileged roles to a producer', async () => {
    server.use(
      http.get(apiUrl('/api/roles'), () =>
        HttpResponse.json(
          buildPage([
            role,
            {
              ...role,
              id: '33333333-3333-4333-8333-333333333333',
              kind: 'fixed',
              code: 'administrator',
              name: 'Administrador',
            },
            {
              ...role,
              id: '44444444-4444-4444-8444-444444444444',
              kind: 'custom',
              code: null,
              name: 'Privilegiado',
              permissions: ['unavailable.permission'],
            },
          ]),
        ),
      ),
    );
    renderWithProviders(<AccountListScreen />, {
      searchParams: '?cuenta=nueva',
    });
    await screen.findByRole('checkbox', { name: 'Capataz' });
    expect(
      screen.queryByRole('checkbox', { name: 'Administrador' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: 'Privilegiado' }),
    ).not.toBeInTheDocument();
  });
  it('loads assignable roles beyond the first page', async () => {
    const nextRole = {
      ...role,
      id: '55555555-5555-4555-8555-555555555555',
      name: 'Rol segunda página',
    };
    server.use(
      http.get(apiUrl('/api/roles'), ({ request }) =>
        HttpResponse.json(
          buildPage(
            new URL(request.url).searchParams.get('page') === '2'
              ? [nextRole]
              : [role],
            21,
          ),
        ),
      ),
    );
    renderWithProviders(<AccountListScreen />, {
      searchParams: '?cuenta=nueva',
    });
    expect(
      await screen.findByRole('checkbox', { name: 'Rol segunda página' }),
    ).toBeVisible();
  });
  it('resends activation without creating the account again', async () => {
    const create = vi.fn(() =>
      HttpResponse.json(
        { ...account, activation_email_sent: false },
        { status: 201 },
      ),
    );
    const resend = vi.fn(() =>
      HttpResponse.json({ activation_email_sent: true }),
    );
    server.use(
      http.post(apiUrl('/api/users'), create),
      http.post(apiUrl(`/api/users/${id}/resend-activation`), resend),
    );
    renderWithProviders(<AccountListScreen />, {
      searchParams: '?cuenta=nueva',
    });
    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Reenviar activación' }),
    );
    expect(await screen.findByText('Correo enviado')).toBeVisible();
    expect(create).toHaveBeenCalledTimes(1);
    expect(resend).toHaveBeenCalledTimes(1);
  });
  it('refreshes the session after a forbidden creation and shows a clear error', async () => {
    const me = vi.fn(() =>
      HttpResponse.json(buildSession({ producer_id: id, permissions })),
    );
    server.use(
      http.get(apiUrl('/api/auth/me'), me),
      http.post(apiUrl('/api/users'), () => apiError(403, 'permission_denied')),
    );
    const client = createQueryClient();
    client.setDefaultOptions({
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    });
    renderWithProviders(<AccountListScreen />, {
      searchParams: '?cuenta=nueva',
      queryClient: client,
    });
    await fillForm();
    const before = me.mock.calls.length;
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(
      await screen.findByText('Ya no tienes permiso para crear esta cuenta.'),
    ).toBeVisible();
    await waitFor(() => expect(me.mock.calls.length).toBeGreaterThan(before));
  });
  it('lists accounts with masked documents and opens their detail', async () => {
    renderWithProviders(<AccountListScreen />);
    expect(await screen.findByText('Ana Prueba')).toBeVisible();
    expect(screen.queryByText('1234567890')).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Ver cuenta de Ana Prueba' }),
    );
    const dialog = await screen.findByRole('dialog');
    expect(
      await within(dialog).findByText('empleado@example.com'),
    ).toBeVisible();
  });
  it('blocks unauthorized access without requesting accounts', async () => {
    const list = vi.fn(() => HttpResponse.json(buildPage([])));
    server.use(
      http.get(apiUrl('/api/auth/me'), () => HttpResponse.json(buildSession())),
      http.get(apiUrl('/api/users'), list),
    );
    renderWithProviders(<AccountListScreen />);
    expect(await screen.findByText('Acceso no disponible')).toBeVisible();
    expect(list).not.toHaveBeenCalled();
  });
  it('creates an employee once and offers activation resend after mail failure', async () => {
    let body: unknown;
    const create = vi.fn(async ({ request }: { request: Request }) => {
      body = await request.json();
      return HttpResponse.json(
        { ...account, activation_email_sent: false },
        { status: 201 },
      );
    });
    server.use(http.post(apiUrl('/api/users'), create));
    renderWithProviders(<AccountListScreen />, {
      searchParams: '?cuenta=nueva',
    });
    await fillForm();
    await userEvent.dblClick(
      screen.getByRole('button', { name: 'Crear cuenta' }),
    );
    expect(
      await screen.findByText(
        'La cuenta se creó, pero no se pudo enviar el correo de activación.',
      ),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Reenviar activación' }),
    ).toBeVisible();
    expect(create).toHaveBeenCalledTimes(1);
    expect(body).toEqual({
      email: 'nuevo@example.com',
      document_type: 'CC',
      identity_document: '987654321',
      first_name: 'Luis',
      last_name: 'Prueba',
      phone: null,
      role_ids: [roleId],
    });
  });
  it('keeps input when the email is duplicated', async () => {
    server.use(
      http.post(apiUrl('/api/users'), () => apiError(409, 'duplicate_email')),
    );
    renderWithProviders(<AccountListScreen />, {
      searchParams: '?cuenta=nueva',
    });
    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(
      await screen.findByText('Ya existe una cuenta con este correo.'),
    ).toBeVisible();
    expect(screen.getByLabelText('Correo')).toHaveValue('nuevo@example.com');
  });
  it('sends URL filters to the server and resets the page when searching', async () => {
    const requests: URL[] = [];
    server.use(
      http.get(apiUrl('/api/users'), ({ request }) => {
        requests.push(new URL(request.url));
        return HttpResponse.json(buildPage([account], 41));
      }),
    );
    renderWithProviders(<AccountListScreen />, {
      searchParams: '?pagina=2&estado=active&activacion=pendiente',
    });
    await screen.findByText('Ana Prueba');
    await userEvent.type(screen.getByLabelText('Buscar usuarios'), 'Luis');
    await waitFor(() =>
      expect(requests.at(-1)?.searchParams.get('search')).toBe('Luis'),
    );
    expect(requests.at(-1)?.searchParams.get('page')).toBe('1');
    expect(requests.at(-1)?.searchParams.get('activation_pending')).toBe(
      'true',
    );
  });
});
