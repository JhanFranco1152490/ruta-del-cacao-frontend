import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { buildSession } from '@/test/factories';
import { createTestQueryClient } from '@/test/render';

import {
  enqueuePlotCreate,
  type PlotFormValues,
  type QueuedPlot,
} from './plot-queue';
import {
  usePlotCreate,
  usePlotDiscard,
  useQueuedPlots,
  useRefreshPlotsWhenQueueShrinks,
} from './use-plot-queue';

const values: PlotFormValues = {
  code: 'P1',
  area_hectares: '1.00',
  vertices: [],
};

function setup() {
  const userId = `plot-hooks-${crypto.randomUUID()}`;
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.session(), buildSession({ id: userId }));
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { userId, queryClient, wrapper };
}

describe('useQueuedPlots', () => {
  it('follows the plots of the farm as the queue changes', async () => {
    const { userId, wrapper } = setup();
    const { result } = renderHook(() => useQueuedPlots(userId, 'f1'), {
      wrapper,
    });
    await waitFor(() => expect(result.current.plots).toEqual([]));

    await enqueuePlotCreate(userId, 'pl1', 'f1', values);
    await waitFor(() => expect(result.current.plots).toHaveLength(1));
    await enqueuePlotCreate(userId, 'pl2', 'f2', values);

    expect(result.current.plots).toHaveLength(1);
  });
});

describe('usePlotCreate and usePlotDiscard', () => {
  it('saves the plot on the device and lets it be discarded', async () => {
    const { userId, wrapper } = setup();
    const create = renderHook(() => usePlotCreate(), { wrapper });

    await act(() =>
      create.result.current.mutateAsync({ id: 'pl1', farmId: 'f1', values }),
    );
    expect(await getOfflineDb(userId).queue.get('pl1')).toMatchObject({
      resource: 'plots',
      parentId: 'f1',
    });

    const discarding = renderHook(() => usePlotDiscard(), { wrapper });
    await act(() => discarding.result.current.mutateAsync('pl1'));

    expect(await getOfflineDb(userId).queue.get('pl1')).toBeUndefined();
  });
});

describe('useRefreshPlotsWhenQueueShrinks', () => {
  it('asks the server again when a plot leaves the queue', async () => {
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(queryKeys.plots.byFarm('f1'), { stale: true });
    const plot = (id: string) => ({ id, farmId: 'f1' }) as QueuedPlot;
    const { rerender } = renderHook(
      ({ plots }) => useRefreshPlotsWhenQueueShrinks('f1', plots),
      { wrapper, initialProps: { plots: [plot('pl1')] } },
    );
    expect(
      queryClient.getQueryState(queryKeys.plots.byFarm('f1'))?.isInvalidated,
    ).toBe(false);

    rerender({ plots: [] });

    await waitFor(() =>
      expect(
        queryClient.getQueryState(queryKeys.plots.byFarm('f1'))?.isInvalidated,
      ).toBe(true),
    );
  });
});
