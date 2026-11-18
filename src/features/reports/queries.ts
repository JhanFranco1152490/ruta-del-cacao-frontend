import { useMutation, useQuery } from '@tanstack/react-query';

import { apiFetch, apiFetchFile } from '@/lib/api/client';
import { apiPath } from '@/lib/api/path';
import { queryKeys, type ReportFilters } from '@/lib/api/query-keys';
import type { AudienceView } from '@/lib/audience-view';
import { saveFile } from '@/lib/files/save-file';

import type { Report, ReportFileFormat } from './api';
import { reportFileName } from './report-file-name';

const reportPath = (
  view: AudienceView,
  filters: ReportFilters,
  file?: ReportFileFormat,
) =>
  apiPath(`/api/reports/${view}${file ? '/export' : ''}`, {
    ...filters,
    file,
  });

// Un reporte se calcula al pedirlo y no tiene copia en el dispositivo: cada vez que se genera se
// pide de nuevo, para que traiga lo último que se registró y su hora de generación. `enabled` es
// falso hasta que se toca Generar.
export const useReport = (
  view: AudienceView,
  filters: ReportFilters,
  enabled: boolean,
) =>
  useQuery({
    queryKey:
      view === 'producer'
        ? queryKeys.reports.producer(filters)
        : queryKeys.reports.association(filters),
    queryFn: ({ signal }) =>
      apiFetch<Report>(reportPath(view, filters), { signal }),
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
  });

// La descarga lleva los filtros del reporte que se ve, no los de la pantalla si cambiaron después:
// el archivo trae lo mismo que la tabla.
export async function exportReport(
  view: AudienceView,
  filters: ReportFilters,
  file: ReportFileFormat,
  report: Pick<Report, 'title' | 'generated_at'>,
) {
  const downloaded = await apiFetchFile(reportPath(view, filters, file));
  saveFile(
    downloaded.blob,
    downloaded.fileName ?? reportFileName(view, report, file),
  );
}

// Solo con conexión: una descarga no se guarda para después.
export const useExportReport = () =>
  useMutation({
    networkMode: 'always',
    mutationFn: ({
      view,
      filters,
      file,
      report,
    }: {
      view: AudienceView;
      filters: ReportFilters;
      file: ReportFileFormat;
      report: Pick<Report, 'title' | 'generated_at'>;
    }) => exportReport(view, filters, file, report),
  });
