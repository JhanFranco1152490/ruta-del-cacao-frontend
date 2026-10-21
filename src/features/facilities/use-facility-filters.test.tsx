import { act, renderHook } from '@testing-library/react';
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from 'nuqs/adapters/testing';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useFacilityFilters } from './use-facility-filters';

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
    ...renderHook(() => useFacilityFilters(), { wrapper }),
  };
}

const lastQuery = (onUrlUpdate: ReturnType<typeof setup>['onUrlUpdate']) =>
  onUrlUpdate.mock.lastCall?.[0].queryString;

describe('useFacilityFilters', () => {
  it('shows everything, with no farm chosen, by default', () => {
    const { result } = setup();

    expect(result.current.filters).toEqual({ type: 'all', status: 'all' });
    expect(result.current.farm).toBeNull();
    expect(result.current.element).toBeNull();
    expect(result.current.producer).toBeNull();
  });

  it('reads the farm and the filters from the URL', () => {
    const { result } = setup(
      '?finca=f1&tipo=solar_dryer&estado=occupied&productor=p1&elemento=fc1',
    );

    expect(result.current.filters).toEqual({
      type: 'solar_dryer',
      status: 'occupied',
    });
    expect(result.current.farm).toBe('f1');
    expect(result.current.producer).toBe('p1');
    expect(result.current.element).toBe('fc1');
  });

  it('falls back to defaults for malformed parameters', () => {
    const { result } = setup('?tipo=bodega&estado=zzz&finca=&productor=');

    expect(result.current.filters).toEqual({ type: 'all', status: 'all' });
    expect(result.current.farm).toBeNull();
    expect(result.current.producer).toBeNull();
  });

  it('writes each filter to the URL in Spanish', async () => {
    const { result, onUrlUpdate } = setup('?finca=f1');

    await act(() => result.current.setType('fermentation_box'));
    await act(() => result.current.setStatus('inactive'));

    expect(lastQuery(onUrlUpdate)).toBe(
      '?finca=f1&tipo=fermentation_box&estado=inactive',
    );
  });

  it('leaves out of the URL a filter that shows everything', async () => {
    const { result, onUrlUpdate } = setup('?finca=f1&tipo=solar_dryer');

    await act(() => result.current.setType('all'));

    expect(lastQuery(onUrlUpdate)).toBe('?finca=f1');
  });

  it('clears the filters and keeps the farm', async () => {
    const { result, onUrlUpdate } = setup(
      '?finca=f1&tipo=solar_dryer&estado=inactive',
    );

    await act(() => result.current.clear());

    expect(lastQuery(onUrlUpdate)).toBe('?finca=f1');
  });

  it('opens a farm keeping the filters', async () => {
    const { result, onUrlUpdate } = setup('?finca=f1&tipo=solar_dryer');

    await act(() => result.current.openFarm('f2'));

    expect(lastQuery(onUrlUpdate)).toBe('?finca=f2&tipo=solar_dryer');
  });

  it('forgets the farm when the producer changes', async () => {
    const { result, onUrlUpdate } = setup('?productor=p1&finca=f1');

    await act(() => result.current.setProducer('p2'));

    expect(lastQuery(onUrlUpdate)).toBe('?productor=p2');
  });

  it('opens and closes a facility', async () => {
    const { result, onUrlUpdate } = setup('?finca=f1');

    await act(() => result.current.showElement('fc1'));
    expect(lastQuery(onUrlUpdate)).toBe('?finca=f1&elemento=fc1');

    await act(() => result.current.showElement(null));
    expect(lastQuery(onUrlUpdate)).toBe('?finca=f1');
  });
});
