import { describe, expect, it } from 'vitest';

import { buildDryingLog } from '@/test/factories';

import type { LogFormValues } from './log-form';
import { formOfLog, logChanges, startLogForm } from './log-values';

describe('startLogForm', () => {
  it('opens with the moment of now and everything else empty', () => {
    const form = startLogForm(new Date('2026-10-24T21:00:00Z'));

    expect(form.measured_at).toBe('2026-10-24T16:00');
    expect(form.moisture_pct).toBe('');
    expect(form.weather).toBe('');
  });
});

describe('formOfLog', () => {
  it('writes the decimals with a comma and the hour in Bogotá', () => {
    expect(formOfLog(buildDryingLog())).toEqual({
      measured_at: '2026-10-23T16:00',
      moisture_pct: '12,4',
      sun_hours: '6,0',
      shade_hours: '',
      turn_count: '2',
      turn_frequency_hours: '3,0',
      weather: 'sunny',
      notes: '',
    });
  });
});

describe('logChanges', () => {
  const log = buildDryingLog();
  const same = (): LogFormValues => ({
    ...formOfLog(log),
    moisture_pct: '12.4',
    sun_hours: '6.0',
    turn_frequency_hours: '3.0',
  });

  it('sends nothing when nothing changed, even if a decimal is written differently', () => {
    expect(logChanges(same(), log)).toEqual({});
    expect(logChanges({ ...same(), sun_hours: '6' }, log)).toEqual({});
  });

  it('sends only what changed', () => {
    expect(
      logChanges({ ...same(), moisture_pct: '11.9', weather: 'rainy' }, log),
    ).toEqual({ moisture_pct: '11.9', weather: 'rainy' });
  });

  it('clears the frequency when the turns go to zero', () => {
    expect(logChanges({ ...same(), turn_count: '0' }, log)).toEqual({
      turn_count: 0,
      turn_frequency_hours: null,
    });
  });

  it('sends the new moment only when the minute changed', () => {
    expect(
      logChanges({ ...same(), measured_at: '2026-10-23T17:30' }, log)
        .measured_at,
    ).toBe('2026-10-23T17:30:00-05:00');
  });
});
