import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildPage, buildProducer, buildSession } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { PERMISSIONS } from '@/lib/permissions';
import { AccountListScreen } from './account-list-screen';

const producerId = '33333333-3333-4333-8333-333333333333';
const otherId = '55555555-5555-4555-8555-555555555555';
const listItem = (id: string, first_name: string, member_code: string) => ({
  id,
  member_code,
  document_type: 'CC',
  identity_document: '1234567890',
  first_name,
  last_name: 'Prueba',
  municipality_code: '54001',
  status: 'active',
});
const associationPermissions = [
  PERMISSIONS.USERS_VIEW,
  PERMISSIONS.USERS_CREATE,
  PERMISSIONS.PRODUCERS_VIEW,
];

function mockSession(producer_id: string | null, permissions: string[]) {
  server.use(
    http.get(apiUrl('/api/auth/me'), () =>
      HttpResponse.json(buildSession({ producer_id, permissions })),
    ),
  );
}
function mockProducer() {
  server.use(
    http.get(apiUrl(`/api/producers/${producerId}`), () =>
      HttpResponse.json(
        buildProducer({
          id: producerId,
          first_name: 'Ana',
          member_code: 'PROD-000007',
        }),
      ),
    ),
  );
}

beforeEach(() => {
  mockSession(null, associationPermissions);
  server.use(
    http.get(apiUrl('/api/users'), () => HttpResponse.json(buildPage([]))),
    // El combobox de productor está siempre montado (aunque ya haya uno elegido), así que
    // siempre pide esta lista; cada prueba la sobreescribe si le importa la respuesta.
    http.get(apiUrl('/api/producers'), () => HttpResponse.json(buildPage([]))),
  );
});

describe('producer filter of the association', () => {
  it('offers the active producers and selects one through the URL', async () => {
    const requests: URL[] = [];
    const onUrlUpdate = vi.fn();
    server.use(
      http.get(apiUrl('/api/producers'), ({ request }) => {
        requests.push(new URL(request.url));
        return HttpResponse.json(
          buildPage([
            listItem(producerId, 'Ana', 'PROD-000007'),
            listItem(otherId, 'Luis', 'PROD-000008'),
          ]),
        );
      }),
    );
    mockProducer();
    renderWithProviders(<AccountListScreen />, { onUrlUpdate });

    expect(
      await screen.findByRole('button', { name: 'Crear cuenta' }),
    ).toBeVisible();
    const combobox = screen.getByLabelText('Productor');
    await userEvent.click(combobox);
    expect(requests[0]?.searchParams.get('status')).toBe('active');
    await userEvent.click(
      await screen.findByRole('option', { name: 'Ana Prueba · PROD-000007' }),
    );

    expect(onUrlUpdate.mock.lastCall?.[0].searchParams.get('productor')).toBe(
      producerId,
    );
    expect(
      await screen.findByRole('button', { name: 'Crear cuenta' }),
    ).toBeVisible();
    expect(screen.queryByText(producerId)).not.toBeInTheDocument();
  });

  it('searches producers by what the person types', async () => {
    const searches: (string | null)[] = [];
    server.use(
      http.get(apiUrl('/api/producers'), ({ request }) => {
        searches.push(new URL(request.url).searchParams.get('search'));
        return HttpResponse.json(buildPage([]));
      }),
    );
    renderWithProviders(<AccountListScreen />);
    const combobox = await screen.findByLabelText('Productor');
    await userEvent.click(combobox);
    await userEvent.type(combobox, 'PROD-7');
    await waitFor(() => expect(searches.at(-1)).toBe('PROD-7'));
    expect(
      await screen.findByText('Ningún productor coincide con la búsqueda.'),
    ).toBeVisible();
  });

  it('goes back to every producer when the filter is removed', async () => {
    mockProducer();
    renderWithProviders(<AccountListScreen />, {
      searchParams: `?productor=${producerId}`,
    });
    await screen.findByRole('button', { name: 'Crear cuenta' });
    await userEvent.click(screen.getByRole('button', { name: 'Borrar' }));
    expect(
      await screen.findByRole('button', { name: 'Crear cuenta' }),
    ).toBeVisible();
  });

  it('switches directly to another producer without clearing the filter first', async () => {
    const onUrlUpdate = vi.fn();
    server.use(
      http.get(apiUrl('/api/producers'), () =>
        HttpResponse.json(
          buildPage([listItem(otherId, 'Luis', 'PROD-000008')]),
        ),
      ),
    );
    mockProducer();
    renderWithProviders(<AccountListScreen />, {
      searchParams: `?productor=${producerId}`,
      onUrlUpdate,
    });
    const combobox = await screen.findByLabelText('Productor');
    await userEvent.click(combobox);
    await userEvent.click(
      await screen.findByRole('option', { name: 'Luis Prueba · PROD-000008' }),
    );

    expect(onUrlUpdate.mock.lastCall?.[0].searchParams.get('productor')).toBe(
      otherId,
    );
  });

  it('is not offered inside the space of a producer', async () => {
    mockSession(producerId, associationPermissions);
    renderWithProviders(<AccountListScreen />);
    expect(
      await screen.findByRole('button', { name: 'Crear cuenta de empleado' }),
    ).toBeVisible();
    expect(screen.queryByLabelText('Productor')).not.toBeInTheDocument();
  });
});
