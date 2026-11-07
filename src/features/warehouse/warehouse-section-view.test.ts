import { describe, expect, it } from 'vitest';

import {
  buildLotStock,
  buildLotWarehouseDetail,
  buildStockEntry,
  buildStockExit,
} from '@/test/factories';

import { warehouseSectionView } from './warehouse-section-view';

const SUMMARY = buildLotWarehouseDetail();
const FULL = buildLotStock({
  lot: {
    id: 'l1',
    code: '000123-F02-P05-261014-1',
    status: 'in_warehouse',
    version: 11,
  },
  entry: buildStockEntry({
    corrected_at: '2026-10-31T09:00:00-05:00',
    corrected_by: { id: 'u2', full_name: 'Ana Pérez' },
  }),
  exits: [
    buildStockExit(),
    buildStockExit({
      id: 'e2',
      grade: 'g2',
      quantity_kg: '1.5',
      reason: 'other',
      detail: 'Regalo a un cliente',
      voided: {
        voided_at: '2026-11-01T08:00:00-05:00',
        voided_by: { id: 'u2', full_name: 'Ana Pérez' },
        reason: 'No salió',
      },
      can_void: false,
    }),
  ],
});

describe('warehouseSectionView', () => {
  it('reads the entry from what the lot brings, for anyone who sees it', () => {
    const view = warehouseSectionView(SUMMARY, undefined);

    expect(view.entry).toEqual([
      { label: 'Fecha de ingreso', value: '30 de octubre' },
      { label: 'Bodega', value: 'Bodega principal' },
      { label: 'Ubicación', value: 'Estante 3' },
      { label: 'G1 ingresado', value: '250,0 kg' },
      { label: 'G2 ingresado', value: '55,2 kg' },
    ]);
    expect(view.enteredBy).toBeNull();
    expect(view.exits).toBeNull();
  });

  it('says what is left of each grade, and which one ran out', () => {
    const view = warehouseSectionView(
      buildLotWarehouseDetail({ g2_available_kg: '0.0' }),
      undefined,
    );

    expect(view.balances).toEqual([
      { grade: 'g1', text: 'G1: 245,0 de 250,0 kg', depleted: false },
      { grade: 'g2', text: 'G2: 0,0 de 55,2 kg', depleted: true },
    ]);
  });

  it('leaves out a grade that entered with no kilos', () => {
    const view = warehouseSectionView(
      buildLotWarehouseDetail({ g2_entered_kg: '0.0', g2_available_kg: '0.0' }),
      undefined,
    );

    expect(view.balances.map(({ grade }) => grade)).toEqual(['g1']);
  });

  it('adds who entered, who corrected and the exits with their void', () => {
    const view = warehouseSectionView(SUMMARY, FULL);

    expect(view.enteredBy).toBe('Ingresado por Cuenta de prueba el 30 oct');
    expect(view.correctedBy).toBe('Corregido por Ana Pérez el 31 oct');
    expect(
      view.exits?.map(({ title, detail, voided }) => [title, detail, voided]),
    ).toEqual([
      [
        '5,0 kg de G1 · Muestra',
        '31 de octubre · Registrada por Cuenta de prueba el 31 oct',
        null,
      ],
      [
        '1,5 kg de G2 · Regalo a un cliente',
        '31 de octubre · Registrada por Cuenta de prueba el 31 oct',
        'Anulada por Ana Pérez el 1 nov: No salió',
      ],
    ]);
  });
});
