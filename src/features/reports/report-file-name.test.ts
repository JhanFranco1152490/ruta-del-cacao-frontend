import { describe, expect, it } from 'vitest';

import { reportFileName } from './report-file-name';

describe('reportFileName', () => {
  it('names the file as the server does, without accents', () => {
    expect(
      reportFileName(
        'producer',
        {
          title: 'Comercialización',
          generated_at: '2026-11-13T10:15:00-05:00',
        },
        'pdf',
      ),
    ).toBe('reporte-comercializacion-2026-11-13.pdf');
  });

  it('marks the association report', () => {
    expect(
      reportFileName(
        'association',
        { title: 'Calidad', generated_at: '2026-11-13T10:15:00-05:00' },
        'xlsx',
      ),
    ).toBe('reporte-asociacion-calidad-2026-11-13.xlsx');
  });

  // Pasada la medianoche UTC todavía es el día anterior en Bogotá.
  it('uses the Bogotá date of generation', () => {
    expect(
      reportFileName(
        'producer',
        { title: 'Producción', generated_at: '2026-11-14T03:00:00Z' },
        'csv',
      ),
    ).toBe('reporte-produccion-2026-11-13.csv');
  });
});
