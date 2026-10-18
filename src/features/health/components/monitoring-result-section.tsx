import type { components } from '@/lib/api/schema';

import { SAMPLING_METHOD_OPTIONS, unitName } from '../monitoring-rules';
import { DetectionActions } from './detection-actions';
import { DetectionResult } from './detection-result';

type Schemas = components['schemas'];
type ActivityMonitoring = Schemas['ActivityMonitoring'];

const methodLabel = (method: ActivityMonitoring['sampling_method']) =>
  SAMPLING_METHOD_OPTIONS.find((option) => option.value === method)?.label;

// El resultado de un monitoreo realizado: qué se evaluó, lo que se encontró con sus controles y
// las observaciones. Las detecciones llegan de la incidencia más alta a la más baja.
export function MonitoringResultSection({
  activity,
  monitoring,
  compact = false,
}: {
  // El monitoreo realizado; `monitoring` es su resultado.
  activity: Schemas['AgriculturalActivity'];
  monitoring: ActivityMonitoring;
  // En una lista: sin el título de la sección y con el resultado en menos líneas.
  compact?: boolean;
}) {
  const { sampling_unit, evaluated_units } = monitoring;
  const method = methodLabel(monitoring.sampling_method);
  return (
    <section
      aria-label="Resultado del monitoreo"
      className={compact ? 'space-y-2' : 'space-y-3'}
    >
      {!compact && <p className="section-label">Resultado</p>}
      <p className="text-sm">
        <span className="font-bold">Evaluado: </span>
        {evaluated_units} {unitName(sampling_unit, evaluated_units)}
        {method ? ` · ${method.toLowerCase()}` : ''}
        {compact && monitoring.no_presence && (
          <span className="font-bold text-ok">
            {' '}
            · Sin presencia de plagas ni enfermedades
          </span>
        )}
      </p>
      {monitoring.no_presence ? (
        !compact && (
          <p className="font-bold text-ok">
            Sin presencia de plagas ni enfermedades
          </p>
        )
      ) : (
        <ul
          aria-label="Detecciones"
          className={compact ? 'space-y-2' : 'space-y-3'}
        >
          {monitoring.detections.map((detection) => (
            <DetectionResult
              actions={
                <DetectionActions
                  compact={compact}
                  detection={detection}
                  monitoring={activity}
                />
              }
              compact={compact}
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
