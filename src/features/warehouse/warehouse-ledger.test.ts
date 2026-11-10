import { describe, expect, it } from 'vitest';

import {
  buildLotStock,
  buildStockEntry,
  buildStockExit,
  buildStockMove,
} from '@/test/factories';

import { warehouseLedger } from './warehouse-ledger';

const VOIDED = buildStockExit({
  id: 'e2',
  grade: 'g2',
  quantity_kg: '1.5',
  exit_date: '2026-11-01',
  created_at: '2026-11-01T09:00:00-05:00',
  reason: 'other',
  detail: 'Regalo a un cliente',
  voided: {
    voided_at: '2026-11-02T08:00:00-05:00',
    voided_by: { id: 'u2', full_name: 'Ana Pérez' },
    reason: 'No salió',
  },
  can_void: false,
});

// Un lote ya ingresado: `buildLotStock` solo trae el ingreso si se le pide.
const stored = (overrides: Parameters<typeof buildLotStock>[0] = {}) =>
  buildLotStock({ entry: buildStockEntry(), ...overrides });

describe('warehouseLedger', () => {
  it('starts with the entry, who made it and the kilos of each grade', () => {
    const [entry] = warehouseLedger(stored());

    expect(entry).toMatchObject({
      kind: 'entry',
      date: '30 oct',
      title: 'Ingreso',
      detail: 'Cuenta de prueba · Estante 3',
      g1: { text: '+250,0', tone: 'in' },
      g2: { text: '+55,2', tone: 'in' },
    });
  });

  it('shows no kilos for a grade that entered with none', () => {
    const [entry] = warehouseLedger(
      stored({ entry: buildStockEntry({ g2_kg: '0.0' }) }),
    );

    expect(entry.g2).toEqual({ text: '—', tone: 'none' });
  });

  it('orders entry, moves and exits by when each was registered', () => {
    const rows = warehouseLedger(
      stored({
        exits: [VOIDED, buildStockExit()],
        moves: [buildStockMove()],
      }),
    );

    expect(rows.map(({ key }) => key)).toEqual([
      'entry',
      'exit-e1',
      'exit-e2',
      'move-m1',
    ]);
  });

  it('takes the exit out of its grade only', () => {
    const rows = warehouseLedger(stored({ exits: [buildStockExit()] }));

    expect(rows[1]).toMatchObject({
      kind: 'exit',
      title: 'Muestra',
      detail: 'Cuenta de prueba',
      g1: { text: '−5,0', tone: 'out' },
      g2: { text: '—', tone: 'none' },
      voided: null,
    });
    expect(rows[1].exit?.id).toBe('e1');
  });

  it('keeps a voided exit, with who voided it and why', () => {
    const rows = warehouseLedger(stored({ exits: [VOIDED] }));

    expect(rows[1]).toMatchObject({
      title: 'Regalo a un cliente',
      voided: 'Anulada por Ana Pérez el 2 nov: No salió',
      g2: { text: '−1,5', tone: 'out' },
    });
  });

  it('shows a move inside one warehouse by its locations, moving nothing', () => {
    const rows = warehouseLedger(stored({ moves: [buildStockMove()] }));

    expect(rows[1]).toMatchObject({
      kind: 'move',
      title: 'Movido',
      detail: 'Estante 3 → Estante 9 · Cuenta de prueba',
      g1: { text: '—', tone: 'none' },
      g2: { text: '—', tone: 'none' },
      exit: null,
    });
  });

  it('names both warehouses when the move changes warehouse', () => {
    const rows = warehouseLedger(
      stored({
        moves: [
          buildStockMove({
            to_warehouse: { id: 'w2', name: 'Anexo' },
            to_location: '',
          }),
        ],
      }),
    );

    expect(rows[1].detail).toBe(
      'Bodega principal · Estante 3 → Anexo · Sin ubicación · Cuenta de prueba',
    );
  });

  it('says the entry went in where the cacao was before the first move', () => {
    const rows = warehouseLedger(
      buildLotStock({
        entry: buildStockEntry({ location: 'Estante 9' }),
        moves: [buildStockMove()],
      }),
    );

    expect(rows[0].detail).toBe('Cuenta de prueba · Estante 3');
  });

  it('has no rows for a lot without an entry', () => {
    expect(warehouseLedger(buildLotStock({ entry: null }))).toEqual([]);
  });
});
