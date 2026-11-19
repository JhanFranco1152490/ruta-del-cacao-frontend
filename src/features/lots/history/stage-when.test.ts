import { describe, expect, it } from 'vitest';

import { stageDateText, stageSpanText } from './stage-when';

describe('stageDateText', () => {
  it('shows the Bogotá time when the stage has one', () => {
    expect(
      stageDateText({
        occurred_on: '2026-03-14',
        occurred_at: '2026-03-14T20:20:00Z',
      }),
    ).toBe('14 de marzo de 2026, 3:20 p.m.');
  });

  it('shows only the date when the stage has no time', () => {
    expect(
      stageDateText({ occurred_on: '2026-03-14', occurred_at: null }),
    ).toBe('14 de marzo de 2026');
  });
});

describe('stageSpanText', () => {
  it('goes from the start to the end of a finished stage', () => {
    expect(
      stageSpanText({
        started_at: '2026-03-15T07:00:00-05:00',
        ended_at: '2026-03-21T07:30:00-05:00',
        days: 6,
      }),
    ).toBe('15 mar → 21 mar · 6 días');
  });

  it('says a stage is still going', () => {
    expect(
      stageSpanText({
        started_at: '2026-03-15T07:00:00-05:00',
        ended_at: null,
        days: 1,
      }),
    ).toBe('Desde el 15 mar, en curso · 1 día');
  });
});
