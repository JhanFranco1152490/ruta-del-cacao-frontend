import { z } from 'zod';

import { percentField } from '@/lib/validation/percent';

import type {
  EvaluationCorrection,
  EvaluationInput,
  QualityEvaluation,
} from './api';
import { evaluationSum, SUM_EXCEEDS_MESSAGE } from './evaluation-sum';

export const NOTES_MAX_LENGTH = 500;

export type EvaluationFormInput = {
  well_fermented_pct: string;
  moldy_pct: string;
  other_defects_pct: string;
  notes: string;
};

const isPercent = (text: string) => percentField.safeParse(text).success;

// El error de la suma va en «Otros defectos», el último de los tres, debajo del cual se lee la suma.
// Solo con los tres porcentajes válidos: un 101 ya tiene su propio error.
export const evaluationFormSchema = z
  .object({
    well_fermented_pct: percentField,
    moldy_pct: percentField,
    other_defects_pct: percentField,
    notes: z
      .string()
      .trim()
      .max(NOTES_MAX_LENGTH, `Máximo ${NOTES_MAX_LENGTH} caracteres.`),
  })
  .superRefine((values, context) => {
    const percents = [
      values.well_fermented_pct,
      values.moldy_pct,
      values.other_defects_pct,
    ];
    if (percents.every(isPercent) && evaluationSum(values).exceeds) {
      context.addIssue({
        code: 'custom',
        path: ['other_defects_pct'],
        message: SUM_EXCEEDS_MESSAGE,
      });
    }
  });

// Vacío para evaluar; con los valores vigentes para corregir.
export const evaluationFormOf = (
  evaluation: QualityEvaluation | null,
): EvaluationFormInput => ({
  well_fermented_pct: evaluation?.well_fermented_pct ?? '',
  moldy_pct: evaluation?.moldy_pct ?? '',
  other_defects_pct: evaluation?.other_defects_pct ?? '',
  notes: evaluation?.notes ?? '',
});

const percentages = (values: EvaluationFormInput) => ({
  well_fermented_pct: values.well_fermented_pct,
  moldy_pct: values.moldy_pct,
  other_defects_pct: values.other_defects_pct,
  notes: values.notes,
});

export const toEvaluationRequest = (
  values: EvaluationFormInput,
  expectedLotVersion: number,
): EvaluationInput => ({
  expected_lot_version: expectedLotVersion,
  ...percentages(values),
});

export const toEvaluationCorrection = (
  values: EvaluationFormInput,
  expectedVersion: number,
): EvaluationCorrection => ({
  expected_version: expectedVersion,
  ...percentages(values),
});
