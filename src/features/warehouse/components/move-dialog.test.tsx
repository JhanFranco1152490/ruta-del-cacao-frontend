import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import {
  apiError,
  buildLotStock,
  buildSession,
  buildStockEntry,
  buildWarehouse,
} from '@/test/factories';
import {
  lotStockHandler,
  stockLocationsHandler,
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

const MANAGER = [
  PERMISSIONS.WAREHOUSE_VIEW_STOCK,
  PERMISSIONS.WAREHOUSE_REGISTER_ENTRY,
  PERMISSIONS.WAREHOUSE_REGISTER_EXIT,
];

const STORED = buildLotStock({
  lot: {
    id: 'l1',
    code: '000123-F02-P05-261014-1',
    status: 'in_warehouse',
    version: 11,
  },
  entry: buildStockEntry({ version: 3 }),
  balances: [
    { grade: 'g1', quantity_kg: '245.0' },
    { grade: 'g2', quantity_kg: '55.2' },
  ],
});

let userId: string;

beforeEach(() => {
  userId = `move-${crypto.randomUUID()}`;
  resetLocation();
  server.use(
    warehousesHandler([
      buildWarehouse(),
      buildWarehouse({ id: 'w2', name: 'Anexo' }),
    ]),
    stockLocationsHandler(['Zona B']),
    lotStockHandler(STORED),
  );
});

const renderDialog = (permissions = MANAGER) => {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, permissions }),
  );
  const onClose = vi.fn();
  const request: DialogRequest = { action: 'mover', lotId: 'l1' };
  renderWithProviders(
    <WarehouseActionDialog onClose={onClose} request={request} />,
    { queryClient },
  );
  return onClose;
};

const moveDialog = () =>
  screen.findByRole('dialog', { name: /^Mover · 000123/ });

describe('MoveDialog', () => {
  it('opens on where the cacao is now', async () => {
    renderDialog();

    const dialog = await moveDialog();
    expect(dialog).toHaveTextContent(
      'Ahora está en Bodega principal · Estante 3.',
    );
    await waitFor(() =>
      expect(
        within(dialog).getByRole('combobox', { name: 'Bodega' }),
      ).toHaveValue('w1'),
    );
    expect(
      within(dialog).getByRole('combobox', { name: 'Ubicación (opcional)' }),
    ).toHaveValue('Estante 3');
  });

  it('moves the cacao with the version of the entry', async () => {
    const bodies: unknown[] = [];
    server.use(stockWriteHandler('move', STORED, bodies));
    const onClose = renderDialog();

    const dialog = await moveDialog();
    await waitFor(() =>
      expect(
        within(dialog).getByRole('combobox', { name: 'Bodega' }),
      ).toHaveValue('w1'),
    );
    await userEvent.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Bodega' }),
      'w2',
    );
    const location = within(dialog).getByRole('combobox', {
      name: 'Ubicación (opcional)',
    });
    await userEvent.clear(location);
    await userEvent.type(location, 'Zona B');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Mover' }),
    );

    expect(await screen.findByText('Cacao movido.')).toBeInTheDocument();
    expect(bodies).toEqual([
      { expected_version: 3, warehouse_id: 'w2', location: 'Zona B' },
    ]);
    expect(onClose).toHaveBeenCalled();
  });

  it('says there is nothing to move when the place does not change', async () => {
    const bodies: unknown[] = [];
    server.use(stockWriteHandler('move', STORED, bodies));
    renderDialog();

    const dialog = await moveDialog();
    await waitFor(() =>
      expect(
        within(dialog).getByRole('combobox', { name: 'Bodega' }),
      ).toHaveValue('w1'),
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Mover' }),
    );

    expect(
      await screen.findByText('No hubo cambios que guardar.'),
    ).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it('shows a refused warehouse in its field', async () => {
    server.use(
      stockWriteHandler(
        'move',
        apiError(400, 'warehouse_inactive', 'La bodega está desactivada.', {
          warehouse_id: ['La bodega está desactivada: no recibe ingresos.'],
        }),
      ),
    );
    renderDialog();

    const dialog = await moveDialog();
    await waitFor(() =>
      expect(
        within(dialog).getByRole('combobox', { name: 'Bodega' }),
      ).toHaveValue('w1'),
    );
    await userEvent.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Bodega' }),
      'w2',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Mover' }),
    );

    expect(
      await within(dialog).findByText(
        'La bodega está desactivada: no recibe ingresos.',
      ),
    ).toBeInTheDocument();
  });

  it('is not offered to an account that cannot enter lots', async () => {
    renderDialog([
      PERMISSIONS.WAREHOUSE_VIEW_STOCK,
      PERMISSIONS.WAREHOUSE_REGISTER_EXIT,
    ]);

    expect(
      await screen.findByText('Tu cuenta no tiene permiso para hacer esto.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /^Mover/ })).toBeNull();
  });
});
