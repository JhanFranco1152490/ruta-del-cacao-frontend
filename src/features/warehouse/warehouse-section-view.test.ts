import { describe, expect, it } from 'vitest';

import {
  buildLotStock,
  buildLotWarehouseDetail,
  buildStockEntry,
} from '@/test/factories';

import { warehouseSectionView } from './warehouse-section-view';

const SUMMARY = buildLotWarehouseDetail();
const TODAY = '2026-11-02';

describe('warehouseSectionView', () => {
  it('says where the cacao is and since when, for anyone who sees the lot', () => {
    const view = warehouseSectionView(SUMMARY, undefined, TODAY);

    expect(view.place).toBe('Bodega principal · Estante 3');
    expect(view.since).toBe('Desde el 30 de octubre · 3 días en bodega');
    expect(view.ledger).toBeNull();
    expect(view.correctedBy).toBeNull();
  });

  it('names a place without a location', () => {
    const view = warehouseSectionView(
      buildLotWarehouseDetail({ location: '' }),
      undefined,
      TODAY,
    );

    expect(view.place).toBe('Bodega principal · Sin ubicación');
  });

  it('counts the days in the warehouse, in the singular and on the day itself', () => {
    expect(warehouseSectionView(SUMMARY, undefined, '2026-10-31').since).toBe(
      'Desde el 30 de octubre · 1 día en bodega',
    );
    expect(warehouseSectionView(SUMMARY, undefined, '2026-10-30').since).toBe(
      'Desde el 30 de octubre',
    );
  });

  it('says what is left of each grade, and which one ran out', () => {
    const view = warehouseSectionView(
      buildLotWarehouseDetail({ g2_available_kg: '0.0' }),
      undefined,
      TODAY,
    );

    expect(view.balances).toEqual([
      {
        grade: 'g1',
        kilos: '245,0 kg',
        caption: 'G1 disponible de 250,0',
        depleted: false,
      },
      {
        grade: 'g2',
        kilos: '0,0 kg',
        caption: 'G2 disponible de 55,2',
        depleted: true,
      },
    ]);
  });

  it('leaves out a grade that entered with no kilos, also from the balance row', () => {
    const view = warehouseSectionView(
      buildLotWarehouseDetail({ g2_entered_kg: '0.0', g2_available_kg: '0.0' }),
      buildLotStock({ entry: buildStockEntry() }),
      TODAY,
    );

    expect(view.balances.map(({ grade }) => grade)).toEqual(['g1']);
    expect(view.ledger?.balance.g1.text).toBe('245,0');
    expect(view.ledger?.balance.g2.text).toBe('—');
  });

  it('adds the ledger and who corrected the entry with the full detail', () => {
    const full = buildLotStock({
      entry: buildStockEntry({
        corrected_at: '2026-10-31T09:00:00-05:00',
        corrected_by: { id: 'u2', full_name: 'Ana Pérez' },
      }),
    });

    const view = warehouseSectionView(SUMMARY, full, TODAY);

    expect(view.correctedBy).toBe('Corregido por Ana Pérez el 31 oct');
    expect(view.ledger?.rows.map(({ kind }) => kind)).toEqual(['entry']);
    expect(view.ledger?.balance).toEqual({
      g1: { text: '245,0', tone: 'none' },
      g2: { text: '55,2', tone: 'none' },
    });
  });
});
