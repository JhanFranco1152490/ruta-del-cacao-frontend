import { describe, expect, it } from 'vitest';

import type { LotWarehouseDetail } from './api';
import { warehouseSummary } from './warehouse-summary';

const buildDetail = (
  overrides: Partial<LotWarehouseDetail> = {},
): LotWarehouseDetail => ({
  entry_date: '2026-11-08',
  warehouse_name: 'Bodega principal',
  location: 'Estante 1',
  g1_entered_kg: '100.0',
  g2_entered_kg: '14.0',
  g1_available_kg: '98.0',
  g2_available_kg: '14.0',
  ...overrides,
});

describe('warehouseSummary', () => {
  it('says the entry is pending when the lot has not been stored', () => {
    expect(warehouseSummary(null)).toBe('Pendiente de ingreso');
  });

  it('says where the lot is and what is left of each grade', () => {
    expect(warehouseSummary(buildDetail())).toBe(
      'En bodega · Bodega principal · G1 98,0 kg · G2 14,0 kg',
    );
  });

  it('leaves out a grade that did not enter with kilos', () => {
    const detail = buildDetail({
      g2_entered_kg: '0.0',
      g2_available_kg: '0.0',
    });

    expect(warehouseSummary(detail)).toBe(
      'En bodega · Bodega principal · G1 98,0 kg',
    );
  });

  it('keeps a depleted grade at zero', () => {
    const detail = buildDetail({ g2_available_kg: '0.0' });

    expect(warehouseSummary(detail)).toBe(
      'En bodega · Bodega principal · G1 98,0 kg · G2 0,0 kg',
    );
  });
});
