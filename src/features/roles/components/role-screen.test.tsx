import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildPage, buildSession, apiError } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { PERMISSIONS } from '@/lib/permissions';
import { RoleScreen } from './role-screen';

const id = '11111111-1111-4111-8111-111111111111';
const role = {
  id,
  code: null,
  kind: 'custom',
  name: 'Supervisor',
  description: 'Coordina actividades',
  producer_id: id,
  permissions: ['accounts.users_view'],
};
const catalog = [
  {
    code: 'accounts.users_view',
    name: 'Consultar usuarios',
    area: 'Cuentas',
    delegable: true,
    grantable: true,
  },
  {
    code: 'accounts.roles_manage',
    name: 'Administrar roles',
    area: 'Roles',
    delegable: true,
    grantable: false,
  },
];
beforeEach(() => {
  server.use(
    http.get(apiUrl('/api/auth/me'), () =>
      HttpResponse.json(
        buildSession({
          producer_id: id,
          permissions: [PERMISSIONS.ROLES_VIEW, PERMISSIONS.ROLES_MANAGE],
        }),
      ),
    ),
    http.get(apiUrl('/api/roles'), () => HttpResponse.json(buildPage([role]))),
    http.get(apiUrl(`/api/roles/${id}`), () => HttpResponse.json(role)),
    http.get(apiUrl('/api/permissions'), () =>
      HttpResponse.json({ results: catalog }),
    ),
  );
});
describe('RoleScreen', () => {
  it('closes with Escape, clears the selection and restores focus', async () => {
    const user = userEvent.setup();
    const onUrlUpdate = vi.fn();
    renderWithProviders(<RoleScreen />, { onUrlUpdate });
    const trigger = await screen.findByRole('button', {
      name: 'Ver rol Supervisor',
    });
    await user.click(trigger);
    await screen.findByRole('button', { name: 'Editar rol' });
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(onUrlUpdate.mock.lastCall?.[0].searchParams.has('rol')).toBe(false);
  });
  it('rejects an empty name without sending a request', async () => {
    const create = vi.fn(() => HttpResponse.json(role));
    server.use(http.post(apiUrl('/api/roles'), create));
    renderWithProviders(<RoleScreen />, { searchParams: '?rol=nuevo' });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Guardar rol' }),
    );
    expect(await screen.findByText('Escribe el nombre del rol.')).toBeVisible();
    expect(create).not.toHaveBeenCalled();
  });
  it('keeps the panel open and submits once while saving', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const create = vi.fn(async () => {
      await pending;
      return HttpResponse.json(role, { status: 201 });
    });
    server.use(http.post(apiUrl('/api/roles'), create));
    renderWithProviders(<RoleScreen />, { searchParams: '?rol=nuevo' });
    await userEvent.type(await screen.findByLabelText('Nombre'), 'Auxiliar');
    await userEvent.dblClick(
      screen.getByRole('button', { name: 'Guardar rol' }),
    );
    await screen.findByRole('button', { name: 'Guardando…' });
    try {
      await userEvent.keyboard('{Escape}');
      expect(screen.getByRole('dialog')).toBeVisible();
      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
      expect(create).toHaveBeenCalledTimes(1);
    } finally {
      release();
    }
    await screen.findByRole('heading', { name: 'Supervisor' });
  });
  it('shows loading then an empty list', async () => {
    server.use(
      http.get(apiUrl('/api/roles'), async () => {
        await delay(150);
        return HttpResponse.json(buildPage([]));
      }),
    );
    renderWithProviders(<RoleScreen />);
    expect(await screen.findByText('Cargando roles…')).toBeVisible();
    expect(await screen.findByText('No hay roles para mostrar')).toBeVisible();
  });
  it('retries a failed list request', async () => {
    let calls = 0;
    server.use(
      http.get(apiUrl('/api/roles'), () =>
        ++calls === 1
          ? apiError(500, 'internal_error')
          : HttpResponse.json(buildPage([role])),
      ),
    );
    renderWithProviders(<RoleScreen />);
    expect(
      await screen.findByText('No fue posible cargar los roles.'),
    ).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Supervisor')).toBeVisible();
  });
  it.each([403, 404])(
    'keeps an inaccessible detail separate from the list (%s)',
    async (status) => {
      server.use(
        http.get(apiUrl(`/api/roles/${id}`), () =>
          apiError(status, status === 404 ? 'not_found' : 'permission_denied'),
        ),
      );
      renderWithProviders(<RoleScreen />, { searchParams: `?rol=${id}` });
      expect(await screen.findByText('Rol no disponible')).toBeVisible();
      expect(await screen.findByText('Supervisor')).toBeVisible();
    },
  );
  it.each(['fixed', 'predefined'])(
    'does not edit or delete a %s role',
    async (kind) => {
      server.use(
        http.get(apiUrl(`/api/roles/${id}`), () =>
          HttpResponse.json({ ...role, kind }),
        ),
      );
      renderWithProviders(<RoleScreen />, { searchParams: `?rol=${id}` });
      expect(
        await screen.findByText(
          'Los roles del sistema no se pueden modificar.',
        ),
      ).toBeVisible();
      expect(
        screen.queryByRole('button', { name: 'Editar rol' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Borrar rol' }),
      ).not.toBeInTheDocument();
    },
  );
  it('hides all write actions without roles_manage', async () => {
    server.use(
      http.get(apiUrl('/api/auth/me'), () =>
        HttpResponse.json(
          buildSession({ permissions: [PERMISSIONS.ROLES_VIEW] }),
        ),
      ),
    );
    renderWithProviders(<RoleScreen />, { searchParams: `?rol=${id}` });
    expect(await screen.findByText('Solo lectura')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Crear rol' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Editar rol' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Borrar rol' }),
    ).not.toBeInTheDocument();
  });
  it('edits an existing role and updates the detail', async () => {
    let current = role;
    let payload: unknown;
    server.use(
      http.get(apiUrl(`/api/roles/${id}`), () => HttpResponse.json(current)),
      http.patch(apiUrl(`/api/roles/${id}`), async ({ request }) => {
        payload = await request.json();
        current = { ...role, name: 'Coordinador' };
        return HttpResponse.json(current);
      }),
    );
    renderWithProviders(<RoleScreen />, { searchParams: `?rol=${id}` });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Editar rol' }),
    );
    await userEvent.clear(screen.getByLabelText('Nombre'));
    await userEvent.type(screen.getByLabelText('Nombre'), 'Coordinador');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar rol' }));
    expect(
      await screen.findByRole('heading', { name: 'Coordinador' }),
    ).toBeVisible();
    expect(payload).toEqual({
      name: 'Coordinador',
      description: role.description,
      permission_codes: role.permissions,
    });
  });
  it('explains self_role_lockout beside the permissions and keeps the form', async () => {
    const lockout =
      'Este cambio te dejaría sin poder gestionar roles. Pide que otra persona con ese permiso lo haga.';
    server.use(
      http.patch(apiUrl(`/api/roles/${id}`), () =>
        apiError(409, 'self_role_lockout', lockout),
      ),
    );
    renderWithProviders(<RoleScreen />, { searchParams: `?rol=${id}` });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Editar rol' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Guardar rol' }));
    const permissions = screen.getByRole('group', { name: 'Permisos' });
    expect(await within(permissions).findByRole('alert')).toHaveTextContent(
      lockout,
    );
    expect(screen.getByLabelText('Nombre')).toHaveValue(role.name);
  });
  it('confirms deletion, explains role_in_use and allows retry', async () => {
    let count = 0;
    server.use(
      http.delete(apiUrl(`/api/roles/${id}`), () => {
        count++;
        return count === 1
          ? apiError(409, 'role_in_use')
          : new HttpResponse(null, { status: 204 });
      }),
    );
    renderWithProviders(<RoleScreen />, { searchParams: `?rol=${id}` });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Borrar rol' }),
    );
    expect(count).toBe(0);
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(count).toBe(0);
    await userEvent.click(screen.getByRole('button', { name: 'Borrar rol' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar borrado' }),
    );
    expect(
      await screen.findByText(
        'Este rol tiene cuentas asignadas. Retíralo de esas cuentas antes de borrarlo.',
      ),
    ).toBeVisible();
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar borrado' }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(count).toBe(2);
  });
  it('resets the page when filtering and sends the type to the server', async () => {
    const requests: URL[] = [];
    server.use(
      http.get(apiUrl('/api/roles'), ({ request }) => {
        requests.push(new URL(request.url));
        return HttpResponse.json(buildPage([role], 41));
      }),
    );
    const onUrlUpdate = vi.fn();
    renderWithProviders(<RoleScreen />, {
      searchParams: '?pagina=2',
      onUrlUpdate,
    });
    await screen.findByText('Supervisor');
    await userEvent.selectOptions(
      screen.getByLabelText('Filtrar por tipo'),
      'custom',
    );
    await waitFor(() =>
      expect(requests.at(-1)?.searchParams.get('kind')).toBe('custom'),
    );
    expect(requests.at(-1)?.searchParams.get('page')).toBe('1');
    expect(onUrlUpdate.mock.lastCall?.[0].searchParams.get('tipo')).toBe(
      'custom',
    );
  });
  it('uses safe defaults for malformed list filters', async () => {
    const requests: URL[] = [];
    server.use(
      http.get(apiUrl('/api/roles'), ({ request }) => {
        requests.push(new URL(request.url));
        return HttpResponse.json(buildPage([role]));
      }),
    );
    renderWithProviders(<RoleScreen />, {
      searchParams: '?pagina=-5&tipo=bad&productor=bad',
    });
    await screen.findByText('Supervisor');
    expect(requests[0].searchParams.get('page')).toBe('1');
    expect(requests[0].searchParams.has('kind')).toBe(false);
    expect(requests[0].searchParams.has('producer')).toBe(false);
  });
  it('requires a producer before creating on behalf of the association', async () => {
    server.use(
      http.get(apiUrl('/api/auth/me'), () =>
        HttpResponse.json(
          buildSession({
            producer_id: null,
            permissions: [PERMISSIONS.ROLES_VIEW, PERMISSIONS.ROLES_MANAGE],
          }),
        ),
      ),
    );
    renderWithProviders(<RoleScreen />, { searchParams: '?rol=nuevo' });
    expect(
      await screen.findByText(
        'No puedes crear un rol sin permiso y un productor válido.',
      ),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Guardar rol' }),
    ).not.toBeInTheDocument();
  });
  it('sends the selected producer only for association accounts', async () => {
    let payload: unknown;
    server.use(
      http.get(apiUrl('/api/auth/me'), () =>
        HttpResponse.json(
          buildSession({
            producer_id: null,
            permissions: [PERMISSIONS.ROLES_VIEW, PERMISSIONS.ROLES_MANAGE],
          }),
        ),
      ),
      http.post(apiUrl('/api/roles'), async ({ request }) => {
        payload = await request.json();
        return HttpResponse.json(role, { status: 201 });
      }),
    );
    renderWithProviders(<RoleScreen />, {
      searchParams: `?productor=${id}&rol=nuevo`,
    });
    await userEvent.type(await screen.findByLabelText('Nombre'), 'Auxiliar');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar rol' }));
    await waitFor(() =>
      expect(payload).toEqual({
        name: 'Auxiliar',
        description: '',
        permission_codes: [],
        producer_id: id,
      }),
    );
  });
  it('preserves the form after permission and field errors', async () => {
    let calls = 0;
    server.use(
      http.post(apiUrl('/api/roles'), () =>
        ++calls === 1
          ? apiError(403, 'exceeds_own_permissions')
          : apiError(400, 'validation_error', 'Revisa los datos.', {
              description: ['Descripción no válida.'],
            }),
      ),
    );
    renderWithProviders(<RoleScreen />, { searchParams: '?rol=nuevo' });
    await userEvent.type(await screen.findByLabelText('Nombre'), 'Auxiliar');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar rol' }));
    expect(
      await screen.findByText(
        'No puedes conceder todos los permisos seleccionados.',
      ),
    ).toBeVisible();
    expect(screen.getByLabelText('Nombre')).toHaveValue('Auxiliar');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar rol' }));
    expect(await screen.findByText('Descripción no válida.')).toBeVisible();
  });
  it('denies access without requesting roles', async () => {
    const list = vi.fn(() => HttpResponse.json(buildPage([])));
    server.use(
      http.get(apiUrl('/api/auth/me'), () => HttpResponse.json(buildSession())),
      http.get(apiUrl('/api/roles'), list),
    );
    renderWithProviders(<RoleScreen />);
    expect(await screen.findByText('Acceso no disponible')).toBeVisible();
    expect(list).not.toHaveBeenCalled();
  });
  it('searches on the server and resets the page in the URL', async () => {
    const requests: URL[] = [];
    const onUrlUpdate = vi.fn();
    server.use(
      http.get(apiUrl('/api/roles'), ({ request }) => {
        const url = new URL(request.url);
        requests.push(url);
        return HttpResponse.json(
          buildPage(
            url.searchParams.get('search')
              ? [{ ...role, name: 'Rol encontrado' }]
              : [role],
            url.searchParams.get('search') ? 1 : 41,
          ),
        );
      }),
    );
    renderWithProviders(<RoleScreen />, {
      searchParams: '?pagina=2',
      onUrlUpdate,
    });
    await screen.findByText('Supervisor');
    await userEvent.type(screen.getByLabelText('Buscar roles'), 'encontrado');
    expect(await screen.findByText('Rol encontrado')).toBeVisible();
    expect(requests.at(-1)?.searchParams.get('page')).toBe('1');
    expect(requests.at(-1)?.searchParams.get('search')).toBe('encontrado');
    expect(onUrlUpdate).toHaveBeenCalled();
  });
  it('creates a role with grantable permissions and prevents duplicate requests', async () => {
    let payload: unknown;
    const create = vi.fn(async ({ request }: { request: Request }) => {
      payload = await request.json();
      return HttpResponse.json({ ...role, name: 'Auxiliar' }, { status: 201 });
    });
    server.use(http.post(apiUrl('/api/roles'), create));
    renderWithProviders(<RoleScreen />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Crear rol' }),
    );
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(
      await within(dialog).findByLabelText('Nombre'),
      'Auxiliar',
    );
    expect(
      within(dialog).getByRole('checkbox', { name: 'Administrar roles' }),
    ).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(
      within(dialog).getByRole('checkbox', { name: 'Consultar usuarios' }),
    );
    await userEvent.dblClick(
      within(dialog).getByRole('button', { name: 'Guardar rol' }),
    );
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(payload).toEqual({
      name: 'Auxiliar',
      description: '',
      permission_codes: ['accounts.users_view'],
    });
  });
  it('keeps an ungrantable role read-only without hiding its permissions', async () => {
    server.use(
      http.get(apiUrl(`/api/roles/${id}`), () =>
        HttpResponse.json({
          ...role,
          permissions: ['accounts.roles_manage', 'unknown.permission'],
        }),
      ),
    );
    renderWithProviders(<RoleScreen />, { searchParams: `?rol=${id}` });
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('unknown.permission')).toBeVisible();
    expect(
      within(dialog).queryByRole('button', { name: 'Editar rol' }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: 'Borrar rol' }),
    ).not.toBeInTheDocument();
  });
  it('handles a malformed role without a detail request', async () => {
    renderWithProviders(<RoleScreen />, { searchParams: '?rol=incorrecto' });
    expect(await screen.findByText('Rol no disponible')).toBeVisible();
    expect(await screen.findByText('Supervisor')).toBeVisible();
  });
  it('keeps duplicate name errors next to the submitted value', async () => {
    server.use(
      http.post(apiUrl('/api/roles'), () =>
        apiError(409, 'duplicate_role_name'),
      ),
    );
    renderWithProviders(<RoleScreen />, { searchParams: '?rol=nuevo' });
    await userEvent.type(await screen.findByLabelText('Nombre'), 'Duplicado');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar rol' }));
    expect(
      await screen.findByText('Ya existe un rol con este nombre.'),
    ).toBeVisible();
    expect(screen.getByLabelText('Nombre')).toHaveValue('Duplicado');
  });
});

