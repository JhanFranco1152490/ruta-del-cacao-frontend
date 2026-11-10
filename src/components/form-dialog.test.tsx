import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FormDialog } from './form-dialog';

function renderDialog({
  dirty = false,
  isSaving = false,
}: { dirty?: boolean; isSaving?: boolean } = {}) {
  const onClose = vi.fn();
  render(
    <FormDialog
      dirty={dirty}
      isSaving={isSaving}
      onClose={onClose}
      onSubmit={(event) => event.preventDefault()}
      submitLabel="Guardar"
      title="Editar algo"
    >
      <input aria-label="Nombre" />
    </FormDialog>,
  );
  return { onClose };
}

const confirmation = () =>
  screen.queryByRole('dialog', { name: '¿Descartar los cambios?' });

describe('FormDialog', () => {
  it('closes at once without changes', async () => {
    const { onClose } = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalled();
    expect(confirmation()).not.toBeInTheDocument();
  });

  it('asks before discarding changes, and stays open to keep editing', async () => {
    const { onClose } = renderDialog({ dirty: true });

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await screen.findByRole('dialog', { name: '¿Descartar los cambios?' });
    await userEvent.click(
      screen.getByRole('button', { name: 'Seguir editando' }),
    );

    await waitFor(() => expect(confirmation()).not.toBeInTheDocument());
    expect(onClose).not.toHaveBeenCalled();
    expect(
      screen.getByRole('dialog', { name: 'Editar algo' }),
    ).toBeInTheDocument();
  });

  it('discards the changes on confirmation', async () => {
    const { onClose } = renderDialog({ dirty: true });

    await userEvent.keyboard('{Escape}');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Descartar cambios' }),
    );

    expect(onClose).toHaveBeenCalled();
  });

  it('does not close while saving', async () => {
    const { onClose } = renderDialog({ dirty: true, isSaving: true });

    await userEvent.keyboard('{Escape}');

    expect(onClose).not.toHaveBeenCalled();
    expect(confirmation()).not.toBeInTheDocument();
  });
});
