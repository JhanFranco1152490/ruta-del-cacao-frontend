import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SyncAdapter } from '@/lib/offline/adapters';
import {
  clearAdapters,
  enqueue,
  processQueue,
  registerAdapter,
} from '@/lib/offline/sync-queue';
import { createTestQueryClient } from '@/test/render';

import { useRefreshAfterSync } from './use-refresh-after-sync';

const SYNCED_KEY = ['plots', 'farm', 'f1'];
const OTHER_KEY = ['plots', 'farm', 'f2'];

const adapter: SyncAdapter = {
  resource: 'plots',
  send: vi.fn().mockResolvedValue(undefined),
  parseConflict: () => null,
  refreshAfterSync: (item) => [['plots', 'farm', item.parentId]],
};

afterEach(() => clearAdapters());

function setup() {
  const userId = `refresh-${crypto.randomUUID()}`;
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(SYNCED_KEY, []);
  queryClient.setQueryData(OTHER_KEY, []);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  registerAdapter(adapter);
  const isInvalidated = (key: unknown[]) =>
    queryClient.getQueryState(key)?.isInvalidated;
  return { userId, wrapper, isInvalidated };
}

const enqueuePlot = (userId: string) =>
  enqueue(userId, {
    id: 'pl1',
    resource: 'plots',
    operation: 'create',
    parentId: 'f1',
    payload: {},
  });

describe('useRefreshAfterSync', () => {
  it('asks again for what a record changed once it reaches the server', async () => {
    const { userId, wrapper, isInvalidated } = setup();
    renderHook(() => useRefreshAfterSync(), { wrapper });
    await enqueuePlot(userId);

    await processQueue(userId);

    await waitFor(() => expect(isInvalidated(SYNCED_KEY)).toBe(true));
    expect(isInvalidated(OTHER_KEY)).toBe(false);
  });

  it('stops listening once unmounted', async () => {
    const { userId, wrapper, isInvalidated } = setup();
    const { unmount } = renderHook(() => useRefreshAfterSync(), { wrapper });
    unmount();
    await enqueuePlot(userId);

    await processQueue(userId);

    expect(isInvalidated(SYNCED_KEY)).toBe(false);
  });
});
