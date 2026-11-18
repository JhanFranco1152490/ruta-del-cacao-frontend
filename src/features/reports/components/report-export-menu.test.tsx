import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiFetchFile, type DownloadedFile } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import type { ReportFilters } from '@/lib/api/query-keys';
import { saveFile } from '@/lib/files/save-file';
import { notify } from '@/lib/notify';
import { buildReport } from '@/test/factories';
import { createTestQueryClient } from '@/test/render';

import { EXPORT_FAILED_MESSAGE, ReportExportMenu } from './report-export-menu';

// La descarga de verdad (el archivo y su nombre) se prueba en el entorno `node`: aquí solo importa
// qué se pide y qué ve la persona.
vi.mock('@/lib/api/client', async (original) => ({
  ...(await original<typeof import('@/lib/api/client')>()),
  apiFetchFile: vi.fn(),
}));
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

const FILE: DownloadedFile = {
  blob: new Blob(['a,b']),
  fileName: 'reporte-produccion-2026-03-31.xlsx',
};

beforeEach(() => {
  vi.mocked(apiFetchFile).mockReset().mockResolvedValue(FILE);
  vi.mocked(saveFile).mockReset();
  vi.spyOn(notify, 'error').mockImplementation(() => '');
});

function renderMenu(report = buildReport()) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ReportExportMenu filters={FILTERS} report={report} view="producer" />
    </QueryClientProvider>,
  );
}

async function choose(format: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Exportar' }));
  await user.click(await screen.findByRole('menuitem', { name: format }));
}

describe('ReportExportMenu', () => {
  it('offers the three formats', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: 'Exportar' }));

    expect(
      (await screen.findAllByRole('menuitem')).map((item) => item.textContent),
    ).toEqual(['PDF', 'Excel', 'CSV']);
  });

  // El archivo trae lo mismo que la pantalla.
  it('downloads the report it shows, with its filters and the chosen format', async () => {
    renderMenu();

    await choose('Excel');

    await waitFor(() =>
      expect(saveFile).toHaveBeenCalledWith(
        FILE.blob,
        'reporte-produccion-2026-03-31.xlsx',
      ),
    );
    expect(apiFetchFile).toHaveBeenCalledWith(
      '/api/reports/producer/export?type=production&from=2026-01-01&to=2026-03-31&farm=f1&file=xlsx',
    );
  });

  it('cannot be asked again while it downloads', async () => {
    let finish: (file: DownloadedFile) => void = () => {};
    vi.mocked(apiFetchFile).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    renderMenu();

    await choose('PDF');

    const busy = await screen.findByRole('button', { name: 'Exportando…' });
    expect(busy).toBeDisabled();
    finish(FILE);
    expect(
      await screen.findByRole('button', { name: 'Exportar' }),
    ).toBeEnabled();
  });

  // El PDF admite menos filas que Excel y CSV: el servidor dice qué hacer.
  it('says why the server did not give the file', async () => {
    vi.mocked(apiFetchFile).mockRejectedValue(
      new ApiError(400, {
        code: 'report_too_large',
        detail:
          'El PDF admite hasta 2.000 filas. Descarga el reporte en Excel o CSV.',
        fields: {},
      }),
    );
    renderMenu();

    await choose('PDF');

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(
        'El PDF admite hasta 2.000 filas. Descarga el reporte en Excel o CSV.',
      ),
    );
    expect(saveFile).not.toHaveBeenCalled();
  });

  it('falls back to a general message without a server answer', async () => {
    vi.mocked(apiFetchFile).mockRejectedValue(new TypeError('Failed to fetch'));
    renderMenu();

    await choose('CSV');

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(EXPORT_FAILED_MESSAGE),
    );
  });

  // Sin filas no hay archivo.
  it('is disabled when the report has no rows', () => {
    renderMenu(buildReport({ rows: [] }));

    expect(screen.getByRole('button', { name: 'Exportar' })).toBeDisabled();
    expect(apiFetchFile).not.toHaveBeenCalled();
  });
});
