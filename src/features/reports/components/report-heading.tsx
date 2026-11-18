import type { ReactNode } from 'react';

import type { Report } from '../api';
import { filtersLine, generatedLine } from '../report-header';

// El tipo de reporte, los filtros con que se generó y cuándo, como el encabezado del archivo; a la
// derecha, lo que se hace con él (exportar).
export function ReportHeading({
  report,
  titleId,
  actions,
}: {
  report: Report;
  titleId: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-xl text-selva" id={titleId}>
          {report.title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {filtersLine(report.filters)}
        </p>
        <p className="text-sm text-muted-foreground">{generatedLine(report)}</p>
      </div>
      {actions}
    </div>
  );
}
