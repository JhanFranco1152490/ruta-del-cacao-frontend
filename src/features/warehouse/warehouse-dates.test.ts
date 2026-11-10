import { describe, expect, it } from 'vitest';

import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';

import {
  DATE_IN_FUTURE_MESSAGE,
  ENTRY_BEFORE_CLASSIFICATION_MESSAGE,
  entryDateIssue,
  EXIT_BEFORE_ENTRY_MESSAGE,
  exitDateIssue,
} from './warehouse-dates';

describe('entryDateIssue', () => {
  // Clasificado a las 9 p. m. del 29 en Bogotá: en UTC ya es el 30.
  const context = {
    today: '2026-10-31',
    classifiedAt: '2026-10-29T21:00:00-05:00',
  };

  it('accepts today and the day of the classification', () => {
    expect(entryDateIssue('2026-10-31', context)).toBeNull();
    expect(entryDateIssue('2026-10-29', context)).toBeNull();
  });

  it('rejects tomorrow', () => {
    expect(entryDateIssue('2026-11-01', context)).toBe(DATE_IN_FUTURE_MESSAGE);
  });

  it('rejects the day before the classification, counted in Bogotá', () => {
    expect(entryDateIssue('2026-10-28', context)).toBe(
      ENTRY_BEFORE_CLASSIFICATION_MESSAGE,
    );
  });

  it('asks for the date when it is missing or is not a real day', () => {
    expect(entryDateIssue('', context)).toBe(REQUIRED_FIELD_MESSAGE);
    expect(entryDateIssue('2026-02-30', context)).toBe(REQUIRED_FIELD_MESSAGE);
  });
});

describe('exitDateIssue', () => {
  const context = { today: '2026-10-31', enteredOn: '2026-10-30' };

  it('accepts today and the day of the entry', () => {
    expect(exitDateIssue('2026-10-31', context)).toBeNull();
    expect(exitDateIssue('2026-10-30', context)).toBeNull();
  });

  it('rejects tomorrow and the day before the entry', () => {
    expect(exitDateIssue('2026-11-01', context)).toBe(DATE_IN_FUTURE_MESSAGE);
    expect(exitDateIssue('2026-10-29', context)).toBe(
      EXIT_BEFORE_ENTRY_MESSAGE,
    );
  });
});