describe('custom roles by producer', () => {
  const otherProducer = '44444444-4444-4444-8444-444444444444';
  const roles = [
    {
      ...role,
      id: '55555555-5555-4555-8555-555555555555',
      code: 'foreman',
      kind: 'predefined',
      name: 'Capataz',
      producer_id: null,
      producer: null,
    },
    { ...role, producer: { id, member_code: 'PROD-000001' } },
    {
      ...role,
      id: '66666666-6666-4666-8666-666666666666',
      name: 'Supervisor',
      producer_id: otherProducer,
      producer: { id: otherProducer, member_code: 'PROD-000002' },
    },
  ];
  beforeEach(() => {
    server.use(
      http.get(apiUrl('/api/roles'), () => HttpResponse.json(buildPage(roles))),
    );
  });
  const headings = async () =>
    (await screen.findAllByRole('heading', { level: 2 })).map(
      (heading) => heading.textContent,
    );

  it('groups the custom roles of each producer for the association', async () => {
    server.use(
      http.get(apiUrl('/api/auth/me'), () =>
        HttpResponse.json(
          buildSession({
            producer_id: null,
            permissions: [PERMISSIONS.ROLES_VIEW],
          }),
        ),
      ),
    );
    renderWithProviders(<RoleScreen />);
    expect(await headings()).toEqual([
      'Roles del sistema',
      'Roles propios de PROD-000001',
      'Roles propios de PROD-000002',
    ]);
    const second = screen
      .getByRole('heading', { name: 'Roles propios de PROD-000002' })
      .closest('section')!;
    expect(
      within(second).getAllByRole('button', { name: 'Ver rol Supervisor' }),
    ).toHaveLength(1);
  });

  it('keeps a single custom group inside the space of a producer', async () => {
    renderWithProviders(<RoleScreen />);
    expect(await headings()).toEqual(['Roles del sistema', 'Roles propios']);
  });
});

