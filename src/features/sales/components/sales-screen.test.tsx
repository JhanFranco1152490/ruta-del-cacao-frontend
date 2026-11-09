import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildBuyerOption,
  buildFarm,
  buildSaleListItem,
  buildSaleSummary,
  buildSession,
} from '@/test/factories';
import {
  apiUrl,
  buyerOptionsHandler,
  farmsHandler,
  salesHandler,
  saleSummaryHandler,
} from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { mockLocation, resetLocation, router } from '@/test/router';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { salesCacheKey } from '../queries';
import { SalesScreen } from './sales-screen';

const NOVEMBER = '?mes=2026-11';

const ALL = [
  PERMISSIONS.SALES_VIEW,
  PERMISSIONS.SALES_ADD,
  PERMISSIONS.SALES_VOID,
];

const REGISTERED = buildSaleListItem();
const VOIDED = buildSaleListItem({
  id: 's2',
  code: 'V-0002',
  sale_date: '2026-11-18',
  buyer: {
    id: 'b2',
    name: 'Cooperativa Cacaotera del Catatumbo',
    buyer_type: 'cooperative',
    is_active: true,
  },
  g1_kg: '10.0',
  g2_kg: '0.0',
  total: 185000,
  status: 'voided',
  invoice: {
    file_name: 'factura.pdf',
    content_type: 'application/pdf',
    size: 1000,
    uploaded_at: '2026-11-18T15:00:00Z',
  },
});

let userId: string;
let salesRequests: URLSearchParams[];
let summaryRequests: URLSearchParams[];

afterEach(() => vi.restoreAllMocks());

beforeEach(() => {
  userId = `sales-screen-${crypto.randomUUID()}`;
  salesRequests = [];
  summaryRequests = [];
  resetLocation();
  mockLocation.path = '/ventas';
  mockLocation.search = NOVEMBER;
  router.push.mockClear();
  server.use(
    farmsHandler([buildFarm({ id: 'f1', code: 'F02', name: 'La Esperanza' })]),
    salesHandler([REGISTERED, VOIDED], salesRequests),
    saleSummaryHandler(buildSaleSummary(), summaryRequests),
    buyerOptionsHandler([buildBuyerOption()]),
  );
});

function renderScreen({
  searchParams = NOVEMBER,
  permissions = ALL,
  superuser = false,
}: {
  searchParams?: string;
  permissions?: string[];
  superuser?: boolean;
} = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, permissions, is_superuser: superuser }),
  );
  return renderWithProviders(<SalesScreen />, { queryClient, searchParams });
}

const saleRows = async () =>
  within(await screen.findByRole('table', { name: 'Ventas' }))
    .getAllByRole('row')
    .slice(1);

