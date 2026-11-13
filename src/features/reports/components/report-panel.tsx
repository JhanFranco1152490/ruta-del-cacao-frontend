import type { Report } from '../api';
import { filtersLine, generatedLine } from '../report-header';

// El reporte generado: su encabezado con los filtros con que se generó y cuándo.
export function ReportPanel({ report }: { report: Report }) {
  return (
    <section
      aria-labelledby="report-title"
      className="motion-rise rounded-lg bg-card p-5 shadow-card"
    >
      <h2 className="text-xl text-selva" id="report-title">
        {report.title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {filtersLine(report.filters)}
      </p>
      <p className="text-sm text-muted-foreground">{generatedLine(report)}</p>
    </section>
  );
}
