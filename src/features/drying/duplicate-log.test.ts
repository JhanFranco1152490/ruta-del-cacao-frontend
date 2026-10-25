import { describe, expect, it } from 'vitest';

import { sameDateLog } from './duplicate-log';

const logs = [
  { id: 'a', measured_at: '2026-10-23T08:00:00-05:00' },
  { id: 'b', measured_at: '2026-10-24T16:00:00-05:00' },
];

describe('sameDateLog', () => {
  it('finds a log of the same date, whatever the hour', () => {
    expect(sameDateLog(logs, '2026-10-24T07:00:00-05:00')?.id).toBe('b');
  });

  it('compares the date in Bogotá, not in UTC', () => {
    // 21:30 en Bogotá ya es el día siguiente en UTC.
    expect(sameDateLog(logs, '2026-10-23T21:30:00-05:00')?.id).toBe('a');
  });

  it('finds nothing on a date without a log', () => {
    expect(sameDateLog(logs, '2026-10-25T10:00:00-05:00')).toBeUndefined();
  });

  it('leaves out the log being corrected', () => {
    expect(sameDateLog(logs, '2026-10-24T17:00:00-05:00', 'b')).toBeUndefined();
  });
});
