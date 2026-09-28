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

  it('turns the offline window off once the 7-day mark passes', async () => {
    const userId = randomUserId();
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    await recordLogin(userId, eightDaysAgo);

    const { result } = renderHook(() => useSyncStatus(userId));

    await waitFor(() =>
      expect(result.current.isWithinOfflineWindow).toBe(false),
    );
  });

  it('updates isOnline when the browser goes offline and back online', async () => {
    const userId = randomUserId();
    await recordLogin(userId);

    const { result } = renderHook(() => useSyncStatus(userId));
    await waitFor(() => expect(result.current.isOnline).toBe(true));

    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    });
    window.dispatchEvent(new Event('offline'));
    await waitFor(() => expect(result.current.isOnline).toBe(false));

    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true,
    });
    window.dispatchEvent(new Event('online'));
    await waitFor(() => expect(result.current.isOnline).toBe(true));
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
