import { dateInBogota } from '@/lib/format/dates';
import type { AudienceView } from '@/lib/audience-view';

import type { Report, ReportFileFormat } from './api';

// El nombre que pone el servidor (`reporte-produccion-2026-11-13.pdf`), armado aquí con la misma
// regla para cuando no llega: el tipo en minúsculas y sin tildes, el prefijo de la asociación y la
// fecha de generación en Bogotá.
export function reportFileName(
  view: AudienceView,
  report: Pick<Report, 'title' | 'generated_at'>,
  file: ReportFileFormat,
) {
  const slug = report.title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-');
  const prefix = view === 'association' ? 'reporte-asociacion' : 'reporte';
  return `${prefix}-${slug}-${dateInBogota(report.generated_at)}.${file}`;
}
