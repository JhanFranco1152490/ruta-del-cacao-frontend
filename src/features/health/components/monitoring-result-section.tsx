import type { components } from '@/lib/api/schema';

import { SAMPLING_METHOD_OPTIONS, unitName } from '../monitoring-rules';
import { DetectionResult } from './detection-result';

type ActivityMonitoring = components['schemas']['ActivityMonitoring'];

const methodLabel = (method: ActivityMonitoring['sampling_method']) =>
  SAMPLING_METHOD_OPTIONS.find((option) => option.value === method)?.label;

// El resultado de un monitoreo realizado: qué se evaluó, lo que se encontró con sus controles y
// las observaciones. Las detecciones llegan de la incidencia más alta a la más baja.
export function MonitoringResultSection({
  monitoring,
}: {
  monitoring: ActivityMonitoring;
}) {
  const { sampling_unit, evaluated_units } = monitoring;
  const method = methodLabel(monitoring.sampling_method);
  return (
    <section aria-label="Resultado del monitoreo" className="space-y-3">
      <p className="section-label">Resultado</p>
      <p className="text-sm">
        <span className="font-bold">Evaluado: </span>
        {evaluated_units} {unitName(sampling_unit, evaluated_units)}
        {method ? ` · ${method.toLowerCase()}` : ''}
      </p>
      {monitoring.no_presence ? (
        <p className="font-bold text-ok">
          Sin presencia de plagas ni enfermedades
        </p>
      ) : (
        <ul aria-label="Detecciones" className="space-y-3">
          {monitoring.detections.map((detection) => (
            <DetectionResult
              detection={detection}
              key={detection.id}
              samplingUnit={sampling_unit}
            />
          ))}
        </ul>
      )}
      {monitoring.notes && (
        <p className="text-sm">
          <span className="font-bold">Observaciones: </span>
          {monitoring.notes}
        </p>
      )}
    </section>
  );
}
