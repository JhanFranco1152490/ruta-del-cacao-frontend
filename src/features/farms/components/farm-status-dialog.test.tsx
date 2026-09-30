import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FarmStatusDialog } from './farm-status-dialog';

describe('FarmStatusDialog', () => {
  it('deactivates an active farm after confirmation, explaining nothing is deleted', async () => {
    const user = userEvent.setup();
    const onChangeStatus = vi.fn().mockResolvedValue(undefined);
    render(
      <FarmStatusDialog
        farm={{ name: 'La Esperanza', status: 'active' }}
        onChangeStatus={onChangeStatus}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Desactivar' }));
    expect(
      screen.getByRole('heading', {
        name: '¿Desactivar la finca La Esperanza?',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sus datos y su historial se conservan/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Desactivar finca' }));

    expect(onChangeStatus).toHaveBeenCalledWith('inactive');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('activates an inactive farm', async () => {
    const user = userEvent.setup();
    const onChangeStatus = vi.fn().mockResolvedValue(undefined);
    render(
      <FarmStatusDialog
        farm={{ name: 'La Esperanza', status: 'inactive' }}
        onChangeStatus={onChangeStatus}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Activar' }));
    await user.click(screen.getByRole('button', { name: 'Activar finca' }));

    expect(onChangeStatus).toHaveBeenCalledWith('active');
  });

  it('keeps the dialog open with a message when the change fails', async () => {
    const user = userEvent.setup();
    render(
      <FarmStatusDialog
        farm={{ name: 'La Esperanza', status: 'active' }}
        onChangeStatus={() => Promise.reject(new Error('stale_version'))}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Desactivar' }));
    await user.click(screen.getByRole('button', { name: 'Desactivar finca' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible cambiar el estado de la finca. Inténtalo nuevamente.',
    );
  });
});
