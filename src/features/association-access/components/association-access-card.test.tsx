import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { apiError, buildSession } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { PERMISSIONS } from '@/lib/permissions';
import MyProducerPage from '@/app/(app)/mi-productor/page';

const producerPermissions = [
  PERMISSIONS.USERS_VIEW,
  PERMISSIONS.ASSOCIATION_ACCESS_MANAGE,
];
const off = { enabled: false, changed_at: null };
const on = { enabled: true, changed_at: '2026-09-28T15:30:00Z' };

function mockSession(permissions: string[]) {
  server.use(
    http.get(apiUrl('/api/auth/me'), () =>
      HttpResponse.json(buildSession({ permissions })),
    ),
  );
}
// Guarda el cuerpo de cada cambio y responde con lo que decida la prueba.
function recordPut(respond: (enabled: boolean) => Promise<Response>) {
  const bodies: unknown[] = [];
  server.use(
    http.put(apiUrl('/api/association-access'), async ({ request }) => {
      const body = (await request.json()) as { enabled: boolean };
      bodies.push(body);
      return respond(body.enabled);
    }),
  );
  return bodies;
}
const json = (body: object) => Promise.resolve(HttpResponse.json(body));
const findSwitch = () =>
  screen.findByRole('switch', {
    name: 'Permitir que la asociación gestione mis cuentas y roles',
  });

beforeEach(() => {
  mockSession(producerPermissions);
  server.use(
    http.get(apiUrl('/api/association-access'), () => HttpResponse.json(off)),
  );
});

describe('AssociationAccessCard', () => {
  it('is not offered to an account without its own producer, even with the permission', async () => {
    // Un superusuario de Django recibe todos los permisos del sistema, incluido este, aunque
    // no tenga productor propio del que la asociación pueda gestionar cuentas: el interruptor
    // no le sirve, así que ni se muestra ni se consulta.
    let requested = false;
    server.use(
      http.get(apiUrl('/api/auth/me'), () =>
        HttpResponse.json(
          buildSession({ producer_id: null, permissions: producerPermissions }),
        ),
      ),
      http.get(apiUrl('/api/association-access'), () => {
        requested = true;
        return HttpResponse.json(off);
      }),
    );
    renderWithProviders(<MyProducerPage />);
    expect(
      await screen.findByText(
        'Esta sección es para las cuentas de un productor',
      ),
    ).toBeVisible();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(requested).toBe(false);
  });

  it('shows the current state and that it never changed', async () => {
    renderWithProviders(<MyProducerPage />);
    const toggle = await findSwitch();
    expect(toggle).not.toBeChecked();
    expect(screen.getByText('Apagado')).toBeVisible();
    expect(screen.getByText('Nunca se ha cambiado.')).toBeVisible();
  });

  it('shows when it changed for the last time', async () => {
    server.use(
      http.get(apiUrl('/api/association-access'), () => HttpResponse.json(on)),
    );
    renderWithProviders(<MyProducerPage />);
    expect(await findSwitch()).toBeChecked();
    expect(screen.getByText('Encendido')).toBeVisible();
    expect(
      screen.getByText('Último cambio: 28 de septiembre de 2026, 10:30 a.m.'),
    ).toBeVisible();
  });

  it('turns on only after confirmation, with a single request', async () => {
    const bodies = recordPut(async () => {
      await delay(100);
      return HttpResponse.json(on);
    });
    renderWithProviders(<MyProducerPage />);
    await userEvent.click(await findSwitch());
    const dialog = await screen.findByRole('dialog', {
      name: '¿Permitir el acceso de la asociación?',
    });
    expect(bodies).toEqual([]);
    await userEvent.dblClick(
      within(dialog).getByRole('button', { name: 'Permitir acceso' }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await findSwitch()).toBeChecked();
    expect(bodies).toEqual([{ enabled: true }]);
  });

  it('sends nothing when the confirmation is cancelled', async () => {
    const bodies = recordPut(() => json(on));
    renderWithProviders(<MyProducerPage />);
    await userEvent.click(await findSwitch());
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancelar' }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await findSwitch()).not.toBeChecked();
    expect(bodies).toEqual([]);
  });

  it('turns off only after confirmation using the keyboard', async () => {
    server.use(
      http.get(apiUrl('/api/association-access'), () => HttpResponse.json(on)),
    );
    const bodies = recordPut(() =>
      json({ enabled: false, changed_at: '2026-09-28T16:00:00Z' }),
    );
    renderWithProviders(<MyProducerPage />);
    const toggle = await findSwitch();
    toggle.focus();
    await userEvent.keyboard(' ');
    const dialog = await screen.findByRole('dialog', {
      name: '¿Quitar el acceso de la asociación?',
    });
    expect(bodies).toEqual([]);
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Quitar acceso' }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(bodies).toEqual([{ enabled: false }]);
    await waitFor(() => expect(toggle).not.toBeChecked());
    expect(screen.getByText('Apagado')).toBeVisible();
  });

  it('keeps the access on when turning it off is cancelled', async () => {
    server.use(
      http.get(apiUrl('/api/association-access'), () => HttpResponse.json(on)),
    );
    const bodies = recordPut(() => json(off));
    renderWithProviders(<MyProducerPage />);
    await userEvent.click(await findSwitch());
    const dialog = await screen.findByRole('dialog', {
      name: '¿Quitar el acceso de la asociación?',
    });
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancelar' }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await findSwitch()).toBeChecked();
    expect(bodies).toEqual([]);
  });

  it('keeps the previous state and shows the error when the change fails', async () => {
    server.use(
      http.get(apiUrl('/api/association-access'), () => HttpResponse.json(on)),
    );
    recordPut(() =>
      Promise.resolve(
        apiError(500, 'server_error', 'No fue posible guardar el cambio.'),
      ),
    );
    renderWithProviders(<MyProducerPage />);
    await userEvent.click(await findSwitch());
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Quitar acceso' }),
    );
    expect(
      await within(dialog).findByText('No fue posible guardar el cambio.'),
    ).toBeVisible();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancelar' }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await findSwitch()).toBeChecked();
    expect(screen.getByText('Encendido')).toBeVisible();
  });

  it('offers a retry when the state cannot be loaded', async () => {
    let calls = 0;
    server.use(
      http.get(apiUrl('/api/association-access'), () => {
        calls += 1;
        return calls === 1
          ? apiError(500, 'server_error')
          : HttpResponse.json(off);
      }),
    );
    renderWithProviders(<MyProducerPage />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Reintentar' }),
    );
    expect(await findSwitch()).not.toBeChecked();
  });

  it('shows the server message without a retry when the account has no producer', async () => {
    server.use(
      http.get(apiUrl('/api/association-access'), () =>
        apiError(
          404,
          'not_found',
          'Esta cuenta no tiene un productor asociado.',
        ),
      ),
    );
    renderWithProviders(<MyProducerPage />);
    expect(
      await screen.findByText('Esta cuenta no tiene un productor asociado.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Reintentar' }),
    ).not.toBeInTheDocument();
  });
});
