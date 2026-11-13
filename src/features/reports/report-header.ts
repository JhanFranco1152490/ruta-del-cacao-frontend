import { formatNumericDateTime } from '@/lib/format/dates';

import type { Report, ReportFilter } from './api';

// Los filtros con que se generó, con sus nombres y no sus ids, como los escribe el archivo:
// «Periodo: 01/01/2026 – 31/03/2026 · Finca: F02 · La Esperanza».
export const filtersLine = (filters: readonly ReportFilter[]) =>
  filters.map(({ label, text }) => `${label}: ${text}`).join(' · ') ||
  'Sin filtros';

export const generatedLine = ({
  generated_at,
  generated_by,
}: Pick<Report, 'generated_at' | 'generated_by'>) =>
  `Generado el ${formatNumericDateTime(generated_at)} por ${generated_by}`;
