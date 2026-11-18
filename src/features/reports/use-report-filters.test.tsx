import { act, renderHook } from '@testing-library/react';
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from 'nuqs/adapters/testing';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useReportFilters } from './use-report-filters';

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
  return { onUrlUpdate, ...renderHook(() => useReportFilters(), { wrapper }) };
}

const lastUrl = (onUrlUpdate: ReturnType<typeof vi.fn<OnUrlUpdateFunction>>) =>
  onUrlUpdate.mock.calls.at(-1)?.[0].queryString;

beforeEach(() => {
  // Viernes 13 de noviembre de 2026, en Bogotá.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-13T15:00:00Z'));
});

afterEach(() => vi.useRealTimers());

describe('useReportFilters', () => {
  it('opens on this year, without a type or a place, not yet generated', () => {
    const { result } = setup();

    expect(result.current.values).toEqual({
      from: '2026-01-01',
      to: '2026-11-13',
      producer: null,
      municipality: null,
      farm: null,
      plot: null,
      lot: null,
    });
    expect(result.current.requestedType).toBeNull();
    expect(result.current.requestedView).toBeNull();
    expect(result.current.preset).toBe('year');
    expect(result.current.generated).toBe(false);
    expect(result.current.hasFilters).toBe(false);
  });

  // Un enlace compartido vuelve a generar el mismo reporte al abrirse.
  it('reads a shared link with its filters and generated', () => {
    const { result } = setup(
      '?vista=producer&tipo=quality&finca=f1&desde=2026-02-01&hasta=2026-03-31&generar=1',
    );

    expect(result.current.requestedView).toBe('producer');
    expect(result.current.requestedType).toBe('quality');
    expect(result.current.values).toMatchObject({
      farm: 'f1',
      from: '2026-02-01',
      to: '2026-03-31',
    });
    expect(result.current.preset).toBeNull();
    expect(result.current.generated).toBe(true);
    expect(result.current.hasFilters).toBe(true);
  });

  it('ignores a malformed view or date', () => {
    const { result } = setup('?vista=todas&desde=zzz');

    expect(result.current.requestedView).toBeNull();
    expect(result.current.values.from).toBe('2026-01-01');
  });

  it('marks the report generated when asked', async () => {
    const { result, onUrlUpdate } = setup('?tipo=production');

    await act(async () => {
      await result.current.generate();
    });

    expect(result.current.generated).toBe(true);
    expect(lastUrl(onUrlUpdate)).toBe('?tipo=production&generar=1');
  });

  // Lo que se ve corresponde siempre a los filtros de arriba.
  it('takes the report away when a filter changes', async () => {
    const { result } = setup('?tipo=production&generar=1');

    await act(async () => {
      await result.current.setType('quality');
    });

    expect(result.current.generated).toBe(false);
    expect(result.current.requestedType).toBe('quality');
  });

  it('drops the plot and the lot when the farm changes', async () => {
    const { result, onUrlUpdate } = setup(
      '?finca=f1&parcela=pl1&lote=l1&generar=1',
    );

    await act(async () => {
      await result.current.setFarm('f2');
    });

    expect(result.current.values).toMatchObject({
      farm: 'f2',
      plot: null,
      lot: null,
    });
    expect(lastUrl(onUrlUpdate)).toBe('?finca=f2');
  });

  it('drops the lot when the plot changes, and the places when the producer does', async () => {
    const { result } = setup('?productor=p1&finca=f1&parcela=pl1&lote=l1');

    await act(async () => {
      await result.current.setPlot('pl2');
    });
    expect(result.current.values).toMatchObject({ plot: 'pl2', lot: null });

    await act(async () => {
      await result.current.setProducer('p2');
    });
    expect(result.current.values).toMatchObject({
      producer: 'p2',
      farm: null,
      plot: null,
    });
  });

  it('keeps the type and the period when the view changes', async () => {
    const { result, onUrlUpdate } = setup(
      '?vista=producer&tipo=production&finca=f1&desde=2026-02-01',
    );

    await act(async () => {
      await result.current.setView('association');
    });

    expect(lastUrl(onUrlUpdate)).toBe(
      '?vista=association&tipo=production&desde=2026-02-01',
    );
  });

  it('fills both dates from a shortcut, and writes nothing for this year', async () => {
    const { result, onUrlUpdate } = setup();

    await act(async () => {
      await result.current.setPreset('3m');
    });
    expect(result.current.values).toMatchObject({
      from: '2026-09-01',
      to: '2026-11-13',
    });
    expect(result.current.preset).toBe('3m');
    expect(lastUrl(onUrlUpdate)).toBe('?desde=2026-09-01');

    await act(async () => {
      await result.current.setPreset('year');
    });
    expect(result.current.preset).toBe('year');
    expect(lastUrl(onUrlUpdate)).toBe('');
  });

  it('goes back to this year when a date is erased', async () => {
    const { result } = setup('?desde=2026-02-01');

    await act(async () => {
      await result.current.setFrom('');
    });

    expect(result.current.values.from).toBe('2026-01-01');
  });

  it('clears the places and the period but keeps the view and the type', async () => {
    const { result, onUrlUpdate } = setup(
      '?vista=association&tipo=sales&municipio=54001&productor=p1&hasta=2026-06-30&generar=1',
    );

    await act(async () => {
      await result.current.clear();
    });

    expect(lastUrl(onUrlUpdate)).toBe('?vista=association&tipo=sales');
    expect(result.current.hasFilters).toBe(false);
  });
});
