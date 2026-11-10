import { act, renderHook, waitFor } from '@testing-library/react';
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from 'nuqs/adapters/testing';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useWarehouseFilters } from './use-warehouse-filters';
import type { WarehousePermissions } from './warehouse-actions';

const ALL: WarehousePermissions = {
  view: true,
  entry: true,
  exit: true,
  manage: true,
  viewLot: true,
};
const VIEW_ONLY: WarehousePermissions = {
  ...ALL,
  entry: false,
  exit: false,
  manage: false,
};

async function setup(searchParams = '', can = ALL) {
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
  const rendered = renderHook(() => useWarehouseFilters(can), { wrapper });
  // El adaptador de pruebas entrega el primer valor un instante después.
  await waitFor(() => expect(rendered.result.current).not.toBeNull());
  return { onUrlUpdate, ...rendered };
}

const lastUrl = (onUrlUpdate: ReturnType<typeof vi.fn<OnUrlUpdateFunction>>) =>
  onUrlUpdate.mock.calls.at(-1)?.[0].queryString;

describe('useWarehouseFilters', () => {
  it('starts on the stock, without filters', async () => {
    const { result } = await setup();

    expect(result.current.view).toBe('existencias');
    expect(result.current.stockFilters).toEqual({
      producer: null,
      farm: null,
      warehouse: null,
      grade: null,
      location: '',
      search: '',
      ordering: null,
      page: 1,
    });
    expect(result.current.hasFilters).toBe(false);
    expect(result.current.pendingAction).toBeNull();
  });

  it('reads the tab, the filters, the order and the page from the URL', async () => {
    const { result } = await setup(
      '?vista=existencias&finca=f1&bodega=w1&calibre=g2&ubicacion=Estante%203&buscar=F02&orden=-quantity&productor=p1&pagina=2',
    );

    expect(result.current.stockFilters).toEqual({
      producer: 'p1',
      farm: 'f1',
      warehouse: 'w1',
      grade: 'g2',
      location: 'Estante 3',
      search: 'F02',
      ordering: '-quantity',
      page: 2,
    });
    expect(result.current.summaryFilters).not.toHaveProperty('ordering');
    expect(result.current.pendingFilters).toEqual({
      producer: 'p1',
      farm: 'f1',
      search: 'F02',
      page: 2,
    });
    expect(result.current.hasFilters).toBe(true);
  });

  it('ignores a malformed tab, grade, order or action', async () => {
    const { result } = await setup(
      '?vista=todas&calibre=g3&orden=price&lote=l1&accion=borrar',
    );

    expect(result.current.view).toBe('existencias');
    expect(result.current.stockFilters.grade).toBeNull();
    expect(result.current.stockFilters.ordering).toBeNull();
    expect(result.current.pendingAction).toBeNull();
  });

  it('keeps the lots to store away from whom cannot store them', async () => {
    const { result } = await setup('?vista=por-ingresar', VIEW_ONLY);

    expect(result.current.view).toBe('existencias');
  });

  it('reads the form to open when arriving from another screen', async () => {
    const { result, onUrlUpdate } = await setup(
      '?vista=por-ingresar&lote=l1&accion=ingresar',
    );

    expect(result.current.view).toBe('por-ingresar');
    expect(result.current.pendingAction).toEqual({
      lotId: 'l1',
      action: 'ingresar',
    });

    act(() => void result.current.clearAction());
    await waitFor(() =>
      expect(lastUrl(onUrlUpdate)).toBe('?vista=por-ingresar'),
    );
  });

  it('forgets the warehouse and the location when the farm changes', async () => {
    const { result, onUrlUpdate } = await setup(
      '?finca=f1&bodega=w1&ubicacion=Zona&pagina=3',
    );

    act(() => void result.current.setFarm('f2'));

    await waitFor(() => expect(lastUrl(onUrlUpdate)).toBe('?finca=f2'));
  });

  it('goes back to the first page when the order changes', async () => {
    const { result, onUrlUpdate } = await setup('?pagina=3');

    act(() => void result.current.setOrdering('lot'));

    await waitFor(() => expect(lastUrl(onUrlUpdate)).toBe('?orden=lot'));
  });

  it('clears the filters but keeps the tab and the producer', async () => {
    const { result, onUrlUpdate } = await setup(
      '?vista=bodegas&productor=p1&finca=f1&calibre=g1&buscar=F02',
    );

    act(() => void result.current.clear());

    await waitFor(() =>
      expect(lastUrl(onUrlUpdate)).toBe('?vista=bodegas&productor=p1'),
    );
  });
  it('reads the filters of the exits from the address, in Spanish', async () => {
    const { result } = await setup(
      '?vista=salidas&motivo=sample&estado=voided&desde=2026-10-01&hasta=2026-10-31&calibre=g2&buscar=L-2',
    );

    expect(result.current.view).toBe('salidas');
    expect(result.current.exitFilters).toEqual({
      producer: null,
      farm: null,
      warehouse: null,
      grade: 'g2',
      reason: 'sample',
      state: 'voided',
      from: '2026-10-01',
      to: '2026-10-31',
      search: 'L-2',
      page: 1,
    });
    expect(result.current.exitSummaryFilters).not.toHaveProperty('state');
    expect(result.current.hasFilters).toBe(true);
  });

  it('leaves the period out of what it asks when it is backwards', async () => {
    const { result } = await setup(
      '?vista=salidas&desde=2026-11-05&hasta=2026-11-01',
    );

    expect(result.current.periodError).toBe(
      'La fecha final no puede ser anterior a la inicial.',
    );
    expect(result.current.exitFilters.from).toBeNull();
    expect(result.current.exitFilters.to).toBeNull();
    expect(result.current.exitInputs.from).toBe('2026-11-05');
  });

  it('ignores a reason or a state it does not know', async () => {
    const { result } = await setup('?vista=salidas&motivo=robo&estado=todas');

    expect(result.current.exitFilters.reason).toBeNull();
    expect(result.current.exitFilters.state).toBeNull();
  });

  it('goes back to the first page when the reason or the period change, and clears them all', async () => {
    const { result, onUrlUpdate } = await setup('?vista=salidas&pagina=3');

    act(() => void result.current.setReason('shrinkage'));
    await waitFor(() =>
      expect(lastUrl(onUrlUpdate)).toBe('?vista=salidas&motivo=shrinkage'),
    );
    act(() => void result.current.setFrom('2026-10-01'));
    await waitFor(() =>
      expect(lastUrl(onUrlUpdate)).toContain('desde=2026-10-01'),
    );
    act(() => void result.current.clear());
    await waitFor(() => expect(lastUrl(onUrlUpdate)).toBe('?vista=salidas'));
  });
});
