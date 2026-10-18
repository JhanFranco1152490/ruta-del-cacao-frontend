import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { discard } from '@/lib/offline/sync-queue';

import { controlQueueId, enqueueControl } from './control-queue';
import { useQueuedControlActivities } from './use-queued-controls';

describe('useQueuedControlActivities', () => {
  it('follows the controls scheduled in the device while they wait', async () => {
    const userId = `queued-controls-${crypto.randomUUID()}`;
    const { result } = renderHook(() => useQueuedControlActivities(userId));
    expect(result.current).toEqual([]);

    await enqueueControl(userId, 'd1', {
      request: {
        id: 'c1',
        mode: 'scheduled',
        scheduled_date: '2026-10-25',
        assignee_id: 'u1',
      },
      label: 'Monilia · P-03',
      context: {
        plot: {
          id: 'pl1',
          code: 'P-03',
          name: null,
          is_active: true,
          farm: {
            id: 'f1',
            code: 'F01',
            name: 'La Esperanza',
            is_active: true,
          },
        },
        producerId: 'p1',
        assigneeName: 'Carlos Rincón',
      },
    });

    await waitFor(() =>
      expect(result.current.map(({ id }) => id)).toEqual(['c1']),
    );

    await discard(userId, controlQueueId('c1'));

    await waitFor(() => expect(result.current).toEqual([]));
  });
});
