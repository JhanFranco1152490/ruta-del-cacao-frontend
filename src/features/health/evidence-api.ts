import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch, apiFetchBlob } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { readThroughCache } from '@/lib/offline/cached-read';

import type { EvidencePayload } from './evidence-queue';

type Schemas = components['schemas'];
export type Evidence = Schemas['Evidence'];

export const evidenceListCacheKey = (activityId: string) =>
  `evidence:${activityId}`;
export const evidenceFileCacheKey = (evidenceId: string) =>
  `evidence-file:${evidenceId}`;

// Sube una foto. Es el único envío de la API que no es JSON: una foto en base64 pesaría un tercio
// más. Reenviar el mismo `id` responde bien sin duplicarla.
export function postEvidence(photo: EvidencePayload) {
  const form = new FormData();
  form.set('id', photo.id);
  form.set('file', photo.blob, photo.fileName);
  form.set('captured_at', photo.capturedAt);
  return apiFetch<Evidence>(
    `/api/agricultural-activities/${photo.activityId}/evidence`,
    { method: 'POST', body: form },
  );
}

// Las fotos de un monitoreo o un control realizados, de la primera a la última. Con copia en el
// dispositivo: sin conexión se ven las que se cargaron.
export const useEvidence = (
  userId: string | undefined,
  activityId: string,
  { enabled = true } = {},
) =>
  useQuery({
    queryKey: queryKeys.health.evidence(activityId),
    queryFn: async ({ signal }) =>
      readThroughCache(userId!, evidenceListCacheKey(activityId), async () => {
        const { results } = await apiFetch<Schemas['EvidenceList']>(
          `/api/agricultural-activities/${activityId}/evidence`,
          { signal },
        );
        return results;
      }),
    enabled: enabled && !!userId,
    networkMode: 'offlineFirst',
  });

// El archivo de una foto. Nunca es público: se pide a la API, que revisa que quien lo pide alcance
// la finca. El teléfono guarda su propia copia para verla sin conexión, porque la API no deja que el
// navegador la guarde.
export const readEvidenceFile = (
  userId: string,
  evidenceId: string,
  signal?: AbortSignal,
) =>
  readThroughCache(userId, evidenceFileCacheKey(evidenceId), () =>
    apiFetchBlob(`/api/evidence/${evidenceId}/file`, { signal }),
  );

export const useEvidenceFile = (
  userId: string | undefined,
  evidenceId: string,
) =>
  useQuery({
    queryKey: queryKeys.health.evidenceFile(evidenceId),
    queryFn: ({ signal }) => readEvidenceFile(userId!, evidenceId, signal),
    enabled: !!userId,
    networkMode: 'offlineFirst',
    // Una foto no cambia: no se vuelve a pedir mientras esté en la memoria.
    staleTime: Infinity,
  });

// Eliminar una foto equivocada es solo en línea: sin red falla en el acto.
export function useDeleteEvidence(activityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: (evidenceId: string) =>
      apiFetch<void>(`/api/evidence/${evidenceId}`, { method: 'DELETE' }),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.health.evidence(activityId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.agriculturalActivities.all(),
        }),
      ]),
  });
}
