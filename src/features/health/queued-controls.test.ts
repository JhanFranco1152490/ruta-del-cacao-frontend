import { describe, expect, it } from 'vitest';

import type { QueueItem } from '@/lib/offline/db';

import { CONTROL_RESOURCE, type ControlPayload } from './control-queue';
import { queuedControlActivity } from './queued-controls';

const plot = {
  id: 'pl1',
  code: 'P-03',
  is_active: true,
  farm: { id: 'f1', name: 'La Esperanza', is_active: true },
};

const payload = (
  request: Partial<ControlPayload['request']> = {},
): ControlPayload => ({
  request: {
    id: 'c1',
    mode: 'scheduled',
    scheduled_date: '2026-10-25',
    assignee_id: 'u1',
    ...request,
  },
  label: 'Monilia · P-03',
  context: {
    plot,
    producerId: 'p1',
    assigneeName: 'Carlos Rincón',
  },
});

const item = (
  overrides: Partial<QueueItem> = {},
  request: Partial<ControlPayload['request']> = {},
): QueueItem => ({
  id: 'phytosanitary-control:c1',
  resource: CONTROL_RESOURCE,
  operation: 'create',
  parentId: 'd1',
  payload: payload(request),
  status: 'pending',
  createdAt: Date.parse('2026-10-22T15:00:00Z'),
  updatedAt: 0,
  ...overrides,
});

describe('queuedControlActivity', () => {
  it('shows a control for later as a scheduled control on its date', () => {
    expect(queuedControlActivity(item())).toMatchObject({
      id: 'c1',
      activity_type: 'phytosanitary_control',
      scheduled_date: '2026-10-25',
      status: 'scheduled',
      plot,
      producer_id: 'p1',
      assignee: { id: 'u1', full_name: 'Carlos Rincón', is_active: true },
      created_at: '2026-10-22T15:00:00.000Z',
    });
  });

  it('leaves out a control already done, one rejected and one saved without its context', () => {
    expect(
      queuedControlActivity(
        item({}, { mode: 'done', scheduled_date: undefined }),
      ),
    ).toBeNull();
    expect(queuedControlActivity(item({ status: 'error' }))).toBeNull();
    expect(
      queuedControlActivity(
        item({ payload: { ...payload(), context: undefined } }),
      ),
    ).toBeNull();
  });
});
