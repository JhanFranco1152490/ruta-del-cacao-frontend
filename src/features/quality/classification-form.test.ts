import { describe, expect, it } from 'vitest';

import {
  classificationBalance,
  classificationFormSchema,
  emptyClassificationForm,
  toClassificationRequest,
  type ClassificationFormInput,
} from './classification-form';

const form = (
  values: Partial<ClassificationFormInput>,
): ClassificationFormInput => ({
  ...emptyClassificationForm(),
  g1_kg: '250',
  g2_kg: '63,2',
  ...values,
});

const errorsOf = (values: Partial<ClassificationFormInput>) => {
  const result = classificationFormSchema.safeParse(form(values));
  return result.success
    ? {}
    : Object.fromEntries(
        result.error.issues.map((issue) => [issue.path[0], issue.message]),
      );
};

describe('classificationBalance', () => {
  it('says what is missing to reach the dry weight', () => {
    expect(
      classificationBalance(form({ g1_kg: '250', g2_kg: '50' }), '313.2'),
    ).toEqual({
      distributedLine: 'Distribuido: 300,0 de 313,2 kg',
      differenceLine: 'Faltan 13,2 kg por distribuir',
      balanced: false,
    });
  });

  it('says what is left over', () => {
    expect(
      classificationBalance(form({ discard_kg: '4,8' }), '313.2')
        .differenceLine,
    ).toBe('Sobran 4,8 kg');
  });

  it('balances in tenths, without floating point noise', () => {
    expect(
      classificationBalance(
        form({ g1_kg: '0,1', g2_kg: '0,2', discard_kg: '0' }),
        '0.3',
      ),
    ).toMatchObject({ differenceLine: null, balanced: true });
  });
});

describe('classificationFormSchema', () => {
  it('accepts kilos with one decimal and no discard', () => {
    expect(errorsOf({})).toEqual({});
  });

  it('refuses negative kilos and more than one decimal', () => {
    expect(errorsOf({ g1_kg: '-1' })).toEqual({
      g1_kg: 'No puede ser negativo.',
    });
    expect(errorsOf({ g2_kg: '1,25' })).toEqual({
      g2_kg: 'Usa máximo 1 decimal.',
    });
  });

  it('asks for the reason only with kilos of discard', () => {
    expect(errorsOf({ discard_kg: '6' })).toEqual({
      discard_reason: 'Indique el motivo del descarte',
    });
    expect(errorsOf({ discard_kg: '0', discard_reason: '' })).toEqual({});
  });

  it('asks for the detail with Otro', () => {
    expect(errorsOf({ discard_kg: '6', discard_reason: 'other' })).toEqual({
      discard_detail: 'Describa el motivo del descarte',
    });
    expect(
      errorsOf({
        discard_kg: '6',
        discard_reason: 'other',
        discard_detail: 'Granos germinados',
      }),
    ).toEqual({});
  });
});

describe('toClassificationRequest', () => {
  it('drops the reason and the detail without discard', () => {
    expect(
      toClassificationRequest(
        form({ discard_reason: 'mold', discard_detail: 'x' }),
        5,
      ),
    ).toEqual({
      expected_lot_version: 5,
      g1_kg: '250',
      g2_kg: '63,2',
      discard_kg: '0',
      discard_reason: '',
      discard_detail: '',
    });
  });

  it('keeps the reason with discard', () => {
    expect(
      toClassificationRequest(
        form({ discard_kg: '6', discard_reason: 'mold' }),
        5,
      ),
    ).toMatchObject({ discard_kg: '6', discard_reason: 'mold' });
  });
});
