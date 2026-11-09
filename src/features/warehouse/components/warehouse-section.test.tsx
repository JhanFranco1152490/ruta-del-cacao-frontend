import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SectionPickControl } from '@/components/page-blocks/section-item';
import { queryKeys } from '@/lib/api/query-keys';
import type { LotStatus } from '@/lib/lot-status';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildLotStock,
  buildLotWarehouseDetail,
  buildSession,
  buildStockEntry,
  buildStockExit,
  buildStockMove,
  buildWarehouse,
} from '@/test/factories';
import {
  lotStockHandler,
  stockLocationsHandler,
  warehousesHandler,
} from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import type { LotWarehouseDetail } from '../api';
import { WarehouseSection } from './warehouse-section';

const MANAGER = [
  PERMISSIONS.LOTS_VIEW,
  PERMISSIONS.WAREHOUSE_VIEW_STOCK,
  PERMISSIONS.WAREHOUSE_REGISTER_ENTRY,
  PERMISSIONS.WAREHOUSE_REGISTER_EXIT,
];

const VOIDED = buildStockExit({
  id: 'e2',
  grade: 'g2',
  quantity_kg: '1.5',
  voided: {
    voided_at: '2026-11-01T08:00:00-05:00',
    voided_by: { id: 'u2', full_name: 'Ana Pérez' },
    reason: 'No salió',
  },
  can_void: false,
});

// 250,0 de G1 con una muestra de 5,0 vigente, y 55,2 de G2 con una salida anulada.
const STOCK = buildLotStock({
  lot: {
    id: 'l1',
    code: '000123-F02-P05-261014-1',
    status: 'in_warehouse',
    version: 11,
  },
  entry: buildStockEntry({ can_correct: false }),
  balances: [
    { grade: 'g1', quantity_kg: '245.0' },
    { grade: 'g2', quantity_kg: '55.2' },
  ],
  exits: [buildStockExit(), VOIDED],
});

let userId: string;

beforeEach(() => {
  userId = `section-${crypto.randomUUID()}`;
  server.use(
    warehousesHandler([buildWarehouse()]),
    stockLocationsHandler([]),
    lotStockHandler(STOCK),
  );
});

function renderSection(
  status: LotStatus,
  warehouse: LotWarehouseDetail | null,
  permissions = MANAGER,
  pick?: SectionPickControl,
) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, permissions }),
  );
  return renderWithProviders(
    <WarehouseSection lot={{ id: 'l1', status, warehouse }} pick={pick} />,
    { queryClient },
  );
}

const section = () => screen.findByRole('region', { name: 'Bodega' });

