import { formatDayMonth } from '@/lib/format/dates';
import { formatDecimal } from '@/lib/format/decimal';

import {
  type ControlMethod,
  controlMethodLabel,
  evaluatedText,
  incidencePercent,
  OTHER_PEST_DISEASE,
  type SamplingUnit,
  unitName,
} from './monitoring-rules';
import type {
  ControlValues,
  DetectionValues,
  MonitoringFormValues,
} from './monitoring-schema';

function controlPhrase(
  control: ControlValues,
  assigneeName: (id: string) => string,
) {
  switch (control.mode) {
    case 'done': {
      const what =
        control.method === 'other'
          ? control.method_description
          : controlMethodLabel(control.method as ControlMethod).toLowerCase();
      return `Control: ${what} (hecho)`;
    }
    case 'scheduled':
      return `Control: programado para el ${formatDayMonth(control.scheduled_date)} · ${assigneeName(control.assignee_id)}`;
    case 'requested':
      return 'Control: se pidió que lo programen';
    default:
      return 'Control: ninguno por ahora';
  }
}

function detectionTitle(
  row: DetectionValues,
  unit: SamplingUnit,
  evaluated: number,
  pestName: (id: string) => string,
) {
  const affected = Number(row.affected_units);
  const name =
    row.pest_disease_id === OTHER_PEST_DISEASE
      ? `Otra (${row.other_description})`
      : pestName(row.pest_disease_id);
  const percent = formatDecimal(incidencePercent(affected, evaluated), 2);
  return `${name}: ${affected} ${unitName(unit, affected)} · ${percent} %`;
}

// Lo que se va a registrar, dicho antes de confirmar: después no se puede modificar.
export function monitoringSummary(
  values: MonitoringFormValues,
  {
    plotCode,
    pestName,
    assigneeName,
    photoCount,
  }: {
    plotCode: string;
    pestName: (id: string) => string;
    assigneeName: (id: string) => string;
    photoCount: number;
  },
) {
  const evaluated = Number(values.evaluated_units);
  const heading = [
    plotCode,
    formatDayMonth(values.done_date),
    evaluatedText(values.sampling_unit, evaluated),
    ...(values.no_presence ? ['Sin presencia de plagas ni enfermedades'] : []),
  ].join(' · ');
  return {
    heading,
    detections: values.no_presence
      ? []
      : values.detections.map((row) => ({
          title: detectionTitle(row, values.sampling_unit, evaluated, pestName),
          control: controlPhrase(row.control, assigneeName),
        })),
    photos:
      photoCount === 0
        ? null
        : photoCount === 1
          ? '1 foto adjunta'
          : `${photoCount} fotos adjuntas`,
  };
}
