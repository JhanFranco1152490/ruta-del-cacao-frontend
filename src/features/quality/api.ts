import type { components } from '@/lib/api/schema';

type Schemas = components['schemas'];

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
