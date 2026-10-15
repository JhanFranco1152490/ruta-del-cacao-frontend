import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { PERMISSIONS } from '@/lib/permissions';
import { apiError, buildFarm, buildPage, buildSession } from '@/test/factories';
import { apiUrl, farmsHandler } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { AccountListScreen } from './account-list-screen';

const id = '11111111-1111-4111-8111-111111111111';
const producerId = '33333333-3333-4333-8333-333333333333';
const foremanId = '22222222-2222-4222-8222-222222222222';
const sellerId = '44444444-4444-4444-8444-444444444444';
const esperanza = buildFarm({ id: 'farm-a', name: 'La Esperanza' });
const recreo = buildFarm({ id: 'farm-b', name: 'El Recreo' });
const closed = buildFarm({ id: 'farm-c', name: 'Cerrada', is_active: false });

const role = (
  roleId: string,
  name: string,
  permissions: string[],
  farm_scope: 'all' | 'one' | 'many' = 'many',
) => ({
  id: roleId,
  code: null,
  kind: 'predefined',
  name,
  description: '',
  farm_scope,
  producer_id: null,
  permissions,
});
const account = {
  id,
  email: 'empleado@example.com',
  first_name: 'Luis',
  last_name: 'Prueba',
  document_type: 'CC',
  identity_document: '1234567890',
  phone: null,
  producer: { id: producerId, member_code: 'PROD-000001', status: 'active' },
  farms: [{ id: 'farm-a', name: 'La Esperanza', is_active: true }],
  needs_farm: false,
  all_farms: false,
  roles: [{ id: foremanId, code: 'foreman', name: 'Capataz' }],
  status: 'active',
  activation_pending: false,
  has_signed_in: true,
  created_at: '2026-09-28T12:00:00Z',
};
const permissions = [
  PERMISSIONS.USERS_VIEW,
  PERMISSIONS.USERS_CREATE,
  PERMISSIONS.USERS_UPDATE,
  PERMISSIONS.ROLES_VIEW,
  PERMISSIONS.ACTIVITIES_VIEW,
];

function session(overrides = {}) {
  server.use(
    http.get(apiUrl('/api/auth/me'), () =>
      HttpResponse.json(
        buildSession({ producer_id: producerId, permissions, ...overrides }),
      ),
    ),
  );
}
function mockAccount(detail: object) {
  server.use(
    http.get(apiUrl(`/api/users/${id}`), () => HttpResponse.json(detail)),
  );
}
// Guarda el cuerpo de cada petición a `path` y responde con `reply`.
function record(
  method: 'post' | 'patch' | 'put',
  path: string,
  reply: (body: Record<string, unknown>) => Response,
) {
  const bodies: Record<string, unknown>[] = [];
  server.use(
    http[method](apiUrl(path), async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      bodies.push(body);
      return reply(body);
    }),
  );
  return bodies;
}
const open = (search: string) =>
  renderWithProviders(<AccountListScreen />, { searchParams: search });

async function fillEmployee() {
  await userEvent.type(
    await screen.findByLabelText('Correo'),
    'nuevo@example.com',
  );
  await userEvent.type(
    screen.getByLabelText('Número de documento'),
    '987654321',
  );
  await userEvent.type(screen.getByLabelText('Nombres'), 'Marta');
  await userEvent.type(screen.getByLabelText('Apellidos'), 'Ruiz');
}

beforeEach(() => {
  session();
  mockAccount(account);
  server.use(
    http.get(apiUrl('/api/users'), () =>
      HttpResponse.json(buildPage([account])),
    ),
    http.get(apiUrl('/api/roles'), () =>
      HttpResponse.json(
        buildPage([
          role(foremanId, 'Capataz', [PERMISSIONS.ACTIVITIES_VIEW]),
          role(sellerId, 'Comercializador', []),
        ]),
      ),
    ),
    farmsHandler([esperanza, recreo, closed]),
  );
});

const farmsGroup = (name: RegExp) => screen.findByRole('group', { name });
const farmBox = (group: HTMLElement, name: string) =>
  within(group).findByRole('checkbox', { name });

const scopeGroup = () =>
  screen.findByRole('group', { name: /fincas en las que trabaja/i });
const everywhereRadio = () =>
  screen.findByRole('radio', { name: /Todas las fincas/ });

