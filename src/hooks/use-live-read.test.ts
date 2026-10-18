import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { getOfflineDb, type QueueItem } from '@/lib/offline/db';

import { useLiveRead } from './use-live-read';

const someone = () => `live-read-${crypto.randomUUID()}`;
const item = (id: string): QueueItem => ({
  id,
  resource: 'farms',
  operation: 'create',
  payload: {},
  status: 'pending',
  createdAt: 1,
  updatedAt: 1,
});

const idsOf = (userId: string) => async () =>
  (await getOfflineDb(userId).queue.toArray()).map(({ id }) => id);

describe('useLiveRead', () => {
  it('reads again when what it read changes', async () => {
    const userId = someone();
    await getOfflineDb(userId).queue.add(item('a'));
    const { result } = renderHook(() => useLiveRead(userId, idsOf(userId), []));
    await waitFor(() => expect(result.current).toEqual(['a']));

    await getOfflineDb(userId).queue.add(item('b'));

    await waitFor(() => expect(result.current).toEqual(['a', 'b']));
  });

  it('never returns the previous reading while the new one arrives', async () => {
    const before = someone();
    const after = someone();
    await getOfflineDb(before).queue.add(item('ajeno'));
    const { result, rerender } = renderHook(
      ({ userId }) => useLiveRead(userId, idsOf(userId), []),
      { initialProps: { userId: before } },
    );
    await waitFor(() => expect(result.current).toEqual(['ajeno']));

    rerender({ userId: after });

    expect(result.current).toBeUndefined();
    await waitFor(() => expect(result.current).toEqual([]));
  });

  it('reads nothing without a key', () => {
    const { result } = renderHook(() =>
      useLiveRead(undefined, async () => ['a'], []),
    );

    expect(result.current).toBeUndefined();
  });

  it('gives the fallback when the reading fails', async () => {
    const userId = someone();
    const { result } = renderHook(() =>
      useLiveRead(userId, () => Promise.reject(new Error('sin base')), [
        'vacío',
      ]),
    );

    await waitFor(() => expect(result.current).toEqual(['vacío']));
  });
});
