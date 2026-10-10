import { onlineManager } from '@tanstack/react-query';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PERMISSIONS } from '@/lib/permissions';
import {
  apiError,
  buildFarm,
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

const PRODUCER = apiUrl('/api/producers/p1');
const STATUS = apiUrl('/api/producers/p1/status');

type DeleteRequest = { version: string | null; body: string };
let deletes: DeleteRequest[] = [];

function signIn(permissions: string[]) {
  server.use(
    http.get(apiUrl('/api/auth/me'), () =>
      HttpResponse.json(buildSession({ permissions, producer_id: null })),
    ),
  );
}

function dependents({
  farms = ['La Esperanza', 'El Roble'],
  accounts = 1,
  inputs = 0,
} = {}) {
  server.use(
    http.get(apiUrl('/api/farms'), () =>
      HttpResponse.json(
        buildPage(farms.map((name, i) => buildFarm({ id: `f${i}`, name }))),
      ),
    ),
    http.get(apiUrl('/api/users'), () =>
      HttpResponse.json(buildPage([], accounts)),
    ),
    http.get(apiUrl('/api/agricultural-inputs'), () =>
      HttpResponse.json({
        results: Array.from({ length: inputs }, (_, i) => ({ id: `i${i}` })),
      }),
    ),
  );
}

function deleteHandler(
  respond: () => Response = () => new HttpResponse(null, { status: 204 }),
) {
  server.use(
    http.delete(PRODUCER, async ({ request }) => {
      deletes.push({
        version: new URL(request.url).searchParams.get('expected_version'),
        body: await request.text(),
      });
      return respond();
    }),
  );
}

function producerHandler(overrides: Partial<Producer> = {}) {
  server.use(
    http.get(PRODUCER, () => HttpResponse.json(buildProducer(overrides))),
  );
}

async function openDeleteDialog() {
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole('button', { name: 'Eliminar productor' }),
  );
  return { user, dialog: await screen.findByRole('dialog') };
}

beforeEach(() => {
  vi.clearAllMocks();
  deletes = [];
  server.use(municipalitiesHandler());
  producerHandler({ version: 5 });
  signIn([PERMISSIONS.PRODUCERS_VIEW, PERMISSIONS.PRODUCERS_DELETE]);
  dependents();
});