describe('el alcance al crear un empleado', () => {
  it('es obligatorio y las fincas viajan en la petición', async () => {
    const created = record('post', '/api/users', (body) =>
      HttpResponse.json(
        { ...account, ...body, activation_email_sent: true },
        { status: 201 },
      ),
    );
    open('?cuenta=nueva');
    await fillEmployee();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Capataz' }));
    const create = screen.getByRole('button', { name: 'Crear cuenta' });

    await userEvent.click(create);

    expect(
      await screen.findByText(
        'Indica en qué fincas trabaja o marca todas las fincas.',
      ),
    ).toBeVisible();
    expect(created).toEqual([]);

    const group = await scopeGroup();
    // Solo las fincas activas.
    expect(within(group).queryByText('Cerrada')).not.toBeInTheDocument();
    // Puede trabajar en varias fincas vecinas.
    await userEvent.click(await farmBox(group, 'La Esperanza'));
    await userEvent.click(await farmBox(group, 'El Recreo'));
    await userEvent.click(create);

    expect(
      await screen.findByRole('heading', { name: /Prueba/ }),
    ).toBeVisible();
    expect(created[0]).toMatchObject({
      role_ids: [foremanId],
      farm_ids: ['farm-a', 'farm-b'],
    });
    expect(created[0]).not.toHaveProperty('all_farms');
  });

  it('también lo necesita quien no trabaja en campo, y «todas» viaja sin lista', async () => {
    const created = record('post', '/api/users', (body) =>
      HttpResponse.json(
        { ...account, ...body, farms: [], activation_email_sent: true },
        { status: 201 },
      ),
    );
    open('?cuenta=nueva');
    await fillEmployee();
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Comercializador' }),
    );
    const create = screen.getByRole('button', { name: 'Crear cuenta' });

    await userEvent.click(create);
    expect(
      await screen.findByText(
        'Indica en qué fincas trabaja o marca todas las fincas.',
      ),
    ).toBeVisible();
    expect(created).toEqual([]);

    await userEvent.click(await everywhereRadio());
    await userEvent.click(create);

    expect(
      await screen.findByRole('heading', { name: /Prueba/ }),
    ).toBeVisible();
    expect(created[0]).toMatchObject({ all_farms: true });
    expect(created[0]).not.toHaveProperty('farm_ids');
  });

  it('un rol de una sola finca pide exactamente una y no ofrece todas', async () => {
    server.use(
      http.get(apiUrl('/api/roles'), () =>
        HttpResponse.json(
          buildPage([
            role(foremanId, 'Capataz', [PERMISSIONS.ACTIVITIES_VIEW], 'one'),
          ]),
        ),
      ),
    );
    const created = record('post', '/api/users', (body) =>
      HttpResponse.json(
        { ...account, ...body, activation_email_sent: true },
        { status: 201 },
      ),
    );
    open('?cuenta=nueva');
    await fillEmployee();
    await userEvent.click(
      await screen.findByRole('checkbox', { name: 'Capataz' }),
    );

    const group = await screen.findByRole('group', {
      name: 'Finca en la que trabaja',
    });
    expect(
      screen.queryByRole('radio', { name: /Todas las fincas/ }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      await within(group).findByRole('radio', { name: 'El Recreo' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(
      await screen.findByRole('heading', { name: /Prueba/ }),
    ).toBeVisible();
    expect(created[0]).toMatchObject({ farm_ids: ['farm-b'] });
  });

  it('un rol de siempre todas las fincas no deja elegir otra cosa', async () => {
    server.use(
      http.get(apiUrl('/api/roles'), () =>
        HttpResponse.json(
          buildPage([role(foremanId, 'Administrador de confianza', [], 'all')]),
        ),
      ),
    );
    const created = record('post', '/api/users', (body) =>
      HttpResponse.json(
        { ...account, ...body, activation_email_sent: true },
        { status: 201 },
      ),
    );
    open('?cuenta=nueva');
    await fillEmployee();
    await userEvent.click(
      await screen.findByRole('checkbox', {
        name: 'Administrador de confianza',
      }),
    );

    expect(
      await screen.findByText(/Sus roles trabajan en todas las fincas/),
    ).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(
      await screen.findByRole('heading', { name: /Prueba/ }),
    ).toBeVisible();
    expect(created[0]).toMatchObject({ all_farms: true });
  });

  it('avisa del choque entre un rol de todas las fincas y uno de una sola', async () => {
    server.use(
      http.get(apiUrl('/api/roles'), () =>
        HttpResponse.json(
          buildPage([
            role(foremanId, 'Capataz', [], 'one'),
            role(sellerId, 'Administrador de confianza', [], 'all'),
          ]),
        ),
      ),
    );
    const created = record('post', '/api/users', () =>
      HttpResponse.json(account, { status: 201 }),
    );
    open('?cuenta=nueva');
    await fillEmployee();
    await userEvent.click(
      await screen.findByRole('checkbox', { name: 'Capataz' }),
    );
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Administrador de confianza' }),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText(/piden alcances distintos/)).toBeVisible();
    expect(created).toEqual([]);
  });

  it('un empleado limitado no puede dar «todas las fincas»', async () => {
    session({
      all_farms: false,
      farms: [{ id: 'farm-a', name: 'La Esperanza', is_active: true }],
    });
    open('?cuenta=nueva');
    await fillEmployee();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Capataz' }));

    const group = await scopeGroup();

    expect(await farmBox(group, 'La Esperanza')).toBeVisible();
    expect(
      screen.queryByRole('radio', { name: /Todas las fincas/ }),
    ).not.toBeInTheDocument();
  });

  it('muestra junto al alcance lo que el servidor rechaza', async () => {
    server.use(
      http.post(apiUrl('/api/users'), () =>
        apiError(400, 'validation_error', 'No válido.', {
          farm_ids: ['Elige fincas activas del productor.'],
        }),
      ),
    );
    open('?cuenta=nueva');
    await fillEmployee();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Capataz' }));
    const group = await scopeGroup();
    await userEvent.click(await farmBox(group, 'La Esperanza'));

    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(
      await screen.findByText('Elige fincas activas del productor.'),
    ).toBeVisible();
  });
});

describe('las fincas de una cuenta que ya existe', () => {
  it('se muestran en el detalle', async () => {
    mockAccount({
      ...account,
      farms: [
        { id: 'farm-a', name: 'La Esperanza', is_active: true },
        { id: 'farm-b', name: 'El Recreo', is_active: true },
      ],
    });
    open(`?cuenta=${id}`);

    const detail = await screen.findByRole('dialog', {
      name: 'Detalle de la cuenta',
    });

    expect(
      await within(detail).findByText('Fincas en las que trabaja'),
    ).toBeVisible();
    expect(within(detail).getByText('La Esperanza')).toBeVisible();
    expect(within(detail).getByText('El Recreo')).toBeVisible();
  });

  it('dice «Todas las fincas» y qué alcance admite cada rol', async () => {
    mockAccount({
      ...account,
      farms: [],
      all_farms: true,
      roles: [
        {
          id: sellerId,
          code: 'sales_manager',
          name: 'Comercializador',
          farm_scope: 'many',
        },
      ],
    });
    open(`?cuenta=${id}`);

    const detail = await screen.findByRole('dialog', {
      name: 'Detalle de la cuenta',
    });

    expect(await within(detail).findByText('Todas las fincas')).toBeVisible();
    expect(
      within(detail).getByText('Incluye las que se registren después.'),
    ).toBeVisible();
    expect(within(detail).getByText('Comercializador')).toBeVisible();
    expect(within(detail).getByText('Una o varias fincas')).toBeVisible();
  });

  it('avisa cuando a un empleado de campo le falta finca', async () => {
    mockAccount({ ...account, farms: [], needs_farm: true });
    open(`?cuenta=${id}`);

    const detail = await screen.findByRole('dialog', {
      name: 'Detalle de la cuenta',
    });
    expect(await within(detail).findByText('Sin asignar')).toBeVisible();
    expect(
      within(detail).getByText(/no ve ni registra nada de campo/),
    ).toBeVisible();
  });

  it('se cambian al editar, y solo entonces viajan', async () => {
    const updates = record('patch', `/api/users/${id}`, (body) =>
      HttpResponse.json({
        ...account,
        ...body,
        farms: [
          { id: 'farm-a', name: 'La Esperanza', is_active: true },
          { id: 'farm-b', name: 'El Recreo', is_active: true },
        ],
      }),
    );
    open(`?cuenta=${id}`);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Editar datos' }),
    );
    const group = await farmsGroup(/fincas en las que trabaja/i);
    expect(await farmBox(group, 'La Esperanza')).toBeChecked();

    await userEvent.click(await farmBox(group, 'El Recreo'));
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    );

    const detail = await screen.findByRole('dialog', {
      name: 'Detalle de la cuenta',
    });
    expect(await within(detail).findByText('El Recreo')).toBeVisible();
    expect(updates[0]).toMatchObject({ farm_ids: ['farm-a', 'farm-b'] });
  });

  it('avisa antes de quitarle una finca y muestra sus labores pendientes', async () => {
    const message =
      'Tiene 2 actividades por hacer en las fincas que deja: reasígnalas o ' +
      'regístralas como realizadas antes de quitarle esas fincas.';
    server.use(
      http.patch(apiUrl(`/api/users/${id}`), () =>
        apiError(409, 'account_has_pending_work', message, {
          farm_ids: [message],
        }),
      ),
    );
    open(`?cuenta=${id}`);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Editar datos' }),
    );
    const group = await farmsGroup(/fincas en las que trabaja/i);
    expect(screen.queryByText(/Le quitas/)).not.toBeInTheDocument();

    await userEvent.click(await farmBox(group, 'El Recreo'));
    await userEvent.click(await farmBox(group, 'La Esperanza'));

    expect(screen.getByText('Le quitas La Esperanza.')).toBeVisible();
    expect(screen.getByText(/se rechazará/)).toBeVisible();

    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    );

    expect(await screen.findByText(message)).toBeVisible();
  });

  it('no envía las fincas si no cambiaron', async () => {
    const updates = record('patch', `/api/users/${id}`, (body) =>
      HttpResponse.json({ ...account, ...body }),
    );
    open(`?cuenta=${id}`);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Editar datos' }),
    );
    await farmsGroup(/fincas en las que trabaja/i);
    await userEvent.type(
      screen.getByLabelText('Teléfono (opcional)'),
      '3001234567',
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    );

    expect(await screen.findByText('3001234567')).toBeVisible();
    expect(updates[0]).not.toHaveProperty('farm_ids');
  });

  it('conserva en la lista la que tiene aunque esté inactiva', async () => {
    mockAccount({
      ...account,
      farms: [{ id: 'farm-c', name: 'Cerrada', is_active: false }],
    });
    open(`?cuenta=${id}`);

    const detail = await screen.findByRole('dialog', {
      name: 'Detalle de la cuenta',
    });
    expect(await within(detail).findByText('(inactiva)')).toBeVisible();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Editar datos' }),
    );
    const group = await farmsGroup(/fincas en las que trabaja/i);

    expect(await farmBox(group, 'Cerrada')).toBeChecked();
  });

  it('no las ofrece a un empleado, que no asigna fincas', async () => {
    session({
      all_farms: false,
      farms: [{ id: 'farm-a', name: 'La Esperanza', is_active: true }],
      roles: [{ id: 'role-x', code: null, name: 'Encargado' }],
    });
    open(`?cuenta=${id}`);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Editar datos' }),
    );

    expect(await screen.findByLabelText('Nombres')).toBeVisible();
    expect(
      screen.queryByRole('group', { name: /Fincas/ }),
    ).not.toBeInTheDocument();
  });

  it('se piden al cambiar a un rol de campo a quien no tiene finca', async () => {
    mockAccount({
      ...account,
      farms: [],
      roles: [{ id: sellerId, code: 'sales_manager', name: 'Comercializador' }],
    });
    const saved = record('put', `/api/users/${id}/roles`, () =>
      HttpResponse.json(account),
    );
    open(`?cuenta=${id}`);
    await userEvent.click(
      await screen.findByRole('button', { name: /Cambiar\s+roles/ }),
    );
    expect(
      screen.queryByRole('group', { name: /Fincas/ }),
    ).not.toBeInTheDocument();

    await userEvent.click(
      await screen.findByRole('checkbox', { name: 'Capataz' }),
    );
    const group = await farmsGroup(/fincas en las que trabaja/i);
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar roles' }),
    );
    expect(
      await screen.findByText(
        'Indica en qué fincas trabaja o marca todas las fincas.',
      ),
    ).toBeVisible();
    expect(saved).toEqual([]);

    await userEvent.click(await farmBox(group, 'La Esperanza'));
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar roles' }),
    );

    expect(await screen.findByText('Roles asignados')).toBeVisible();
    expect(saved[0]).toEqual({
      role_ids: [sellerId, foremanId],
      farm_ids: ['farm-a'],
    });
  });
});
