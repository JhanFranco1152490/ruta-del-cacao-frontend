import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb, type QueueItem } from '@/lib/offline/db';
import { buildSession } from '@/test/factories';
import { createTestQueryClient, renderWithProviders } from '@/test/render';

import {
  type ControlPayload,
  controlQueueId,
  enqueueControl,
} from './control-queue';
import { controlQueueView } from './control-queue-view';

const payload: ControlPayload = {
  request: {
    id: 'c1',
    mode: 'scheduled',
    scheduled_date: '2026-10-25',
    assignee_id: 'u1',
  },
  label: 'Monilia · P-03',
};

const queued = (overrides: Partial<QueueItem> = {}): QueueItem => ({
  id: controlQueueId('c1'),
  resource: 'phytosanitary-controls',
  operation: 'create',
  parentId: 'd1',
  payload,
  status: 'error',
  errorCode: 'assignee_not_available',
  errorMessage: 'El responsable ya no trabaja en esta finca.',
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

let userId: string;

beforeEach(() => {
  userId = `control-view-${crypto.randomUUID()}`;
});

function renderActions(item: QueueItem) {
  const { Actions } = controlQueueView;
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.session(), buildSession({ id: userId }));
  return renderWithProviders(<Actions item={item} onNavigate={() => {}} />, {
    queryClient,
  });
}

describe('controlQueueView', () => {
  it('names the record by its pest and its plot', () => {
    expect(controlQueueView.kind).toBe('Control fitosanitario');
    expect(controlQueueView.title(queued())).toBe('Monilia · P-03');
  });

  it('offers nothing while the record still waits for a connection', () => {
    const { container } = renderActions(
      queued({ status: 'pending', errorCode: undefined }),
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('only discards a rejected control, which is created again from its detection', async () => {
    await enqueueControl(userId, 'd1', payload);
    renderActions(queued());

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Descartar registro',
      }),
    );

    await waitFor(async () =>
      expect(
        await getOfflineDb(userId).queue.get(controlQueueId('c1')),
      ).toBeUndefined(),
    );
  });
});
