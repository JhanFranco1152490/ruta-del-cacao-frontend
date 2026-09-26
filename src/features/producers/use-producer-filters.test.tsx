import { act, renderHook, waitFor } from '@testing-library/react';
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from 'nuqs/adapters/testing';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useProducerFilters } from './use-producer-filters';

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
    ...renderHook(() => useProducerFilters(), { wrapper }),
  };
}

describe('useProducerFilters', () => {
  it('reads the filters from the URL', () => {
    const { result } = setup(
      '?buscar=ana&estado=inactive&municipio=54001&pagina=3',
    );

    expect(result.current.query).toEqual({
      search: 'ana',
      status: 'inactive',
      municipality: '54001',
      page: 3,
    });
    expect(result.current.searchInput).toBe('ana');
  });

  it('falls back to defaults for malformed parameters', () => {
    const { result } = setup('?pagina=abc&estado=zzz');

    expect(result.current.query).toEqual({
      search: undefined,
      status: undefined,
      municipality: undefined,
      page: 1,
    });
  });

  it('never goes below page 1', () => {
    expect(setup('?pagina=0').result.current.query.page).toBe(1);
    expect(setup('?pagina=-4').result.current.query.page).toBe(1);
  });

  it('resets to page 1 when a filter changes', async () => {
    const { result, onUrlUpdate } = setup('?pagina=4');

    await act(async () => {
      await result.current.setStatus('active');
    });

    const last = onUrlUpdate.mock.calls.at(-1)![0].searchParams;
    expect(last.get('estado')).toBe('active');
    expect(last.has('pagina')).toBe(false);
  });

  it('debounces the search text, then updates the URL and resets the page', async () => {
    const { result, onUrlUpdate } = setup('?pagina=4');

    act(() => result.current.setSearchInput('ana'));
    expect(result.current.searchInput).toBe('ana');
    expect(onUrlUpdate).not.toHaveBeenCalled();

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled(), {
      timeout: 1500,
    });
    const last = onUrlUpdate.mock.calls.at(-1)![0].searchParams;
    expect(last.get('buscar')).toBe('ana');
    expect(last.has('pagina')).toBe(false);
    await waitFor(() => expect(result.current.query.search).toBe('ana'));
  });
});
