import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  QueueItemBusyError,
  QueueItemHasDependentsError,
  QueueItemMissingError,
} from '@/lib/offline/sync-queue';
import { renderWithProviders } from '@/test/render';

import {
  QueueDiscardDialog,
  queueDiscardErrorMessage,
} from './queue-discard-dialog';

describe('QueueDiscardDialog', () => {
  it('discards after confirming and says so', async () => {
    const onDiscard = vi.fn(() => Promise.resolve());
    renderWithProviders(
      <QueueDiscardDialog
        description="Se borrará de este dispositivo."
        onDiscard={onDiscard}
        successMessage="Monitoreo pendiente descartado"
        title="¿Descartar el monitoreo?"
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Se borrará de este dispositivo.');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Descartar registro' }),
    );

    await waitFor(() => expect(onDiscard).toHaveBeenCalledOnce());
    expect(
      await screen.findByText('Monitoreo pendiente descartado'),
    ).toBeInTheDocument();
  });

  it('says why it could not discard, in the dialog', async () => {
    renderWithProviders(
      <QueueDiscardDialog
        description="Se borrará."
        onDiscard={() => Promise.reject(new QueueItemHasDependentsError())}
        successMessage="Descartado"
        title="¿Descartar?"
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Descartar registro' }),
    );

    expect(
      await screen.findByText(
        'Otros registros de este dispositivo dependen de este. Descártalos primero desde la bandeja.',
      ),
    ).toBeInTheDocument();
  });
});

describe('queueDiscardErrorMessage', () => {
  it('tells apart a record being sent and one that is already gone', () => {
    expect(queueDiscardErrorMessage(new QueueItemBusyError())).toMatch(
      /se está enviando/,
    );
    expect(queueDiscardErrorMessage(new QueueItemMissingError())).toMatch(
      /ya no está pendiente/,
    );
    expect(queueDiscardErrorMessage(new Error('x'))).toBe(
      'No fue posible descartar el registro. Inténtalo nuevamente.',
    );
  });
});
