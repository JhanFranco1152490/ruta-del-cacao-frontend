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

import { RoleScreen } from './role-screen';

const SU = 'su1';
const ACTIVE = '33333333-3333-4333-8333-333333333333';
const OTHER = '44444444-4444-4444-8444-444444444444';

const owner = (id: string, first_name: string, member_code: string) => ({
  id,
  first_name,
  last_name: 'Prueba',
  member_code,
});

const role = (
  id: string,
  name: string,
  kind: 'fixed' | 'custom',
  producer: ReturnType<typeof owner> | null,
) => ({
  id,
  code: kind === 'custom' ? null : name.toLowerCase(),
  kind,
  name,
  description: '',
  producer_id: producer?.id ?? null,
  producer,
  permissions: [],
});

const ana = owner(ACTIVE, 'Ana', 'PROD-000007');
const luis = owner(OTHER, 'Luis', 'PROD-000008');
const ROLES = [
  role('r1', 'Administrador', 'fixed', null),
  role('r2', 'Cosecha de Luis', 'custom', luis),
  role('r3', 'Cosecha de Ana', 'custom', ana),
];

const permissions = [
  PERMISSIONS.ROLES_VIEW,
  PERMISSIONS.ROLES_MANAGE,
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
          permissions,
        }),
      ),
    ),
    http.get(apiUrl('/api/roles'), ({ request }) => {
      requests.push(new URL(request.url).searchParams);
      return HttpResponse.json(buildPage(ROLES));
    }),
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

describe('Roles of the technical account', () => {
  it('without a producer shows every role grouped by producer, with no scope control', async () => {
    signIn();
    renderWithProviders(<RoleScreen />);

    expect(await screen.findByText('Roles del sistema')).toBeVisible();
    expect(
      screen.getByText('Roles propios de Luis Prueba · PROD-000008'),
    ).toBeVisible();
    expect(
      screen.queryByRole('group', { name: 'Alcance de la lista' }),
    ).not.toBeInTheDocument();
    expect(lastRequest().get('ordering')).toBe('producer,name');
    expect(lastRequest().get('producer')).toBeNull();
  });

  it('with a producer chosen starts on its roles and the system ones', async () => {
    writeActingProducer(SU, ACTIVE);
    signIn();
    renderWithProviders(<RoleScreen />);

    const control = await screen.findByRole('group', {
      name: 'Alcance de la lista',
    });
    expect(
      within(control).getByRole('button', { name: 'Del productor activo' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(lastRequest().get('producer')).toBe(ACTIVE));
    expect(lastRequest().get('include_system')).toBe('true');
    expect(lastRequest().get('ordering')).toBeNull();
    expect(screen.queryByLabelText('Productor')).not.toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Crear rol' }),
    ).toBeVisible();
  });

  it('shows every role on "Todos" with the active producer first and open and the rest folded', async () => {
    writeActingProducer(SU, ACTIVE);
    signIn();
    renderWithProviders(<RoleScreen />, { searchParams: '?vista=todos' });

    const active = (
      await screen.findByText('Roles propios de Ana Prueba · PROD-000007')
    ).closest('details') as HTMLDetailsElement;
    const other = screen
      .getByText('Roles propios de Luis Prueba · PROD-000008')
      .closest('details') as HTMLDetailsElement;
    expect(active.open).toBe(true);
    expect(other.open).toBe(false);
    expect(
      active.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(lastRequest().get('producer')).toBeNull();
    expect(screen.getByLabelText('Productor')).toBeVisible();
  });

  it('goes to "Todos" from the control', async () => {
    writeActingProducer(SU, ACTIVE);
    signIn();
    renderWithProviders(<RoleScreen />);

    await userEvent.click(await screen.findByRole('button', { name: 'Todos' }));

    await waitFor(() =>
      expect(lastRequest().get('ordering')).toBe('producer,name'),
    );
  });
});

describe('Roles of an association administrator', () => {
  it('stays as it was, with no scope control and nothing folded', async () => {
    signIn({ is_superuser: false });
    renderWithProviders(<RoleScreen />);

    await screen.findByText('Roles del sistema');
    expect(
      screen.queryByRole('group', { name: 'Alcance de la lista' }),
    ).not.toBeInTheDocument();
    expect(lastRequest().get('ordering')).toBeNull();
    expect(document.querySelector('details')).toBeNull();
  });
});
