import { isApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import { isRetryableStatus, type SyncAdapter } from '@/lib/offline/adapters';

import { postEvidence } from './evidence-api';
import { EVIDENCE_RESOURCE, evidencePayloadOf } from './evidence-queue';

export const EVIDENCE_TARGET_DELETED_CODE = 'evidence_target_deleted';
const REQUIRES_DONE_CODE = 'evidence_requires_done';

export const evidenceSyncAdapter: SyncAdapter = {
  resource: EVIDENCE_RESOURCE,

  // Al llegar se ve en la sección Evidencia, y el monitoreo o el control dicen cuántas fotos tienen.
  refreshAfterSync: (item) => [
    queryKeys.health.evidence(evidencePayloadOf(item).activityId),
    queryKeys.agriculturalActivities.all(),
    queryKeys.health.all(),
  ],

  async send(item) {
    await postEvidence(evidencePayloadOf(item));
  },

  // Sin respuesta, o con una que puede cambiar sola, se reintenta. También si lo que respalda
  // todavía no está realizado en el servidor: puede seguir en camino. Lo demás no mejora reintentando
  // (más de 5 MB, otro formato, ya tiene 5 fotos) y va a la bandeja para descartarlo.
  parseConflict(error) {
    if (!isApiError(error) || isRetryableStatus(error.status)) return null;
    if (error.code === REQUIRES_DONE_CODE) return null;
    if (error.status === 404) {
      return {
        code: EVIDENCE_TARGET_DELETED_CODE,
        message: 'El monitoreo o control de esta foto ya no existe.',
      };
    }
    return { code: error.code, message: error.message };
  },
};
