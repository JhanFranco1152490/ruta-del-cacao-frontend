import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { PERMISSIONS } from '@/lib/permissions';
import { buildPage, buildSession } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { RoleScreen } from './role-screen';

const role = {
  id: 'r1',
  code: 'administrator',
  kind: 'fixed',
  name: 'Administrador',
  description: '',
  producer_id: null,
  producer: null,
  permissions: [],
};

function signIn(producer_id: string | null, is_superuser = false) {
  const requests: URLSearchParams[] = [];
  server.use(
    http.get(apiUrl('/api/auth/me'), () =>
      HttpResponse.json(
        buildSession({
          producer_id,
          is_superuser,
          permissions: [PERMISSIONS.ROLES_VIEW],
        }),
      ),
    ),
    http.get(apiUrl('/api/roles'), ({ request }) => {
      requests.push(new URL(request.url).searchParams);
      return HttpResponse.json(buildPage([role]));
    }),
  );
  return requests;
}

describe('RoleScreen and the order of the roles', () => {
  it('orders the roles by producer for the technical account, so a group is not split between pages', async () => {
    const requests = signIn(null, true);
    renderWithProviders(<RoleScreen />);

    await screen.findByText('Roles del sistema');
    expect(requests.at(-1)?.get('ordering')).toBe('producer,name');
  });

  it('leaves the order alone for the association administrator, who sees no producer roles', async () => {
    const requests = signIn(null);
    renderWithProviders(<RoleScreen />);

    await screen.findByText('Roles del sistema');
    expect(requests.at(-1)?.get('ordering')).toBeNull();
  });

  it('leaves the order alone for a producer, who only sees its own', async () => {
    const requests = signIn('p1');
    renderWithProviders(<RoleScreen />);

    await screen.findByText('Roles del sistema');
    expect(requests.at(-1)?.get('ordering')).toBeNull();
  });
});
