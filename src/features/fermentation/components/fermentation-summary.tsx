import { SummaryItem, SummaryStrip } from '@/components/summary-strip';

function SummaryValue({ title, value }: { title: string; value: string }) {
  return (
    <SummaryItem title={title}>
      <p className="text-xl font-bold text-selva tabular-nums sm:text-2xl">
        {value}
      </p>
    </SummaryItem>
  );
}

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
    <SummaryStrip label="Resumen de fermentación">
      <SummaryValue title="En fermentación" value={String(inProgress)} />
      <SummaryValue title="Volteo pendiente" value={String(overdue)} />
      <SummaryValue
        title="Listos para fermentar"
        value={ready === undefined ? '—' : String(ready)}
      />
    </SummaryStrip>
  );
}
