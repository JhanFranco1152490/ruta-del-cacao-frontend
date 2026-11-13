import { describe, expect, it } from 'vitest';

import { buildReport } from '@/test/factories';

import { filtersLine, generatedLine } from './report-header';

describe('filtersLine', () => {
  it('names each applied filter, as the exported file does', () => {
    expect(filtersLine(buildReport().filters)).toBe(
      'Periodo: 01/01/2026 – 31/03/2026 · Finca: F01 · La Esperanza',
    );
  });

  // El inventario de toda la unidad productiva no lleva periodo ni lugar.
  it('says so when there is no filter', () => {
    expect(filtersLine([])).toBe('Sin filtros');
  });
});

describe('generatedLine', () => {
  it('says when, in Bogotá time, and by whom', () => {
    expect(
      generatedLine({
        generated_at: '2026-11-13T15:15:00Z',
        generated_by: 'Ana Ejemplo',
      }),
    ).toBe('Generado el 13/11/2026 a las 10:15 por Ana Ejemplo');
  });
});
