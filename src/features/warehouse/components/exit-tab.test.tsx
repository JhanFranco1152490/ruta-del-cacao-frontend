import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildExitSummary,
  buildFarm,
  buildSession,
  buildStockExitRow,
  buildStockSummary,
  buildWarehouse,
} from '@/test/factories';
import {
  exitListHandler,
  exitSummaryHandler,
  farmsHandler,
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

import { WarehouseScreen } from './warehouse-screen';

const ALL = [
  PERMISSIONS.WAREHOUSE_VIEW_STOCK,
  PERMISSIONS.WAREHOUSE_REGISTER_ENTRY,
  PERMISSIONS.WAREHOUSE_REGISTER_EXIT,
  PERMISSIONS.LOTS_VIEW,
];

const SAMPLE = buildStockExitRow();
const VOIDED = buildStockExitRow({
  id: 'e2',
  grade: 'g2',
  quantity_kg: '1.5',
  reason: 'shrinkage',
  voided: {
    voided_at: '2026-11-01T08:00:00-05:00',
    voided_by: { id: 'u2', full_name: 'Ana Pérez' },
    reason: 'Error de digitación',
  },
  can_void: false,
});
const OTHER = buildStockExitRow({
  id: 'e3',
  lot: { id: 'l2', code: 'L-2' },
  reason: 'other',
  detail: 'Se la llevó el vecino',
});

let userId: string;
let exitRequests: URLSearchParams[];
let summaryRequests: URLSearchParams[];

beforeEach(() => {
  userId = `exit-tab-${crypto.randomUUID()}`;
  exitRequests = [];
  summaryRequests = [];
  resetLocation();
  server.use(
    farmsHandler([buildFarm({ id: 'f1', code: 'F02', name: 'La Esperanza' })]),
    stockSummaryHandler(buildStockSummary()),
    warehousesHandler([buildWarehouse()]),
    exitListHandler([SAMPLE, VOIDED, OTHER], exitRequests),
    exitSummaryHandler(buildExitSummary(), summaryRequests),
  );
});

function renderTab(searchParams = '?vista=salidas', permissions = ALL) {
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

const rows = async () =>
  within(await screen.findByRole('table', { name: 'Salidas' }))
    .getAllByRole('row')
    .slice(1);

describe('Salidas tab', () => {
  it('lists every exit with its lot, grade, kilos, reason and who registered it', async () => {
    renderTab();

    const [sample, , other] = await rows();
    expect(sample).toHaveTextContent('000123-F02-P05-261014-1');
    expect(sample).toHaveTextContent('G1');
    expect(sample).toHaveTextContent('5,0 kg');
    expect(sample).toHaveTextContent('Muestra');
    expect(sample).toHaveTextContent('Registrada por Cuenta de prueba');
    expect(sample).toHaveTextContent('Bodega principal');
    expect(other).toHaveTextContent('Se la llevó el vecino');
    expect(
      within(sample).getByRole('link', {
        name: 'Ver el lote 000123-F02-P05-261014-1',
      }),
    ).toHaveAttribute('href', expect.stringMatching(/id=l1/));
  });

  it('marks a voided exit, with who voided it and why', async () => {
    renderTab();

    const voided = (await rows())[1];
    expect(voided).toHaveTextContent('Anulada');
    expect(voided).toHaveTextContent(
      'Anulada por Ana Pérez: Error de digitación',
    );
  });

  it('shows what left by reason in the strip, from the biggest', async () => {
    renderTab();

    const strip = await screen.findByRole('region', {
      name: 'Resumen de salidas',
    });
    await waitFor(() =>
      expect(strip).toHaveTextContent('Salió en total (kg)25,0'),
    );
    expect(strip).toHaveTextContent('2 salidas vigentes');
    expect(strip).toHaveTextContent('Merma (kg)20,0');
    expect(strip).toHaveTextContent('Muestra (kg)5,0');
  });

  it('is between Existencias and Bodegas, and a view-only account sees it', async () => {
    renderTab('?vista=existencias', [PERMISSIONS.WAREHOUSE_VIEW_STOCK]);

    const tabs = await screen.findByRole('group', { name: 'Vista de bodega' });
    expect(
      within(tabs)
        .getAllByRole('button')
        .map((tab) => tab.textContent),
    ).toEqual(['Existencias', 'Salidas', 'Bodegas']);
  });

  it('asks the server with the filters of the address, and the summary without the state', async () => {
    renderTab(
      '?vista=salidas&motivo=sample&calibre=g1&estado=active&desde=2026-10-01&hasta=2026-10-31',
    );

    await rows();
    const last = exitRequests.at(-1)!;
    expect(last.get('reason')).toBe('sample');
    expect(last.get('grade')).toBe('g1');
    expect(last.get('state')).toBe('active');
    expect(last.get('date_from')).toBe('2026-10-01');
    expect(last.get('date_to')).toBe('2026-10-31');
    await waitFor(() => expect(summaryRequests.length).toBeGreaterThan(0));
    const summary = summaryRequests.at(-1)!;
    expect(summary.get('reason')).toBe('sample');
    expect(summary.has('state')).toBe(false);
  });

  it('filters by reason from the select', async () => {
    renderTab();
    await rows();

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Motivo' }),
      'shrinkage',
    );

    await waitFor(() =>
      expect(exitRequests.at(-1)?.get('reason')).toBe('shrinkage'),
    );
  });

  it('says the period is backwards and keeps asking without it', async () => {
    renderTab('?vista=salidas&desde=2026-11-05&hasta=2026-11-01');
    await rows();

    expect(
      screen.getByText('La fecha final no puede ser anterior a la inicial.'),
    ).toBeInTheDocument();
    expect(exitRequests.at(-1)?.has('date_from')).toBe(false);
  });

  it('says nothing has left yet, and offers to clear the filters when some are on', async () => {
    server.use(exitListHandler([]));
    renderTab();

    expect(
      await screen.findByRole('heading', {
        name: 'Todavía no ha salido cacao de la bodega.',
      }),
    ).toBeInTheDocument();
  });

  it('says there are no exits for the filter, with the way to clear it', async () => {
    server.use(exitListHandler([]));
    renderTab('?vista=salidas&motivo=sale');

    expect(
      await screen.findByRole('heading', {
        name: 'No hay salidas para este filtro.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'Limpiar filtros' }).length,
    ).toBeGreaterThan(0);
  });
});
