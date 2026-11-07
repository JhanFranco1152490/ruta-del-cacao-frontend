import { describe, expect, it } from 'vitest';

import { buildQualityEvaluation } from '@/test/factories';

import {
  evaluationFormOf,
  evaluationFormSchema,
  toEvaluationCorrection,
  toEvaluationRequest,
} from './evaluation-form';

const valid = {
  well_fermented_pct: '85',
  moldy_pct: '2,5',
  other_defects_pct: '5',
  notes: '',
};

const errorsOf = (values: Partial<typeof valid>) => {
  const result = evaluationFormSchema.safeParse({ ...valid, ...values });
  return result.success
    ? {}
    : Object.fromEntries(
        result.error.issues.map((issue) => [issue.path[0], issue.message]),
      );
};

describe('evaluationFormSchema', () => {
  it('accepts three percentages that fit in 100, with a comma', () => {
    const result = evaluationFormSchema.safeParse(valid);
    expect(result.success && result.data.moldy_pct).toBe('2.5');
  });

  it('asks for each percentage', () => {
    expect(errorsOf({ well_fermented_pct: '' })).toEqual({
      well_fermented_pct: 'Campo obligatorio',
    });
  });

  it('keeps each one between 0 and 100 with one decimal', () => {
    expect(errorsOf({ moldy_pct: '101' })).toEqual({
      moldy_pct: 'Debe estar entre 0 % y 100 %.',
    });
    expect(errorsOf({ moldy_pct: '2,55' })).toEqual({
      moldy_pct: 'Usa máximo 1 decimal.',
    });
  });

  it('puts a sum over 100 under the last percentage', () => {
    expect(errorsOf({ well_fermented_pct: '95' })).toEqual({
      other_defects_pct: 'La suma no puede pasar de 100 %',
    });
  });

  it('limits the notes to 500 characters', () => {
    expect(errorsOf({ notes: 'a'.repeat(501) })).toEqual({
      notes: 'Máximo 500 caracteres.',
    });
  });
});

describe('evaluation requests', () => {
  it('starts empty to evaluate and with the current values to correct', () => {
    expect(evaluationFormOf(null).well_fermented_pct).toBe('');
    expect(
      evaluationFormOf(buildQualityEvaluation({ notes: 'Buen corte' })),
    ).toEqual({
      well_fermented_pct: '85.0',
      moldy_pct: '2.0',
      other_defects_pct: '5.0',
      notes: 'Buen corte',
    });
  });

  it('sends the lot version to evaluate and the evaluation version to correct', () => {
    expect(toEvaluationRequest(valid, 4)).toMatchObject({
      expected_lot_version: 4,
      moldy_pct: '2,5',
    });
    const correction = toEvaluationCorrection(valid, 2);
    expect(correction.expected_version).toBe(2);
    expect(correction).not.toHaveProperty('expected_lot_version');
  });
});
