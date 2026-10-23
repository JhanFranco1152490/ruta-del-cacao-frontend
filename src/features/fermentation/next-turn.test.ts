import { describe, expect, it } from 'vitest';

import { isTurnOverdue, nextTurnDueAt } from './next-turn';

const STARTED = '2026-10-15T07:00:00-05:00';
const instant = (iso: string) => new Date(iso).getTime();

describe('nextTurnDueAt', () => {
  it('is 48 hours after the start when there are no turns', () => {
    expect(instant(nextTurnDueAt(STARTED, null))).toBe(
      instant('2026-10-17T07:00:00-05:00'),
    );
  });

  it('is 24 hours after the last turn when there are turns', () => {
    expect(instant(nextTurnDueAt(STARTED, '2026-10-17T07:30:00-05:00'))).toBe(
      instant('2026-10-18T07:30:00-05:00'),
    );
  });
});

describe('isTurnOverdue', () => {
  const due = '2026-10-17T07:00:00-05:00';

  it('is not overdue right at the time it is due', () => {
    expect(isTurnOverdue(due, new Date(due))).toBe(false);
  });

  it('is overdue once that time has passed', () => {
    expect(isTurnOverdue(due, new Date('2026-10-17T07:01:00-05:00'))).toBe(
      true,
    );
  });

  it('is not overdue before it is due', () => {
    expect(isTurnOverdue(due, new Date('2026-10-16T22:00:00-05:00'))).toBe(
      false,
    );
  });
});
