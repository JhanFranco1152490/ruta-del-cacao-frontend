import { act, renderHook, waitFor } from '@testing-library/react';
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from 'nuqs/adapters/testing';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useQualityFilters } from './use-quality-filters';

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
  const rendered = renderHook(() => useQualityFilters(), { wrapper });
  // El adaptador de pruebas entrega el primer valor un instante después.
  await waitFor(() => expect(rendered.result.current).not.toBeNull());
  return { onUrlUpdate, ...rendered };
}

const lastUrl = (onUrlUpdate: ReturnType<typeof vi.fn<OnUrlUpdateFunction>>) =>
  onUrlUpdate.mock.calls.at(-1)?.[0].queryString;

describe('useQualityFilters', () => {
  it('starts on the lots to evaluate, without filters', async () => {
    const { result } = await setup();

    expect(result.current.view).toBe('por-evaluar');
    expect(result.current.apiView).toBe('to_evaluate');
    expect(result.current.filters).toEqual({
      producer: null,
      farm: null,
      search: '',
      page: 1,
    });
    expect(result.current.hasFilters).toBe(false);
    expect(result.current.pendingAction).toBeNull();
  });

  it('reads the tab, the filters and the page from the URL', async () => {
    const { result } = await setup(
      '?vista=cerrados&finca=f1&buscar=F02&productor=p1&pagina=2',
    );

    expect(result.current.apiView).toBe('closed');
    expect(result.current.filters).toEqual({
      producer: 'p1',
      farm: 'f1',
      search: 'F02',
      page: 2,
    });
    expect(result.current.summaryFilters).not.toHaveProperty('page');
    expect(result.current.hasFilters).toBe(true);
  });

  it('falls back to the first tab and no action when they are malformed', async () => {
    const { result } = await setup('?vista=todas&lote=l1&accion=borrar');

    expect(result.current.view).toBe('por-evaluar');
    expect(result.current.pendingAction).toBeNull();
  });

  it('opens the form of a lot from a link', async () => {
    const { result, onUrlUpdate } = await setup('?lote=l1&accion=clasificar');

    expect(result.current.pendingAction).toEqual({
      lotId: 'l1',
      action: 'clasificar',
    });

    await act(() => result.current.clearAction());
    await waitFor(() => expect(lastUrl(onUrlUpdate)).toBe(''));
  });

  it('keeps the farm when changing tab and goes back to the first page', async () => {
    const { result, onUrlUpdate } = await setup('?finca=f1&pagina=3');

    await act(() => result.current.setView('evaluados'));

    await waitFor(() =>
      expect(lastUrl(onUrlUpdate)).toBe('?finca=f1&vista=evaluados'),
    );
  });

  it('forgets the farm of another producer', async () => {
    const { result, onUrlUpdate } = await setup('?finca=f1&productor=p1');

    await act(() => result.current.setProducer('p2'));

    await waitFor(() => expect(lastUrl(onUrlUpdate)).toBe('?productor=p2'));
  });
});
