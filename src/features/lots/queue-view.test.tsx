import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb, type QueueItem } from '@/lib/offline/db';
import { buildSession } from '@/test/factories';
import { createTestQueryClient, renderWithProviders } from '@/test/render';

import { enqueueLot, listQueuedLots, type LotPayload } from './lot-queue';
import { lotQueueView } from './queue-view';

const payload: LotPayload = {
  request: { id: 'l1', harvest_id: 'h1' },
  label: 'Lote de P05 · Lote del río · 14 oct.',
};

const queued = (overrides: Partial<QueueItem> = {}): QueueItem => ({
  id: 'lot:l1',
  resource: 'lots',
  operation: 'create',
  parentId: 'harvest:h1',
  payload,
  status: 'error',
  errorCode: 'harvest_already_in_lot',
  errorMessage: 'Esta cosecha ya forma otro lote.',
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

let userId: string;

beforeEach(() => {
  userId = `lot-view-${crypto.randomUUID()}`;
});

function renderActions(item: QueueItem) {
  const { Actions } = lotQueueView;
  // Descartar lee la sesión: va ya cargada para no pedirla al servidor.
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.session(), buildSession({ id: userId }));
  return renderWithProviders(<Actions item={item} onNavigate={vi.fn()} />, {
    queryClient,
  });
}

describe('lotQueueView', () => {
  it('names the record by the harvest it comes from', () => {
    expect(lotQueueView.kind).toBe('Lote');
    expect(lotQueueView.title(queued())).toBe(
      'Lote de P05 · Lote del río · 14 oct.',
    );
  });

  it('offers only to discard a lot the server rejected', async () => {
    renderActions(queued());

    expect(screen.queryByRole('link')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Descartar' }),
    ).toBeInTheDocument();
  });

  it('offers nothing while the lot waits for a connection', () => {
    renderActions(queued({ status: 'pending' }));

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('discards the lot from the phone after confirming', async () => {
    await enqueueLot(userId, payload);
    await getOfflineDb(userId).queue.update('lot:l1', { status: 'error' });
    renderActions(queued());

    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Descartar registro' }),
    );

    await waitFor(async () => expect(await listQueuedLots(userId)).toEqual([]));
  });
});
