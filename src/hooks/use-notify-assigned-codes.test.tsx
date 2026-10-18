import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { notify } from '@/lib/notify';
import type { AssignedCode, SyncAdapter } from '@/lib/offline/adapters';
import type { QueueItem } from '@/lib/offline/db';
import { onItemSynced } from '@/lib/offline/sync-queue';

import { BATCH_MS } from './use-notify-after-sync';
import { useNotifyAssignedCodes } from './use-notify-assigned-codes';

vi.mock('@/lib/offline/sync-queue', async (original) => {
  const actual = await original<typeof import('@/lib/offline/sync-queue')>();
  return { ...actual, onItemSynced: vi.fn() };
});

let emit: (adapter: SyncAdapter, response: unknown) => void;
const item = { id: 'x', operation: 'create' } as QueueItem;

const adapterGiving = (code: AssignedCode | null) =>
  ({ assignedCode: () => code }) as unknown as SyncAdapter;

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(onItemSynced).mockImplementation((listener) => {
    emit = (adapter, response) => listener(item, adapter, response);
    return () => {};
  });
  vi.spyOn(notify, 'success').mockImplementation(() => '');
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useNotifyAssignedCodes', () => {
  it('tells the code the server gave, once the batch stops arriving', async () => {
    renderHook(() => useNotifyAssignedCodes());

    emit(
      adapterGiving({ kind: 'plot', code: 'P05', name: 'Lote del río' }),
      {},
    );
    expect(notify.success).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(BATCH_MS);

    expect(notify.success).toHaveBeenCalledOnce();
    expect(notify.success).toHaveBeenCalledWith(
      'La parcela Lote del río quedó con el código P05',
    );
  });

  it('gives one notice per kind for a batch', async () => {
    renderHook(() => useNotifyAssignedCodes());

    emit(adapterGiving({ kind: 'plot', code: 'P05', name: null }), {});
    emit(adapterGiving({ kind: 'plot', code: 'P06', name: 'La loma' }), {});
    emit(adapterGiving({ kind: 'farm', code: 'F03', name: 'El Diviso' }), {});
    await vi.advanceTimersByTimeAsync(BATCH_MS);

    expect(notify.success).toHaveBeenCalledTimes(2);
    expect(notify.success).toHaveBeenCalledWith(
      '2 parcelas recibieron su código: P05 y P06 · La loma',
    );
    expect(notify.success).toHaveBeenCalledWith(
      'La finca El Diviso quedó con el código F03',
    );
  });

  it('says nothing for a record that got no code', async () => {
    renderHook(() => useNotifyAssignedCodes());

    emit(adapterGiving(null), {});
    emit({} as SyncAdapter, {});
    await vi.advanceTimersByTimeAsync(BATCH_MS);

    expect(notify.success).not.toHaveBeenCalled();
  });
});
