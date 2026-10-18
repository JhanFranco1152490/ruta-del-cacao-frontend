import type { components } from '@/lib/api/schema';
import type { QueueItem } from '@/lib/offline/db';

import { controlPayloadOf } from './control-queue';

type AgriculturalActivity = components['schemas']['AgriculturalActivity'];

// Un control programado que espera en el dispositivo, con la forma de una actividad para que el
// calendario lo muestre en su fecha. Uno ya hecho no se muestra (no tiene fecha programada que
// ocupar), uno rechazado lo cuenta la bandeja, y uno guardado sin su contexto no se puede pintar.
export function queuedControlActivity(
  item: QueueItem,
): AgriculturalActivity | null {
  if (item.status === 'error') return null;
  const { request, context } = controlPayloadOf(item);
  if (request.mode !== 'scheduled' || !request.scheduled_date || !context) {
    return null;
  }
  const createdAt = new Date(item.createdAt).toISOString();
  return {
    id: request.id,
    plot: context.plot,
    producer_id: context.producerId,
    activity_type: 'phytosanitary_control',
    other_description: null,
    scheduled_date: request.scheduled_date,
    status: 'scheduled',
    state: 'scheduled',
    days_late: 0,
    assignee: {
      id: request.assignee_id ?? '',
      full_name: context.assigneeName,
      is_active: true,
    },
    done_date: null,
    inputs: [],
    completed_by: null,
    completed_at: null,
    version: 0,
    created_at: createdAt,
    updated_at: createdAt,
    monitoring: null,
    control_of: null,
  };
}
