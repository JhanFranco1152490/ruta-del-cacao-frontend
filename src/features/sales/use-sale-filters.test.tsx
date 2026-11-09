import { act, renderHook, waitFor } from '@testing-library/react';
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from 'nuqs/adapters/testing';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSaleFilters } from './use-sale-filters';

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
  return { onUrlUpdate, ...renderHook(() => useSaleFilters(), { wrapper }) };
}

beforeEach(() => {
  // Viernes 20 de noviembre de 2026, en Bogotá.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-20T15:00:00Z'));
});

afterEach(() => vi.useRealTimers());

const lastUrl = (onUrlUpdate: ReturnType<typeof vi.fn<OnUrlUpdateFunction>>) =>
  onUrlUpdate.mock.calls.at(-1)?.[0].queryString;

describe('useSaleFilters', () => {
  it('opens on the registered sales of this month, without filters', async () => {
    const { result } = setup();

    expect(result.current.filters).toEqual({
      producer: null,
      from: '2026-11-01',
      to: '2026-11-30',
      farm: null,
      buyer: null,
      status: 'registered',
      search: '',
      page: 1,
    });
    expect(result.current.hasFilters).toBe(false);
  });

  it('reads the month and the filters from the URL', async () => {
    const { result } = setup(
      '?mes=2026-10&finca=f1&comprador=b1&estado=voided&buscar=12&productor=p1&pagina=3',
    );

    expect(result.current.filters).toEqual({
      producer: 'p1',
      from: '2026-10-01',
      to: '2026-10-31',
      farm: 'f1',
      buyer: 'b1',
      status: 'voided',
      search: '12',
      page: 3,
    });
    expect(result.current.summaryFilters).not.toHaveProperty('status');
    expect(result.current.hasFilters).toBe(true);
  });

  it('asks for every status with «all»', async () => {
    const { result } = setup('?estado=all');

    expect(result.current.filters.status).toBeNull();
    expect(result.current.status).toBe('all');
  });

  it('treats a malformed status or page as the default ones', async () => {
    const { result } = setup('?estado=zzz&pagina=abc&comprador=');

    expect(result.current.filters).toMatchObject({
      status: 'registered',
      page: 1,
      buyer: null,
    });
  });

  it('goes back to the first page when a filter changes', async () => {
    const { result, onUrlUpdate } = setup('?mes=2026-10&pagina=3');

    act(() => {
      result.current.setBuyer('b1');
    });

    await waitFor(() =>
      expect(lastUrl(onUrlUpdate)).toBe('?mes=2026-10&comprador=b1'),
    );
  });

  it('goes back to the first page when the month changes', async () => {
    const { result, onUrlUpdate } = setup('?mes=2026-10&comprador=b1&pagina=3');

    act(() => {
      result.current.period.goPrevious();
    });

    await waitFor(() =>
      expect(lastUrl(onUrlUpdate)).toBe('?mes=2026-09&comprador=b1'),
    );
  });

  it('leaves this month out of the URL', async () => {
    const { result, onUrlUpdate } = setup('?mes=2026-10');

    act(() => {
      result.current.period.goNext();
    });

    await waitFor(() => expect(lastUrl(onUrlUpdate)).toBe(''));
    expect(result.current.period).toMatchObject({
      month: '2026-11',
      isCurrentMonth: true,
    });
  });

  it('forgets the farm and the buyer of another producer', async () => {
    const { result, onUrlUpdate } = setup('?finca=f1&comprador=b1');

    act(() => {
      result.current.setProducer('p2');
    });

    await waitFor(() => expect(lastUrl(onUrlUpdate)).toBe('?productor=p2'));
  });

  it('clears the filters but keeps the month and the producer', async () => {
    const { result, onUrlUpdate } = setup(
      '?mes=2026-10&productor=p1&finca=f1&estado=voided&buscar=12',
    );

    act(() => {
      result.current.clear();
    });

    await waitFor(() =>
      expect(lastUrl(onUrlUpdate)).toBe('?mes=2026-10&productor=p1'),
    );
  });
});
