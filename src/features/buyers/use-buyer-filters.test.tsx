import { act, renderHook } from '@testing-library/react';
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from 'nuqs/adapters/testing';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useBuyerFilters } from './use-buyer-filters';

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
    ...renderHook(() => useBuyerFilters(), { wrapper }),
  };
}

const lastQuery = (onUrlUpdate: ReturnType<typeof setup>['onUrlUpdate']) =>
  onUrlUpdate.mock.lastCall?.[0].queryString;

describe('useBuyerFilters', () => {
  it('shows the active buyers, with nothing searched, by default', () => {
    const { result } = setup();

    expect(result.current.filters).toEqual({
      search: '',
      type: '',
      status: 'active',
    });
    expect(result.current.producer).toBeNull();
    expect(result.current.buyer).toBeNull();
  });

  it('reads the filters, the producer and the open buyer from the URL', () => {
    const { result } = setup(
      '?buscar=oriente&tipo=exporter&estado=all&productor=p1&comprador=b1',
    );

    expect(result.current.filters).toEqual({
      search: 'oriente',
      type: 'exporter',
      status: 'all',
    });
    expect(result.current.producer).toBe('p1');
    expect(result.current.buyer).toBe('b1');
  });

  it('falls back to defaults for malformed parameters', () => {
    const { result } = setup(
      '?tipo=exportador&estado=zzz&productor=&comprador=',
    );

    expect(result.current.filters).toEqual({
      search: '',
      type: '',
      status: 'active',
    });
    expect(result.current.producer).toBeNull();
    expect(result.current.buyer).toBeNull();
  });

  it('writes the filters in Spanish and leaves the defaults out', async () => {
    const { result, onUrlUpdate } = setup();

    await act(() => result.current.setType('cooperative'));
    await act(() => result.current.setStatus('inactive'));
    await act(() => result.current.setSearch('acopio'));

    expect(lastQuery(onUrlUpdate)).toBe(
      '?tipo=cooperative&estado=inactive&buscar=acopio',
    );

    await act(() => result.current.setStatus('active'));
    await act(() => result.current.setType(''));
    await act(() => result.current.setSearch(''));

    expect(lastQuery(onUrlUpdate)).toBe('');
  });

  it('clears the filters but keeps the producer', async () => {
    const { result, onUrlUpdate } = setup(
      '?productor=p1&buscar=x&tipo=exporter&estado=all',
    );

    await act(() => result.current.clear());

    expect(lastQuery(onUrlUpdate)).toBe('?productor=p1');
  });

  it('closes the open buyer when the producer changes', async () => {
    const { result, onUrlUpdate } = setup('?productor=p1&comprador=b1');

    await act(() => result.current.setProducer('p2'));

    expect(lastQuery(onUrlUpdate)).toBe('?productor=p2');
  });

  it('reveals a buyer clearing the filters that could hide it', async () => {
    const { result, onUrlUpdate } = setup(
      '?productor=p1&buscar=x&tipo=exporter',
    );

    await act(() => result.current.revealBuyer('b4'));

    expect(lastQuery(onUrlUpdate)).toBe(
      '?productor=p1&comprador=b4&estado=all',
    );
  });

  it('opens and closes a buyer', async () => {
    const { result, onUrlUpdate } = setup();

    await act(() => result.current.showBuyer('b1'));
    expect(lastQuery(onUrlUpdate)).toBe('?comprador=b1');

    await act(() => result.current.showBuyer(null));
    expect(lastQuery(onUrlUpdate)).toBe('');
  });
});
