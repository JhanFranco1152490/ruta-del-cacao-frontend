import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import type { QueueItem } from '@/lib/offline/db';
import { buildSession } from '@/test/factories';
import { createTestQueryClient, renderWithProviders } from '@/test/render';

import { enqueueLog, getQueuedLog, type LogPayload } from './log-queue';
import { logQueueView } from './queue-view';

const payload: LogPayload = {
  lotId: 'l1',
  request: {
    id: 'dl1',
    measured_at: '2026-10-23T16:00:00-05:00',
    moisture_pct: '12.4',
    sun_hours: '6.0',
    shade_hours: null,
    turn_count: 2,
    turn_frequency_hours: '3.0',
    weather: 'sunny',
    notes: '',
    captured_at: '2026-10-23T21:01:00.000Z',
  },
  label: '000123-F02-P05-261014-1 · bitácora del día 2 · 23 oct',
};

const queued = (overrides: Partial<QueueItem> = {}): QueueItem => ({
  id: 'drying-log:dl1',
  resource: 'drying-logs',
  operation: 'create',
  payload,
  status: 'error',
  errorCode: 'duplicate_drying_log_date',
  errorMessage: 'Ya existe un registro para esta fecha',
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

let userId: string;
const onNavigate = vi.fn<() => void>();

beforeEach(() => {
  userId = `log-view-${crypto.randomUUID()}`;
  onNavigate.mockClear();
});

function renderActions(item: QueueItem) {
  const { Actions } = logQueueView;
  // Descartar lee la sesión: va ya cargada para no pedirla al servidor.
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.session(), buildSession({ id: userId }));
  return renderWithProviders(<Actions item={item} onNavigate={onNavigate} />, {
    queryClient,
  });
}

describe('logQueueView', () => {
  it('names the record by its lot, its day and its date', () => {
    expect(logQueueView.kind).toBe('Bitácora');
    expect(logQueueView.title(queued())).toBe(payload.label);
  });

  it('offers to correct what can be fixed, and to discard it', async () => {
    renderActions(queued());

    const correct = screen.getByRole('link', {
      name: `Corregir ${payload.label}`,
    });
    expect(correct).toHaveAttribute(
      'href',
      '/secado/bitacora?lote=l1&pendiente=dl1',
    );
    expect(
      screen.getByRole('button', { name: 'Descartar' }),
    ).toBeInTheDocument();

    await userEvent.click(correct);
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it('offers only to discard a log of a drying that already finished', () => {
    renderActions(queued({ errorCode: 'drying_not_in_progress' }));

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Descartar' }),
    ).toBeInTheDocument();
  });

  it('offers nothing while the log waits for a connection', () => {
    renderActions(queued({ status: 'pending' }));

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('discards the log from the device after confirming', async () => {
    await enqueueLog(userId, payload);
    renderActions(queued());

    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(
      await screen.findByText(`¿Descartar la bitácora ${payload.label}?`),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Descartar registro' }),
    );

    await waitFor(async () =>
      expect(await getQueuedLog(userId, 'dl1')).toBeNull(),
    );
    expect(
      await screen.findByText('Bitácora pendiente descartada'),
    ).toBeInTheDocument();
  });
});
