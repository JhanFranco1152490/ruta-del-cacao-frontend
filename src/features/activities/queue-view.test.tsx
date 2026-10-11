import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import type { QueueItem } from '@/lib/offline/db';
import { buildSession } from '@/test/factories';
import { createTestQueryClient, renderWithProviders } from '@/test/render';

import {
  type CompletionPayload,
  enqueueCompletion,
  getQueuedCompletion,
} from './completion-queue';
import { completionQueueView } from './queue-view';

const payload: CompletionPayload = {
  request: { done_date: '2026-10-19', inputs: [] },
  label: 'Fertilización · P-03',
};

const queued = (overrides: Partial<QueueItem> = {}): QueueItem => ({
  id: 'activity-completion:a1',
  resource: 'agricultural-activity-completions',
  operation: 'update',
  parentId: 'a1',
  payload,
  status: 'error',
  errorCode: 'input_inactive',
  errorMessage: 'Este insumo ya no está disponible.',
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

let userId: string;
const onNavigate = vi.fn<() => void>();

beforeEach(() => {
  userId = `completion-view-${crypto.randomUUID()}`;
  onNavigate.mockClear();
});

function renderActions(item: QueueItem) {
  const { Actions } = completionQueueView;
  // Descartar lee la sesión: va ya cargada para no pedirla al servidor.
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.session(), buildSession({ id: userId }));
  return renderWithProviders(<Actions item={item} onNavigate={onNavigate} />, {
    queryClient,
  });
}

describe('completionQueueView', () => {
  it('names the record by its labor and its plot', () => {
    expect(completionQueueView.kind).toBe('Realización');
    expect(completionQueueView.title(queued())).toBe('Fertilización · P-03');
  });

  it('offers to correct what can be fixed, and to discard it', async () => {
    renderActions(queued());

    const correct = screen.getByRole('link', {
      name: 'Corregir Fertilización · P-03',
    });
    expect(correct).toHaveAttribute('href', '/actividades/realizar?id=a1');
    expect(
      screen.getByRole('button', { name: 'Descartar' }),
    ).toBeInTheDocument();

    await userEvent.click(correct);
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it.each(['activity_already_done', 'activity_deleted'])(
    'offers only to discard a record rejected with %s',
    (errorCode) => {
      renderActions(queued({ errorCode }));

      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Descartar' }),
      ).toBeInTheDocument();
    },
  );

  it('offers nothing while the record still waits for a connection', () => {
    const { container } = renderActions(
      queued({ status: 'pending', errorCode: undefined }),
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('discards the record from the device after confirming', async () => {
    await enqueueCompletion(userId, 'a1', payload);
    renderActions(queued());

    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByRole('heading', {
        name: '¿Descartar la realización de Fertilización · P-03?',
      }),
    ).toBeInTheDocument();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Descartar registro' }),
    );

    await waitFor(async () =>
      expect(await getQueuedCompletion(userId, 'a1')).toBeNull(),
    );
  });
});
