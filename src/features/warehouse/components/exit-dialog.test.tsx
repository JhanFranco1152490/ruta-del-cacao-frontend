import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { todayInBogota } from '@/lib/format/dates';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildFarm,
  buildLotStock,
  buildSession,
  buildStockEntry,
  buildStockRow,
  buildStockSummary,
  buildWarehouse,
} from '@/test/factories';
import {
  farmsHandler,
  lotStockHandler,
  stockListHandler,
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
];

// Entró el 30 de octubre: así cualquier fecha de hoy es válida para la salida.
const IN_WAREHOUSE = buildLotStock({
  lot: {
    id: 'l1',
    code: '000123-F02-P05-261014-1',
    status: 'in_warehouse',
    version: 11,
  },
  entry: buildStockEntry(),
  balances: [
    { grade: 'g1', quantity_kg: '250.0' },
    { grade: 'g2', quantity_kg: '55.2' },
  ],
});

let userId: string;

beforeEach(() => {
  userId = `exit-${crypto.randomUUID()}`;
  resetLocation();
  server.use(
    farmsHandler([buildFarm({ id: 'f1', code: 'F02', name: 'La Esperanza' })]),
    stockSummaryHandler(buildStockSummary()),
    stockListHandler([buildStockRow()]),
    warehousesHandler([buildWarehouse()]),
    lotStockHandler(IN_WAREHOUSE),
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

const exitDialog = () =>
  screen.findByRole('dialog', { name: /^Registrar salida ·/ });

describe('ExitDialog', () => {
  it('takes out a sample of G1, with what is available beside the grade', async () => {
    const bodies: unknown[] = [];
    server.use(stockWriteHandler('exit', IN_WAREHOUSE, bodies));
    const onClose = renderDialog({
      action: 'salida',
      lotId: 'l1',
      grade: 'g1',
    });

    const dialog = await exitDialog();
    expect(
      within(dialog).getByRole('combobox', { name: 'Calibre' }),
    ).toHaveValue('g1');
    expect(dialog).toHaveTextContent('Disponible: 250,0 kg');
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'Cantidad (kg)' }),
      '5,0',
    );
    await userEvent.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Motivo' }),
      'sample',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Registrar salida' }),
    );

    expect(await screen.findByText('Salida registrada.')).toBeInTheDocument();
    expect(bodies).toEqual([
      {
        grade: 'g1',
        quantity_kg: '5.0',
        exit_date: todayInBogota(),
        reason: 'sample',
        detail: '',
      },
    ]);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not offer the sale as a reason', async () => {
    renderDialog({ action: 'salida', lotId: 'l1' });

    const dialog = await exitDialog();
    const reasons = within(
      within(dialog).getByRole('combobox', { name: 'Motivo' }),
    )
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(reasons).toEqual([
      'Elige un motivo',
      'Merma',
      'Muestra',
      'Reproceso',
      'Traslado',
      'Otro (con detalle)',
    ]);
  });

  it('says while typing that the quantity is more than what there is, and does not save', async () => {
    renderDialog({ action: 'salida', lotId: 'l1', grade: 'g1' });

    const dialog = await exitDialog();
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'Cantidad (kg)' }),
      '300',
    );

    expect(
      within(dialog).getByText('La cantidad supera lo disponible (250,0 kg)'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Registrar salida' }),
    ).toBeDisabled();
  });

  it('asks for the detail when the reason is Otro', async () => {
    const bodies: unknown[] = [];
    server.use(stockWriteHandler('exit', IN_WAREHOUSE, bodies));
    renderDialog({ action: 'salida', lotId: 'l1', grade: 'g2' });

    const dialog = await exitDialog();
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'Cantidad (kg)' }),
      '1',
    );
    await userEvent.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Motivo' }),
      'other',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Registrar salida' }),
    );

    expect(
      await within(dialog).findByText('Describa el motivo de la salida'),
    ).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it('adopts what the server says is left when someone took out first', async () => {
    server.use(
      stockWriteHandler(
        'exit',
        HttpResponse.json(
          {
            detail: 'La cantidad supera lo disponible (50,0 kg)',
            code: 'stock_insufficient',
            fields: {
              quantity_kg: ['La cantidad supera lo disponible (50,0 kg)'],
            },
            available_kg: '50.0',
          },
          { status: 400 },
        ),
      ),
    );
    renderDialog({ action: 'salida', lotId: 'l1', grade: 'g1' });

    const dialog = await exitDialog();
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'Cantidad (kg)' }),
      '200',
    );
    await userEvent.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Motivo' }),
      'shrinkage',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Registrar salida' }),
    );

    await waitFor(() =>
      expect(dialog).toHaveTextContent('Disponible: 50,0 kg'),
    );
    expect(
      within(dialog).getByText('La cantidad supera lo disponible (50,0 kg)'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Registrar salida' }),
    ).toBeDisabled();
  });

  it('opens from a stock row with the grade of the row', async () => {
    renderWithProviders(
      <WarehouseScreen lotHref={(id) => `/lotes/detalle?id=${id}`} />,
      { queryClient: sessionClient() },
    );

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Registrar salida de G1 del lote 000123-F02-P05-261014-1',
      }),
    );

    const dialog = await exitDialog();
    expect(
      within(dialog).getByRole('combobox', { name: 'Calibre' }),
    ).toHaveValue('g1');
  });
});
