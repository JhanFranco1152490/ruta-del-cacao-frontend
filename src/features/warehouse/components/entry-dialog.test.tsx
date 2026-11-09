import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { todayInBogota } from '@/lib/format/dates';
import { PERMISSIONS } from '@/lib/permissions';
import {
  apiError,
  buildFarm,
  buildLotStock,
  buildPendingEntry,
  buildSession,
  buildStockEntry,
  buildStockSummary,
  buildWarehouse,
} from '@/test/factories';
import {
  farmsHandler,
  lotStockHandler,
  pendingEntryHandler,
  stockLocationsHandler,
  stockSummaryHandler,
  stockWriteHandler,
  warehousesHandler,
} from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { resetLocation } from '@/test/router';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import type { DialogRequest } from '../dialog-request';
import { WarehouseActionDialog } from './warehouse-action-dialog';
import { WarehouseScreen } from './warehouse-screen';

const MANAGER = [
  PERMISSIONS.WAREHOUSE_VIEW_STOCK,
  PERMISSIONS.WAREHOUSE_REGISTER_ENTRY,
  PERMISSIONS.WAREHOUSE_REGISTER_EXIT,
  PERMISSIONS.WAREHOUSE_MANAGE,
];

const CLASSIFIED = buildLotStock();
const IN_WAREHOUSE = buildLotStock({
  lot: { ...CLASSIFIED.lot, status: 'in_warehouse', version: 11 },
  entry: buildStockEntry(),
  balances: [
    { grade: 'g1', quantity_kg: '250.0' },
    { grade: 'g2', quantity_kg: '55.2' },
  ],
});

let userId: string;
let warehouseRequests: URLSearchParams[];

beforeEach(() => {
  userId = `entry-${crypto.randomUUID()}`;
  warehouseRequests = [];
  resetLocation();
  server.use(
    farmsHandler([buildFarm({ id: 'f1', code: 'F02', name: 'La Esperanza' })]),
    stockSummaryHandler(buildStockSummary()),
    stockLocationsHandler(['Estante 3', 'Zona A']),
    pendingEntryHandler([buildPendingEntry()]),
    warehousesHandler([buildWarehouse()], warehouseRequests),
    lotStockHandler(CLASSIFIED),
  );
});

const sessionClient = () => {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, permissions: MANAGER }),
  );
  return queryClient;
};

const renderDialog = (request: DialogRequest, onClose = vi.fn()) => {
  renderWithProviders(
    <WarehouseActionDialog onClose={onClose} request={request} />,
    { queryClient: sessionClient() },
  );
  return onClose;
};

const entryDialog = () =>
  screen.findByRole('dialog', { name: /^Ingresar a bodega ·/ });

