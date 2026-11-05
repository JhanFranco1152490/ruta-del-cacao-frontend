import { SummaryStrip, SummaryValue } from '@/components/summary-strip';

// Las cifras del trabajo del día, con el filtro de finca puesto. Los lotes listos solo se cuentan
// con conexión: sin ella, o mientras llegan, la cifra queda en «—».
export function DryingSummary({
  inProgress,
  missingToday,
  ready,
}: {
  inProgress: number;
  missingToday: number;
  ready: number | undefined;
}) {
  return (
    <SummaryStrip compact label="Resumen de secado">
      <SummaryValue title="En secado" value={String(inProgress)} />
      <SummaryValue
        title="Bitácora de hoy pendiente"
        value={String(missingToday)}
      />
      <SummaryValue
        title="Listos para secar"
        value={ready === undefined ? '—' : String(ready)}
      />
    </SummaryStrip>
  );
}
