import { describe, expect, it } from 'vitest';

import { buildDrying, buildDryingLog } from '@/test/factories';

import type { QueuedLog } from './log-queue';
import { logRows } from './log-rows';

// Iniciado el 22 oct. a las 14:00: el 23 es el día 2 y el 24 el día 3.
const STARTED = '2026-10-22T14:00:00-05:00';
const NOW = new Date('2026-10-24T10:00:00-05:00');

const queuedLog = (
  measuredAt: string,
  status: QueuedLog['status'] = 'pending',
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
    weather: 'cloudy',
    notes: 'Llovizna',
  },
  label: 'lote',
  status,
});

describe('logRows', () => {
  const drying = buildDrying({
    started_at: STARTED,
    logs: [buildDryingLog({ id: 'dl2', day_number: 2 })],
  });

  it('has a row for every day up to today, with the log or empty', () => {
    const rows = logRows(drying, [], NOW);

    expect(rows.map(({ day, date, empty }) => [day, date, empty])).toEqual([
      [1, '2026-10-22', true],
      [2, '2026-10-23', false],
      [3, '2026-10-24', true],
    ]);
    expect(rows[1]).toMatchObject({
      id: 'dl2',
      moisture: '12.4',
      pending: false,
      recordedBy: 'Cuenta de prueba',
    });
    expect(rows[1].log?.id).toBe('dl2');
  });

  it('puts a log waiting on the phone in its day, pending, with nothing to correct yet', () => {
    const rows = logRows(drying, [queuedLog('2026-10-24T09:00:00-05:00')], NOW);

    expect(rows[2]).toMatchObject({
      day: 3,
      empty: false,
      id: 'q1',
      moisture: '10.0',
      weather: 'cloudy',
      notes: 'Llovizna',
      pending: true,
    });
    expect(rows[2].log).toBeUndefined();
  });

  it('leaves out a log the server rejected', () => {
    const rows = logRows(
      drying,
      [queuedLog('2026-10-24T09:00:00-05:00', 'error')],
      NOW,
    );

    expect(rows[2].empty).toBe(true);
  });

  it('keeps going past today when a log is dated later than the clock', () => {
    const rows = logRows(drying, [queuedLog('2026-10-25T09:00:00-05:00')], NOW);

    expect(rows.map(({ day }) => day)).toEqual([1, 2, 3, 4]);
  });

  it('counts the days of the result once the drying finished', () => {
    const finished = buildDrying({
      started_at: STARTED,
      logs: [buildDryingLog({ day_number: 2 })],
      result: {
        ended_at: '2026-10-26T10:00:00-05:00',
        duration_hours: '116.0',
        days: 5,
        total_sun_hours: '20.0',
        final_moisture_pct: '7.0',
        dry_weight_kg: '60.0',
        yield_pct: '49.8',
      },
    });

    expect(
      logRows(finished, [], new Date('2026-11-30T10:00:00-05:00')),
    ).toHaveLength(5);
  });
});
