'use client';

import { useState } from 'react';

import { useSession } from '@/hooks/use-session';
import { useProducerSummary } from '@/lib/api/producer-options';
import { availableViews, resolveView } from '@/lib/audience-view';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { useReport } from './queries';
import { reportContent } from './report-content';
import { reportErrors } from './report-errors';
import {
  type ReportFieldErrors,
  reportQuery,
  validateReportRequest,
} from './report-request';
import {
  availableReportTypes,
  REPORT_VIEW_PERMISSIONS,
  resolveReportType,
} from './report-types';
import { useReportFilters } from './use-report-filters';

export type ReportsScreenState = ReturnType<typeof useReportsScreen>;

// Todo lo que Reportes lee y decide antes de dibujarse: la vista de la cuenta, los tipos que puede
// generar, si lo que hay en los filtros se puede pedir y el reporte, solo cuando se tocó Generar.
export function useReportsScreen() {
  const { data: user, isPending: sessionPending } = useSession();
  const filters = useReportFilters();
  // Que falta el tipo se dice al tocar Generar, no antes: la pantalla abre sin tipo elegido.
  const [attempted, setAttempted] = useState(false);

  const views = availableViews(user, REPORT_VIEW_PERMISSIONS);
  const view = resolveView(views, filters.requestedView) ?? 'producer';
  const types = availableReportTypes(user, view);
  const type = resolveReportType(types, filters.requestedType);
  const superuser = user?.is_superuser === true;
  const values = { ...filters.values, type };
  const invalid = validateReportRequest(values);

  const query = reportQuery(
    view,
    { ...values, type: type ?? types[0] ?? 'production' },
    { superuser },
  );
  const report = useReport(view, query, filters.generated && !invalid);
  const refused =
    filters.generated && report.error ? reportErrors(report.error) : null;

  const fieldErrors: ReportFieldErrors = {
    ...refused?.fields,
    ...(invalid?.period && { period: invalid.period }),
    ...(attempted && invalid?.type && { type: invalid.type }),
  };

  return {
    filters,
    views,
    view,
    types,
    type,
    superuser,
    // El lote se busca en la lista de lotes, que pide su propio permiso.
    canFilterLot:
      view === 'producer' && hasPermission(user, PERMISSIONS.LOTS_VIEW),
    selectedProducer: useProducerSummary(filters.values.producer ?? undefined),
    fieldErrors,
    notice: refused?.notice ?? null,
    query,
    report,
    content: reportContent({
      sessionPending,
      hasTypes: types.length > 0,
      generated: filters.generated,
      valid: !invalid,
      pending: report.isPending,
      notice: refused?.notice ?? null,
      hasReport: !!report.data,
    }),
    // Con el reporte ya generado y los mismos filtros, se pide otra vez: la hora de generación y
    // lo registrado desde entonces cambian.
    generate: () => {
      setAttempted(true);
      if (invalid) return;
      if (filters.generated) void report.refetch();
      else void filters.generate();
    },
  };
}
