import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { apiPath } from '@/lib/api/path';
import {
  type QualityClosedFilters,
  type QualityFilters,
  queryKeys,
} from '@/lib/api/query-keys';
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
export type ClosedSummary = Schemas['ClosedSummary'];
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

const closedQuery = (closed: QualityClosedFilters) => ({
  result: closed.result,
  closed_from: closed.from,
  closed_to: closed.to,
});

// Sin filtros de Cerrados, para las otras pestañas: no los usan y no deben partir su copia.
export const NO_CLOSED_FILTERS: QualityClosedFilters = {
  result: null,
  from: null,
  to: null,
};

// La copia es de la primera página de cada pestaña con sus filtros: lo que se abre sin buscar más.
export const qualityListCacheKey = (
  view: QualityApiView,
  filters: SummaryFilters,
  closed: QualityClosedFilters = NO_CLOSED_FILTERS,
) =>
  `quality:${apiPath(view, { ...filterQuery(filters), ...closedQuery(closed) })}`;

export const qualitySummaryCacheKey = (filters: SummaryFilters) =>
  `quality-summary:${apiPath('', filterQuery(filters))}`;

export const closedSummaryCacheKey = (
  filters: SummaryFilters,
  closed: QualityClosedFilters,
) =>
  `quality-closed-summary:${apiPath('', { ...filterQuery(filters), ...closedQuery(closed) })}`;

const fetchQualityPage = (
  view: QualityApiView,
  filters: QualityFilters,
  closed: QualityClosedFilters,
  signal?: AbortSignal,
) =>
  apiFetch<QualityPage>(
    apiPath('/api/quality', {
      view,
      ...filterQuery(filters),
      ...closedQuery(closed),
      page: filters.page > 1 ? filters.page : undefined,
    }),
    { signal },
  );

// Una página de una pestaña de Calidad. La primera se guarda en el dispositivo y se ve sin conexión;
// las siguientes solo con ella. Al cambiar de página o de filtro se sigue mostrando lo anterior
// hasta que llega lo nuevo. `closed` solo cuenta en la pestaña Cerrados.
export const useQualityLots = (
  userId: string | undefined,
  view: QualityApiView,
  filters: QualityFilters,
  closed: QualityClosedFilters = NO_CLOSED_FILTERS,
) =>
  useQuery({
    queryKey: queryKeys.quality.list(view, filters, closed),
    queryFn: ({ signal }): Promise<CachedRead<QualityPage>> =>
      filters.page > 1
        ? fetchQualityPage(view, filters, closed, signal).then((data) => ({
            data,
          }))
        : readThroughCache(
            userId!,
            qualityListCacheKey(view, filters, closed),
            () => fetchQualityPage(view, filters, closed, signal),
          ),
    enabled: !!userId,
    networkMode: 'offlineFirst',
    placeholderData: keepPreviousData,
  });

// Lo que dejó el periodo de cierre: lotes clasificados y descartados, kilos de G1 y G2 y kilos que
// quedaron fuera. Con copia, como la primera página.
export const useClosedSummary = (
  userId: string | undefined,
  filters: SummaryFilters,
  closed: QualityClosedFilters,
  enabled: boolean,
) => {
  // El resultado no cambia lo que dejó el periodo: no parte la copia ni la consulta.
  const period = { ...closed, result: null };
  return useQuery({
    queryKey: queryKeys.quality.closedSummary(filters, period),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, closedSummaryCacheKey(filters, period), () =>
        apiFetch<ClosedSummary>(
          apiPath('/api/quality/closed-summary', {
            ...filterQuery(filters),
            ...closedQuery(period),
          }),
          { signal },
        ),
      ),
    enabled: enabled && !!userId,
    networkMode: 'offlineFirst',
    placeholderData: keepPreviousData,
  });
};

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
