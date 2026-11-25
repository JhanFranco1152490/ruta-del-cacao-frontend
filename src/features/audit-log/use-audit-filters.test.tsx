import { act, renderHook } from '@testing-library/react';
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from 'nuqs/adapters/testing';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useAuditFilters } from './use-audit-filters';

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
  return { onUrlUpdate, ...renderHook(() => useAuditFilters(), { wrapper }) };
}

const lastUrl = (onUrlUpdate: ReturnType<typeof vi.fn<OnUrlUpdateFunction>>) =>
  onUrlUpdate.mock.calls.at(-1)?.[0].queryString;

describe('useAuditFilters', () => {
  it('opens on the whole log: no filters and the first page', () => {
    const { result } = setup();

    expect(result.current.values).toEqual({
      producer: null,
      actor: null,
      recordType: null,
      from: null,
      to: null,
      page: 1,
    });
    expect(result.current.hasFilters).toBe(false);
  });

  it('reads a shared link with its filters and page', () => {
    const { result } = setup(
      '?productor=pr-1&usuario=acc-2&tipo=harvest&desde=2026-11-01&hasta=2026-11-20&pagina=3',
    );

    expect(result.current.values).toEqual({
      producer: 'pr-1',
      actor: 'acc-2',
      recordType: 'harvest',
      from: '2026-11-01',
      to: '2026-11-20',
      page: 3,
    });
    expect(result.current.hasFilters).toBe(true);
  });

  it('takes a record type or a date it does not know as not set', () => {
    const { result } = setup('?tipo=login&desde=2026-02-30&pagina=0');

    expect(result.current.values).toMatchObject({
      recordType: null,
      from: null,
      page: 1,
    });
  });

  it('goes back to the first page when a filter changes', async () => {
    const { result, onUrlUpdate } = setup('?pagina=4');

    await act(() => result.current.setActor('acc-2'));
    expect(lastUrl(onUrlUpdate)).toBe('?usuario=acc-2');

    await act(() => result.current.setPage(2));
    await act(() => result.current.setRecordType('sale'));
    expect(lastUrl(onUrlUpdate)).toBe('?usuario=acc-2&tipo=sale');

    await act(() => result.current.setPage(2));
    await act(() => result.current.setFrom('2026-11-01'));
    await act(() => result.current.setTo('2026-11-20'));
    expect(lastUrl(onUrlUpdate)).toBe(
      '?usuario=acc-2&tipo=sale&desde=2026-11-01&hasta=2026-11-20',
    );
  });

  it('takes an emptied date as no date', async () => {
    const { result, onUrlUpdate } = setup('?desde=2026-11-01');

    await act(() => result.current.setFrom(''));
    expect(lastUrl(onUrlUpdate)).toBe('');
    expect(result.current.values.from).toBeNull();
  });

  it('keeps the page it is asked for', async () => {
    const { result, onUrlUpdate } = setup('?tipo=sale');

    await act(() => result.current.setPage(2));
    expect(lastUrl(onUrlUpdate)).toBe('?tipo=sale&pagina=2');
  });

  // Las cuentas de un productor no son las de otro.
  it('drops the chosen user when the technical account changes producer', async () => {
    const { result, onUrlUpdate } = setup(
      '?productor=pr-1&usuario=acc-2&tipo=sale&pagina=2',
    );

    await act(() => result.current.setProducer('pr-2'));
    expect(lastUrl(onUrlUpdate)).toBe('?productor=pr-2&tipo=sale');
  });

  it('clears the filters but keeps the producer being looked at', async () => {
    const { result, onUrlUpdate } = setup(
      '?productor=pr-1&usuario=acc-2&tipo=sale&desde=2026-11-01&pagina=2',
    );

    await act(() => result.current.clear());
    expect(lastUrl(onUrlUpdate)).toBe('?productor=pr-1');
    expect(result.current.hasFilters).toBe(false);
  });
});
