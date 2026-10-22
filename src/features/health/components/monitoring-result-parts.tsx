import type { components } from '@/lib/api/schema';

import {
  controlRowText,
  type Detection,
  detectionStatus,
} from '../detection-status';
import { SAMPLING_METHOD_OPTIONS, unitName } from '../monitoring-rules';
import { EvidenceSection } from './evidence-section';

type AgriculturalActivity = components['schemas']['AgriculturalActivity'];

const STATUS_CLASS = {
  none: 'text-warn',
  requested: 'text-warn',
  dismissed: 'text-muted-foreground',
} as const;

// Qué se hizo con una detección: sus controles, o si espera uno, se pidió o no hace falta.
export function ControlCell({ detection }: { detection: Detection }) {
  const status = detectionStatus(detection);
  if (!status) {
    return (
      <ul aria-label="Controles" className="space-y-0.5">
        {detection.controls.map((control) => (
          <li key={control.id}>{controlRowText(control)}</li>
        ))}
      </ul>
    );
  }
  return (
    <span className={`font-bold ${STATUS_CLASS[status.kind]}`}>
      {status.text}
    </span>
  );
}

const methodLabel = (method: string | null | undefined) =>
  SAMPLING_METHOD_OPTIONS.find((option) => option.value === method)?.label;

// Lo que no cabe en la fila: qué se evaluó, quién lo registró, las observaciones y las fotos.
export function MonitoringDetail({
  activity,
}: {
  activity: AgriculturalActivity;
}) {
  const { monitoring } = activity;
  if (!monitoring) return null;
  const method = methodLabel(monitoring.sampling_method);
  return (
    <div className="space-y-2 py-1 text-sm">
      <p>
        <span className="font-bold">Evaluado: </span>
        {monitoring.evaluated_units}{' '}
        {unitName(monitoring.sampling_unit, monitoring.evaluated_units)}
        {method ? ` · ${method.toLowerCase()}` : ''}
        {activity.completed_by &&
          ` · Registró ${activity.completed_by.full_name}`}
      </p>
      {monitoring.notes && (
        <p>
          <span className="font-bold">Observaciones: </span>
          {monitoring.notes}
        </p>
      )}
      <EvidenceSection activity={activity} />
    </div>
  );
}
