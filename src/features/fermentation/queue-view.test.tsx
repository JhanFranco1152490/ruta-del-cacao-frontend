import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import type { QueueItem } from '@/lib/offline/db';
import { buildSession } from '@/test/factories';
import { createTestQueryClient, renderWithProviders } from '@/test/render';

import { turnQueueView } from './queue-view';
import { enqueueTurn, getQueuedTurn, type TurnPayload } from './turn-queue';

const payload: TurnPayload = {
  lotId: 'l1',
  request: {
    id: 'ft1',
    turned_at: '2026-10-17T07:30:00-05:00',
    temperature_c: '45.0',
    ph: '4.90',
    notes: '',
    captured_at: '2026-10-17T12:31:00.000Z',
  },
  label: '000123-F02-P05-261014-1 · volteo 1 · 17 oct. 07:30',
};

const queued = (overrides: Partial<QueueItem> = {}): QueueItem => ({
  id: 'fermentation-turn:ft1',
  resource: 'fermentation-turns',
  operation: 'create',
  payload,
  status: 'error',
  errorCode: 'duplicate_turn_time',
  errorMessage: 'Ya hay un volteo registrado a esa hora.',
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

let userId: string;
const onNavigate = vi.fn<() => void>();

beforeEach(() => {
  userId = `turn-view-${crypto.randomUUID()}`;
  onNavigate.mockClear();
});

function renderActions(item: QueueItem) {
  const { Actions } = turnQueueView;
  // Descartar lee la sesión: va ya cargada para no pedirla al servidor.
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.session(), buildSession({ id: userId }));
  return renderWithProviders(<Actions item={item} onNavigate={onNavigate} />, {
    queryClient,
  });
}

describe('turnQueueView', () => {
  it('names the record by its lot, its number and its time', () => {
    expect(turnQueueView.kind).toBe('Volteo');
    expect(turnQueueView.title(queued())).toBe(payload.label);
  });

  it('offers to correct what can be fixed, and to discard it', async () => {
    renderActions(queued());

    const correct = screen.getByRole('link', {
      name: `Corregir ${payload.label}`,
    });
    expect(correct).toHaveAttribute(
      'href',
      '/fermentacion/volteo?lote=l1&pendiente=ft1',
    );
    expect(
      screen.getByRole('button', { name: 'Descartar' }),
    ).toBeInTheDocument();

    await userEvent.click(correct);
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it('offers only to discard a turn of a fermentation that already finished', () => {
    renderActions(queued({ errorCode: 'fermentation_not_in_progress' }));

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Descartar' }),
    ).toBeInTheDocument();
  });

  it('offers nothing while the turn waits for a connection', () => {
    renderActions(queued({ status: 'pending' }));

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('discards the turn from the device after confirming', async () => {
    await enqueueTurn(userId, payload);
    renderActions(queued());

    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(
      await screen.findByText(`¿Descartar el volteo ${payload.label}?`),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Descartar registro' }),
    );

    await waitFor(async () =>
      expect(await getQueuedTurn(userId, 'ft1')).toBeNull(),
    );
    expect(
      await screen.findByText('Volteo pendiente descartado'),
    ).toBeInTheDocument();
  });
});
