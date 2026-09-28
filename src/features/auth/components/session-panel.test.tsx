import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { buildSession } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { SessionPanel } from './session-panel';

const ME = apiUrl('/api/auth/me');

beforeEach(() => {
  server.use(
    http.get(ME, () =>
      HttpResponse.json(
        buildSession({
          email: 'ana@example.com',
          roles: [
            { id: 'role-1', code: 'foreman', name: 'Capataz/Operario' },
            { id: 'role-2', code: null, name: 'Gestión de finca' },
          ],
        }),
      ),
    ),
  );
});

describe('SessionPanel', () => {
  it('shows the email and the roles of the session', async () => {
    renderWithProviders(<SessionPanel />);

    expect(await screen.findByText('ana@example.com')).toBeInTheDocument();
    expect(screen.getByText('Capataz/Operario')).toBeInTheDocument();
    expect(screen.getByText('Gestión de finca')).toBeInTheDocument();
  });

  it('says so when the account has no roles', async () => {
    server.use(
      http.get(ME, () => HttpResponse.json(buildSession({ roles: [] }))),
    );
    renderWithProviders(<SessionPanel />);

    expect(await screen.findByText('Sin roles asignados')).toBeInTheDocument();
  });

  it('only links to the producers section', async () => {
    renderWithProviders(<SessionPanel />);
    await screen.findByText('ana@example.com');

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/productores');
  });
});
