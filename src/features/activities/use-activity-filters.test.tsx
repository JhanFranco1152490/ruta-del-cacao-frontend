import { act, renderHook, waitFor } from '@testing-library/react';
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from 'nuqs/adapters/testing';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useActivityFilters } from './use-activity-filters';

function setup(searchParams = '') {
  const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <NuqsTestingAdapter
      searchParams={searchParams}
      onUrlUpdate={onUrlUpdate}
      hasMemory
    >
      {children}
    </NuqsTestingAdapter>
  );
  return {
    onUrlUpdate,
    ...renderHook(() => useActivityFilters('u1'), { wrapper }),
  };
}

describe('useActivityFilters', () => {
  it('reads the three filters from the URL', () => {
    const { result } = setup('?parcela=p1&estado=overdue&responsable=u2');

    expect(result.current.filters).toEqual({
      farm: null,
      plot: 'p1',
      state: 'overdue',
      assignee: 'u2',
    });
    expect(result.current.hasFilters).toBe(true);
  });

  it('has no filters when the URL has none', () => {
    const { result } = setup();

    expect(result.current.filters).toEqual({
      farm: null,
      plot: null,
      state: null,
      assignee: null,
    });
    expect(result.current.hasFilters).toBe(false);
  });

  it('drops a state it does not know and an empty id', () => {
    const { result } = setup('?estado=zzz&parcela=&responsable=');

    expect(result.current.filters).toEqual({
      farm: null,
      plot: null,
      state: null,
      assignee: null,
    });
  });

  it('writes a filter in the URL and removes it', async () => {
    const { result, onUrlUpdate } = setup();

    act(() => void result.current.setPlot('p1'));
    await waitFor(() => expect(result.current.filters.plot).toBe('p1'));
    expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe('?parcela=p1');

    act(() => void result.current.setPlot(null));
    await waitFor(() => expect(result.current.filters.plot).toBeNull());
    expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe('');
  });

  it('sets the state and the assignee', async () => {
    const { result } = setup();

    act(() => void result.current.setState('delayed'));
    act(() => void result.current.setAssignee('u2'));

    await waitFor(() =>
      expect(result.current.filters).toMatchObject({
        state: 'delayed',
        assignee: 'u2',
      }),
    );
  });

  it('puts the person as assignee with the shortcut and takes it off the second time', async () => {
    const { result } = setup();
    expect(result.current.assignedToMe).toBe(false);

    act(() => void result.current.toggleAssignedToMe());
    await waitFor(() => expect(result.current.assignedToMe).toBe(true));
    expect(result.current.filters.assignee).toBe('u1');

    act(() => void result.current.toggleAssignedToMe());
    await waitFor(() => expect(result.current.assignedToMe).toBe(false));
    expect(result.current.filters.assignee).toBeNull();
  });

  it('replaces another assignee when the shortcut is touched', async () => {
    const { result } = setup('?responsable=u2');

    act(() => void result.current.toggleAssignedToMe());

    await waitFor(() => expect(result.current.filters.assignee).toBe('u1'));
  });

  it('reads the producer apart from the filters', () => {
    const { result } = setup('?productor=p9');

    expect(result.current.producer).toBe('p9');
    expect(result.current.hasFilters).toBe(false);
    expect(setup('?productor=').result.current.producer).toBeNull();
  });

  it('reads the farm and forgets the plot when the farm changes', async () => {
    const { result } = setup('?finca=f1&parcela=p1');
    expect(result.current.filters).toMatchObject({ farm: 'f1', plot: 'p1' });

    act(() => void result.current.setFarm('f2'));

    await waitFor(() => expect(result.current.filters.farm).toBe('f2'));
    expect(result.current.filters.plot).toBeNull();
  });

  it('forgets the plot and the assignee when the producer changes', async () => {
    const { result } = setup('?finca=f1&parcela=p1&responsable=u2&estado=done');

    act(() => void result.current.setProducer('p9'));

    await waitFor(() => expect(result.current.producer).toBe('p9'));
    expect(result.current.filters).toEqual({
      farm: null,
      plot: null,
      state: 'done',
      assignee: null,
    });
  });

  it('keeps the producer when the filters are cleared', async () => {
    const { result } = setup('?productor=p9&parcela=p1');

    act(() => void result.current.clear());

    await waitFor(() => expect(result.current.hasFilters).toBe(false));
    expect(result.current.producer).toBe('p9');
  });

  it('clears the three filters and keeps the rest of the URL', async () => {
    const { result, onUrlUpdate } = setup(
      '?mes=2026-10&vista=lista&parcela=p1&estado=done&responsable=u2',
    );

    act(() => void result.current.clear());

    await waitFor(() => expect(result.current.hasFilters).toBe(false));
    expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe(
      '?mes=2026-10&vista=lista',
    );
  });
});
