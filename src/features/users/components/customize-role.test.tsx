import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { PERMISSIONS } from '@/lib/permissions';
import { apiError, buildPage, buildSession } from '@/test/factories';
import { apiUrl, farmsHandler } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { AccountListScreen } from './account-list-screen';

const producerId = '33333333-3333-4333-8333-333333333333';
const foremanId = '22222222-2222-4222-8222-222222222222';
const operatorId = '66666666-6666-4666-8666-666666666666';

const foreman = {
  id: foremanId,
  code: 'foreman',
  kind: 'predefined',
  name: 'Capataz/Operario',
  description: '',
  producer_id: null,
  producer: null,
  permissions: [PERMISSIONS.ACTIVITIES_ADD, PERMISSIONS.ACTIVITIES_COMPLETE],
  permission_details: [
    { code: PERMISSIONS.ACTIVITIES_ADD, name: 'Puede programar actividades' },
    {
      code: PERMISSIONS.ACTIVITIES_COMPLETE,
      name: 'Puede registrar la realización de actividades',
    },
  ],
};

let createdRoles: Record<string, unknown>[];
let createdAccounts: Record<string, unknown>[];

function session(permissions: string[]) {
  server.use(
    http.get(apiUrl('/api/auth/me'), () =>
      HttpResponse.json(
        buildSession({
          producer_id: producerId,
          permissions: [...permissions, ...foreman.permissions],
        }),
      ),
    ),
  );
}

beforeEach(() => {
  createdRoles = [];
  createdAccounts = [];
  session([
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.ROLES_VIEW,
    PERMISSIONS.ROLES_MANAGE,
  ]);
  server.use(
    http.get(apiUrl('/api/users'), () => HttpResponse.json(buildPage([]))),
    http.get(apiUrl('/api/roles'), () =>
      HttpResponse.json(buildPage([foreman])),
    ),
    http.post(apiUrl('/api/roles'), async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      createdRoles.push(body);
      return HttpResponse.json(
        {
          ...foreman,
          id: operatorId,
          code: null,
          kind: 'custom',
          name: body.name,
          producer_id: producerId,
          permissions: body.permission_codes,
          permission_details: foreman.permission_details.filter(({ code }) =>
            (body.permission_codes as string[]).includes(code),
          ),
        },
        { status: 201 },
      );
    }),
    http.post(apiUrl('/api/users'), async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      createdAccounts.push(body);
      return apiError(400, 'validation_error', 'Detenido en la prueba.');
    }),
    farmsHandler([]),
  );
});

const openCreate = () =>
  renderWithProviders(<AccountListScreen />, {
    searchParams: '?cuenta=nueva',
  });

describe('Personalizar permisos', () => {
  it('crea un rol propio con menos permisos y lo deja elegido en lugar del original', async () => {
    openCreate();

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Personalizar permisos de Capataz/Operario',
      }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: /Personalizar permisos de Capataz\/Operario/,
    });
    await userEvent.type(
      within(dialog).getByLabelText('Nombre del rol'),
      'Operario',
    );
    // El operario no programa: solo registra lo que se le asigna.
    await userEvent.click(
      within(dialog).getByRole('checkbox', {
        name: 'Puede programar actividades',
      }),
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Guardar rol' }),
    );

    expect(
      await screen.findByRole('checkbox', { name: 'Operario' }),
    ).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Capataz/Operario' }),
    ).not.toBeChecked();
    expect(createdRoles).toEqual([
      {
        name: 'Operario',
        description: 'Basado en Capataz/Operario.',
        permission_codes: [PERMISSIONS.ACTIVITIES_COMPLETE],
        farm_scope: 'many',
      },
    ]);
    // Guardar el rol no envía la cuenta.
    expect(createdAccounts).toEqual([]);
  });

  it('pide un nombre y avisa si ya existe', async () => {
    server.use(
      http.post(apiUrl('/api/roles'), () =>
        apiError(409, 'duplicate_role_name'),
      ),
    );
    openCreate();
    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Personalizar permisos de Capataz/Operario',
      }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: /Personalizar permisos/,
    });
    const save = within(dialog).getByRole('button', { name: 'Guardar rol' });

    await userEvent.click(save);
    expect(
      await within(dialog).findByText(/Ponle un nombre al rol/),
    ).toBeVisible();

    await userEvent.type(
      within(dialog).getByLabelText('Nombre del rol'),
      'Operario',
    );
    await userEvent.click(save);
    expect(
      await within(dialog).findByText('Ya hay un rol con ese nombre.'),
    ).toBeVisible();
  });

  it('no se ofrece a quien no puede crear roles', async () => {
    session([
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.USERS_CREATE,
      PERMISSIONS.ROLES_VIEW,
    ]);
    openCreate();

    expect(
      await screen.findByRole('checkbox', { name: 'Capataz/Operario' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /Personalizar permisos/ }),
    ).not.toBeInTheDocument();
  });
});
