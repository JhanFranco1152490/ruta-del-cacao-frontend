import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { QueueView } from '@/components/sync-tray/queue-view';
import { notify } from '@/lib/notify';
import type { SyncAdapter } from '@/lib/offline/adapters';
import type { QueueItem } from '@/lib/offline/db';
import { onItemRejected } from '@/lib/offline/sync-queue';

import { useNotifyRejected } from './use-notify-rejected';

vi.mock('@/lib/offline/sync-queue', async (original) => {
  const actual = await original<typeof import('@/lib/offline/sync-queue')>();
  return { ...actual, onItemRejected: vi.fn() };
});

const views: QueueView[] = [
  {
    resource: 'plots',
    kind: 'Parcela',
    title: (item) => String((item.payload as { code: string }).code),
    Actions: () => null,
  },
];

let emit: (item: QueueItem) => void;
let stopListening: ReturnType<typeof vi.fn>;

const rejected = (overrides: Partial<QueueItem> = {}) =>
  ({
    id: 'pl1',
    resource: 'plots',
    status: 'error',
    errorMessage: 'Ya existe una parcela con este código.',
    payload: { code: 'P2' },
    ...overrides,
  }) as QueueItem;

beforeEach(() => {
  stopListening = vi.fn();
  vi.mocked(onItemRejected).mockImplementation((listener) => {
    emit = (item) => listener(item, {} as SyncAdapter);
    return stopListening as unknown as () => void;
  });
  vi.spyOn(notify, 'error').mockImplementation(() => '');
});

afterEach(() => vi.restoreAllMocks());

describe('useNotifyRejected', () => {
  it('names the record, gives the reason and offers to open the tray', () => {
    const openTray = vi.fn();
    renderHook(() => useNotifyRejected(views, openTray));

    emit(rejected());

    expect(notify.error).toHaveBeenCalledWith(
      'El servidor no aceptó parcela P2',
      {
        description: 'Ya existe una parcela con este código.',
        action: { label: 'Revisar', onClick: expect.any(Function) },
      },
    );
    vi.mocked(notify.error).mock.calls[0][1]!.action!.onClick();
    expect(openTray).toHaveBeenCalledOnce();
  });

  it('still warns about a resource whose view is not registered', () => {
    renderHook(() => useNotifyRejected(views, vi.fn()));

    emit(rejected({ resource: 'otro' }));

    expect(notify.error).toHaveBeenCalledWith(
      'El servidor no aceptó un registro',
      expect.anything(),
    );
  });

  it('uses the latest tray opener without listening again', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ open }) => useNotifyRejected(views, open),
      { initialProps: { open: first } },
    );
    rerender({ open: second });

    emit(rejected());
    vi.mocked(notify.error).mock.calls[0][1]!.action!.onClick();

    expect(onItemRejected).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledOnce();
    expect(first).not.toHaveBeenCalled();
  });

  it('stops listening on unmount', () => {
    const { unmount } = renderHook(() => useNotifyRejected(views, vi.fn()));

    unmount();

    expect(stopListening).toHaveBeenCalled();
  });
});
