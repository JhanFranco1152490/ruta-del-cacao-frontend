import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import type { QueueItem } from '@/lib/offline/db';
import { buildSession } from '@/test/factories';
import { createTestQueryClient, renderWithProviders } from '@/test/render';

import { EVIDENCE_RESOURCE, evidenceQueueId } from './evidence-queue';
import { evidenceQueueView } from './evidence-queue-view';

const queued = (overrides: Partial<QueueItem> = {}): QueueItem => ({
  id: evidenceQueueId('e1'),
  resource: EVIDENCE_RESOURCE,
  operation: 'create',
  parentId: 'monitoring-result:a1',
  payload: {
    id: 'e1',
    activityId: 'a1',
    kind: 'monitoring',
    blob: new Blob(['foto']),
    fileName: 'mazorca.jpg',
    capturedAt: '2026-10-19T15:20:00Z',
    label: 'P-03 · 19 de octubre',
  },
  status: 'error',
  errorCode: 'evidence_limit_reached',
  errorMessage: 'Ya tiene 5 fotos, el máximo.',
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

function renderActions(item: QueueItem) {
  const { Actions } = evidenceQueueView;
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.session(), buildSession());
  return renderWithProviders(<Actions item={item} onNavigate={() => {}} />, {
    queryClient,
  });
}

describe('evidenceQueueView', () => {
  it('names the photo by what it backs', () => {
    expect(evidenceQueueView.kind).toBe('Foto');
    expect(evidenceQueueView.title(queued())).toBe('P-03 · 19 de octubre');
  });

  it('only discards a rejected photo', () => {
    renderActions(queued());

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeVisible();
  });

  it('offers nothing while the photo still waits for a connection', () => {
    const { container } = renderActions(
      queued({ status: 'pending', errorCode: undefined }),
    );

    expect(container).toBeEmptyDOMElement();
  });
});