describe('deleting a producer from the record', () => {
  it('counts the inputs of the catalog that go with the producer', async () => {
    dependents({ inputs: 3 });
    renderWithProviders(<ProducerDetailScreen id="p1" />);

    const { dialog } = await openDeleteDialog();

    expect(await within(dialog).findByText('3 insumos')).toBeInTheDocument();
  });

  it('says there are no inputs, and uses the singular for one', async () => {
    dependents({ inputs: 0 });
    renderWithProviders(<ProducerDetailScreen id="p1" />);
    const first = await openDeleteDialog();
    expect(
      await within(first.dialog).findByText('Ningún insumo'),
    ).toBeInTheDocument();
    cleanup();

    dependents({ inputs: 1 });
    renderWithProviders(<ProducerDetailScreen id="p1" />);
    const second = await openDeleteDialog();
    expect(
      await within(second.dialog).findByText('1 insumo'),
    ).toBeInTheDocument();
  });

  it('still lists the rest when the catalog cannot be read', async () => {
    server.use(
      http.get(apiUrl('/api/agricultural-inputs'), () =>
        apiError(403, 'permission_denied'),
      ),
    );
    renderWithProviders(<ProducerDetailScreen id="p1" />);

    const { dialog } = await openDeleteDialog();

    expect(await within(dialog).findByText('2 fincas')).toBeInTheDocument();
    expect(within(dialog).queryByText(/insumo/i)).not.toBeInTheDocument();
  });

  it('offers it only with the permission', async () => {
    signIn([PERMISSIONS.PRODUCERS_VIEW]);
    renderWithProviders(<ProducerDetailScreen id="p1" />);

    await screen.findByRole('heading', { name: 'Ana Prueba' });
    expect(
      screen.queryByRole('button', { name: 'Eliminar productor' }),
    ).not.toBeInTheDocument();
  });

  it('lists the farms and counts the accounts that go with the producer', async () => {
    dependents({ farms: ['La Esperanza', 'El Roble'], accounts: 2 });
    renderWithProviders(<ProducerDetailScreen id="p1" />);

    const { dialog } = await openDeleteDialog();

    expect(
      within(dialog).getByRole('heading', {
        name: '¿Eliminar al productor Ana Prueba?',
      }),
    ).toBeInTheDocument();
    expect(await within(dialog).findByText('La Esperanza')).toBeInTheDocument();
    expect(within(dialog).getByText('El Roble')).toBeInTheDocument();
    expect(within(dialog).getByText(/2 cuentas/)).toBeInTheDocument();
  });

  it('deletes with the version it read and goes back to the list', async () => {
    deleteHandler();
    renderWithProviders(<ProducerDetailScreen id="p1" />);
    const { user, dialog } = await openDeleteDialog();

    await user.click(
      within(dialog).getByRole('button', { name: 'Eliminar productor' }),
    );

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith('/productores'),
    );
    expect(deletes).toEqual([{ version: '5', body: '' }]);
  });

  it('explains why it cannot and offers to deactivate when something is important', async () => {
    deleteHandler(() =>
      apiError(
        409,
        'producer_has_records',
        'El productor tiene registros asociados. Desactívalo en lugar de eliminarlo. 1 cuenta ya inició sesión.',
      ),
    );
    const patches: unknown[] = [];
    server.use(
      http.patch(STATUS, async ({ request }) => {
        patches.push(await request.json());
        return HttpResponse.json(
          buildProducer({ version: 6, status: 'inactive' }),
        );
      }),
    );
    renderWithProviders(<ProducerDetailScreen id="p1" />);
    const { user, dialog } = await openDeleteDialog();

    await user.click(
      within(dialog).getByRole('button', { name: 'Eliminar productor' }),
    );

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      '1 cuenta ya inició sesión',
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Desactivar productor' }),
    );
    await waitFor(() =>
      expect(patches).toEqual([{ status: 'inactive', expected_version: 5 }]),
    );
    expect(router.push).not.toHaveBeenCalled();
  });

  it('only explains when the producer is already inactive', async () => {
    producerHandler({ version: 5, status: 'inactive' });
    deleteHandler(() =>
      apiError(409, 'producer_has_records', 'Tiene registros asociados.'),
    );
    renderWithProviders(<ProducerDetailScreen id="p1" />);
    const { user, dialog } = await openDeleteDialog();

    await user.click(
      within(dialog).getByRole('button', { name: 'Eliminar productor' }),
    );

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Tiene registros asociados.',
    );
    expect(
      within(dialog).queryByRole('button', { name: 'Desactivar productor' }),
    ).not.toBeInTheDocument();
  });

  it('asks to reopen the record when someone changed it meanwhile', async () => {
    deleteHandler(() => apiError(409, 'stale_version', 'Versión obsoleta.'));
    renderWithProviders(<ProducerDetailScreen id="p1" />);
    const { user, dialog } = await openDeleteDialog();

    await user.click(
      within(dialog).getByRole('button', { name: 'Eliminar productor' }),
    );

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Vuelve a abrir la ficha',
    );
  });

  it('says it needs a connection instead of waiting, and never deletes later on its own', async () => {
    deleteHandler(() => HttpResponse.error());
    renderWithProviders(<ProducerDetailScreen id="p1" />);
    const { user, dialog } = await openDeleteDialog();
    onlineManager.setOnline(false);
    try {
      await user.click(
        within(dialog).getByRole('button', { name: 'Eliminar productor' }),
      );

      expect(await within(dialog).findByRole('alert')).toHaveTextContent(
        'Revisa tu conexión',
      );
    } finally {
      cleanup();
      onlineManager.setOnline(true);
    }
    // Se intentó una sola vez: al volver la red no queda nada en espera que borre al productor.
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(deletes).toHaveLength(1);
  });
});
