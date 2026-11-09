import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiError, buildBuyer } from '@/test/factories';
import { buyerWriteHandler, csrfHandler } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import type { Buyer } from '../api';
import { BuyerDeleteDialog } from './buyer-delete-dialog';

let deletes: unknown[];
let updates: unknown[];

beforeEach(() => {
  deletes = [];
  updates = [];
});

function renderDialog(buyer: Buyer) {
  const onDone = vi.fn();
  const onClose = vi.fn();
  renderWithProviders(
    <BuyerDeleteDialog buyer={buyer} onClose={onClose} onDone={onDone} />,
  );
  return { onDone, onClose, dialog: screen.getByRole('dialog') };
}

const ceiba = buildBuyer({ id: 'b2', name: 'Acopio La Ceiba', version: 3 });

describe('BuyerDeleteDialog', () => {
  it('warns that the data and the history are lost, with Cancel focused', async () => {
    const { dialog } = renderDialog(ceiba);

    expect(dialog).toHaveTextContent('¿Eliminar a Acopio La Ceiba?');
    expect(dialog).toHaveTextContent(
      'Se borrarán sus datos y ya no podrás consultar su historial de cambios.',
    );
    expect(dialog).toHaveTextContent(
      'Esta acción no se puede deshacer. Si solo dejó de comprarte, mejor desactívalo.',
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus(),
    );
  });

  it('sends nothing when cancelled', async () => {
    const { onClose } = renderDialog(ceiba);

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalled();
    expect(deletes).toEqual([]);
  });

  it('deletes with the version read and announces it', async () => {
    server.use(csrfHandler, buyerWriteHandler('delete', null, deletes));
    const { onDone } = renderDialog(ceiba);

    await userEvent.click(
      screen.getByRole('button', { name: 'Eliminar comprador' }),
    );

    await waitFor(() =>
      expect(onDone).toHaveBeenCalledWith('Comprador eliminado'),
    );
    expect(String(deletes[0])).toBe('expected_version=3');
  });

  it('offers to deactivate when a sale arrived meanwhile, and does it', async () => {
    server.use(
      csrfHandler,
      buyerWriteHandler('delete', apiError(409, 'buyer_has_records')),
      buyerWriteHandler('update', ceiba, updates),
    );
    const { onDone, dialog } = renderDialog(ceiba);

    await userEvent.click(
      screen.getByRole('button', { name: 'Eliminar comprador' }),
    );

    expect(
      await screen.findByRole('heading', {
        name: 'No se puede eliminar a Acopio La Ceiba',
      }),
    ).toBeInTheDocument();
    expect(dialog).toHaveTextContent(
      'No se puede eliminar: tiene ventas registradas.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Desactivar' }));

    await waitFor(() =>
      expect(onDone).toHaveBeenCalledWith('Comprador desactivado'),
    );
    expect(updates).toEqual([{ is_active: false, expected_version: 3 }]);
  });

  it('only gives the reason when the buyer with sales is already inactive', async () => {
    server.use(
      csrfHandler,
      buyerWriteHandler('delete', apiError(409, 'buyer_has_records')),
    );
    const { onDone } = renderDialog({ ...ceiba, is_active: false });

    await userEvent.click(
      screen.getByRole('button', { name: 'Eliminar comprador' }),
    );

    expect(
      await screen.findByText(
        'No se puede eliminar: tiene ventas registradas.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Desactivar' }),
    ).not.toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });
});
