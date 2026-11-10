import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import {
  apiError,
  buildLotStock,
  buildSession,
  buildStockEntry,
  buildStockExit,
} from '@/test/factories';
import { lotStockHandler, stockWriteHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { WarehouseActionDialog } from './warehouse-action-dialog';

const IN_WAREHOUSE = buildLotStock({
  lot: {
    id: 'l1',
    code: '000123-F02-P05-261014-1',
    status: 'in_warehouse',
    version: 11,
  },
  entry: buildStockEntry({ can_correct: false }),
  balances: [{ grade: 'g1', quantity_kg: '245.0' }],
  exits: [buildStockExit()],
});

let userId: string;

beforeEach(() => {
  userId = `void-${crypto.randomUUID()}`;
  server.use(lotStockHandler(IN_WAREHOUSE));
});

const renderDialog = (
  permissions = [
    PERMISSIONS.WAREHOUSE_VIEW_STOCK,
    PERMISSIONS.WAREHOUSE_REGISTER_EXIT,
  ],
) => {
  const onClose = vi.fn();
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, permissions }),
  );
  renderWithProviders(
    <WarehouseActionDialog
      onClose={onClose}
      request={{ action: 'anular', lotId: 'l1', exitId: 'e1' }}
    />,
    { queryClient },
  );
  return onClose;
};

const voidDialog = () =>
  screen.findByRole('dialog', { name: '¿Anular la salida de 5,0 kg de G1?' });

describe('VoidExitDialog', () => {
  it('voids the exit with its reason and gives the kilos back', async () => {
    const bodies: unknown[] = [];
    server.use(stockWriteHandler('void', IN_WAREHOUSE, bodies));
    const onClose = renderDialog();

    const dialog = await voidDialog();
    expect(dialog).toHaveTextContent('Los kilos vuelven a las existencias.');
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'Motivo de la anulación' }),
      ' Se escribió 5 en vez de 0,5 ',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Anular salida' }),
    );

    expect(await screen.findByText('Salida anulada.')).toBeInTheDocument();
    expect(bodies).toEqual([{ reason: 'Se escribió 5 en vez de 0,5' }]);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not void without a reason', async () => {
    const bodies: unknown[] = [];
    server.use(stockWriteHandler('void', IN_WAREHOUSE, bodies));
    renderDialog();

    const dialog = await voidDialog();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Anular salida' }),
    );

    expect(
      await within(dialog).findByText('Indique el motivo de la anulación'),
    ).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it('closes and says why when someone voided it first', async () => {
    server.use(
      stockWriteHandler(
        'void',
        apiError(409, 'exit_already_voided', 'La salida ya está anulada.'),
      ),
    );
    const onClose = renderDialog();

    const dialog = await voidDialog();
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'Motivo de la anulación' }),
      'Error',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Anular salida' }),
    );

    expect(
      await screen.findByText('La salida ya está anulada.'),
    ).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
  });

  it('does not open for an exit that can no longer be voided', async () => {
    server.use(
      lotStockHandler({
        ...IN_WAREHOUSE,
        exits: [buildStockExit({ can_void: false })],
      }),
    );
    const onClose = renderDialog();

    expect(
      await screen.findByText('Esa salida ya no se puede anular.'),
    ).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
  });

  it('does not open without the permission to register exits', async () => {
    const onClose = renderDialog([PERMISSIONS.WAREHOUSE_VIEW_STOCK]);

    expect(
      await screen.findByText('Tu cuenta no tiene permiso para hacer esto.'),
    ).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
  });
});
