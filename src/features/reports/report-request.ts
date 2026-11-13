import type { ReportFilters } from '@/lib/api/query-keys';
import type { AudienceView } from '@/lib/audience-view';
import { periodError } from '@/lib/period';

import type { ReportType } from './api';
import { isWithoutPeriod } from './report-types';

export const TYPE_REQUIRED_MESSAGE = 'Seleccione el tipo de reporte.';

// Lo que hay en los filtros de la pantalla, aunque falte algo o no aplique a la vista elegida.
export type ReportFilterValues = {
  type: ReportType | null;
  from: string | null;
  to: string | null;
  producer: string | null;
  municipality: string | null;
  farm: string | null;
  plot: string | null;
  lot: string | null;
};

export type ReportField =
  'type' | 'period' | 'producer' | 'municipality' | 'farm' | 'plot' | 'lot';

export type ReportFieldErrors = Partial<Record<ReportField, string>>;

// Lo que se dice en el campo antes de pedir nada: sin tipo, o con el periodo al revés (el
// inventario no lleva periodo). El servidor valida lo mismo; esto evita la vuelta.
export function validateReportRequest(
  values: ReportFilterValues,
): ReportFieldErrors | null {
  if (!values.type) return { type: TYPE_REQUIRED_MESSAGE };
  if (isWithoutPeriod(values.type)) return null;
  const period = periodError(values.from, values.to);
  return period ? { period } : null;
}

// Lo que se pide al servidor, ya validado: cada vista lleva solo sus filtros. El productor lo
// manda solo la cuenta técnica en la vista del productor (para las demás cuentas el servidor lo
// ignora, pero así la consulta en caché no depende de un valor que no cuenta).
export function reportQuery(
  view: AudienceView,
  values: ReportFilterValues & { type: ReportType },
  { superuser }: { superuser: boolean },
): ReportFilters {
  const withPeriod = !isWithoutPeriod(values.type);
  const producerView = view === 'producer';
  return {
    type: values.type,
    from: withPeriod ? values.from : null,
    to: withPeriod ? values.to : null,
    producer: producerView && !superuser ? null : values.producer,
    municipality: producerView ? null : values.municipality,
    farm: values.farm,
    plot: producerView ? values.plot : null,
    lot: producerView ? values.lot : null,
  };
}
