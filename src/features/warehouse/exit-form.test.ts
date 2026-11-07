import { describe, expect, it } from 'vitest';

import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';

import {
  createExitFormSchema,
  type ExitFormInput,
  exitFormOf,
  toExitRequest,
} from './exit-form';
import { DETAIL_REQUIRED_MESSAGE } from './exit-reasons';
import { EXIT_BEFORE_ENTRY_MESSAGE } from './warehouse-dates';

const GRADES = [
  { grade: 'g1', label: 'G1', availableTenths: 2500 },
  { grade: 'g2', label: 'G2', availableTenths: 552 },
] as const;

const schema = createExitFormSchema({
  today: '2026-10-31',
  enteredOn: '2026-10-30',
  grades: GRADES,
});

const VALID: ExitFormInput = {
  grade: 'g1',
  quantity_kg: '5,0',
  exit_date: '2026-10-31',
  reason: 'sample',
  detail: '',
};

const issuesOf = (values: ExitFormInput) =>
  schema
    .safeParse(values)
    .error?.issues.map(({ path, message }) => [path[0], message]);

describe('createExitFormSchema', () => {
  it('accepts a sample of 5 kg of G1', () => {
    expect(issuesOf(VALID)).toBeUndefined();
  });

  it('marks each missing field', () => {
    expect(
      issuesOf({
        grade: '',
        quantity_kg: '',
        exit_date: '',
        reason: '',
        detail: '',
      }),
    ).toEqual([
      ['exit_date', REQUIRED_FIELD_MESSAGE],
      ['grade', REQUIRED_FIELD_MESSAGE],
      ['reason', REQUIRED_FIELD_MESSAGE],
      ['quantity_kg', REQUIRED_FIELD_MESSAGE],
    ]);
  });

  it('compares the quantity with what the chosen grade has', () => {
    expect(issuesOf({ ...VALID, quantity_kg: '250' })).toBeUndefined();
    expect(issuesOf({ ...VALID, grade: 'g2', quantity_kg: '250' })).toEqual([
      ['quantity_kg', 'La cantidad supera lo disponible (55,2 kg)'],
    ]);
  });

  it('asks for the detail with Otro and rejects a date before the entry', () => {
    expect(
      issuesOf({ ...VALID, reason: 'other', exit_date: '2026-10-29' }),
    ).toEqual([
      ['exit_date', EXIT_BEFORE_ENTRY_MESSAGE],
      ['detail', DETAIL_REQUIRED_MESSAGE],
    ]);
  });
});

describe('exitFormOf', () => {
  it('proposes the grade of the row, or the only one with stock', () => {
    expect(
      exitFormOf({ today: '2026-10-31', grades: GRADES, proposed: 'g2' }).grade,
    ).toBe('g2');
    expect(exitFormOf({ today: '2026-10-31', grades: GRADES }).grade).toBe('');
    expect(
      exitFormOf({ today: '2026-10-31', grades: [GRADES[1]], proposed: 'g1' })
        .grade,
    ).toBe('g2');
  });
});

describe('toExitRequest', () => {
  it('sends the quantity with a point and the trimmed detail', () => {
    expect(
      toExitRequest({ ...VALID, reason: 'other', detail: ' Regalo ' }),
    ).toEqual({
      grade: 'g1',
      quantity_kg: '5.0',
      exit_date: '2026-10-31',
      reason: 'other',
      detail: 'Regalo',
    });
  });
});
