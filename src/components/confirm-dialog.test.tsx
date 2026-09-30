import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialog } from './confirm-dialog';

function renderDialog(onConfirm: () => Promise<unknown>) {
  render(
    <ConfirmDialog
      trigger="Borrar"
      title="¿Borrar el registro?"
      description="No se puede deshacer."
      confirmLabel="Borrar registro"
      pendingLabel="Borrando…"
      variant="destructive"
      onConfirm={onConfirm}
      errorMessage={() => 'No se pudo borrar.'}
    />,
  );
}

describe('ConfirmDialog', () => {
  it('does nothing when the person cancels', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    renderDialog(onConfirm);

    await user.click(screen.getByRole('button', { name: 'Borrar' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onConfirm).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('runs the action once and closes when it succeeds', async () => {
    const user = userEvent.setup();
    let finish!: () => void;
    const onConfirm = vi.fn(
      () => new Promise<void>((resolve) => (finish = resolve)),
    );
    renderDialog(onConfirm);

    await user.click(screen.getByRole('button', { name: 'Borrar' }));
    await user.click(screen.getByRole('button', { name: 'Borrar registro' }));

    expect(screen.getByRole('button', { name: 'Borrando…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    finish();

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('stays open with the reason when the action fails', async () => {
    const user = userEvent.setup();
    renderDialog(() => Promise.reject(new Error('sin red')));

    await user.click(screen.getByRole('button', { name: 'Borrar' }));
    await user.click(screen.getByRole('button', { name: 'Borrar registro' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo borrar.',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Borrar registro' }),
    ).toBeEnabled();
  });
});