describe('WarehouseSection', () => {
  it('is not shown before the lot is classified', () => {
    renderSection('evaluated', null);

    expect(
      screen.queryByRole('region', { name: 'Bodega' }),
    ).not.toBeInTheDocument();
  });

  it('waits for the entry of a classified lot, and stores it right here', async () => {
    server.use(lotStockHandler(buildLotStock()));
    renderSection('classified', null);

    const card = await section();
    expect(card).toHaveTextContent('Pendiente de ingreso.');
    await userEvent.click(
      within(card).getByRole('button', { name: 'Ingresar a bodega' }),
    );

    expect(
      await screen.findByRole('dialog', { name: /^Ingresar a bodega ·/ }),
    ).toBeInTheDocument();
  });

  it('shows where the cacao is, what is left and the ledger of the lot', async () => {
    renderSection('in_warehouse', buildLotWarehouseDetail());

    const card = await section();
    expect(card).toHaveTextContent('Bodega principal · Estante 3');
    expect(card).toHaveTextContent('Desde el 30 de octubre');
    expect(
      within(card).getByRole('list', { name: 'Existencias del lote' }),
    ).toHaveTextContent('245,0 kgG1 disponible de 250,0');

    const ledger = await within(card).findByRole('table', {
      name: 'Movimientos del lote',
    });
    const [, entry, sample, voided, balance] =
      within(ledger).getAllByRole('row');
    expect(entry).toHaveTextContent('IngresoCuenta de prueba · Estante 3');
    expect(entry).toHaveTextContent('+250,0+55,2');
    expect(sample).toHaveTextContent('Muestra');
    expect(sample).toHaveTextContent('−5,0');
    expect(
      within(sample).getByRole('button', { name: /^Anular la salida/ }),
    ).toBeInTheDocument();
    expect(voided).toHaveTextContent(
      'Anulada por Ana Pérez el 1 nov: No salió',
    );
    expect(within(voided).queryByRole('button')).not.toBeInTheDocument();
    expect(balance).toHaveTextContent('Saldo245,055,2');
  });

  it('lists the moves of the cacao in the ledger, and offers to move it', async () => {
    server.use(lotStockHandler({ ...STOCK, moves: [buildStockMove()] }));
    renderSection('in_warehouse', buildLotWarehouseDetail());

    const card = await section();
    const ledger = await within(card).findByRole('table', {
      name: 'Movimientos del lote',
    });
    expect(
      await within(ledger).findByText(
        'Estante 3 → Estante 9 · Cuenta de prueba',
      ),
    ).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Mover' })).toBeEnabled();
  });

  it('opens the move right here', async () => {
    renderSection('in_warehouse', buildLotWarehouseDetail());

    await userEvent.click(
      within(await section()).getByRole('button', { name: 'Mover' }),
    );

    expect(
      await screen.findByRole('dialog', { name: /^Mover ·/ }),
    ).toBeInTheDocument();
  });

  it('takes out, but does not correct the entry once cacao left', async () => {
    renderSection('in_warehouse', buildLotWarehouseDetail());

    const card = await section();
    await within(card).findByRole('table', { name: 'Movimientos del lote' });
    expect(
      within(card).getByRole('button', { name: 'Registrar salida' }),
    ).toBeInTheDocument();
    expect(
      within(card).queryByRole('button', { name: 'Corregir ingreso' }),
    ).not.toBeInTheDocument();
  });

  it('marks the grade that ran out', async () => {
    renderSection(
      'in_warehouse',
      buildLotWarehouseDetail({ g2_available_kg: '0.0' }),
    );

    const balances = within(await section()).getByRole('list', {
      name: 'Existencias del lote',
    });
    expect(balances).toHaveTextContent('0,0 kgG2 disponible de 55,2');
    expect(within(balances).getByText('Agotado')).toBeInTheDocument();
  });

  it('opens the void of an exit right here', async () => {
    renderSection('in_warehouse', buildLotWarehouseDetail());

    const card = await section();
    await userEvent.click(
      await within(card).findByRole('button', { name: /^Anular la salida/ }),
    );

    expect(
      await screen.findByRole('dialog', {
        name: '¿Anular la salida de 5,0 kg de G1?',
      }),
    ).toBeInTheDocument();
  });

  it('shows only what the lot brings to whom does not see the stock', async () => {
    renderSection('in_warehouse', buildLotWarehouseDetail(), [
      PERMISSIONS.LOTS_VIEW,
    ]);

    const card = await section();
    expect(card).toHaveTextContent('Bodega principal · Estante 3');
    expect(card).toHaveTextContent('245,0 kg');
    expect(
      within(card).queryByRole('table', { name: 'Movimientos del lote' }),
    ).not.toBeInTheDocument();
    expect(within(card).queryByRole('button')).not.toBeInTheDocument();
  });
  it('is a line of the stage list that says where the lot is', async () => {
    const onSelect = vi.fn();
    renderSection('in_warehouse', buildLotWarehouseDetail(), MANAGER, {
      as: 'item',
      selected: false,
      onSelect,
      stage: 'current',
    });

    const item = await screen.findByRole('button', { name: /Bodega/ });
    expect(item).toHaveTextContent('En bodega · Bodega principal');
    expect(screen.queryByRole('region', { name: 'Bodega' })).toBeNull();
    await userEvent.click(item);
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('says in the list that a classified lot waits for its entry', async () => {
    renderSection('classified', null, MANAGER, {
      as: 'item',
      selected: true,
      onSelect: vi.fn(),
      stage: 'current',
    });

    expect(
      await screen.findByRole('button', { name: /Bodega/ }),
    ).toHaveTextContent('Pendiente de ingreso');
  });
});
