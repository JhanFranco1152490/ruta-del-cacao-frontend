import { describe, expect, it } from 'vitest';

import { FUTURE_DATE_MESSAGE } from '@/lib/activity-dates';
import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';

import { saleDateIssue } from './sale-date';

const today = '2026-11-20';
const lots = [
  { code: 'L-A', entryDate: '2026-11-02' },
  { code: 'L-B', entryDate: '2026-11-10' },
];

describe('saleDateIssue', () => {
  it('accepts today and any day after every lot was stored', () => {
    expect(saleDateIssue('2026-11-20', { today, lots })).toBeNull();
    expect(saleDateIssue('2026-11-10', { today, lots })).toBeNull();
  });

  it('asks for a date', () => {
    expect(saleDateIssue('', { today, lots })).toBe(REQUIRED_FIELD_MESSAGE);
    expect(saleDateIssue('20/11/2026', { today, lots })).toBe(
      REQUIRED_FIELD_MESSAGE,
    );
  });

  it('refuses a future date', () => {
    expect(saleDateIssue('2026-11-21', { today, lots })).toBe(
      FUTURE_DATE_MESSAGE,
    );
  });

  it('names the last lot stored when the date comes before it', () => {
    expect(saleDateIssue('2026-11-05', { today, lots })).toBe(
      'La fecha no puede ser anterior al ingreso del lote L-B',
    );
  });

  it('checks only the future while there are no lots', () => {
    expect(saleDateIssue('2020-01-01', { today, lots: [] })).toBeNull();
  });
});