describe('permissions that depend on another', () => {
  beforeEach(() => {
    server.use(
      http.get(apiUrl('/api/permissions'), () =>
        HttpResponse.json({
          results: [
            { ...catalog[0], requires: null },
            {
              ...catalog[1],
              grantable: true,
              requires: 'accounts.users_view',
            },
          ],
        }),
      ),
    );
  });

  it('checks and locks the required permission while the dependent stays checked', async () => {
    let payload: unknown;
    server.use(
      http.post(apiUrl('/api/roles'), async ({ request }) => {
        payload = await request.json();
        return HttpResponse.json(role, { status: 201 });
      }),
    );
    renderWithProviders(<RoleScreen />, { searchParams: '?rol=nuevo' });
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(
      await within(dialog).findByLabelText('Nombre'),
      'Auxiliar',
    );
    const manage = within(dialog).getByRole('checkbox', {
      name: 'Administrar roles',
    });
    const view = within(dialog).getByRole('checkbox', {
      name: 'Consultar usuarios',
    });

    await userEvent.click(manage);
    expect(view).toBeChecked();
    expect(view).toHaveAttribute('aria-disabled', 'true');
    expect(
      within(dialog).getByText(
        'Se incluye porque lo necesita: Administrar roles.',
      ),
    ).toBeVisible();

    await userEvent.click(manage);
    expect(view).toBeChecked();
    expect(view).not.toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(view);
    expect(view).not.toBeChecked();

    await userEvent.click(manage);
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Guardar rol' }),
    );
    await waitFor(() =>
      expect(payload).toEqual({
        name: 'Auxiliar',
        description: '',
        permission_codes: ['accounts.roles_manage', 'accounts.users_view'],
      }),
    );
  });
});
