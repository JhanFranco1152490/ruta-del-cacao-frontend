import { apiFetch } from '@/lib/api/client';
import type { components } from '@/lib/api/schema';

import type { DetectionControlRequest } from './control-schema';
import type { MonitoringResultRequest } from './monitoring-request';

type AgriculturalActivity = components['schemas']['AgriculturalActivity'];

export const HEALTH_ERROR = {
  alreadyDone: 'activity_already_done',
  pestDiseaseInactive: 'pest_disease_inactive',
  inputInactive: 'input_inactive',
  notAMonitoring: 'not_a_monitoring',
} as const;

// El resultado se registra en la dirección de su monitoreo. Reenviar el mismo responde bien sin
// cambiar nada, así que la cola puede reintentar.
export const postMonitoringResult = (
  activityId: string,
  body: MonitoringResultRequest,
) =>
  apiFetch<AgriculturalActivity>(
    `/api/agricultural-activities/${activityId}/monitoring`,
    { method: 'POST', body },
  );

// Un control desde una detección. Reenviar el mismo `id` con el mismo contenido responde bien sin
// crear otro, así que la cola puede reintentar.
export const postDetectionControl = (
  detectionId: string,
  body: DetectionControlRequest,
) =>
  apiFetch<AgriculturalActivity>(
    `/api/phytosanitary-detections/${detectionId}/controls`,
    { method: 'POST', body },
  );

// Quien programa decide que una detección no necesita control. Repetirlo no cambia quién lo
// decidió primero.
export const postNoControlNeeded = (detectionId: string) =>
  apiFetch<void>(
    `/api/phytosanitary-detections/${detectionId}/no-control-needed`,
    { method: 'POST' },
  );
