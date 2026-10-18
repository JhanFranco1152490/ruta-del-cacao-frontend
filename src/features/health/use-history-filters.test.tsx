import { act, renderHook, waitFor } from '@testing-library/react';
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from 'nuqs/adapters/testing';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useHistoryFilters } from './use-history-filters';

async function setup(searchParams = '') {
  const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <NuqsTestingAdapter
      hasMemory
      onUrlUpdate={onUrlUpdate}
      searchParams={searchParams}
    >
      {children}
    </NuqsTestingAdapter>
  );
  const rendered = renderHook(() => useHistoryFilters(), { wrapper });
  // El adaptador de pruebas entrega el primer valor un instante después.
  await waitFor(() => expect(rendered.result.current).not.toBeNull());
  return { onUrlUpdate, ...rendered };
}

describe('useHistoryFilters', () => {
  it('reads everything from the URL', async () => {
    const { result } = await setup(
      '?finca=f1&parcela=pl1&productor=pr1&desde=2026-01-01&hasta=2026-10-31&plaga=otra&pagina=3',
    );

    expect(result.current.filters).toEqual({
      farm: 'f1',
      plot: 'pl1',
      producer: 'pr1',
      from: '2026-01-01',
      to: '2026-10-31',
      pest: 'otra',
    });
    expect(result.current.page).toBe(3);
    expect(result.current.hasFilters).toBe(true);
  });

  it('starts on the first page without filters', async () => {
    const { result } = await setup('');

    expect(result.current.page).toBe(1);
    expect(result.current.hasFilters).toBe(false);
  });

  it('drops a date that does not exist', async () => {
    const { result } = await setup('?desde=2026-02-30');

    expect(result.current.filters.from).toBeNull();
    expect(result.current.hasFilters).toBe(false);
  });

  it('writes each filter in the URL and goes back to the first page', async () => {
    const { result, onUrlUpdate } = await setup('?pagina=4');

    act(() => {
      void result.current.setFrom('2026-01-01');
    });
    await waitFor(() =>
      expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe(
        '?desde=2026-01-01',
      ),
    );
    act(() => {
      void result.current.setPest('monilia');
    });
    await waitFor(() =>
      expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe(
        '?desde=2026-01-01&plaga=monilia',
      ),
    );
  });

  it('forgets the plot when the farm changes: it belongs to the other one', async () => {
    const { result, onUrlUpdate } = await setup('?finca=f1&parcela=pl1');

    act(() => {
      void result.current.setFarm('f2');
    });

    await waitFor(() =>
      expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe('?finca=f2'),
    );
  });

  it('forgets the farm and the plot when the producer changes', async () => {
    const { result, onUrlUpdate } = await setup('?finca=f1&parcela=pl1');

    act(() => {
      void result.current.setProducer('pr2');
    });

    await waitFor(() =>
      expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe('?productor=pr2'),
    );
  });

  it('moves between pages and clears everything', async () => {
    const { result, onUrlUpdate } = await setup('?finca=f1&desde=2026-01-01');

    act(() => {
      void result.current.setPage(2);
    });
    await waitFor(() =>
      expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe(
        '?finca=f1&desde=2026-01-01&pagina=2',
      ),
    );

    act(() => {
      void result.current.clear();
    });
    await waitFor(() =>
      expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe(''),
    );
  });
});
