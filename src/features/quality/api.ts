import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { apiPath } from '@/lib/api/path';
import { queryKeys, type QualityFilters } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { type CachedRead, readThroughCache } from '@/lib/offline/cached-read';

type Schemas = components['schemas'];

export type QualityPage = Schemas['PaginatedLotQualityList'];
export type QualityApiView = 'to_evaluate' | 'evaluated' | 'closed';

export type LotQuality = Schemas['LotQuality'];
export type QualityEvaluation = Schemas['QualityEvaluation'];
export type QualityClassification = Schemas['QualityClassification'];
export type QualityDiscard = Schemas['QualityDiscard'];
export type QualitySummary = Schemas['QualitySummary'];
// Lo que la ficha de cualquier lote trae de su calidad, sin nombres ni observaciones.
export type LotQualityDetail = Schemas['LotQualityDetail'];
export type DiscardReason = Schemas['QualityDiscardReasonEnum'];
export type EvaluationInput = Schemas['EvaluationCreateRequest'];
export type EvaluationCorrection = Schemas['PatchedEvaluationUpdateRequest'];
export type ClassificationInput = Schemas['ClassificationCreateRequest'];
export type DiscardInput = Schemas['DiscardCreateRequest'];
export type ClassificationSumError = Schemas['ClassificationSumError'];
export type QualitySumError = Schemas['QualitySumError'];
export type QualityConflictError = Schemas['QualityConflictError'];

export const QUALITY_ERROR = {
  lotInvalidStatus: 'lot_invalid_status',
  staleVersion: 'stale_version',
  sumExceeds100: 'quality_sum_exceeds_100',
  classificationSumMismatch: 'classification_sum_mismatch',
} as const;

type SummaryFilters = Omit<QualityFilters, 'page'>;

const filterQuery = (filters: SummaryFilters) => ({
  producer: filters.producer,
  farm: filters.farm,
  search: filters.search.trim(),
});

// La copia es de la primera página de cada pestaña con sus filtros: lo que se abre sin buscar más.
export const qualityListCacheKey = (
  view: QualityApiView,
  filters: SummaryFilters,
) => `quality:${apiPath(view, filterQuery(filters))}`;

export const qualitySummaryCacheKey = (filters: SummaryFilters) =>
  `quality-summary:${apiPath('', filterQuery(filters))}`;

const fetchQualityPage = (
  view: QualityApiView,
  filters: QualityFilters,
  signal?: AbortSignal,
) =>
  apiFetch<QualityPage>(
    apiPath('/api/quality', {
      view,
      ...filterQuery(filters),
      page: filters.page > 1 ? filters.page : undefined,
    }),
    { signal },
  );

// Una página de una pestaña de Calidad. La primera se guarda en el dispositivo y se ve sin conexión;
// las siguientes solo con ella. Al cambiar de página o de filtro se sigue mostrando lo anterior
// hasta que llega lo nuevo.
export const useQualityLots = (
  userId: string | undefined,
  view: QualityApiView,
  filters: QualityFilters,
) =>
  useQuery({
    queryKey: queryKeys.quality.list(view, filters),
    queryFn: ({ signal }): Promise<CachedRead<QualityPage>> =>
      filters.page > 1
        ? fetchQualityPage(view, filters, signal).then((data) => ({ data }))
        : readThroughCache(userId!, qualityListCacheKey(view, filters), () =>
            fetchQualityPage(view, filters, signal),
          ),
    enabled: !!userId,
    networkMode: 'offlineFirst',
    placeholderData: keepPreviousData,
  });

// Las cifras de la franja: lotes por evaluar y sus kilos secos, por clasificar y descartados este
// mes. Con copia, como la primera página.
export const useQualitySummary = (
  userId: string | undefined,
  filters: SummaryFilters,
) =>
  useQuery({
    queryKey: queryKeys.quality.summary(filters),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, qualitySummaryCacheKey(filters), () =>
        apiFetch<QualitySummary>(
          apiPath('/api/quality/summary', filterQuery(filters)),
          { signal },
        ),
      ),
    enabled: !!userId,
    networkMode: 'offlineFirst',
    placeholderData: keepPreviousData,
  });

// La calidad completa de un lote, con quién evaluó, corrigió o clasificó y las observaciones. El
// servidor la da solo con permiso de evaluar; sin él, la ficha usa lo que trae el lote. Se lee en
// línea: no tiene copia.
export const useQualityLot = (lotId: string, enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.quality.detail(lotId),
    queryFn: ({ signal }) =>
      apiFetch<LotQuality>(`/api/quality/${encodeURIComponent(lotId)}`, {
        signal,
      }),
    enabled: enabled && !!lotId,
  });

// Evaluar, corregir, clasificar o descartar cambian el estado del lote: se vuelven a leer Calidad y
// Lotes.
function useInvalidateAfterQualityChange() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.quality.all() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.lots.all() }),
    ]);
}

const evaluationPath = (lotId: string) =>
  `/api/quality/${encodeURIComponent(lotId)}/evaluation`;

export function useRecordEvaluation(lotId: string) {
  const invalidate = useInvalidateAfterQualityChange();
  return useMutation({
    networkMode: 'always',
    mutationFn: (body: EvaluationInput) =>
      apiFetch<LotQuality>(evaluationPath(lotId), { method: 'POST', body }),
    onSuccess: () => invalidate(),
  });
}

export function useCorrectEvaluation(lotId: string) {
  const invalidate = useInvalidateAfterQualityChange();
  return useMutation({
    networkMode: 'always',
    mutationFn: (body: EvaluationCorrection) =>
      apiFetch<LotQuality>(evaluationPath(lotId), { method: 'PATCH', body }),
    onSuccess: () => invalidate(),
  });
}

export function useClassifyLot(lotId: string) {
  const invalidate = useInvalidateAfterQualityChange();
  return useMutation({
    networkMode: 'always',
    mutationFn: (body: ClassificationInput) =>
      apiFetch<LotQuality>(
        `/api/quality/${encodeURIComponent(lotId)}/classification`,
        { method: 'POST', body },
      ),
    onSuccess: () => invalidate(),
  });
}

export function useDiscardLot(lotId: string) {
  const invalidate = useInvalidateAfterQualityChange();
  return useMutation({
    networkMode: 'always',
    mutationFn: (body: DiscardInput) =>
      apiFetch<LotQuality>(
        `/api/quality/${encodeURIComponent(lotId)}/discard`,
        { method: 'POST', body },
      ),
    onSuccess: () => invalidate(),
  });
}
