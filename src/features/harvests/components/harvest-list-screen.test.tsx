import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { PERMISSIONS } from '@/lib/permissions';
import { apiError, buildHarvest, buildSession } from '@/test/factories';
import { apiUrl, harvestsHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { resetLocation } from '@/test/router';
import { server } from '@/test/server';

import { enqueueHarvest } from '../harvest-queue';
vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { HarvestListScreen } from './harvest-list-screen';

// Jueves 22 de octubre de 2026, a mediodía en Bogotá.
const NOW = new Date('2026-10-22T17:00:00Z');

const ccn = buildHarvest({
  id: 'h1',
  harvest_date: '2026-10-14',
  green_weight_kg: '120.5',
  lot: { id: 'l1', code: '000123-F02-P05-261014-1', status: 'generated' },
});
const ics = buildHarvest({
  id: 'h2',
  harvest_date: '2026-10-20',
  green_weight_kg: '80.3',
  variety: { id: 'v2', name: 'ICS-95', is_active: true },
  collector: { id: 'u2', full_name: 'Luis Rincón', is_active: true },
});

let userId: string;
let urls: string[];
let requests: URLSearchParams[];

beforeEach(() => {
  userId = `harvest-list-${crypto.randomUUID()}`;
  urls = [];
  requests = [];
  resetLocation();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  server.use(harvestsHandler([ics, ccn], requests));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function renderScreen({
  searchParams = '',
  permissions = [PERMISSIONS.HARVESTS_VIEW, PERMISSIONS.HARVESTS_ADD],
  renderFormLot,
}: {
  searchParams?: string;
  permissions?: string[];
  renderFormLot?: NonNullable<
    Parameters<typeof HarvestListScreen>[0]
  >['renderFormLot'];
} = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, permissions }),
  );
  renderWithProviders(<HarvestListScreen renderFormLot={renderFormLot} />, {
    queryClient,
    searchParams,
    onUrlUpdate: ({ queryString }) => urls.push(queryString),
  });
}

const table = () => screen.findByRole('table', { name: 'Cosechas del mes' });
const rowTexts = async () =>
  within(await table())
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.textContent);

describe('HarvestListScreen', () => {
  it('lists the harvests of the current month with their totals', async () => {
    renderScreen();

    expect(await rowTexts()).toEqual([
      expect.stringContaining('ICS-95'),
      expect.stringContaining('000123-F02-P05-261014-1'),
    ]);
    expect(requests[0].toString()).toBe('from=2026-10-01&to=2026-10-31');
    const totals = screen.getByRole('region', { name: 'Totales del mes' });
    expect(totals).toHaveTextContent('200,8 kg en verde');
    expect(totals).toHaveTextContent('2 recolecciones');
    expect(totals).toHaveTextContent('1 cosecha · 80,3 kg');
    expect(
      screen.getAllByRole('link', { name: /Ver la cosecha de P05/ })[0],
    ).toHaveAttribute('href', '/cosechas/detalle?id=h2');
  });

  it('goes to another month and writes it in the address', async () => {
    renderScreen();
    await table();

    await userEvent.click(screen.getByRole('button', { name: 'Mes anterior' }));

    await waitFor(() => expect(urls.at(-1)).toBe('?mes=2026-09'));
    expect(
      await screen.findByRole('heading', { name: 'septiembre de 2026' }),
    ).toBeInTheDocument();
    expect(requests.map(String)).toContain('from=2026-09-01&to=2026-09-30');
  });

  it('filters by what the address says, and the totals follow', async () => {
    renderScreen({ searchParams: '?variedad=v2' });

    expect(await rowTexts()).toEqual([expect.stringContaining('ICS-95')]);
    expect(
      screen.getByRole('region', { name: 'Totales del mes' }),
    ).toHaveTextContent('80,3 kg en verde');
  });

  it('says when no harvest matches the filters, and clears them', async () => {
    renderScreen({ searchParams: '?lote=con&recolector=u2' });

    expect(
      await screen.findByText('No se encontraron cosechas'),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getAllByRole('button', { name: 'Limpiar filtros' })[0],
    );

    await waitFor(() => expect(urls.at(-1)).toBe(''));
  });

  it('says when the month has no harvests and offers to register one', async () => {
    server.use(harvestsHandler([]));
    renderScreen();

    expect(
      await screen.findByText('No hay cosechas en octubre de 2026'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: 'Registrar cosecha' })[0],
    ).toHaveAttribute('href', expect.stringContaining('/cosechas/registrar'));
  });

  it('does not offer to register without the permission', async () => {
    renderScreen({ permissions: [PERMISSIONS.HARVESTS_VIEW] });

    await table();
    expect(
      screen.queryByRole('link', { name: 'Registrar cosecha' }),
    ).not.toBeInTheDocument();
  });

  it('shows what waits in the phone on its date', async () => {
    await enqueueHarvest(userId, {
      request: {
        id: 'q1',
        plot_id: 'pl1',
        harvest_date: '2026-10-22',
        green_weight_kg: '88',
        variety_id: 'v1',
        collector_id: 'u1',
      },
      label: 'P05 · Lote del río · 22 oct.',
    });
    renderScreen();

    await waitFor(async () =>
      expect((await rowTexts())[0]).toContain('Pendiente de enviar'),
    );
    expect(
      screen.getByRole('region', { name: 'Totales del mes' }),
    ).toHaveTextContent('Y 1 más espera en este teléfono.');
  });

  it('offers to form a lot only on the rows from the server without one', async () => {
    await enqueueHarvest(userId, {
      request: {
        id: 'q1',
        plot_id: 'pl1',
        harvest_date: '2026-10-22',
        green_weight_kg: '88',
        variety_id: 'v1',
        collector_id: 'u1',
      },
      label: 'P05 · Lote del río · 22 oct.',
    });
    renderScreen({
      renderFormLot: ({ harvestId }) => (
        <button type="button">{`Conformar lote ${harvestId}`}</button>
      ),
    });

    await waitFor(async () => expect(await rowTexts()).toHaveLength(3));
    expect(
      screen
        .getAllByRole('button', { name: /Conformar lote/ })
        .map((button) => button.textContent),
    ).toEqual(['Conformar lote h2']);
  });

  it('shows the saved copy of the month without a network', async () => {
    await getOfflineDb(userId).cache.put({
      key: 'harvests:2026-10',
      value: [ccn],
      fetchedAt: 1_700_000_000_000,
    });
    server.use(http.get(apiUrl('/api/harvests'), () => HttpResponse.error()));
    renderScreen();

    expect(
      await screen.findByText(/Sin conexión: estás viendo la última copia/),
    ).toBeInTheDocument();
    expect(await rowTexts()).toHaveLength(1);
  });

  it('asks for a connection for a month that was never saved', async () => {
    server.use(http.get(apiUrl('/api/harvests'), () => HttpResponse.error()));
    renderScreen();

    expect(
      await screen.findByText('Este mes no está guardado en el teléfono.'),
    ).toBeInTheDocument();
  });

  it('shows an error of the api', async () => {
    server.use(
      http.get(apiUrl('/api/harvests'), () =>
        apiError(403, 'permission_denied', 'No tienes permiso.'),
      ),
    );
    renderScreen();

    expect(
      await screen.findByText('No fue posible cargar las cosechas.'),
    ).toBeInTheDocument();
  });
});
