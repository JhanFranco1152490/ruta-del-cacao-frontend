import { describe, expect, it } from 'vitest';

import { buildDrying, buildDryingLog } from '@/test/factories';

import type { LogRequest, QueuedLog } from './log-queue';
import {
  cardDetails,
  countMissingToday,
  dayLabel,
  expectedDaysText,
  isMissingToday,
  lastLogLine,
  shownLogs,
} from './drying-list';

// Iniciado el 22 oct. a las 14:00 (día 1); el 23 es el día 2 y el 24 el día 3.
const STARTED = '2026-10-22T14:00:00-05:00';
const at = (iso: string) => new Date(iso);
const NOW = at('2026-10-24T10:00:00-05:00');

const logOf = (day: number, moisture = '12.4') =>
  buildDryingLog({
    id: `dl${day}`,
    day_number: day,
    log_date: `2026-10-${21 + day}`,
    measured_at: `2026-10-${21 + day}T16:00:00-05:00`,
    moisture_pct: moisture,
  });

const queuedLog = (
  measuredAt: string,
  overrides: Partial<QueuedLog> = {},
): QueuedLog => ({
  id: 'q1',
  lotId: buildDrying().lot.id,
  request: {
    id: 'q1',
    measured_at: measuredAt,
    moisture_pct: '10.0',
    sun_hours: '4.0',
    shade_hours: null,
    turn_count: 0,
    turn_frequency_hours: null,
    weather: 'sunny',
    notes: '',
  } satisfies LogRequest,
  label: 'lote',
  status: 'pending',
  ...overrides,
});

describe('shownLogs', () => {
  it('joins the logs of the server with those waiting on the phone, numbered by date', () => {
    const drying = buildDrying({ started_at: STARTED, logs: [logOf(2)] });

    const shown = shownLogs(drying, [queuedLog('2026-10-24T09:00:00-05:00')]);

    expect(
      shown.map(({ id, day_number, pending }) => [id, day_number, pending]),
    ).toEqual([
      ['dl2', 2, false],
      ['q1', 3, true],
    ]);
  });

  it('leaves out the logs of other lots and the ones the server rejected', () => {
    const drying = buildDrying({ started_at: STARTED });

    const shown = shownLogs(drying, [
      queuedLog('2026-10-24T09:00:00-05:00', { lotId: 'other' }),
      queuedLog('2026-10-24T09:00:00-05:00', { status: 'error' }),
    ]);

    expect(shown).toEqual([]);
  });
});

describe('isMissingToday', () => {
  it('is missing when there is no log of today', () => {
    const drying = buildDrying({ started_at: STARTED, logs: [logOf(2)] });

    expect(isMissingToday(drying, NOW)).toBe(true);
  });

  it('counts the one waiting on the phone', () => {
    const drying = buildDrying({ started_at: STARTED, logs: [logOf(2)] });

    expect(
      isMissingToday(drying, NOW, [queuedLog('2026-10-24T09:00:00-05:00')]),
    ).toBe(false);
  });
});

describe('countMissingToday', () => {
  it('counts only the dryings that miss the log of today', () => {
    const done = buildDrying({ started_at: STARTED, logs: [logOf(3)] });
    const missing = buildDrying({ started_at: STARTED, logs: [] });

    expect(countMissingToday([done, missing], NOW)).toBe(1);
  });
});

describe('cardDetails', () => {
  const drying = buildDrying({ started_at: STARTED, logs: [logOf(2, '14.2')] });

  it('tells the day, how long it has been drying and the last humidity', () => {
    const details = cardDetails(drying, NOW);

    expect(details.day).toBe(3);
    expect(details.elapsed).toBe('1 día y 20 h');
    expect(details.logCount).toBe(1);
    expect(details.last).toEqual({
      moisture: '14.2',
      at: '2026-10-23T16:00:00-05:00',
      day: 2,
      pending: false,
    });
    expect(details.missingToday).toBe(true);
  });

  it('has a dot for every day, with and without a log', () => {
    const { days } = cardDetails(drying, NOW);

    expect(days.map(({ day, status }) => [day, status])).toEqual([
      [1, 'missing'],
      [2, 'logged'],
      [3, 'today'],
    ]);
    expect(days[1].label).toBe('Día 2 · 23 oct · Humedad 14,2 %');
    expect(days[2].label).toBe('Día 3 · hoy · Falta la bitácora');
    expect(days[0].label).toBe('Día 1 · 22 oct · Sin bitácora');
  });

  it('marks the day of a log that waits on the phone', () => {
    const { days, last } = cardDetails(drying, NOW, [
      queuedLog('2026-10-24T09:00:00-05:00'),
    ]);

    expect(days[2].status).toBe('queued');
    expect(days[2].label).toContain('Pendiente de enviar');
    expect(last).toMatchObject({ day: 3, pending: true });
  });

  it('has no last log in a drying without logs', () => {
    expect(
      cardDetails(buildDrying({ started_at: STARTED }), NOW).last,
    ).toBeNull();
  });
});

describe('texts', () => {
  it('says when the drying is expected to end', () => {
    expect(expectedDaysText({ min: 5, max: 7 })).toBe(
      'Se espera entre el día 5 y el 7',
    );
    expect(expectedDaysText({ min: 6, max: 6 })).toBe('Se espera el día 6');
  });

  it('writes the last log in one line', () => {
    const { last } = cardDetails(
      buildDrying({ started_at: STARTED, logs: [logOf(2, '14.2')] }),
      NOW,
    );

    expect(lastLogLine(last!)).toBe('14,2 % · día 2 · 23 oct');
  });

  it('labels a missing past day', () => {
    expect(
      dayLabel({ day: 1, date: '2026-10-22', status: 'missing' }, null),
    ).toBe('Día 1 · 22 oct · Sin bitácora');
  });
});
