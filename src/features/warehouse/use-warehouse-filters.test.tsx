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
});
