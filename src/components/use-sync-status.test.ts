import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { getOfflineDb } from '@/lib/offline/db';
import { recordLogin } from '@/lib/offline/session-clock';

import { useSyncStatus } from './use-sync-status';

function randomUserId() {
  return `test-${Math.random().toString(36).slice(2)}`;
}

describe('useSyncStatus', () => {
  it('counts pending and error items reactively', async () => {
    const userId = randomUserId();
    await recordLogin(userId);
    const db = getOfflineDb(userId);

    const { result } = renderHook(() => useSyncStatus(userId));
    await waitFor(() => expect(result.current.pendingCount).toBe(0));

    await db.queue.add({
      id: 'a1',
      resource: 'farms',
      operation: 'create',
      payload: {},
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await waitFor(() => expect(result.current.pendingCount).toBe(1));

    await db.queue.update('a1', {
      status: 'error',
      errorCode: 'stale_version',
    });
    await waitFor(() => {
      expect(result.current.pendingCount).toBe(0);
      expect(result.current.errorCount).toBe(1);
    });
  });

  it('reflects the offline window of the signed-in user', async () => {
    const userId = randomUserId();
    await recordLogin(userId);

    const { result } = renderHook(() => useSyncStatus(userId));

    await waitFor(() =>
      expect(result.current.isWithinOfflineWindow).toBe(true),
    );
  });

  it('returns the default status without a signed-in user', () => {
    const { result } = renderHook(() => useSyncStatus(undefined));

    expect(result.current).toEqual({
      isOnline: true,
      pendingCount: 0,
      errorCount: 0,
      isWithinOfflineWindow: true,
    });
  });
});
