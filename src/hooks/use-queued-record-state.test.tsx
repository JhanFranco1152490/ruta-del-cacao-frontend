import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { getOfflineDb } from '@/lib/offline/db';
import { enqueue } from '@/lib/offline/sync-queue';

import { useQueuedRecordState } from './use-queued-record-state';

const someone = () => `queued-state-${crypto.randomUUID()}`;

const enqueueRecord = (userId: string, id = 'rec-1') =>
  enqueue(userId, { id, resource: 'farms', operation: 'create', payload: {} });

describe('useQueuedRecordState', () => {
  it('starts as pending, which is what a record just saved is', () => {
    const { result } = renderHook(() =>
      useQueuedRecordState(someone(), 'rec-1'),
    );

    expect(result.current).toEqual({ status: 'pending' });
  });

  it('stays pending while the record waits in the queue', async () => {
    const userId = someone();
    await enqueueRecord(userId);

    const { result } = renderHook(() => useQueuedRecordState(userId, 'rec-1'));

    await waitFor(() => expect(result.current.status).toBe('pending'));
  });

  it('turns to the error the server gave when the record lands in the tray', async () => {
    const userId = someone();
    await enqueueRecord(userId);
    const { result } = renderHook(() => useQueuedRecordState(userId, 'rec-1'));

    await act(() =>
      getOfflineDb(userId).queue.update('rec-1', {
        status: 'error',
        errorMessage: 'El nombre ya existe.',
      }),
    );

    await waitFor(() =>
      expect(result.current).toEqual({
        status: 'error',
        errorMessage: 'El nombre ya existe.',
      }),
    );
  });

  it('says synced once the record leaves the queue, because it reached the server', async () => {
    const userId = someone();
    await enqueueRecord(userId);
    const { result } = renderHook(() => useQueuedRecordState(userId, 'rec-1'));
    await waitFor(() => expect(result.current.status).toBe('pending'));

    await act(() => getOfflineDb(userId).queue.delete('rec-1'));

    await waitFor(() => expect(result.current).toEqual({ status: 'synced' }));
  });

  it('follows only its own record', async () => {
    const userId = someone();
    await enqueueRecord(userId, 'rec-1');
    await enqueueRecord(userId, 'rec-2');
    const { result } = renderHook(() => useQueuedRecordState(userId, 'rec-1'));
    await waitFor(() => expect(result.current.status).toBe('pending'));

    await act(() => getOfflineDb(userId).queue.delete('rec-2'));

    expect(result.current).toEqual({ status: 'pending' });
  });

  it('does not read anything without a user', () => {
    const { result } = renderHook(() =>
      useQueuedRecordState(undefined, 'rec-1'),
    );

    expect(result.current).toEqual({ status: 'pending' });
  });
});
