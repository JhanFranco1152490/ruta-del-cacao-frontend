import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildFarm,
  buildPendingEntry,
  buildSession,
  buildStockRow,
  buildStockSummary,
  buildWarehouse,
} from '@/test/factories';
import {
  apiUrl,
  farmsHandler,
  pendingEntryHandler,
  stockListHandler,
  stockSummaryHandler,
  warehousesHandler,
} from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { resetLocation } from '@/test/router';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { stockCacheKey } from '../queries';
import { WarehouseScreen } from './warehouse-screen';

const esperanza = { id: 'f1', code: 'F02', name: 'La Esperanza' };
const diviso = { id: 'f2', code: 'F03', name: 'El Diviso' };

const ALL = [
  PERMISSIONS.WAREHOUSE_VIEW_STOCK,
  PERMISSIONS.WAREHOUSE_REGISTER_ENTRY,
  PERMISSIONS.WAREHOUSE_REGISTER_EXIT,
  PERMISSIONS.WAREHOUSE_MANAGE,
  PERMISSIONS.LOTS_VIEW,
];
// El Comercializador: consulta las existencias, sin la ficha del lote ni acciones.
const VIEW_ONLY = [PERMISSIONS.WAREHOUSE_VIEW_STOCK];

const G1_ROW = buildStockRow();
const G2_ROW = buildStockRow({ grade: 'g2', quantity_kg: '55.2' });

let userId: string;
let stockRequests: URLSearchParams[];
let summaryRequests: URLSearchParams[];

beforeEach(() => {
  userId = `warehouse-screen-${crypto.randomUUID()}`;
  stockRequests = [];
  summaryRequests = [];
  resetLocation();
  server.use(
    farmsHandler([buildFarm({ ...esperanza }), buildFarm({ ...diviso })]),
    stockListHandler([G1_ROW, G2_ROW], stockRequests),
    stockSummaryHandler(
      buildStockSummary({ g1_kg: '250.0', g2_kg: '55.2', lots: 1 }),
      summaryRequests,
    ),
    warehousesHandler([buildWarehouse()]),
    pendingEntryHandler([
      buildPendingEntry({ lot: { id: 'l2', code: 'L-2' } }),
    ]),
  );
});

function renderScreen({
  searchParams = '',
  permissions = ALL,
}: { searchParams?: string; permissions?: string[] } = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, permissions }),
  );
  return renderWithProviders(
    <WarehouseScreen lotHref={(id) => `/lotes/detalle?id=${id}`} />,
    { queryClient, searchParams },
  );
}

const stockRows = async () =>
  within(await screen.findByRole('table', { name: 'Existencias' }))
    .getAllByRole('row')
    .slice(1);

