import { act, renderHook, waitFor } from '@testing-library/react';
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from 'nuqs/adapters/testing';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useInputFilters } from './use-input-filters';

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
    ...renderHook(() => useInputFilters(), { wrapper }),
  };
}

const lastQuery = (onUrlUpdate: ReturnType<typeof setup>['onUrlUpdate']) =>
  onUrlUpdate.mock.lastCall?.[0].queryString;

describe('useInputFilters', () => {
  it('shows the active inputs of the own producer by default', () => {
    const { result } = setup();

    expect(result.current.filters).toEqual({
      search: '',
      type: '',
      status: 'active',
    });
    expect(result.current.producer).toBeNull();
  });

  it('reads the filters from the URL', () => {
    const { result } = setup(
      '?buscar=urea&tipo=fertilizer&estado=inactive&productor=p-1',
    );

    expect(result.current.filters).toEqual({
      search: 'urea',
      type: 'fertilizer',
      status: 'inactive',
    });
    expect(result.current.producer).toBe('p-1');
  });

  it('falls back to defaults for malformed parameters', () => {
    const { result } = setup('?tipo=herbicide&estado=zzz&productor=');

    expect(result.current.filters).toEqual({
      search: '',
      type: '',
      status: 'active',
    });
    expect(result.current.producer).toBeNull();
  });

  it('writes each filter to the URL in Spanish', async () => {
    const { result, onUrlUpdate } = setup();

    act(() => {
      result.current.setSearch('urea');
      result.current.setType('fungicide');
      result.current.setStatus('all');
      result.current.setProducer('p-1');
    });

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const query = new URLSearchParams(lastQuery(onUrlUpdate));
    expect(Object.fromEntries(query)).toEqual({
      buscar: 'urea',
      tipo: 'fungicide',
      estado: 'all',
      productor: 'p-1',
    });
  });

  it('leaves the default status and empty filters out of the URL', async () => {
    const { result, onUrlUpdate } = setup('?buscar=urea&tipo=other');

    act(() => {
      result.current.setSearch('');
      result.current.setType('');
      result.current.setStatus('active');
    });

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    expect(lastQuery(onUrlUpdate)).toBe('');
  });

  it('clears the filters but keeps the chosen producer', async () => {
    const { result, onUrlUpdate } = setup(
      '?buscar=urea&tipo=other&estado=inactive&productor=p-1',
    );

    act(() => {
      result.current.clear();
    });

    await waitFor(() => expect(result.current.filters.search).toBe(''));
    expect(result.current.filters).toEqual({
      search: '',
      type: '',
      status: 'active',
    });
    expect(lastQuery(onUrlUpdate)).toBe('?productor=p-1');
  });

  it('shows an existing input whatever its status', async () => {
    const { result } = setup('?buscar=cobre&tipo=fungicide');

    act(() => {
      result.current.showInput({
        name: 'Urea 46 %',
        input_type: 'fertilizer',
      });
    });

    await waitFor(() =>
      expect(result.current.filters).toEqual({
        search: 'Urea 46 %',
        type: 'fertilizer',
        status: 'all',
      }),
    );
  });
});
