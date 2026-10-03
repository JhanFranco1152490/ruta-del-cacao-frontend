import {
  allocatedPercentage,
  availableHectares,
  formatHectares,
  formatHectareValue,
} from '@/lib/format/hectares';

// Cuánto del área de la finca ya está repartida entre sus parcelas activas. El texto dice lo
// mismo que la barra: el estado nunca se comunica solo con la longitud o el color.
export function PlotAreaBar({
  areaHectares,
  allocatedAreaHectares,
}: {
  areaHectares: string;
  allocatedAreaHectares: string;
}) {
  const percentage = allocatedPercentage(areaHectares, allocatedAreaHectares);
  const summary = `${formatHectareValue(allocatedAreaHectares)} de ${formatHectares(areaHectares)} asignadas · ${formatHectares(availableHectares(areaHectares, allocatedAreaHectares))} disponibles`;

  return (
    <div className="space-y-2">
      <p className="font-bold text-foreground">{summary}</p>
      <div
        aria-label="Área de la finca asignada a parcelas"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percentage}
        aria-valuetext={summary}
        className="h-3 overflow-hidden rounded-full bg-muted"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-selva"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
