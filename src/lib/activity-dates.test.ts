import { describe, expect, it } from 'vitest';

import {
  doneDateIssue,
  FUTURE_DATE_MESSAGE,
  PAST_DATE_MESSAGE,
  scheduledDateIssue,
} from './activity-dates';

const TODAY = '2026-10-22';

describe('doneDateIssue', () => {
  const earliest = {
    date: '2026-10-08',
    reason: 'la programación de la actividad',
  };

  it('accepts today and the days back to the earliest one', () => {
    expect(doneDateIssue(TODAY, TODAY, earliest)).toBeNull();
    expect(doneDateIssue('2026-10-08', TODAY, earliest)).toBeNull();
  });

  it('rejects a future date', () => {
    expect(doneDateIssue('2026-10-23', TODAY, earliest)).toBe(
      FUTURE_DATE_MESSAGE,
    );
  });

  it('rejects a date before the earliest one, saying why', () => {
    expect(doneDateIssue('2026-10-07', TODAY, earliest)).toBe(
      'La fecha no puede ser anterior a la programación de la actividad (8 de octubre de 2026)',
    );
  });

  it('rejects a date that does not exist', () => {
    expect(doneDateIssue('2026-02-30', TODAY, earliest)).toBe(
      'Escribe una fecha válida.',
    );
  });
});

describe('scheduledDateIssue', () => {
  it('accepts today and the days after it', () => {
    expect(scheduledDateIssue(TODAY, TODAY)).toBeNull();
    expect(scheduledDateIssue('2026-11-01', TODAY)).toBeNull();
  });

  it('rejects a day that already passed', () => {
    expect(scheduledDateIssue('2026-10-21', TODAY)).toBe(PAST_DATE_MESSAGE);
  });

  it('rejects a date that does not exist', () => {
    expect(scheduledDateIssue('2026-13-01', TODAY)).toBe(
      'Escribe una fecha válida.',
    );
  });
});
