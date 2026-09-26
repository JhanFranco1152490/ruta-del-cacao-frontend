import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { apiError, buildProducer } from '@/test/factories';
import { apiUrl, municipalitiesHandler } from '@/test/handlers';
import { expectVisibleFocusOutline } from '@/test/focus-outline';
import { renderWithProviders } from '@/test/render';
import { router } from '@/test/router';
import { server } from '@/test/server';

import type { Producer } from '../api';
import { ProducerDetailScreen } from './producer-detail-screen';

vi.mock('next/navigation', () => ({ useRouter: () => router }));

const PRODUCER = apiUrl('/api/producers/p1');
const STATUS = apiUrl('/api/producers/p1/status');
const STALE_DETAIL =
  'La ficha fue modificada por otra persona. Recarga antes de guardar.';

let statusBodies: unknown[] = [];

function producerHandler(overrides: Partial<Producer> = {}) {
  return http.get(PRODUCER, () => HttpResponse.json(buildProducer(overrides)));
}

function statusHandler(
  response: (body: unknown) => Response | Promise<Response>,
) {
  return http.patch(STATUS, async ({ request }) => {
    const body = await request.json();
    statusBodies.push(body);
    return response(body);
  });
}

async function openDialog(name: 'Desactivar' | 'Reactivar') {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name }));
  return { user, dialog: await screen.findByRole('dialog') };
}

beforeEach(() => {
  vi.clearAllMocks();
  statusBodies = [];
  server.use(municipalitiesHandler(), producerHandler());
});

