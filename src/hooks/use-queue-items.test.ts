import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { getOfflineDb, type QueueItem } from '@/lib/offline/db';

import { useQueueItems } from './use-queue-items';

const someone = () => `queue-${crypto.randomUUID()}`;
const item = (overrides: Partial<QueueItem>): QueueItem => ({
  id: crypto.randomUUID(),
  resource: 'farms',
  operation: 'create',
  payload: {},
  status: 'pending',
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

describe('useQueueItems', () => {
  it('lists the failed items first, then the most recent', async () => {
    const userId = someone();
    await getOfflineDb(userId).queue.bulkAdd([
      item({ id: 'old', updatedAt: 1 }),
      item({ id: 'new', updatedAt: 3 }),
      item({ id: 'failed', status: 'error', updatedAt: 2 }),
    ]);

    const { result } = renderHook(() => useQueueItems(userId));

    await waitFor(() =>
      expect(result.current?.map((i) => i.id)).toEqual([
        'failed',
        'new',
        'old',
      ]),
    );
  });

  it('follows the queue as it changes', async () => {
    const userId = someone();
    const { result } = renderHook(() => useQueueItems(userId));
    await waitFor(() => expect(result.current).toEqual([]));

    await getOfflineDb(userId).queue.add(item({ id: 'a' }));

    await waitFor(() =>
      expect(result.current?.map((i) => i.id)).toEqual(['a']),
    );
  });

  it('never shows the queue of the previous person while reading the new one', async () => {
    const before = someone();
    await getOfflineDb(before).queue.add(item({ id: 'ajeno' }));
    const { result, rerender } = renderHook(
      ({ userId }) => useQueueItems(userId),
      { initialProps: { userId: before } },
    );
    await waitFor(() => expect(result.current).toHaveLength(1));

    rerender({ userId: someone() });

    expect(result.current).toBeUndefined();
  });
});
