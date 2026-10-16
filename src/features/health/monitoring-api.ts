import { apiFetch } from '@/lib/api/client';
import type { components } from '@/lib/api/schema';

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
