import { useId } from 'react';

import { EmptyState } from '@/components/empty-state';
import { ReportSheets } from '@/components/illustrations/report-sheets';
import { Button } from '@/components/ui/button';
import type { ReportFilters } from '@/lib/api/query-keys';
import type { AudienceView } from '@/lib/audience-view';

import type { Report } from '../api';
import { ReportExportMenu } from './report-export-menu';
import { ReportHeading } from './report-heading';
import { ReportTable } from './report-table';
import { ReportTotals } from './report-totals';

// El reporte generado: su encabezado, los totales y la tabla. Sin filas no hay reporte que leer:
// lo dice, y se puede volver a empezar.
export function ReportPanel({
  report,
  view,
  filters,
  onClear,
}: {
  report: Report;
  view: AudienceView;
  // Los filtros con que se pidió el reporte: la descarga trae lo mismo que la tabla.
  filters: ReportFilters;
  // Solo con algún filtro puesto: sin ninguno no hay nada que limpiar.
  onClear?: () => void;
}) {
  const titleId = useId();
  const empty = report.rows.length === 0;
  return (
    <section aria-labelledby={titleId} className="motion-rise space-y-4">
      <ReportHeading
        actions={
          <ReportExportMenu filters={filters} report={report} view={view} />
        }
        report={report}
        titleId={titleId}
      />
      {empty ? (
        <div className="rounded-lg bg-card shadow-card">
          <EmptyState
            action={
              onClear && (
                <Button
                  onClick={onClear}
                  size="office"
                  type="button"
                  variant="action"
                >
                  Limpiar filtros
                </Button>
              )
            }
            description="Cambia el periodo, la finca o el tipo de reporte y vuelve a generar."
            illustration={ReportSheets}
            title="No hay resultados para estos filtros."
          />
        </div>
      ) : (
        <>
          <ReportTotals totals={report.totals} />
          <div className="rounded-lg bg-card p-5 shadow-card max-md:bg-transparent max-md:p-0 max-md:shadow-none">
            <ReportTable report={report} />
          </div>
        </>
      )}
    </section>
  );
}
