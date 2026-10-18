import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import type { QueueItem } from '@/lib/offline/db';
import { enqueue } from '@/lib/offline/sync-queue';
import { buildSession } from '@/test/factories';
import { createTestQueryClient, renderWithProviders } from '@/test/render';

import {
  enqueueMonitoring,
  getQueuedMonitoring,
  type MonitoringPayload,
} from './monitoring-queue';
import { monitoringQueueView } from './monitoring-queue-view';

const payload: MonitoringPayload = {
  request: {
    done_date: '2026-10-19',
    sampling_unit: 'trees',
    evaluated_units: 50,
    no_presence: true,
    detections: [],
  },
  label: 'P-03 · 19 de octubre',
};

const queued = (overrides: Partial<QueueItem> = {}): QueueItem => ({
  id: 'monitoring-result:a1',
  resource: 'monitoring-results',
  operation: 'update',
  parentId: 'a1',
  payload,
  status: 'error',
  errorCode: 'pest_disease_inactive',
  errorMessage: 'Una plaga o enfermedad ya no está activa.',
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

let userId: string;
const onNavigate = vi.fn<() => void>();

beforeEach(() => {
  userId = `monitoring-view-${crypto.randomUUID()}`;
  onNavigate.mockClear();
});

function renderActions(item: QueueItem) {
  const { Actions } = monitoringQueueView;
  // Descartar lee la sesión: va ya cargada para no pedirla al servidor.
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.session(), buildSession({ id: userId }));
  return renderWithProviders(<Actions item={item} onNavigate={onNavigate} />, {
    queryClient,
  });
}

describe('monitoringQueueView', () => {
  it('names the record by its plot and its date', () => {
    expect(monitoringQueueView.kind).toBe('Monitoreo');
    expect(monitoringQueueView.title(queued())).toBe('P-03 · 19 de octubre');
  });

  it('offers to correct what can be fixed, and to discard it', async () => {
    renderActions(queued());

    const correct = screen.getByRole('link', {
      name: 'Corregir P-03 · 19 de octubre',
    });
    expect(correct).toHaveAttribute('href', '/sanidad/monitoreo?id=a1');
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeVisible();

    await userEvent.click(correct);
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it.each(['activity_already_done', 'monitoring_deleted', 'permission_denied'])(
    'offers only to discard a record rejected with %s',
    (errorCode) => {
      renderActions(queued({ errorCode }));

      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Descartar' })).toBeVisible();
    },
  );

  it('offers nothing while the record still waits for a connection', () => {
    const { container } = renderActions(
      queued({ status: 'pending', errorCode: undefined }),
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('discards the record from the device after confirming', async () => {
    await enqueueMonitoring(userId, 'a1', payload);
    renderActions(queued());

    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByRole('heading', {
        name: '¿Descartar el monitoreo de P-03 · 19 de octubre?',
      }),
    ).toBeInTheDocument();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Descartar registro' }),
    );

    await waitFor(async () =>
      expect(await getQueuedMonitoring(userId, 'a1')).toBeNull(),
    );
  });

  it('does not discard it while a control or a photo of it waits in the device', async () => {
    await enqueueMonitoring(userId, 'a1', payload);
    await enqueue(userId, {
      id: 'phytosanitary-control:c1',
      resource: 'phytosanitary-controls',
      operation: 'create',
      parentId: 'monitoring-result:a1',
      payload: {},
    });
    renderActions(queued());

    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Descartar registro' }),
    );

    expect(
      await screen.findByText(/Otros registros de este dispositivo dependen/),
    ).toBeInTheDocument();
    expect(await getQueuedMonitoring(userId, 'a1')).not.toBeNull();
  });
});
