import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { notify } from '@/lib/notify';
import type { SyncAdapter } from '@/lib/offline/adapters';
import type { QueueItem } from '@/lib/offline/db';
import { clearAdapters, onItemSynced } from '@/lib/offline/sync-queue';

import {
  BATCH_MS,
  useNotifyAfterSync,
  WAITED_MS,
} from './use-notify-after-sync';

vi.mock('@/lib/offline/sync-queue', async (original) => {
  const actual = await original<typeof import('@/lib/offline/sync-queue')>();
  return { ...actual, onItemSynced: vi.fn() };
});

const adapter = {} as SyncAdapter;
let emit: (item: QueueItem) => void;
let stopListening: ReturnType<typeof vi.fn>;

const itemCreated = (agoMs: number) =>
  ({ createdAt: Date.now() - agoMs }) as QueueItem;

beforeEach(() => {
  vi.useFakeTimers();
  stopListening = vi.fn();
  vi.mocked(onItemSynced).mockImplementation((listener) => {
    emit = (item) => listener(item, adapter);
    return stopListening as unknown as () => void;
  });
  vi.spyOn(notify, 'success').mockImplementation(() => '');
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  clearAdapters();
});

describe('useNotifyAfterSync', () => {
  it('gives one notice with the total once the batch stops arriving', async () => {
    renderHook(() => useNotifyAfterSync());

    emit(itemCreated(WAITED_MS + 1));
    await vi.advanceTimersByTimeAsync(BATCH_MS - 100);
    emit(itemCreated(WAITED_MS * 5));
    await vi.advanceTimersByTimeAsync(BATCH_MS - 100);
    expect(notify.success).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(200);

    expect(notify.success).toHaveBeenCalledTimes(1);
    expect(notify.success).toHaveBeenCalledWith('Se enviaron 2 registros');
  });

  it('uses the singular for a single record', async () => {
    renderHook(() => useNotifyAfterSync());

    emit(itemCreated(WAITED_MS * 2));
    await vi.advanceTimersByTimeAsync(BATCH_MS);

    expect(notify.success).toHaveBeenCalledWith('Se envió 1 registro');
  });

  it('stays quiet for a record that was sent right after saving', async () => {
    renderHook(() => useNotifyAfterSync());

    emit(itemCreated(500));
    await vi.advanceTimersByTimeAsync(BATCH_MS * 2);

    expect(notify.success).not.toHaveBeenCalled();
  });

  it('starts counting again after a notice', async () => {
    renderHook(() => useNotifyAfterSync());

    emit(itemCreated(WAITED_MS * 2));
    await vi.advanceTimersByTimeAsync(BATCH_MS);
    emit(itemCreated(WAITED_MS * 2));
    await vi.advanceTimersByTimeAsync(BATCH_MS);

    expect(notify.success).toHaveBeenNthCalledWith(2, 'Se envió 1 registro');
  });

  it('stops listening and drops a pending notice on unmount', async () => {
    const { unmount } = renderHook(() => useNotifyAfterSync());

    emit(itemCreated(WAITED_MS * 2));
    unmount();
    await vi.advanceTimersByTimeAsync(BATCH_MS * 2);

    expect(stopListening).toHaveBeenCalled();
    expect(notify.success).not.toHaveBeenCalled();
  });
});
