import { describe, expect, it } from 'vitest';

import { buildReportColumn } from '@/test/factories';

import { groupColumns, type ReportTableColumn } from './report-column-groups';

// Las columnas como las manda el servidor: solo importan la clave y el orden.
const columnsOf = (...keys: string[]) =>
  keys.map((key) => buildReportColumn({ key, label: key }));

// Lo que queda en la tabla: una columna suelta por su clave y un grupo con las suyas.
const layout = (table: ReportTableColumn[]) =>
  table.map((cell) =>
    cell.type === 'single'
      ? cell.key
      : `${cell.label}(${cell.columns.map(({ key }) => key).join(', ')})`,
  );

describe('groupColumns', () => {
  it('joins the 20 traceability columns into 8, one per stage', () => {
    const traceability = columnsOf(
      'lot_code',
      'farm',
      'plot',
      'harvest_date',
      'green_kg',
      'status',
      'fermentation_started_on',
      'fermentation_ended_on',
      'drying_ended_on',
      'dry_kg',
      'yield_pct',
      'quality_result',
      'quality_closed_on',
      'g1_kg',
      'g2_kg',
      'discard_kg',
      'entry_date',
      'available_kg',
      'sold_kg',
      'buyers',
    );

    expect(layout(groupColumns(traceability))).toEqual([
      'Lote(lot_code, status)',
      'Origen(farm, plot)',
      'Cosecha(harvest_date, green_kg)',
      'Fermentación(fermentation_started_on, fermentation_ended_on)',
      'Secado(drying_ended_on, dry_kg, yield_pct)',
      'Calidad(quality_result, quality_closed_on, g1_kg, g2_kg, discard_kg)',
      'Bodega(entry_date, available_kg)',
      'Venta(sold_kg, buyers)',
    ]);
  });

  // Cada grupo queda donde venía su primera columna.
  it('joins the production columns that go together, where the first one was', () => {
    const production = columnsOf(
      'harvest_date',
      'farm',
      'plot',
      'variety',
      'collector',
      'green_kg',
      'lot_code',
      'lot_status',
      'dry_kg',
      'yield_pct',
    );

    expect(layout(groupColumns(production))).toEqual([
      'Cosecha(harvest_date, green_kg)',
      'Origen(farm, plot)',
      'variety',
      'collector',
      'Lote(lot_code, lot_status)',
      'dry_kg',
      'yield_pct',
    ]);
  });

  it('joins each grade with its share in the quality report', () => {
    const quality = columnsOf(
      'lot_code',
      'farm',
      'plot',
      'closed_on',
      'result',
      'dry_kg',
      'g1_kg',
      'g2_kg',
      'discard_kg',
      'g1_pct',
      'g2_pct',
      'discard_pct',
      'discard_reason',
    );

    expect(layout(groupColumns(quality))).toEqual([
      'lot_code',
      'Origen(farm, plot)',
      'closed_on',
      'result',
      'dry_kg',
      'G1(g1_kg, g1_pct)',
      'G2(g2_kg, g2_pct)',
      'Descarte(discard_kg, discard_pct)',
      'discard_reason',
    ]);
  });

  // La finca de la asociación o de una venta va sola: un grupo necesita todas sus claves.
  it('leaves the columns as they come when no group is complete', () => {
    const sales = columnsOf('sale_date', 'sale_number', 'buyer', 'farm', 'kg');

    expect(layout(groupColumns(sales))).toEqual([
      'sale_date',
      'sale_number',
      'buyer',
      'farm',
      'kg',
    ]);
  });

  it('keeps every column of the report exactly once', () => {
    const quality = columnsOf('g1_kg', 'g1_pct', 'quality_result', 'g2_kg');
    const keys = groupColumns(quality).flatMap((cell) =>
      cell.type === 'single' ? [cell.key] : cell.columns.map(({ key }) => key),
    );

    expect(keys.sort()).toEqual(['g1_kg', 'g1_pct', 'g2_kg', 'quality_result']);
  });
});
