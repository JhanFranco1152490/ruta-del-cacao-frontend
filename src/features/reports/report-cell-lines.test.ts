import { describe, expect, it } from 'vitest';

import { buildReportColumn } from '@/test/factories';

import { cellLines } from './report-cell-lines';

const DRYING = [
  buildReportColumn({
    key: 'drying_ended_on',
    label: 'Fin del secado',
    kind: 'date',
  }),
  buildReportColumn({ key: 'dry_kg', label: 'Kg seco', kind: 'kg' }),
  buildReportColumn({ key: 'yield_pct', label: 'Rendimiento %', kind: 'pct' }),
];

describe('cellLines', () => {
  it('writes dates and texts alone, and figures with their label', () => {
    expect(
      cellLines(DRYING, {
        drying_ended_on: '2026-04-02',
        dry_kg: '40.5',
        yield_pct: '33.8',
      }),
    ).toEqual([
      { key: 'drying_ended_on', label: undefined, text: '02/04/2026' },
      { key: 'dry_kg', label: 'Kg seco', text: '40,5 kg' },
      { key: 'yield_pct', label: 'Rendimiento %', text: '33,8 %' },
    ]);
  });

  // El lote en proceso muestra lo que lleva.
  it('leaves out what has not happened yet', () => {
    expect(
      cellLines(DRYING, {
        drying_ended_on: '2026-04-02',
        dry_kg: null,
        yield_pct: null,
      }).map(({ text }) => text),
    ).toEqual(['02/04/2026']);
  });

  it('shows a dash when the whole stage has not happened', () => {
    expect(
      cellLines(DRYING, {
        drying_ended_on: null,
        dry_kg: null,
        yield_pct: null,
      }),
    ).toEqual([{ key: 'empty', text: '—' }]);
  });
});
