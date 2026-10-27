import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { notify } from '@/lib/notify';
import type { SyncAdapter, SyncNotice } from '@/lib/offline/adapters';
import type { QueueItem } from '@/lib/offline/db';
import { onItemSynced } from '@/lib/offline/sync-queue';

import { useNotifyDeviations } from './use-notify-deviations';

vi.mock('@/lib/offline/sync-queue', async (original) => {
  const actual = await original<typeof import('@/lib/offline/sync-queue')>();
  return { ...actual, onItemSynced: vi.fn() };
});

let emit: (adapter: SyncAdapter) => void;
const stop = vi.fn();
const item = { id: 'x', operation: 'create' } as QueueItem;

const adapterGiving = (notice?: SyncNotice | null) =>
  ({
    syncNotice: notice === undefined ? undefined : () => notice,
  }) as unknown as SyncAdapter;

beforeEach(() => {
  vi.mocked(onItemSynced).mockImplementation((listener) => {
    emit = (adapter) => listener(item, adapter, {});
    return stop;
  });
  vi.spyOn(notify, 'warning').mockImplementation(() => '');
});

afterEach(() => vi.restoreAllMocks());

describe('useNotifyDeviations', () => {
  it('warns about what the server found in each record that arrives', () => {
    renderHook(() => useNotifyDeviations());

    emit(
      adapterGiving({
        title: 'Volteo 3 guardado · Grano demasiado ácido: pH 3,90',
        description: 'La fermentación no avanza: pH 6,10',
        critical: false,
      }),
    );

    expect(notify.warning).toHaveBeenCalledOnce();
    expect(notify.warning).toHaveBeenCalledWith(
      'Volteo 3 guardado · Grano demasiado ácido: pH 3,90',
      { description: 'La fermentación no avanza: pH 6,10', persistent: false },
    );
  });

  it('keeps a critical one on screen', () => {
    renderHook(() => useNotifyDeviations());

    emit(adapterGiving({ title: 'Sobresecado', critical: true }));

    expect(notify.warning).toHaveBeenCalledWith('Sobresecado', {
      description: undefined,
      persistent: true,
    });
  });

  it('says nothing for a record without findings or a resource without notices', () => {
    renderHook(() => useNotifyDeviations());

    emit(adapterGiving(null));
    emit(adapterGiving());

    expect(notify.warning).not.toHaveBeenCalled();
  });

  it('stops listening when it unmounts', () => {
    const { unmount } = renderHook(() => useNotifyDeviations());

    unmount();

    expect(stop).toHaveBeenCalledOnce();
  });
});
