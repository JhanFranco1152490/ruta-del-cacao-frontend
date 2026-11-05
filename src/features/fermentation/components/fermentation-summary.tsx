import { SummaryStrip, SummaryValue } from '@/components/summary-strip';

// Las cifras del trabajo del día, con el filtro de finca puesto. Los lotes listos solo se cuentan
// con conexión: sin ella, o mientras llegan, la cifra queda en «—».
export function FermentationSummary({
  inProgress,
  overdue,
  ready,
}: {
  inProgress: number;
  overdue: number;
  ready: number | undefined;
}) {
  return (
    <SummaryStrip compact label="Resumen de fermentación">
      <SummaryValue title="En fermentación" value={String(inProgress)} />
      <SummaryValue title="Volteo pendiente" value={String(overdue)} />
      <SummaryValue
        title="Listos para fermentar"
        value={ready === undefined ? '—' : String(ready)}
      />
    </SummaryStrip>
  );
}
