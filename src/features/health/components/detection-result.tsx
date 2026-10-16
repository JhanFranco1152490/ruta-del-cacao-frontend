import type { ReactNode } from 'react';

import { formatDecimal } from '@/lib/format/decimal';

import {
  controlRowText,
  type Detection,
  detectionName,
  detectionStatus,
} from '../detection-status';
import { type SamplingUnit, unitName } from '../monitoring-rules';

const STATUS_CLASS = {
  none: 'text-warn',
  requested: 'text-warn',
  dismissed: 'text-muted-foreground',
} as const;

// Una detección de un monitoreo realizado: qué, en cuántas unidades, con qué incidencia, y sus
// controles o lo que falta decidir. `actions` son los botones que ofrece quien puede programar.
export function DetectionResult({
  detection,
  samplingUnit,
  actions,
}: {
  detection: Detection;
  samplingUnit: SamplingUnit;
  actions?: ReactNode;
}) {
  const status = detectionStatus(detection);
  const affected = detection.affected_units;
  return (
    <li className="space-y-2 border-l-4 border-selva pl-3">
      <p className="font-bold">
        {detectionName(detection)}
        <span className="font-normal text-muted-foreground">
          {' '}
          · {affected} {unitName(samplingUnit, affected)} ·{' '}
          {formatDecimal(detection.incidence, 2)} %
        </span>
      </p>
      {detection.controls.length > 0 && (
        <ul aria-label="Controles" className="space-y-1 text-sm">
          {detection.controls.map((control) => (
            <li key={control.id}>{controlRowText(control)}</li>
          ))}
        </ul>
      )}
      {status && (
        <p className={`text-sm font-bold ${STATUS_CLASS[status.kind]}`}>
          {status.text}
        </p>
      )}
      {actions}
    </li>
  );
}
