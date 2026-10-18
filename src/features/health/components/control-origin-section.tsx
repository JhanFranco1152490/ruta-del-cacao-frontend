import { Button } from '@/components/ui/button';
import type { components } from '@/lib/api/schema';
import { formatDayMonth } from '@/lib/format/dates';
import { formatDecimal } from '@/lib/format/decimal';

import { controlMethodLabel, SAMPLING_UNITS } from '../monitoring-rules';

type ControlOf = components['schemas']['ControlOf'];

// A qué detección atiende un control: la plaga, su incidencia y el monitoreo en que se encontró.
// `onOpenMonitoring` abre el monitoreo, si quien muestra el detalle sabe hacerlo.
export function ControlOriginSection({
  controlOf,
  onOpenMonitoring,
}: {
  controlOf: ControlOf;
  onOpenMonitoring?: () => void;
}) {
  const pest =
    controlOf.pest_disease?.name ?? `Otra (${controlOf.other_description})`;
  const incidence = `${formatDecimal(controlOf.incidence, 2)} % de ${SAMPLING_UNITS[controlOf.sampling_unit].plural}`;
  const plan =
    controlOf.method === 'other'
      ? controlOf.method_description
      : controlOf.method && controlMethodLabel(controlOf.method);
  return (
    <section aria-label="Control fitosanitario" className="space-y-2">
      <p className="section-label">Control fitosanitario</p>
      <p className="text-sm">
        <span className="font-bold">Atiende: </span>
        {pest} {incidence} · monitoreo del{' '}
        {formatDayMonth(controlOf.monitoring_done_date)}
      </p>
      {plan && (
        <p className="text-sm">
          <span className="font-bold">Qué se hace: </span>
          {plan}
        </p>
      )}
      {controlOf.planned_input && (
        <p className="text-sm">
          <span className="font-bold">Insumo previsto: </span>
          {controlOf.planned_input.name}
        </p>
      )}
      {onOpenMonitoring && (
        <Button
          className="h-auto px-0 font-bold"
          onClick={onOpenMonitoring}
          type="button"
          variant="link"
        >
          Ver el monitoreo
        </Button>
      )}
    </section>
  );
}
