'use client';

import { useQuery } from '@tanstack/react-query';
import { liveQuery } from 'dexie';
import { useEffect, useMemo, useState } from 'react';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { readThroughCache } from '@/lib/offline/cached-read';
import { listQueuedByParent } from '@/lib/offline/queued-by-parent';

import { CONTROL_RESOURCE } from './control-queue';

type Schemas = components['schemas'];
export type WaitingDetection = Schemas['WaitingDetection'];

// La cuenta técnica guarda aparte lo de cada productor que eligió.
export const waitingDetectionsCacheKey = (producer: string | null) =>
  producer
    ? `phytosanitary-detections:without-control:producer:${producer}`
    : 'phytosanitary-detections:without-control';

async function fetchWaitingDetections(
  producer: string | null,
  signal?: AbortSignal,
): Promise<WaitingDetection[]> {
  const suffix = producer ? `?${new URLSearchParams({ producer })}` : '';
  const { results } = await apiFetch<Schemas['WaitingDetectionList']>(
    `/api/phytosanitary-detections/without-control${suffix}`,
    { signal },
  );
  return results;
}

// Las detecciones a las que les tocaron un control en este dispositivo y siguen esperando
// conexión: ya no esperan que alguien decida.
function useDetectionsWithQueuedControl(userId: string | undefined) {
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    if (!userId) return;
    const subscription = liveQuery(() =>
      listQueuedByParent(userId, [CONTROL_RESOURCE]),
    ).subscribe({
      next: (items) => setIds(new Set(items.map(({ parentId }) => parentId))),
      error: () => setIds(new Set()),
    });
    return () => subscription.unsubscribe();
  }, [userId]);
  return ids;
}

// Las detecciones en que alguien pidió un control y nadie lo ha atendido, de las fincas que alcanza
// quien pregunta, de la más antigua a la más reciente. Con copia en el dispositivo: sin conexión se
// ve la última. La cuenta técnica las pide de un productor; sin él, de todos.
export function useWaitingDetections(
  userId: string | undefined,
  producer: string | null,
  { enabled = true } = {},
) {
  const query = useQuery({
    queryKey: queryKeys.health.withoutControl(producer),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, waitingDetectionsCacheKey(producer), () =>
        fetchWaitingDetections(producer, signal),
      ),
    enabled: enabled && !!userId,
    networkMode: 'offlineFirst',
  });
  const queued = useDetectionsWithQueuedControl(enabled ? userId : undefined);
  const detections = useMemo(
    () => (query.data?.data ?? []).filter(({ id }) => !queued.has(id)),
    [query.data, queued],
  );
  return {
    detections,
    isLoaded: query.isSuccess,
    savedAt: query.data?.savedAt,
  };
}
