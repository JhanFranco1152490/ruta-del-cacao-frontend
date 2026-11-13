// @vitest-environment node
// La descarga recibe un `Blob` y lee sus encabezados: los de jsdom no son los del `fetch` de las
// pruebas.
import { HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReportFilters } from '@/lib/api/query-keys';
import { saveFile } from '@/lib/files/save-file';
import { apiError } from '@/test/factories';
import { reportFileHandler } from '@/test/handlers';
import { server } from '@/test/server';

import { exportReport } from './queries';

vi.mock('@/lib/files/save-file', () => ({ saveFile: vi.fn() }));

const FILTERS: ReportFilters = {
  type: 'production',
  from: '2026-01-01',
  to: '2026-03-31',
  producer: null,
  municipality: null,
  farm: 'f1',
  plot: null,
  lot: null,
};

const REPORT = {
  title: 'Producción',
  generated_at: '2026-03-31T10:15:00-05:00',
};

beforeEach(() => vi.mocked(saveFile).mockReset());

describe('exportReport', () => {
  it('downloads the report it shows, in the chosen format, with the server name', async () => {
    const requests: URLSearchParams[] = [];
    server.use(
      reportFileHandler(
        'producer',
        { body: 'a,b', fileName: 'reporte-produccion-2026-03-31.csv' },
        requests,
      ),
    );

    await exportReport('producer', FILTERS, 'csv', REPORT);

    expect(Object.fromEntries(requests[0])).toEqual({
      type: 'production',
      from: '2026-01-01',
      to: '2026-03-31',
      farm: 'f1',
      file: 'csv',
    });
    const [blob, name] = vi.mocked(saveFile).mock.calls[0];
    expect(await blob.text()).toBe('a,b');
    expect(name).toBe('reporte-produccion-2026-03-31.csv');
  });

  // Desde otro origen el navegador oculta el nombre si la API no lo expone.
  it('names the file itself when the server name does not arrive', async () => {
    server.use(reportFileHandler('association', new HttpResponse('x')));

    await exportReport('association', FILTERS, 'xlsx', REPORT);

    expect(vi.mocked(saveFile).mock.calls[0][1]).toBe(
      'reporte-asociacion-produccion-2026-03-31.xlsx',
    );
  });

  it('saves nothing when the server refuses the file', async () => {
    server.use(
      reportFileHandler(
        'producer',
        apiError(
          400,
          'report_too_large',
          'El reporte tiene demasiadas filas para un PDF. Descárgalo en Excel o CSV.',
        ),
      ),
    );

    await expect(
      exportReport('producer', FILTERS, 'pdf', REPORT),
    ).rejects.toMatchObject({ code: 'report_too_large' });
    expect(saveFile).not.toHaveBeenCalled();
  });
});
