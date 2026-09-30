import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildPage, buildSession } from '@/test/factories';
import { apiUrl, municipalitiesHandler } from '@/test/handlers';
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
  producer: {
    id: producerId,
    member_code: 'PROD-000001',
    status: 'active',
    municipality_code: '54001',
  },
  roles: [{ id: 'role-foreman', code: 'foreman', name: 'Capataz' }],
  status: 'active',
  activation_pending: false,
  created_at: '2026-09-28T12:00:00Z',
};
const administrator = {
  ...account,
  id: '22222222-2222-4222-8222-222222222222',
  first_name: 'Luis',
  producer: null,
  roles: [{ id: 'role-admin', code: 'administrator', name: 'Administrador' }],
};

function mockSession(producer_id: string | null) {
  server.use(
    http.get(apiUrl('/api/auth/me'), () =>
      HttpResponse.json(
        buildSession({ producer_id, permissions: [PERMISSIONS.USERS_VIEW] }),
      ),
    ),
  );
}

beforeEach(() => {
  mockSession(null);
  server.use(
    municipalitiesHandler(),
    http.get(apiUrl('/api/users'), () =>
      HttpResponse.json(buildPage([account, administrator])),
    ),
    http.get(apiUrl(`/api/users/${id}`), () => HttpResponse.json(account)),
  );
});

describe('municipality of the accounts', () => {
  it('shows the municipality of each producer account to the association', async () => {
    renderWithProviders(<AccountListScreen />);
    const table = await screen.findByRole('table');
    expect(
      within(table).getByRole('columnheader', { name: 'Municipio' }),
    ).toBeVisible();
    const [, employeeRow, adminRow] = within(table).getAllByRole('row');
    expect(await within(employeeRow).findByText('Cúcuta')).toBeVisible();
    expect(within(adminRow).getByText('—')).toBeVisible();
  });

  it('filters by municipality through the URL and resets the page', async () => {
    const requests: URL[] = [];
    const onUrlUpdate = vi.fn();
    server.use(
      http.get(apiUrl('/api/users'), ({ request }) => {
        requests.push(new URL(request.url));
        return HttpResponse.json(buildPage([account]));
      }),
    );
    renderWithProviders(<AccountListScreen />, {
      searchParams: '?pagina=2',
      onUrlUpdate,
    });
    await screen.findByRole('option', { name: 'Cúcuta' });
    await userEvent.selectOptions(screen.getByLabelText('Municipio'), '54001');

    await waitFor(() =>
      expect(requests.at(-1)?.searchParams.get('municipality')).toBe('54001'),
    );
    expect(requests.at(-1)?.searchParams.get('page')).toBe('1');
    expect(onUrlUpdate.mock.lastCall?.[0].searchParams.get('municipio')).toBe(
      '54001',
    );
  });

  it('shows the municipality in the detail of a producer account', async () => {
    renderWithProviders(<AccountListScreen />, {
      searchParams: `?cuenta=${id}`,
    });
    const detail = await screen.findByRole('dialog', {
      name: 'Detalle de la cuenta',
    });
    expect(await within(detail).findByText('Municipio')).toBeVisible();
    expect(await within(detail).findByText('Cúcuta')).toBeVisible();
  });

  it('offers neither the filter nor the column inside the space of a producer', async () => {
    mockSession(producerId);
    const requests: URL[] = [];
    server.use(
      http.get(apiUrl('/api/users'), ({ request }) => {
        requests.push(new URL(request.url));
        return HttpResponse.json(buildPage([account]));
      }),
    );
    renderWithProviders(<AccountListScreen />, {
      searchParams: '?municipio=54001',
    });
    const table = await screen.findByRole('table');
    expect(
      within(table).queryByRole('columnheader', { name: 'Municipio' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Municipio')).not.toBeInTheDocument();
    expect(requests.at(-1)?.searchParams.has('municipality')).toBe(false);
  });
});