describe('SalesScreen', () => {
  it('shows what was sold in the month, without the voided sales', async () => {
    renderScreen();

    const summary = await screen.findByRole('region', {
      name: 'Resumen de ventas',
    });
    await waitFor(() =>
      expect(summary).toHaveTextContent('Valor vendido$ 3.375.000'),
    );
    expect(summary).toHaveTextContent('Kg de G1150,0');
    expect(summary).toHaveTextContent('Kg de G240,0');
    expect(summary).toHaveTextContent('Ventas1');
    expect(summaryRequests[0].toString()).toBe('from=2026-11-01&to=2026-11-30');
  });

  it('asks for the registered sales of the month', async () => {
    renderScreen();

    await saleRows();
    expect(salesRequests[0].toString()).toBe(
      'from=2026-11-01&to=2026-11-30&status=registered',
    );
    expect(
      screen.getByRole('heading', { name: 'noviembre de 2026' }),
    ).toBeInTheDocument();
  });

  it('shows each sale with its buyer, kilos, value, invoice and status', async () => {
    renderScreen();

    const [first, second] = await saleRows();
    expect(first).toHaveTextContent('V-0001');
    expect(first).toHaveTextContent('Chocolates del Oriente S.A.S.');
    expect(first).toHaveTextContent('Industria chocolatera');
    expect(first).toHaveTextContent('F02 · La Esperanza');
    expect(first).toHaveTextContent('150,0 kg');
    expect(first).toHaveTextContent('$ 3.375.000');
    expect(first).toHaveTextContent('Registrada');
    expect(first).not.toHaveTextContent('Con soporte de la factura');
    expect(second).toHaveTextContent('Anulada');
    expect(second).toHaveTextContent('Con soporte de la factura');
  });

  it('opens the detail of a sale, remembering the list', async () => {
    renderScreen();

    const [first] = await saleRows();
    expect(within(first).getByRole('link', { name: 'V-0001' })).toHaveAttribute(
      'href',
      `/ventas/detalle?id=s1&origen=${encodeURIComponent('/ventas?mes=2026-11')}`,
    );
  });

  it('opens the form on the chosen farm, remembering the list', async () => {
    const user = userEvent.setup();
    mockLocation.search = '?mes=2026-11&finca=f1';
    renderScreen({ searchParams: '?mes=2026-11&finca=f1' });

    await user.click(
      await screen.findByRole('button', { name: 'Registrar venta' }),
    );

    expect(router.push).toHaveBeenCalledWith(
      `/ventas/registrar?finca=f1&origen=${encodeURIComponent('/ventas?mes=2026-11&finca=f1')}`,
    );
  });

  it('does not offer to register to whoever only consults', async () => {
    renderScreen({ permissions: [PERMISSIONS.SALES_VIEW] });

    await saleRows();
    expect(
      screen.queryByRole('button', { name: 'Registrar venta' }),
    ).not.toBeInTheDocument();
  });

  it('says there are no sales in the month, and offers to register one', async () => {
    server.use(salesHandler([]));
    renderScreen();

    expect(
      await screen.findByRole('heading', {
        name: 'No hay ventas registradas en noviembre de 2026.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'Registrar venta' }),
    ).toHaveLength(2);
  });

  it('lets clear the filters when nothing matches', async () => {
    const user = userEvent.setup();
    server.use(salesHandler([], salesRequests));
    renderScreen({ searchParams: `${NOVEMBER}&estado=voided` });

    expect(
      await screen.findByRole('heading', { name: 'No se encontraron ventas.' }),
    ).toBeInTheDocument();
    await user.click(
      screen.getAllByRole('button', { name: 'Limpiar filtros' }).at(-1)!,
    );

    await waitFor(() =>
      expect(salesRequests.at(-1)?.get('status')).toBe('registered'),
    );
  });

  it('shows the copy without a connection, with registering disabled', async () => {
    await getOfflineDb(userId).cache.put({
      key: salesCacheKey({
        producer: null,
        from: '2026-11-01',
        to: '2026-11-30',
        farm: null,
        buyer: null,
        status: 'registered',
        search: '',
      }),
      value: { count: 1, next: null, previous: null, results: [REGISTERED] },
      fetchedAt: 1_760_000_000_000,
    });
    server.use(http.get(apiUrl('/api/sales'), () => HttpResponse.error()));
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderScreen();

    expect(
      await screen.findByText(/Sin conexión: estás viendo la copia del/),
    ).toHaveTextContent('Necesitas conexión para registrar o cambiar ventas.');
    expect(await saleRows()).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: 'Registrar venta' }),
    ).toBeDisabled();
    expect(screen.queryByRole('navigation', { name: /ventas/i })).toBeNull();
  });

  it('asks for a connection once when there is no copy', async () => {
    server.use(http.get(apiUrl('/api/sales'), () => HttpResponse.error()));
    renderScreen();

    expect(
      await screen.findByRole('heading', {
        name: 'Necesitas conexión una vez para cargar las ventas.',
      }),
    ).toBeInTheDocument();
  });

  it('asks the technical account to choose a producer first', async () => {
    renderScreen({ superuser: true });

    expect(
      await screen.findByText('Elige un productor para ver sus ventas.'),
    ).toBeInTheDocument();
    expect(salesRequests).toEqual([]);
  });
});
