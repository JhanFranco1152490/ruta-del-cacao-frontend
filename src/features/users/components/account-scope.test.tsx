import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { syncActingProducer, writeActingProducer } from '@/lib/acting-producer';
import { PERMISSIONS } from '@/lib/permissions';
import { buildPage, buildProducer, buildSession } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { AccountListScreen } from './account-list-screen';

const SU = 'su1';
const ACTIVE = '33333333-3333-4333-8333-333333333333';
const OTHER = '44444444-4444-4444-8444-444444444444';
const roleId = '22222222-2222-4222-8222-222222222222';

const producer = (id: string, first_name: string, member_code: string) => ({
  id,
  first_name,
  last_name: 'Prueba',
  member_code,
  status: 'active',
  municipality_code: '54001',
});

const account = (id: string, first_name: string, owner: object | null) => ({
  id,
  email: `${first_name.toLowerCase()}@example.com`,
  first_name,
  last_name: 'Cuenta',
  document_type: 'CC',
  identity_document: '1234567890',
  phone: null,
  producer: owner,
  roles: [{ id: roleId, code: 'foreman', name: 'Capataz' }],
  status: 'active',
  activation_pending: false,
  created_at: '2026-09-28T12:00:00Z',
});

const ana = producer(ACTIVE, 'Ana', 'PROD-000007');
const luis = producer(OTHER, 'Luis', 'PROD-000008');
const ACCOUNTS = [
  account('a1', 'Alba', null),
  account('a2', 'Beto', luis),
  account('a3', 'Cira', ana),
];

const technicalPermissions = [
  PERMISSIONS.USERS_VIEW,
  PERMISSIONS.USERS_CREATE,
  PERMISSIONS.ROLES_VIEW,
  PERMISSIONS.PRODUCERS_VIEW,
];

let requests: URLSearchParams[];

function signIn({ is_superuser = true } = {}) {
  requests = [];
  server.use(
    http.get(apiUrl('/api/auth/me'), () =>
      HttpResponse.json(
        buildSession({
          id: SU,
          producer_id: null,
          is_superuser,
          permissions: technicalPermissions,
        }),
      ),
    ),
    http.get(apiUrl('/api/users'), ({ request }) => {
      requests.push(new URL(request.url).searchParams);
      return HttpResponse.json(buildPage(ACCOUNTS));
    }),
    http.get(apiUrl('/api/roles'), () =>
      HttpResponse.json(
        buildPage([
          {
            id: roleId,
            code: 'foreman',
            kind: 'predefined',
            name: 'Capataz',
            description: '',
            producer_id: null,
            permissions: [],
          },
        ]),
      ),
    ),
    http.get(apiUrl('/api/producers'), () => HttpResponse.json(buildPage([]))),
    http.get(apiUrl(`/api/producers/${ACTIVE}`), () =>
      HttpResponse.json(buildProducer({ id: ACTIVE, first_name: 'Ana' })),
    ),
  );
}

const lastRequest = () => requests.at(-1) as URLSearchParams;

beforeEach(() => {
  sessionStorage.clear();
  syncActingProducer(null);
});

afterEach(() => {
  sessionStorage.clear();
  syncActingProducer(null);
});

describe('Users of the technical account', () => {
  it('without a producer shows everyone grouped by producer, with no scope control', async () => {
    signIn();
    renderWithProviders(<AccountListScreen />);

    expect(await screen.findByText('Ana Prueba · PROD-000007')).toBeVisible();
    expect(screen.getByText('Luis Prueba · PROD-000008')).toBeVisible();
    expect(screen.getByText('Asociación')).toBeVisible();
    expect(
      screen.queryByRole('group', { name: 'Alcance de la lista' }),
    ).not.toBeInTheDocument();
    expect(lastRequest().get('ordering')).toBe('producer,last_name');
    expect(lastRequest().get('producer')).toBeNull();
  });

  it('with a producer chosen starts on the accounts of that producer only', async () => {
    writeActingProducer(SU, ACTIVE);
    signIn();
    renderWithProviders(<AccountListScreen />);

    const control = await screen.findByRole('group', {
      name: 'Alcance de la lista',
    });
    expect(
      within(control).getByRole('button', { name: 'Del productor activo' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(lastRequest().get('producer')).toBe(ACTIVE));
    expect(lastRequest().get('ordering')).toBeNull();
    expect(screen.queryByLabelText('Productor')).not.toBeInTheDocument();
    expect(screen.queryByText('Asociación')).not.toBeInTheDocument();
  });

  it('shows everyone grouped, with the active producer first and open, on "Todos"', async () => {
    writeActingProducer(SU, ACTIVE);
    signIn();
    renderWithProviders(<AccountListScreen />, {
      searchParams: '?vista=todos',
    });

    const headers = await screen.findAllByText(/PROD-0000|Asociación/);
    expect(headers[0]).toHaveTextContent('Ana Prueba · PROD-000007');
    const active = headers[0].closest('details') as HTMLDetailsElement;
    const other = screen
      .getByText('Luis Prueba · PROD-000008')
      .closest('details') as HTMLDetailsElement;
    expect(active.open).toBe(true);
    expect(other.open).toBe(false);
    expect(lastRequest().get('producer')).toBeNull();
    expect(lastRequest().get('ordering')).toBe('producer,last_name');
    expect(screen.getByLabelText('Productor')).toBeVisible();
  });

  it('goes to "Todos" from the control', async () => {
    writeActingProducer(SU, ACTIVE);
    signIn();
    renderWithProviders(<AccountListScreen />);

    await userEvent.click(await screen.findByRole('button', { name: 'Todos' }));

    await waitFor(() =>
      expect(lastRequest().get('ordering')).toBe('producer,last_name'),
    );
  });

  it('creates an employee of the active producer without asking which', async () => {
    writeActingProducer(SU, ACTIVE);
    signIn();
    renderWithProviders(<AccountListScreen />, {
      searchParams: '?cuenta=nueva',
    });

    expect(
      await screen.findByRole('heading', { name: 'Crear cuenta de empleado' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Continuar' }),
    ).not.toBeInTheDocument();
  });

  it('still asks the type of account on "Todos"', async () => {
    writeActingProducer(SU, ACTIVE);
    signIn();
    renderWithProviders(<AccountListScreen />, {
      searchParams: '?cuenta=nueva&vista=todos',
    });

    expect(
      await screen.findByRole('button', { name: 'Continuar' }),
    ).toBeVisible();
  });
});

describe('Users of an association administrator', () => {
  it('stays a flat list, with no scope control and no grouping', async () => {
    signIn({ is_superuser: false });
    renderWithProviders(<AccountListScreen />);

    await screen.findByRole('table');
    expect(
      screen.queryByRole('group', { name: 'Alcance de la lista' }),
    ).not.toBeInTheDocument();
    expect(lastRequest().get('ordering')).toBeNull();
    expect(screen.queryByText('Asociación')).not.toBeInTheDocument();
  });
});