describe('EntryDialog', () => {
  it('stores the lot with today, the only warehouse and the location', async () => {
    const bodies: unknown[] = [];
    server.use(stockWriteHandler('entry', IN_WAREHOUSE, bodies));
    const onClose = renderDialog({ action: 'ingresar', lotId: 'l1' });

    const dialog = await entryDialog();
    expect(dialog).toHaveTextContent('G1 250,0 kg · G2 55,2 kg clasificados');
    await waitFor(() =>
      expect(
        within(dialog).getByRole('combobox', { name: 'Bodega' }),
      ).toHaveValue('w1'),
    );
    expect(warehouseRequests[0].toString()).toBe('farm=f1&active=true');
    await userEvent.type(
      within(dialog).getByRole('combobox', { name: 'Ubicación (opcional)' }),
      'Estante 3',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Ingresar a bodega' }),
    );

    expect(await screen.findByText('Ingreso registrado.')).toBeInTheDocument();
    expect(bodies).toEqual([
      {
        expected_lot_version: 10,
        entry_date: todayInBogota(),
        warehouse_id: 'w1',
        location: 'Estante 3',
      },
    ]);
    expect(onClose).toHaveBeenCalled();
  });

  it('stores the lot without a location when none is written', async () => {
    const bodies: unknown[] = [];
    server.use(stockWriteHandler('entry', IN_WAREHOUSE, bodies));
    renderDialog({ action: 'ingresar', lotId: 'l1' });

    const dialog = await entryDialog();
    await waitFor(() =>
      expect(
        within(dialog).getByRole('combobox', { name: 'Bodega' }),
      ).toHaveValue('w1'),
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Ingresar a bodega' }),
    );

    expect(await screen.findByText('Ingreso registrado.')).toBeInTheDocument();
    expect(bodies).toEqual([
      {
        expected_lot_version: 10,
        entry_date: todayInBogota(),
        warehouse_id: 'w1',
        location: '',
      },
    ]);
  });

  it('marks a future date and saves nothing', async () => {
    const bodies: unknown[] = [];
    server.use(stockWriteHandler('entry', IN_WAREHOUSE, bodies));
    renderDialog({ action: 'ingresar', lotId: 'l1' });

    const dialog = await entryDialog();
    fireEvent.change(within(dialog).getByLabelText('Fecha de ingreso'), {
      target: { value: '2999-01-01' },
    });
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Ingresar a bodega' }),
    );

    expect(
      await within(dialog).findByText('La fecha no puede ser futura'),
    ).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it('says when the farm has no active warehouse, with the way to register one', async () => {
    server.use(warehousesHandler([]));
    renderDialog({ action: 'ingresar', lotId: 'l1' });

    const dialog = await entryDialog();
    expect(
      await within(dialog).findByText(/Esta finca no tiene bodegas activas/),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('link', { name: 'Nueva bodega' }),
    ).toHaveAttribute('href', '/bodega?vista=bodegas&finca=f1');
    expect(
      within(dialog).getByRole('button', { name: 'Ingresar a bodega' }),
    ).toBeDisabled();
  });

  it('closes and says why when someone stored the lot meanwhile', async () => {
    server.use(
      stockWriteHandler(
        'entry',
        apiError(409, 'lot_invalid_status', 'Estado.', {}),
      ),
    );
    const onClose = renderDialog({ action: 'ingresar', lotId: 'l1' });

    const dialog = await entryDialog();
    await userEvent.type(
      within(dialog).getByRole('combobox', { name: 'Ubicación (opcional)' }),
      'Estante 3',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Ingresar a bodega' }),
    );

    expect(
      await screen.findByText('El lote cambió de estado.'),
    ).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
  });

  it('does not open, and says why, when the lot is no longer classified', async () => {
    server.use(lotStockHandler(IN_WAREHOUSE));
    const onClose = renderDialog({ action: 'ingresar', lotId: 'l1' });

    expect(
      await screen.findByText('El lote ya está en bodega.'),
    ).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
    // El aviso flotante también es un `dialog`: se busca el del formulario.
    expect(
      screen.queryByRole('dialog', { name: /^Ingresar a bodega ·/ }),
    ).not.toBeInTheDocument();
  });

  it('corrects only the location of the entry', async () => {
    const bodies: unknown[] = [];
    server.use(
      lotStockHandler(IN_WAREHOUSE),
      stockWriteHandler('entry-correction', IN_WAREHOUSE, bodies),
    );
    renderDialog({ action: 'corregir', lotId: 'l1' });

    const dialog = await screen.findByRole('dialog', {
      name: /^Corregir ingreso ·/,
    });
    const location = within(dialog).getByRole('combobox', {
      name: 'Ubicación (opcional)',
    });
    expect(location).toHaveValue('Estante 3');
    await userEvent.clear(location);
    await userEvent.type(location, 'Estante 5');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Guardar cambios' }),
    );

    expect(await screen.findByText('Ingreso actualizado.')).toBeInTheDocument();
    expect(bodies).toEqual([{ expected_version: 1, location: 'Estante 5' }]);
  });

  it('sends nothing when the correction changes nothing', async () => {
    const bodies: unknown[] = [];
    server.use(
      lotStockHandler(IN_WAREHOUSE),
      stockWriteHandler('entry-correction', IN_WAREHOUSE, bodies),
    );
    renderDialog({ action: 'corregir', lotId: 'l1' });

    const dialog = await screen.findByRole('dialog', {
      name: /^Corregir ingreso ·/,
    });
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Guardar cambios' }),
    );

    expect(
      await screen.findByText('No hubo cambios que guardar.'),
    ).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });
});

describe('opening the entry from the warehouse screen', () => {
  const renderScreen = (searchParams: string) =>
    renderWithProviders(
      <WarehouseScreen lotHref={(id) => `/lotes/detalle?id=${id}`} />,
      { queryClient: sessionClient(), searchParams },
    );

  it('opens it from the card of a lot to store', async () => {
    renderScreen('?vista=por-ingresar');

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Ingresar a bodega el lote 000123-F02-P05-261014-1',
      }),
    );

    expect(await entryDialog()).toBeInTheDocument();
  });

  it('opens it when arriving from Lotes with the lot and the action', async () => {
    renderScreen('?vista=por-ingresar&lote=l1&accion=ingresar');

    expect(await entryDialog()).toBeInTheDocument();
  });
});
