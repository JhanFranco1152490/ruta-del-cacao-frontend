import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import {
  apiError,
  buildFarm,
  buildSession,
  buildStockSummary,
  buildWarehouse,
} from '@/test/factories';
import {
  farmsHandler,
  stockSummaryHandler,
  warehousesHandler,
  warehouseWriteHandler,
} from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { resetLocation } from '@/test/router';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { WarehouseScreen } from './warehouse-screen';

const esperanza = { id: 'f1', code: 'F02', name: 'La Esperanza' };
const diviso = { id: 'f2', code: 'F03', name: 'El Diviso' };

const MANAGER = [
  PERMISSIONS.WAREHOUSE_VIEW_STOCK,
  PERMISSIONS.WAREHOUSE_REGISTER_ENTRY,
  PERMISSIONS.WAREHOUSE_REGISTER_EXIT,
  PERMISSIONS.WAREHOUSE_MANAGE,
];

const UNUSED = buildWarehouse();
const USED = buildWarehouse({ id: 'w2', name: 'Bodega norte', in_use: true });

let userId: string;

beforeEach(() => {
  userId = `warehouses-${crypto.randomUUID()}`;
  resetLocation();
  server.use(
    farmsHandler([buildFarm({ ...esperanza }), buildFarm({ ...diviso })]),
    stockSummaryHandler(buildStockSummary()),
    warehousesHandler([UNUSED, USED]),
  );
});

function renderTab({
  searchParams = '?vista=bodegas',
  permissions = MANAGER,
}: { searchParams?: string; permissions?: string[] } = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, permissions }),
  );
  return renderWithProviders(
    <WarehouseScreen lotHref={(id) => `/lotes/detalle?id=${id}`} />,
    { queryClient, searchParams },
  );
}

const card = async (name: string) => {
  const list = await screen.findByRole('list', { name: 'Bodegas' });
  const found = within(list)
    .getAllByRole('listitem')
    .find((item) => item.textContent?.includes(name));
  if (!found) throw new Error(`No hay tarjeta de ${name}`);
  return found;
};

