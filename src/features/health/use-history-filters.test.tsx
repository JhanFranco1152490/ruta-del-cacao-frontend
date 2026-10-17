import { act, renderHook, waitFor } from '@testing-library/react';
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from 'nuqs/adapters/testing';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useHistoryFilters } from './use-history-filters';

function setup(searchParams = '') {
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
  return { onUrlUpdate, ...renderHook(() => useHistoryFilters(), { wrapper }) };
}

describe('useHistoryFilters', () => {
  it('reads the period and the pest from the URL, keeping the plot', () => {
    const { result } = setup(
      '?id=pl1&desde=2026-01-01&hasta=2026-10-31&plaga=otra',
    );

    expect(result.current.filters).toEqual({
      from: '2026-01-01',
      to: '2026-10-31',
      pest: 'otra',
    });
    expect(result.current.hasFilters).toBe(true);
  });

  it('drops a date that does not exist', () => {
    const { result } = setup('?desde=2026-02-30');

    expect(result.current.filters.from).toBeNull();
    expect(result.current.hasFilters).toBe(false);
  });

  it('writes each filter in the URL and clears them all', async () => {
    const { result, onUrlUpdate } = setup('?id=pl1');

    act(() => result.current.setFrom('2026-01-01'));
    act(() => result.current.setPest('monilia'));
    await waitFor(() =>
      expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe(
        '?id=pl1&desde=2026-01-01&plaga=monilia',
      ),
    );

    act(() => result.current.clear());
    await waitFor(() =>
      expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe('?id=pl1'),
    );
  });
});
