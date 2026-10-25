import { describe, expect, it } from 'vitest';

import { buildFermentation, buildFermentationTurn } from '@/test/factories';

import { cardDetails, relativeHours } from './card-details';

const NOW = new Date('2026-10-17T09:00:00-05:00');
const started = '2026-10-15T07:00:00-05:00';

describe('relativeHours', () => {
  it('says how long is left or how late it is', () => {
    expect(relativeHours('2026-10-17T14:00:00-05:00', NOW)).toBe('en 5 h');
    expect(relativeHours('2026-10-17T06:00:00-05:00', NOW)).toBe('hace 3 h');
    expect(relativeHours('2026-10-17T09:20:00-05:00', NOW)).toBe(
      'en menos de 1 h',
    );
  });

  it('switches to days from 48 hours on', () => {
    expect(relativeHours('2026-10-20T09:00:00-05:00', NOW)).toBe('en 3 días');
    expect(relativeHours('2026-10-14T09:00:00-05:00', NOW)).toBe('hace 3 días');
  });
});

describe('cardDetails', () => {
  it('counts the hours and has no last turn before the first one', () => {
    const details = cardDetails(
      buildFermentation({ started_at: started, turns: [] }),
      NOW,
    );

    expect(details.hours).toBe(50);
    expect(details.turnCount).toBe(0);
    expect(details.last).toBeNull();
    expect(details.next.overdue).toBe(true);
    expect(details.timeline.points).toEqual([]);
  });

  it('gives the last turn and when the next one is due', () => {
    const details = cardDetails(
      buildFermentation({
        started_at: started,
        turns: [
          buildFermentationTurn({
            turned_at: '2026-10-17T08:30:00-05:00',
            temperature_c: '46.0',
            ph: '4.85',
          }),
        ],
      }),
      NOW,
    );

    expect(details.turnCount).toBe(1);
    expect(details.last).toMatchObject({
      number: 1,
      temperature: '46.0',
      ph: '4.85',
      pending: false,
    });
    expect(details.next.overdue).toBe(false);
    expect(details.next.relative).toBe('en 24 h');
  });

  it('places the turns on the timeline between the start and the farthest instant', () => {
    const details = cardDetails(
      buildFermentation({
        started_at: started,
        turns: [
          buildFermentationTurn({ turned_at: '2026-10-17T08:30:00-05:00' }),
        ],
      }),
      NOW,
    );

    const [point] = details.timeline.points;
    expect(point).toMatchObject({ number: 1, pending: false });
    expect(details.startedAt).toBe(started);
    expect(point.percent).toBeGreaterThan(0);
    expect(point.percent).toBeLessThan(details.timeline.duePercent);
    // El próximo cae más lejos que ahora: la barra llega hasta él.
    expect(details.timeline.duePercent).toBe(96);
    expect(details.timeline.nowPercent).toBeLessThan(96);
  });

  it('ends the timeline at now when the next turn is already late', () => {
    const details = cardDetails(
      buildFermentation({
        started_at: '2026-10-14T21:00:00-05:00',
        turns: [],
      }),
      NOW,
    );

    expect(details.timeline.nowPercent).toBe(96);
    expect(details.timeline.duePercent).toBeLessThan(96);
  });
});