describe('WarehousesBody', () => {
  it('lists each warehouse with its farm, its status and whether it was used', async () => {
    renderTab();

    const unused = await card('Bodega principal');
    expect(unused).toHaveTextContent('F02 · La Esperanza');
    expect(unused).toHaveTextContent('Activa');
    expect(unused).toHaveTextContent('Todavía sin lotes');
    expect(await card('Bodega norte')).toHaveTextContent('Ya recibió lotes');
  });

  it('offers to delete only the warehouse never used', async () => {
    renderTab();

    const unused = await card('Bodega principal');
    expect(
      within(unused).getByRole('button', { name: 'Editar Bodega principal' }),
    ).toBeInTheDocument();
    await userEvent.click(
      within(unused).getByRole('button', {
        name: 'Más acciones de Bodega principal',
      }),
    );
    expect(
      await screen.findByRole('menuitem', { name: 'Eliminar' }),
    ).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');

    // Con dos acciones, las dos a la vista y sin «⋯».
    const used = await card('Bodega norte');
    expect(
      within(used).getByRole('button', { name: 'Desactivar Bodega norte' }),
    ).toBeInTheDocument();
    expect(
      within(used).queryByRole('button', { name: /^Más acciones/ }),
    ).not.toBeInTheDocument();
  });

  it('registers a warehouse in the chosen farm', async () => {
    const bodies: unknown[] = [];
    server.use(warehouseWriteHandler('create', buildWarehouse(), bodies));
    renderTab({ searchParams: '?vista=bodegas&finca=f1' });

    await userEvent.click(
      await screen.findByRole('button', { name: 'Nueva bodega' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Nueva bodega' });
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'Nombre' }),
      ' Bodega sur ',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Guardar' }),
    );

    expect(await screen.findByText('Bodega registrada.')).toBeInTheDocument();
    expect(bodies).toEqual([{ farm_id: 'f1', name: 'Bodega sur' }]);
  });

  it('asks for the name and shows a repeated one in its field', async () => {
    server.use(
      warehouseWriteHandler(
        'create',
        apiError(409, 'warehouse_name_taken', 'Repetido.', {
          name: ['Ya existe una bodega con este nombre en la finca.'],
        }),
      ),
    );
    renderTab({ searchParams: '?vista=bodegas&finca=f1' });

    await userEvent.click(
      await screen.findByRole('button', { name: 'Nueva bodega' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Nueva bodega' });
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Guardar' }),
    );
    expect(
      await within(dialog).findByText('Campo obligatorio'),
    ).toBeInTheDocument();

    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'Nombre' }),
      'bodega principal',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Guardar' }),
    );

    expect(
      await within(dialog).findByText(
        'Ya existe una bodega con este nombre en la finca.',
      ),
    ).toBeInTheDocument();
  });

  it('renames a warehouse without changing its farm', async () => {
    const bodies: unknown[] = [];
    server.use(
      warehouseWriteHandler(
        'update',
        buildWarehouse({ name: 'Bodega central' }),
        bodies,
      ),
    );
    renderTab();

    await userEvent.click(
      within(await card('Bodega principal')).getByRole('button', {
        name: 'Editar Bodega principal',
      }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Editar Bodega principal',
    });
    expect(dialog).toHaveTextContent('F02 · La Esperanza');
    const name = within(dialog).getByRole('textbox', { name: 'Nombre' });
    await userEvent.clear(name);
    await userEvent.type(name, 'Bodega central');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Guardar cambios' }),
    );

    expect(await screen.findByText('Bodega actualizada.')).toBeInTheDocument();
    expect(bodies).toEqual([{ expected_version: 1, name: 'Bodega central' }]);
  });

  it('deactivates a used warehouse', async () => {
    const bodies: unknown[] = [];
    server.use(
      warehouseWriteHandler('update', { ...USED, is_active: false }, bodies),
    );
    renderTab();

    await userEvent.click(
      within(await card('Bodega norte')).getByRole('button', {
        name: 'Desactivar Bodega norte',
      }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: '¿Desactivar Bodega norte?',
    });
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Desactivar' }),
    );

    expect(await screen.findByText('Bodega desactivada.')).toBeInTheDocument();
    expect(bodies).toEqual([{ expected_version: 1, is_active: false }]);
  });

  it('offers to deactivate when the warehouse was used before deleting it', async () => {
    const updates: unknown[] = [];
    server.use(
      warehouseWriteHandler(
        'delete',
        apiError(409, 'warehouse_has_records', 'Ya recibió ingresos.'),
      ),
      warehouseWriteHandler('update', { ...UNUSED, is_active: false }, updates),
    );
    renderTab();

    await userEvent.click(
      within(await card('Bodega principal')).getByRole('button', {
        name: 'Más acciones de Bodega principal',
      }),
    );
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Eliminar' }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: '¿Eliminar Bodega principal?',
    });
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Eliminar' }),
    );

    expect(
      await screen.findByRole('dialog', {
        name: 'No se puede eliminar Bodega principal',
      }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Desactivar' }));

    expect(await screen.findByText('Bodega desactivada.')).toBeInTheDocument();
    await waitFor(() =>
      expect(updates).toEqual([{ expected_version: 1, is_active: false }]),
    );
  });

  it('says when the farm has no warehouses yet, with the way to register one', async () => {
    server.use(warehousesHandler([]));
    renderTab({ searchParams: '?vista=bodegas&finca=f1' });

    expect(
      await screen.findByRole('heading', {
        name: 'Esta finca todavía no tiene bodegas.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Nueva bodega' }),
    ).toBeInTheDocument();
  });

  it('shows the list without actions to whom only reads', async () => {
    renderTab({ permissions: [PERMISSIONS.WAREHOUSE_VIEW_STOCK] });

    const unused = await card('Bodega principal');
    expect(within(unused).queryByRole('button')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Nueva bodega' }),
    ).not.toBeInTheDocument();
  });
});
