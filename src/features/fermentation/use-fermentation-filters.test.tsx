import { act, renderHook } from '@testing-library/react';
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from 'nuqs/adapters/testing';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useFermentationFilters } from './use-fermentation-filters';

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
    ...renderHook(() => useFermentationFilters(), { wrapper }),
  };
}

const lastQuery = (onUrlUpdate: ReturnType<typeof setup>['onUrlUpdate']) =>
  onUrlUpdate.mock.lastCall?.[0].queryString;

describe('useFermentationFilters', () => {
  it('opens the lots in fermentation of every farm by default', () => {
    const { result } = setup();

    expect(result.current.view).toBe('en-curso');
    expect(result.current.farm).toBeNull();
    expect(result.current.producer).toBeNull();
  });

  it('reads the tab, the farm and the producer from the URL', () => {
    const { result } = setup('?vista=listos&finca=f1&productor=p1');

    expect(result.current.view).toBe('listos');
    expect(result.current.farm).toBe('f1');
    expect(result.current.producer).toBe('p1');
  });

  it('falls back to defaults for malformed parameters', () => {
    const { result } = setup('?vista=todas&finca=&productor=');

    expect(result.current.view).toBe('en-curso');
    expect(result.current.farm).toBeNull();
    expect(result.current.producer).toBeNull();
  });

  it('keeps the default tab out of the URL', async () => {
    const { result, onUrlUpdate } = setup('?vista=listos&finca=f1');

    await act(() => result.current.setView('en-curso'));

    expect(lastQuery(onUrlUpdate)).toBe('?finca=f1');
  });

  it('keeps the farm when the tab changes', async () => {
    const { result, onUrlUpdate } = setup('?finca=f1');

    await act(() => result.current.setView('listos'));

    expect(lastQuery(onUrlUpdate)).toBe('?finca=f1&vista=listos');
  });

  it('clears the farm filter', async () => {
    const { result, onUrlUpdate } = setup('?vista=listos&finca=f1');

    await act(() => result.current.clear());

    expect(lastQuery(onUrlUpdate)).toBe('?vista=listos');
  });

  // La finca elegida era de otro productor.
  it('forgets the farm when the producer changes', async () => {
    const { result, onUrlUpdate } = setup('?finca=f1&productor=p1');

    await act(() => result.current.setProducer('p2'));

    expect(lastQuery(onUrlUpdate)).toBe('?productor=p2');
  });

  it('reads the lot a link from Lotes asks to start or finish, and clears it', async () => {
    const { result, onUrlUpdate } = setup('?iniciar=l1&finalizar=l2');

    expect(result.current.startLotId).toBe('l1');
    expect(result.current.finishLotId).toBe('l2');
    await act(() => result.current.clearStart());
    expect(lastQuery(onUrlUpdate)).toBe('?finalizar=l2');
    await act(() => result.current.clearFinish());
    expect(lastQuery(onUrlUpdate)).toBe('');
  });
});
