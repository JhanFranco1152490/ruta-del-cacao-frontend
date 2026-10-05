import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '@/lib/permissions';
import {
  apiError,
  buildPage,
  buildProducer,
  buildSession,
} from '@/test/factories';
import { apiUrl, municipalitiesHandler } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { router } from '@/test/router';
import { server } from '@/test/server';
import type { Producer } from '../api';
import { ProducerDetailScreen } from './producer-detail-screen';

vi.mock('next/navigation', () => ({ useRouter: () => router }));

const accountId = '11111111-1111-4111-8111-111111111111';
const producerRoleId = '22222222-2222-4222-8222-222222222222';
const account = {
  id: accountId,
  email: 'ana.prueba@example.com',
  status: 'active',
  activation_pending: false,
};
const adminPermissions = [
  PERMISSIONS.PRODUCERS_VIEW,
  PERMISSIONS.USERS_VIEW,
  PERMISSIONS.USERS_CREATE,
  PERMISSIONS.USERS_UPDATE,
  PERMISSIONS.USERS_CHANGE_STATUS,
  PERMISSIONS.ROLES_VIEW,
];

// El detalle se pide de nuevo tras cada acción: la prueba decide qué devuelve cada vez.
let producer: Producer;
function mockProducer(overrides: Partial<Producer>) {
  producer = buildProducer({ email: 'ana.prueba@example.com', ...overrides });
}
function mockSession(permissions: string[]) {
  server.use(
    http.get(apiUrl('/api/auth/me'), () =>
      HttpResponse.json(buildSession({ producer_id: null, permissions })),
    ),
  );
}
const card = () => screen.findByRole('region', { name: 'Cuenta de acceso' });

beforeEach(() => {
  mockProducer({});
  mockSession(adminPermissions);
  server.use(
    municipalitiesHandler(),
    http.get(apiUrl('/api/producers/p1'), () => HttpResponse.json(producer)),
    http.get(apiUrl('/api/roles'), () =>
      HttpResponse.json(
        buildPage([
          {
            id: producerRoleId,
            code: 'producer',
            kind: 'fixed',
            name: 'Productor',
            description: '',
            producer_id: null,
            permissions: [],
          },
        ]),
      ),
    ),
  );
});

