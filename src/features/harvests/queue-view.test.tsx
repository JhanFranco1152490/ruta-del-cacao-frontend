import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import type { QueueItem } from '@/lib/offline/db';
import { buildSession } from '@/test/factories';
import { createTestQueryClient, renderWithProviders } from '@/test/render';

import {
  enqueueHarvest,
  getQueuedHarvest,
  type HarvestPayload,
} from './harvest-queue';
import { harvestQueueView } from './queue-view';

const payload: HarvestPayload = {
  request: {
    id: 'h1',
    plot_id: 'pl1',
    harvest_date: '2026-10-14',
    green_weight_kg: '120.5',
    variety_id: 'v1',
    collector_id: 'u1',
  },
  label: 'P05 · Lote del río · 14 oct.',
};

const queued = (overrides: Partial<QueueItem> = {}): QueueItem => ({
  id: 'harvest:h1',
  resource: 'harvests',
  operation: 'create',
  parentId: 'plot-characterization:pl1',
  payload,
  status: 'error',
  errorCode: 'variety_not_in_plot',
  errorMessage: 'Esta variedad ya no está en la ficha de la parcela.',
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

let userId: string;
const onNavigate = vi.fn<() => void>();

beforeEach(() => {
  userId = `harvest-view-${crypto.randomUUID()}`;
  onNavigate.mockClear();
});

function renderActions(item: QueueItem) {
  const { Actions } = harvestQueueView;
  // Descartar lee la sesión: va ya cargada para no pedirla al servidor.
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.session(), buildSession({ id: userId }));
  return renderWithProviders(<Actions item={item} onNavigate={onNavigate} />, {
    queryClient,
  });
}

describe('harvestQueueView', () => {
  it('names the record by its plot and its date', () => {
    expect(harvestQueueView.kind).toBe('Cosecha');
    expect(harvestQueueView.title(queued())).toBe(
      'P05 · Lote del río · 14 oct.',
    );
  });

  it('offers to correct what can be fixed, and to discard it', async () => {
    renderActions(queued());

    const correct = screen.getByRole('link', {
      name: 'Corregir P05 · Lote del río · 14 oct.',
    });
    expect(correct).toHaveAttribute('href', '/cosechas/registrar?pendiente=h1');
    expect(
      screen.getByRole('button', { name: 'Descartar' }),
    ).toBeInTheDocument();

    await userEvent.click(correct);
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it('offers only to discard a harvest whose plot is gone', () => {
    renderActions(queued({ errorCode: 'harvest_plot_gone' }));

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Descartar' }),
    ).toBeInTheDocument();
  });

  it('offers nothing while the record still waits for a connection', () => {
    const { container } = renderActions(
      queued({ status: 'pending', errorCode: undefined }),
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('discards the record from the device after confirming', async () => {
    await enqueueHarvest(userId, payload);
    renderActions(queued());

    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByRole('heading', {
        name: '¿Descartar la cosecha P05 · Lote del río · 14 oct.?',
      }),
    ).toBeInTheDocument();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Descartar registro' }),
    );

    await waitFor(async () =>
      expect(await getQueuedHarvest(userId, 'h1')).toBeNull(),
    );
  });
});
