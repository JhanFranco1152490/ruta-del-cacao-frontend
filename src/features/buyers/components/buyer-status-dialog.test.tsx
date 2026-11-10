import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiError, buildBuyer } from '@/test/factories';
import { buyerWriteHandler, csrfHandler } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import type { Buyer } from '../api';
import { BuyerStatusDialog } from './buyer-status-dialog';

let bodies: unknown[];

beforeEach(() => {
  bodies = [];
});

function renderDialog(buyer: Buyer) {
  const onDone = vi.fn();
  const onClose = vi.fn();
  renderWithProviders(
    <BuyerStatusDialog buyer={buyer} onClose={onClose} onDone={onDone} />,
  );
  return { onDone, onClose, dialog: screen.getByRole('dialog') };
}

const oriente = buildBuyer({
  name: 'Chocolates del Oriente S.A.S.',
  version: 2,
});

describe('BuyerStatusDialog', () => {
  it('deactivates an active buyer after explaining what changes', async () => {
    server.use(csrfHandler, buyerWriteHandler('update', oriente, bodies));
    const { onDone, dialog } = renderDialog(oriente);

    expect(dialog).toHaveTextContent(
      '¿Desactivar a Chocolates del Oriente S.A.S.?',
    );
    expect(dialog).toHaveTextContent(
      'Dejará de ofrecerse al registrar ventas. Sus ventas no cambian. Puedes activarlo de nuevo cuando quieras.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Desactivar' }));

    await waitFor(() =>
      expect(onDone).toHaveBeenCalledWith('Comprador desactivado'),
    );
    expect(bodies).toEqual([{ is_active: false, expected_version: 2 }]);
  });

  it('activates an inactive buyer', async () => {
    server.use(csrfHandler, buyerWriteHandler('update', oriente, bodies));
    const { onDone, dialog } = renderDialog({ ...oriente, is_active: false });

    expect(dialog).toHaveTextContent(
      '¿Activar a Chocolates del Oriente S.A.S.?',
    );
    expect(dialog).toHaveTextContent(
      'Volverá a ofrecerse al registrar ventas.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Activar' }));

    await waitFor(() =>
      expect(onDone).toHaveBeenCalledWith('Comprador activado'),
    );
    expect(bodies).toEqual([{ is_active: true, expected_version: 2 }]);
  });

  it('stays open with the reason when another person changed the buyer', async () => {
    server.use(
      csrfHandler,
      buyerWriteHandler('update', apiError(409, 'stale_version')),
    );
    const { onDone } = renderDialog(oriente);

    await userEvent.click(screen.getByRole('button', { name: 'Desactivar' }));

    expect(
      await screen.findByText(
        'Otra persona cambió este comprador mientras tanto. Cierra y revisa sus datos actuales antes de intentarlo de nuevo.',
      ),
    ).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('closes without changing anything on cancel', async () => {
    const { onClose } = renderDialog(oriente);

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalled();
    expect(bodies).toEqual([]);
  });
});