describe('ProducerAccountCard', () => {
  it('creates the account with the record email and shows it', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(apiUrl('/api/users'), async ({ request }) => {
        bodies.push(await request.json());
        await delay(50);
        mockProducer({ account: { ...account, activation_pending: true } });
        return HttpResponse.json({
          id: accountId,
          activation_email_sent: true,
        });
      }),
    );
    renderWithProviders(<ProducerDetailScreen id="p1" />);
    const region = await card();
    expect(
      within(region).getByText('Este productor aún no tiene cuenta de acceso.'),
    ).toBeVisible();
    await userEvent.click(
      await within(region).findByRole('button', {
        name: 'Crear cuenta de acceso',
      }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Crear cuenta de acceso',
    });
    expect(within(dialog).getByLabelText('Correo')).toHaveValue(
      'ana.prueba@example.com',
    );
    await userEvent.dblClick(
      within(dialog).getByRole('button', { name: 'Crear cuenta' }),
    );
    expect(
      await within(region).findByText('Pendiente de activación'),
    ).toBeVisible();
    expect(bodies).toEqual([
      {
        email: 'ana.prueba@example.com',
        role_ids: [producerRoleId],
        producer_id: 'p1',
      },
    ]);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it.each([
    ['duplicate_email', 409, 'Ya existe una cuenta con este correo.'],
    [
      'producer_already_linked',
      409,
      'Este productor ya tiene una cuenta de acceso. Recarga la ficha.',
    ],
    [
      'producer_inactive',
      409,
      'El productor está inactivo: reactívalo antes de crear su cuenta.',
    ],
  ])(
    'presents %s without closing the dialog',
    async (code, status, message) => {
      server.use(http.post(apiUrl('/api/users'), () => apiError(status, code)));
      renderWithProviders(<ProducerDetailScreen id="p1" />);
      await userEvent.click(
        await within(await card()).findByRole('button', {
          name: 'Crear cuenta de acceso',
        }),
      );
      const dialog = await screen.findByRole('dialog', {
        name: 'Crear cuenta de acceso',
      });
      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Crear cuenta' }),
      );
      expect(await within(dialog).findByText(message)).toBeVisible();
    },
  );

  it('does not offer the creation for an inactive producer', async () => {
    mockProducer({ status: 'inactive' });
    renderWithProviders(<ProducerDetailScreen id="p1" />);
    const region = await card();
    expect(
      within(region).getByText('Reactiva el productor para crear su cuenta.'),
    ).toBeVisible();
    expect(within(region).queryByRole('button')).toBeNull();
  });

  it('shows an active account and deactivates it', async () => {
    mockProducer({ account });
    server.use(
      http.patch(apiUrl(`/api/users/${accountId}/status`), () => {
        mockProducer({ account: { ...account, status: 'inactive' } });
        return HttpResponse.json({ id: accountId, status: 'inactive' });
      }),
    );
    renderWithProviders(<ProducerDetailScreen id="p1" />);
    const region = await card();
    expect(within(region).getByText('ana.prueba@example.com')).toBeVisible();
    expect(within(region).getByText('Activa')).toBeVisible();
    await userEvent.click(
      await within(region).findByRole('button', { name: 'Desactivar' }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: '¿Desactivar cuenta?',
    });
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Desactivar cuenta' }),
    );
    expect(await within(region).findByText('Inactiva')).toBeVisible();
    expect(
      await within(region).findByRole('button', { name: 'Reactivar' }),
    ).toBeVisible();
  });

  it('resends the activation of a pending account', async () => {
    mockProducer({ account: { ...account, activation_pending: true } });
    let calls = 0;
    server.use(
      http.post(apiUrl(`/api/users/${accountId}/resend-activation`), () => {
        calls += 1;
        return HttpResponse.json({ activation_email_sent: true });
      }),
    );
    renderWithProviders(<ProducerDetailScreen id="p1" />);
    const region = await card();
    expect(within(region).getByText('Pendiente de activación')).toBeVisible();
    await userEvent.click(
      await within(region).findByRole('button', {
        name: 'Reenviar activación',
      }),
    );
    expect(await within(region).findByText('Correo enviado')).toBeVisible();
    expect(calls).toBe(1);
  });

  it('links to the producer accounts only when the association has access', async () => {
    mockProducer({ account, association_access: true });
    renderWithProviders(<ProducerDetailScreen id="p1" />);
    const region = await card();
    expect(
      within(region).getByText('Acceso de la asociación: encendido'),
    ).toBeVisible();
    expect(
      await within(region).findByRole('link', {
        name: 'Ver cuentas de este productor',
      }),
    ).toHaveAttribute('href', '/usuarios?productor=p1');
  });

  it('hides the link when the association has no access', async () => {
    mockProducer({ account, association_access: false });
    renderWithProviders(<ProducerDetailScreen id="p1" />);
    const region = await card();
    expect(
      within(region).getByText('Acceso de la asociación: apagado'),
    ).toBeVisible();
    expect(within(region).queryByRole('link')).toBeNull();
  });

  it('offers no actions without account permissions', async () => {
    let sessionServed = false;
    server.use(
      http.get(apiUrl('/api/auth/me'), () => {
        sessionServed = true;
        return HttpResponse.json(
          buildSession({ permissions: [PERMISSIONS.PRODUCERS_VIEW] }),
        );
      }),
    );
    mockProducer({
      account: { ...account, activation_pending: true },
      association_access: true,
    });
    renderWithProviders(<ProducerDetailScreen id="p1" />);
    const region = await card();
    await waitFor(() => expect(sessionServed).toBe(true));
    expect(within(region).getByText('ana.prueba@example.com')).toBeVisible();
    expect(within(region).queryByRole('button')).toBeNull();
    expect(within(region).queryByRole('link')).toBeNull();
  });

  it('warns that deactivating the producer also blocks its employees', async () => {
    renderWithProviders(<ProducerDetailScreen id="p1" />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Desactivar' }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: '¿Desactivar productor?',
    });
    expect(
      within(dialog).getByText(
        /también se bloqueará el acceso de su cuenta y el de sus empleados/,
      ),
    ).toBeVisible();
  });

  describe('deleting the account', () => {
    const detail = (overrides: object = {}) => ({
      ...account,
      first_name: 'Ana',
      last_name: 'Prueba',
      has_signed_in: false,
      ...overrides,
    });
    function mockAccountDetail(overrides: object = {}) {
      server.use(
        http.get(apiUrl(`/api/users/${accountId}`), () =>
          HttpResponse.json(detail(overrides)),
        ),
      );
    }
    const withDelete = [...adminPermissions, PERMISSIONS.USERS_DELETE];

    it('offers it for an account that never signed in and leaves the producer without one', async () => {
      mockSession(withDelete);
      mockProducer({ account });
      mockAccountDetail();
      server.use(
        http.delete(apiUrl(`/api/users/${accountId}`), () => {
          mockProducer({});
          return new HttpResponse(null, { status: 204 });
        }),
      );
      renderWithProviders(<ProducerDetailScreen id="p1" />);
      const region = await card();
      await userEvent.click(
        await within(region).findByRole('button', { name: 'Eliminar cuenta' }),
      );
      const dialog = await screen.findByRole('dialog', {
        name: '¿Eliminar la cuenta?',
      });
      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Eliminar cuenta' }),
      );
      expect(
        await within(region).findByText(
          'Este productor aún no tiene cuenta de acceso.',
        ),
      ).toBeVisible();
      expect(
        await within(region).findByRole('button', {
          name: 'Crear cuenta de acceso',
        }),
      ).toBeVisible();
    });

    it('does not offer it once the account has signed in', async () => {
      mockSession(withDelete);
      mockProducer({ account });
      mockAccountDetail({ has_signed_in: true });
      renderWithProviders(<ProducerDetailScreen id="p1" />);
      const region = await card();
      await within(region).findByRole('button', { name: 'Desactivar' });
      expect(
        within(region).queryByRole('button', { name: 'Eliminar cuenta' }),
      ).toBeNull();
    });

    it('does not offer it without users_delete', async () => {
      mockProducer({ account });
      mockAccountDetail();
      renderWithProviders(<ProducerDetailScreen id="p1" />);
      const region = await card();
      await within(region).findByRole('button', { name: 'Desactivar' });
      expect(
        within(region).queryByRole('button', { name: 'Eliminar cuenta' }),
      ).toBeNull();
    });
  });
});