describe('WarehouseScreen', () => {
  it('shows the totals of each grade and the lots in the warehouse', async () => {
    renderScreen();

    const summary = await screen.findByRole('region', {
      name: 'Resumen de bodega',
    });
    await waitFor(() =>
      expect(summary).toHaveTextContent('Total G1 (kg)250,0'),
    );
    expect(summary).toHaveTextContent('Total G2 (kg)55,2');
    expect(summary).toHaveTextContent('Lotes en bodega1');
  });

  it('lists one row per lot and grade, with its kilos and its location', async () => {
    renderScreen();

    const [g1, g2] = await stockRows();
    expect(g1).toHaveTextContent('000123-F02-P05-261014-1');
    expect(g1).toHaveTextContent('F02 · La Esperanza');
    expect(g1).toHaveTextContent('G1');
    expect(g1).toHaveTextContent('250,0 kg');
    expect(g1).toHaveTextContent('Bodega principal');
    expect(g1).toHaveTextContent('Estante 3');
    expect(g2).toHaveTextContent('55,2 kg');
    expect(
      within(g1).getByRole('button', {
        name: 'Registrar salida de G1 del lote 000123-F02-P05-261014-1',
      }),
    ).toBeEnabled();
    expect(
      within(g1).getByRole('link', {
        name: 'Ver el lote 000123-F02-P05-261014-1',
      }),
    ).toHaveAttribute('href', expect.stringMatching(/id=l1/));
  });

  it('sorts by the latest entry and by any column the header offers', async () => {
    renderScreen();
    await stockRows();

    expect(
      screen.getByRole('columnheader', { name: 'Ingreso' }),
    ).toHaveAttribute('aria-sort', 'descending');

    await userEvent.click(screen.getByRole('button', { name: 'Disponible' }));

    await waitFor(() =>
      expect(stockRequests.at(-1)?.get('ordering')).toBe('quantity'),
    );
  });

  it('filters by grade, and the totals follow the filter', async () => {
    renderScreen();
    await stockRows();

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Calibre' }),
      'g2',
    );

    await waitFor(() => expect(stockRequests.at(-1)?.get('grade')).toBe('g2'));
    await waitFor(() =>
      expect(summaryRequests.at(-1)?.get('grade')).toBe('g2'),
    );
  });

  it('says when there is no cacao in the warehouse yet', async () => {
    server.use(stockListHandler([]));
    renderScreen();

    expect(
      await screen.findByRole('heading', {
        name: 'Todavía no hay cacao en bodega.',
      }),
    ).toBeInTheDocument();
  });

  it('offers to clear the filters when nothing matches', async () => {
    server.use(stockListHandler([]));
    renderScreen({ searchParams: '?calibre=g2&ubicacion=Zona%20Z' });

    expect(
      await screen.findByRole('heading', {
        name: 'No hay existencias para este filtro.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'Limpiar filtros' }).length,
    ).toBeGreaterThan(0);
  });

  it('lists the classified lots to store, with what each grade has', async () => {
    renderScreen({ searchParams: '?vista=por-ingresar' });

    const list = await screen.findByRole('list', {
      name: 'Lotes por ingresar',
    });
    const [card] = within(list).getAllByRole('listitem');
    expect(card).toHaveTextContent('L-2');
    expect(card).toHaveTextContent(
      'G1 250,0 kg · G2 55,2 kg · clasificado el 29 oct',
    );
    expect(
      within(card).getByRole('button', {
        name: 'Ingresar a bodega el lote L-2',
      }),
    ).toBeEnabled();
  });

  it('says when there is nothing to store', async () => {
    server.use(pendingEntryHandler([]));
    renderScreen({ searchParams: '?vista=por-ingresar' });

    expect(
      await screen.findByRole('heading', {
        name: 'No hay lotes clasificados por ingresar a bodega.',
      }),
    ).toBeInTheDocument();
  });

  it('lets whom only reads see the stock, without actions nor the lots to store', async () => {
    renderScreen({
      searchParams: '?vista=por-ingresar',
      permissions: VIEW_ONLY,
    });

    const [g1] = await stockRows();
    expect(within(g1).queryByRole('button')).not.toBeInTheDocument();
    expect(within(g1).queryByRole('link')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Por ingresar' }),
    ).not.toBeInTheDocument();
  });

  it('shows the copy without a connection, with the actions disabled', async () => {
    await getOfflineDb(userId).cache.put({
      key: stockCacheKey({
        producer: null,
        farm: null,
        warehouse: null,
        grade: null,
        location: '',
        search: '',
        ordering: null,
      }),
      value: { count: 1, results: [G1_ROW] },
      fetchedAt: 1_760_000_000_000,
    });
    server.use(http.get(apiUrl('/api/stock'), () => HttpResponse.error()));
    renderScreen();

    expect(
      await screen.findByText(/Sin conexión: estás viendo la copia del/),
    ).toHaveTextContent(
      'Necesitas conexión para registrar movimientos de bodega.',
    );
    const [g1] = await stockRows();
    expect(
      within(g1).getByRole('button', { name: /^Registrar salida/ }),
    ).toBeDisabled();
  });

  it('asks for a connection once when there is no copy', async () => {
    server.use(http.get(apiUrl('/api/stock'), () => HttpResponse.error()));
    renderScreen();

    expect(
      await screen.findByRole('heading', {
        name: 'Necesitas conexión una vez para cargar la bodega.',
      }),
    ).toBeInTheDocument();
  });
});