describe('ProducerDetailScreen', () => {
  it('shows the record with the sensitive data masked', async () => {
    server.use(
      producerHandler({
        phone: '3001234567',
        email: 'ana.prueba@example.com',
      }),
    );
    renderWithProviders(<ProducerDetailScreen id="p1" />);

    expect(
      await screen.findByRole('heading', { name: 'Ana Prueba' }),
    ).toBeInTheDocument();
    expect(screen.getByText('CC ••••7890')).toBeInTheDocument();
    expect(screen.getByText('••••4567')).toBeInTheDocument();
    expect(screen.getByText('••••.com')).toBeInTheDocument();
    expect(screen.queryByText(/1234567890/)).not.toBeInTheDocument();
    expect(screen.queryByText(/3001234567/)).not.toBeInTheDocument();
    expect(screen.queryByText(/ana\.prueba/)).not.toBeInTheDocument();
    expect(screen.getByText('Productor activo')).toBeInTheDocument();
  });

  it('shows the municipality name (not its code) and the long date', async () => {
    renderWithProviders(<ProducerDetailScreen id="p1" />);

    expect(await screen.findByText('Cúcuta')).toBeInTheDocument();
    expect(screen.queryByText('54001')).not.toBeInTheDocument();
    expect(screen.getByText('15 de marzo de 2026')).toBeInTheDocument();
    expect(
      screen.getByText('Código de asociado: PROD-000001'),
    ).toBeInTheDocument();
  });

  it('stacks the header until wide screens, where two actions fit next to the title', async () => {
    renderWithProviders(<ProducerDetailScreen id="p1" />);

    const header = (await screen.findByRole('heading', { name: 'Ana Prueba' }))
      .parentElement!.parentElement!;
    expect(header).toHaveClass('mt-5', 'sm:flex-col', 'lg:flex-row');
    expect(header).not.toHaveClass('mt-4');
    expect(header).not.toHaveClass('sm:flex-row');
  });

  it('keeps showing the record when a background refresh fails', async () => {
    let failing = false;
    server.use(
      http.get(PRODUCER, () =>
        failing
          ? apiError(500, 'internal_error', 'Falla interna.')
          : HttpResponse.json(buildProducer()),
      ),
    );
    const { queryClient } = renderWithProviders(
      <ProducerDetailScreen id="p1" />,
    );
    await screen.findByRole('heading', { name: 'Ana Prueba' });

    failing = true;
    await act(async () => {
      await queryClient.refetchQueries({
        queryKey: queryKeys.producers.detail('p1'),
      });
      // TanStack Query avisa a React en el siguiente tick.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(
      queryClient.getQueryState(queryKeys.producers.detail('p1'))?.status,
    ).toBe('error');
    expect(
      screen.getByRole('heading', { name: 'Ana Prueba' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('says "Sin registrar" when the phone and the email are missing', async () => {
    renderWithProviders(<ProducerDetailScreen id="p1" />);

    expect(await screen.findAllByText('Sin registrar')).toHaveLength(2);
  });

  it('masks values of 4 characters or fewer completely', async () => {
    server.use(producerHandler({ phone: '1234' }));
    renderWithProviders(<ProducerDetailScreen id="p1" />);

    expect(await screen.findByText('••••')).toBeInTheDocument();
    expect(screen.queryByText(/1234$/)).not.toBeInTheDocument();
  });

  it('links to the edit screen', async () => {
    renderWithProviders(<ProducerDetailScreen id="p1" />);

    expect(
      await screen.findByRole('link', { name: /Editar datos/ }),
    ).toHaveAttribute('href', '/productores/p1/editar');
  });

  it('keeps the visible focus outline on the edit link', async () => {
    renderWithProviders(<ProducerDetailScreen id="p1" />);

    expectVisibleFocusOutline(
      await screen.findByRole('link', { name: /Editar datos/ }),
    );
  });

  it('shows the error when the record cannot be loaded', async () => {
    server.use(
      http.get(PRODUCER, () =>
        apiError(404, 'not_found', 'El productor no existe.'),
      ),
    );
    renderWithProviders(<ProducerDetailScreen id="p1" />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El productor no existe.',
    );
    expect(
      screen.getByRole('link', { name: 'Volver a productores' }),
    ).toHaveAttribute('href', '/productores');
  });

  it('shows a generic message when the record fails to load without a server reply', async () => {
    server.use(http.get(PRODUCER, () => HttpResponse.error()));
    renderWithProviders(<ProducerDetailScreen id="p1" />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible cargar la ficha del productor.',
    );
  });
});

describe('ProducerDetailScreen - deactivation', () => {
  it('deactivates the producer after confirming', async () => {
    server.use(
      statusHandler(() =>
        HttpResponse.json(buildProducer({ status: 'inactive', version: 4 })),
      ),
    );
    renderWithProviders(<ProducerDetailScreen id="p1" />);

    const { user, dialog } = await openDialog('Desactivar');
    expect(
      within(dialog).getByText('¿Desactivar productor?'),
    ).toBeInTheDocument();
    expect(statusBodies).toEqual([]);

    await user.click(
      within(dialog).getByRole('button', { name: 'Desactivar productor' }),
    );

    expect(await screen.findByText('Productor inactivo')).toBeInTheDocument();
    expect(statusBodies).toEqual([{ status: 'inactive', expected_version: 3 }]);
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole('button', { name: 'Desactivar' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reactivar' }),
    ).toBeInTheDocument();
  });

  it('sends nothing when the confirmation is cancelled', async () => {
    server.use(statusHandler(() => HttpResponse.json(buildProducer())));
    renderWithProviders(<ProducerDetailScreen id="p1" />);

    const { user, dialog } = await openDialog('Desactivar');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(statusBodies).toEqual([]);
    expect(screen.getByText('Productor activo')).toBeInTheDocument();
  });

  it('shows the server error in the dialog when the request fails', async () => {
    server.use(
      statusHandler(() =>
        apiError(500, 'internal_error', 'Ocurrió un error interno.'),
      ),
    );
    renderWithProviders(<ProducerDetailScreen id="p1" />);

    const { user, dialog } = await openDialog('Desactivar');
    await user.click(
      within(dialog).getByRole('button', { name: 'Desactivar productor' }),
    );

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Ocurrió un error interno.',
    );
    expect(screen.getByText('Productor activo')).toBeInTheDocument();
  });

  it('shows a generic message in the dialog when there is no connection', async () => {
    server.use(http.patch(STATUS, () => HttpResponse.error()));
    renderWithProviders(<ProducerDetailScreen id="p1" />);

    const { user, dialog } = await openDialog('Desactivar');
    await user.click(
      within(dialog).getByRole('button', { name: 'Desactivar productor' }),
    );

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'No fue posible cambiar el estado del productor. Revisa tu conexión e inténtalo de nuevo.',
    );
  });

  it('keeps the dialog open with the server message on a stale version', async () => {
    server.use(
      statusHandler(() => apiError(409, 'stale_version', STALE_DETAIL)),
    );
    renderWithProviders(<ProducerDetailScreen id="p1" />);

    const { user, dialog } = await openDialog('Desactivar');
    await user.click(
      within(dialog).getByRole('button', { name: 'Desactivar productor' }),
    );

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      STALE_DETAIL,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Productor activo')).toBeInTheDocument();
    expect(screen.queryByText('Productor inactivo')).not.toBeInTheDocument();
  });

  it('clears the error when the dialog is closed and opened again', async () => {
    server.use(
      statusHandler(() => apiError(409, 'stale_version', STALE_DETAIL)),
    );
    renderWithProviders(<ProducerDetailScreen id="p1" />);

    const { user, dialog } = await openDialog('Desactivar');
    await user.click(
      within(dialog).getByRole('button', { name: 'Desactivar productor' }),
    );
    await within(dialog).findByRole('alert');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: 'Desactivar' }));

    const reopened = await screen.findByRole('dialog');
    expect(within(reopened).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('disables the confirm button while the request is in flight (no double submit)', async () => {
    server.use(
      statusHandler(async () => {
        await delay(100);
        return HttpResponse.json(
          buildProducer({ status: 'inactive', version: 4 }),
        );
      }),
    );
    renderWithProviders(<ProducerDetailScreen id="p1" />);

    const { user, dialog } = await openDialog('Desactivar');
    await user.click(
      within(dialog).getByRole('button', { name: 'Desactivar productor' }),
    );

    const pending = await within(dialog).findByRole('button', {
      name: 'Desactivando…',
    });
    expect(pending).toBeDisabled();
    expect(
      within(dialog).getByRole('button', { name: 'Cancelar' }),
    ).toBeDisabled();
    await user.click(pending);

    expect(await screen.findByText('Productor inactivo')).toBeInTheDocument();
    expect(statusBodies).toHaveLength(1);
  });
});

describe('ProducerDetailScreen - reactivation', () => {
  beforeEach(() => {
    server.use(producerHandler({ status: 'inactive', version: 4 }));
  });

  it('offers reactivating an inactive producer and not deactivating', async () => {
    renderWithProviders(<ProducerDetailScreen id="p1" />);

    expect(
      await screen.findByRole('button', { name: 'Reactivar' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Productor inactivo')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Desactivar' }),
    ).not.toBeInTheDocument();
  });

  it('does not offer reactivating an active producer', async () => {
    server.use(producerHandler());
    renderWithProviders(<ProducerDetailScreen id="p1" />);

    await screen.findByRole('button', { name: 'Desactivar' });
    expect(
      screen.queryByRole('button', { name: 'Reactivar' }),
    ).not.toBeInTheDocument();
  });

  it('reactivates the producer after confirming', async () => {
    server.use(
      statusHandler(() =>
        HttpResponse.json(buildProducer({ status: 'active', version: 5 })),
      ),
    );
    renderWithProviders(<ProducerDetailScreen id="p1" />);

    const { user, dialog } = await openDialog('Reactivar');
    expect(
      within(dialog).getByText('¿Reactivar productor?'),
    ).toBeInTheDocument();
    expect(statusBodies).toEqual([]);

    await user.click(
      within(dialog).getByRole('button', { name: 'Reactivar productor' }),
    );

    expect(await screen.findByText('Productor activo')).toBeInTheDocument();
    expect(statusBodies).toEqual([{ status: 'active', expected_version: 4 }]);
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole('button', { name: 'Reactivar' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Desactivar' }),
    ).toBeInTheDocument();
  });

  it('sends nothing when the reactivation is cancelled', async () => {
    renderWithProviders(<ProducerDetailScreen id="p1" />);

    const { user, dialog } = await openDialog('Reactivar');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(statusBodies).toEqual([]);
    expect(screen.getByText('Productor inactivo')).toBeInTheDocument();
  });

  it('shows the server error when the reactivation fails', async () => {
    server.use(
      statusHandler(() => apiError(409, 'stale_version', STALE_DETAIL)),
    );
    renderWithProviders(<ProducerDetailScreen id="p1" />);

    const { user, dialog } = await openDialog('Reactivar');
    await user.click(
      within(dialog).getByRole('button', { name: 'Reactivar productor' }),
    );

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      STALE_DETAIL,
    );
    expect(screen.getByText('Productor inactivo')).toBeInTheDocument();
  });
});
